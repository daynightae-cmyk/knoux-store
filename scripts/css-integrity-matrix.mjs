/**
 * CSS build-integrity control matrix.
 *
 * Reproduces, isolates and re-tests the stylesheet-chunk defect without a server
 * and without git, so the experiment cannot be perturbed by either.
 *
 * For each scenario it: applies an edit from a pristine on-disk copy, removes
 * `.next`, builds, then cross-checks every stylesheet referenced by every
 * prerendered HTML file against the physical build output.
 *
 * The filesystem check is the primary signal. A production server is only needed
 * to confirm the same hrefs are *servable*, which a later step does.
 *
 * Usage:  node scripts/css-integrity-matrix.mjs [--only=B,C]
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const NEXT = join(ROOT, '.next');
const OUT_DIR = join(ROOT, 'references', 'css-build-integrity');
mkdirSync(OUT_DIR, { recursive: true });

/** The two stylesheets the defect was observed on. */
const GLOBALS = join(ROOT, 'src/app/globals.css');
const MODULE = join(ROOT, 'src/components/command/command.module.css');

/** Pristine copies, taken once, so no scenario needs git. */
const PRISTINE = join(ROOT, '.integrity-pristine');
mkdirSync(PRISTINE, { recursive: true });
const pristineGlobals = join(PRISTINE, 'globals.css');
const pristineModule = join(PRISTINE, 'command.module.css');
copyFileSync(GLOBALS, pristineGlobals);
copyFileSync(MODULE, pristineModule);

/**
 * The smallest edit that actually reaches the build output.
 *
 * It must survive minification. An appended comment does not: the minifier strips
 * it, the emitted CSS is byte-identical, no chunk hash can change, and the
 * scenario silently tests nothing — which is exactly what an earlier run of this
 * matrix did, reporting "not reproduced" for a no-op edit.
 *
 * An unused custom property is the right size of change. Custom properties are
 * preserved through minification, so the emitted stylesheet differs in bytes; and
 * because nothing reads it, it cannot alter a single rendered pixel. Any chunk
 * change observed afterwards is therefore attributable to the build, not to the
 * stylesheet's content.
 */
const appendDeclaration = (file) => {
  const text = readFileSync(file, 'utf8');
  writeFileSync(file, `${text}\n:root { --css-integrity-probe: 1; }\n`, 'utf8');
};

const restore = () => {
  copyFileSync(pristineGlobals, GLOBALS);
  copyFileSync(pristineModule, MODULE);
};

const SCENARIOS = [
  { id: 'A', name: 'pristine main', globals: false, module: false },
  { id: 'B', name: 'globals.css only', globals: true, module: false },
  { id: 'C', name: 'command.module.css only', globals: false, module: true },
  { id: 'D', name: 'both', globals: true, module: true },
  { id: 'E', name: 'revert to pristine (control)', globals: false, module: false },
];

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').replace('--only=', '');
const selected = only
  ? SCENARIOS.filter((s) => only.split(',').includes(s.id))
  : SCENARIOS;

/** Every `.html` file the build emitted. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') && entry !== '.next') continue;
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
 * Matches `/_next/static/...css` in markup and in any inline JSON the client uses
 * to inject stylesheets after hydration — a stylesheet the browser fetches still
 * has to exist, even though it is not in the HTML head.
 */
function referencedCss(html) {
  const found = new Set();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]*?\.css/g)) found.add(m[0]);
  return [...found];
}

/**
 * Map a public href to its physical build output.
 *
 * `/_next/static/chunks/x.css` is served from `.next/static/chunks/x.css`, so the
 * `/_next/` segment is part of the URL namespace and not part of the output path.
 * Resolving it as `.next/_next/static/...` reports every stylesheet as missing,
 * which is a false positive that looks exactly like the real defect.
 */
const toDisk = (href) => join(NEXT, href.replace(/^\/_next\//, '').replace(/^\//, ''));

/** Cross-check referenced hrefs against the physical build output. */
function auditBuild() {
  const htmlFiles = walk(join(NEXT, 'server', 'app'));
  const cssOnDisk = new Set();
  const collect = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      let s; try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) collect(full);
      else if (e.endsWith('.css')) cssOnDisk.add(full);
    }
  };
  collect(join(NEXT, 'static'));

  const referenced = new Map(); // href -> [documents referencing it]
  for (const file of htmlFiles) {
    for (const href of referencedCss(readFileSync(file, 'utf8'))) {
      if (!referenced.has(href)) referenced.set(href, []);
      referenced.get(href).push(relative(join(NEXT, 'server', 'app'), file));
    }
  }

  const missing = [];
  for (const [href, documents] of referenced) {
    if (!existsSync(toDisk(href))) missing.push({ href, documents });
  }

  const referencedDiskPaths = new Set([...referenced.keys()].map(toDisk));
  const orphans = [...cssOnDisk]
    .filter((f) => !referencedDiskPaths.has(f))
    .map((f) => relative(NEXT, f));

  return {
    htmlDocuments: htmlFiles.length,
    cssFilesOnDisk: cssOnDisk.size,
    cssReferences: referenced.size,
    missingCount: missing.length,
    missing,
    orphanCount: orphans.length,
    orphans,
    referencedHrefs: [...referenced.keys()],
    onDiskNames: [...cssOnDisk].map((f) => f.split(/[\\/]/).pop()),
  };
}

const rows = [];

for (const scenario of selected) {
  restore();
  if (scenario.globals) appendDeclaration(GLOBALS);
  if (scenario.module) appendDeclaration(MODULE);

  rmSync(NEXT, { recursive: true, force: true });

  process.stdout.write(`\n=== ${scenario.id}: ${scenario.name} ===\n`);
  process.stdout.write(`building...\n`);

  const started = Date.now();
  let exit = 0;
  try {
    execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe', shell: true });
  } catch (error) {
    exit = typeof error.status === 'number' ? error.status : -1;
  }
  const buildMs = Date.now() - started;

  const audit = auditBuild();
  rows.push({ ...scenario, exit, buildMs, ...audit });

  process.stdout.write(
    `exit=${exit} build=${(buildMs / 1000).toFixed(0)}s documents=${audit.htmlDocuments} ` +
      `cssOnDisk=${audit.cssFilesOnDisk} referenced=${audit.cssReferences} ` +
      `MISSING=${audit.missingCount} orphans=${audit.orphanCount}\n`,
  );
  for (const m of audit.missing.slice(0, 6)) {
    process.stdout.write(`  MISSING ${m.href}  (${m.documents.length} docs, e.g. ${m.documents[0]})\n`);
  }
  if (audit.missingCount > 0) {
    process.stdout.write(`  referenced: ${audit.referencedHrefs.map((h) => h.split('/').pop()).join(', ')}\n`);
    process.stdout.write(`  on disk   : ${audit.onDiskNames.join(', ')}\n`);
  }
}

restore();

process.stdout.write('\n\n================ CONTROL MATRIX ================\n');
process.stdout.write(
  ['ID', 'SCENARIO', 'EXIT', 'DOCS', 'CSS-DISK', 'CSS-REF', 'MISSING', 'ORPHANS']
    .map((h, i) => h.padEnd([4, 28, 5, 6, 9, 8, 8, 8][i]))
    .join('') + '\n',
);
for (const r of rows) {
  process.stdout.write(
    [
      r.id,
      r.name.slice(0, 27),
      String(r.exit),
      String(r.htmlDocuments),
      String(r.cssFilesOnDisk),
      String(r.cssReferences),
      String(r.missingCount),
      String(r.orphanCount),
    ].map((v, i) => v.padEnd([4, 28, 5, 6, 9, 8, 8, 8][i]))
      .join('') + '\n',
  );
}

const broken = rows.filter((r) => r.exit === 0 && r.missingCount > 0);
process.stdout.write(
  `\nRESULT: ${broken.length ? 'P0 REPRODUCED' : 'not reproduced'} ` +
    `(${broken.length} scenario(s) exited 0 with missing stylesheets)\n`,
);

writeFileSync(
  join(OUT_DIR, 'control-matrix.json'),
  `${JSON.stringify({ capturedAt: new Date().toISOString(), rows }, null, 2)}\n`,
  'utf8',
);