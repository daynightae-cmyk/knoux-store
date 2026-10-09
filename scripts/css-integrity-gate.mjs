/**
 * Stylesheet integrity gate.
 *
 * A green `next build` is not evidence that styles are served. This gate makes it
 * one.
 *
 * It answers two questions that a build exit code cannot:
 *
 *   1. Does every stylesheet referenced by a prerendered page exist in the build
 *      output?
 *   2. Does the production server actually serve each of those hrefs with 200?
 *
 * Both are discovered dynamically. No hashed filename is hardcoded, so the gate
 * keeps working when chunk names change, which is the point.
 *
 * Exit codes:
 *   0  every referenced stylesheet exists and is served
 *   1  at least one is missing or unservable
 *
 * Usage:
 *   node scripts/css-integrity-gate.mjs            # build-output check only
 *   node scripts/css-integrity-gate.mjs --served   # also require a running server
 *   PORT=4411 node scripts/css-integrity-gate.mjs --served
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const NEXT = join(ROOT, '.next');
const SERVE = process.argv.includes('--served');
const PORT = Number(process.env.PORT ?? process.env.KNOUX_V4_PORT ?? 3311);
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Routes that must be styled, spanning every visual family.
 *
 * Chosen to cover the families that carry their own stylesheets — CSS modules are
 * only emitted for routes that import them, so a module-bearing family is the
 * only way this gate can fail on a module.
 */
const ROUTES = [
  ['home', '/'],
  ['products', '/products'],
  ['product-detail', '/products/knoux-one'],
  ['build', '/build'],
  ['providers', '/build/providers'],
  ['build-ai-models', '/build/ai/models'],
  ['command', '/command'],
  ['command-analytics', '/command/analytics'],
  ['growth', '/growth'],
  ['wordpress', '/wordpress'],
  ['creative', '/creative'],
  ['web', '/web'],
  ['engineering', '/engineering'],
  ['solutions', '/solutions'],
  ['auth', '/login'],
];

/** `/_next/static/x.css` is served from `.next/static/x.css`. */
const toDisk = (href) => join(NEXT, href.replace(/^\/_next\//, '').replace(/^\//, ''));

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * Stylesheet hrefs a document references.
 *
 * Matches the markup *and* any inline JSON the client uses to inject stylesheets
 * after hydration. A stylesheet the browser fetches has to exist even when it is
 * not in the head, so a head-only scan would miss real breakage.
 */
function referencedCss(html) {
  const found = new Set();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]*?\.css/g)) found.add(m[0]);
  return [...found];
}

/** The prerendered document for a route, by its emitted file. */
function documentFor(route) {
  const base = join(NEXT, 'server', 'app', route.replace(/^\//, ''));
  for (const candidate of ['.html', join('index.html')]) {
    const file = join(base, candidate);
    if (statSync(file, { throwIfNoEntry: false })?.isFile()) return file;
  }
  const flat = `${join(NEXT, 'server', 'app', route.replace(/^\//, ''))}.html`;
  return statSync(flat, { throwIfNoEntry: false })?.isFile() ? flat : null;
}

const failures = [];
const skipped = [];
const checked = new Map();

process.stdout.write('CSS INTEGRITY GATE\n');
process.stdout.write(`build output: ${relative(ROOT, NEXT) || '.next'}\n`);
process.stdout.write(`mode        : ${SERVE ? `served (port ${PORT}) + build output` : 'build output only'}\n\n`);

for (const [family, route] of ROUTES) {
  // Served mode fetches the route, which covers `force-dynamic` routes that emit
  // no prerendered document at all. Build-output mode cannot see those, and says
  // so rather than reporting a pass it did not earn.
  let hrefs = [];
  if (SERVE) {
    try {
      const res = await fetch(`${BASE}${route}`, { cache: 'no-store' });
      if (!res.ok) {
        failures.push({ family, route, reason: `route returned HTTP ${res.status}` });
        process.stdout.write(`  ROUTE ${res.status}      ${family.padEnd(18)} ${route}\n`);
        continue;
      }
      hrefs = referencedCss(await res.text());
    } catch (error) {
      failures.push({ family, route, reason: `route unreachable: ${error instanceof Error ? error.message : error}` });
      process.stdout.write(`  UNREACHABLE     ${family.padEnd(18)} ${route}\n`);
      continue;
    }
  } else {
    const file = documentFor(route);
    if (!file) {
      skipped.push({ family, route, reason: 'dynamic route emits no prerendered document; needs --served' });
      process.stdout.write(`  skipped         ${family.padEnd(18)} ${route} (dynamic; needs --served)\n`);
      continue;
    }
    hrefs = referencedCss(readFileSync(file, 'utf8'));
  }

  if (hrefs.length === 0) {
    failures.push({ family, route, reason: 'document references no stylesheet at all' });
    process.stdout.write(`  NO STYLESHEET   ${family.padEnd(18)} ${route}\n`);
    continue;
  }

  const absent = [];
  const statuses = [];
  for (const href of hrefs) {
    if (!statSync(toDisk(href), { throwIfNoEntry: false })?.isFile()) absent.push(href);
  }

  if (SERVE) {
    for (const href of hrefs) {
      try {
        const res = await fetch(`${BASE}${href}`, { cache: 'no-store' });
        statuses.push({ href, status: res.status });
        await res.arrayBuffer();
      } catch (error) {
        statuses.push({ href, status: `ERR ${error instanceof Error ? error.message : error}` });
      }
    }
  }

  const badServed = SERVE ? statuses.filter((s) => s.status !== 200) : [];
  checked.set(family, { route, hrefs: hrefs.length, absent: absent.length, badServed: badServed.length });

  if (absent.length === 0 && badServed.length === 0) {
    process.stdout.write(
      `  ok  ${family.padEnd(18)} ${String(hrefs.length).padStart(2)} stylesheet(s)` +
        `${SERVE ? ' all 200' : ''}\n`,
    );
  } else {
    for (const href of absent) failures.push({ family, route, reason: `not in build output: ${href}` });
    for (const s of badServed) failures.push({ family, route, reason: `served ${s.status}: ${s.href}` });
    process.stdout.write(
      `  FAIL ${family.padEnd(18)} ${absent.length} missing, ${badServed.length} unservable\n`,
    );
  }
}

process.stdout.write(`\nroutes checked : ${checked.size}/${ROUTES.length}`);
process.stdout.write(`${skipped.length ? ` (${skipped.length} skipped: dynamic)` : ''}\n`);
process.stdout.write(`failures       : ${failures.length}\n`);

if (skipped.length && !SERVE) {
  process.stdout.write(
    '\nnote: dynamic routes were skipped, not verified. Re-run with --served against a\n' +
      '      production server to cover them.\n',
  );
}

if (failures.length) {
  process.stdout.write('\nstylesheet integrity FAILED\n');
  for (const f of failures) process.stdout.write(`  ${f.route} — ${f.reason}\n`);
  process.exit(1);
}

process.stdout.write('\nstylesheet integrity OK\n');