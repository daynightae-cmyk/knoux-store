import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3403';
const ROUTE = `${BASE}/wordpress`;

const browser = await chromium.launch();
const out = {};

/* ---------------------------------------------- 1. hydration + nesting */

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const hydration = [];
const pageErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') hydration.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(ROUTE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const HYDRATION_WORDS = [
  'hydrat',
  'did not match',
  'Text content does not match',
  'server rendered HTML',
  'validateDOMNesting',
  'cannot appear as a descendant',
  'isInvalidHTML',
];
out.hydrationAndNestingWarnings = hydration.filter((t) =>
  HYDRATION_WORDS.some((w) => t.toLowerCase().includes(w.toLowerCase())),
);
out.allConsoleWarningsAndErrors = hydration;

/**
 * Every element whose box escapes the viewport, with the reason it is allowed to.
 * An offender inside an `overflow-x: auto|scroll` ancestor is a deliberate rail.
 * An offender with no such ancestor is clipped content and a real defect.
 */
out.escapingElements = await page.evaluate(() => {
  const de = document.documentElement;
  const scrollable = (node) => {
    for (let el = node.parentElement; el; el = el.parentElement) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`;
    }
    return null;
  };
  const bad = [];
  for (const el of document.querySelectorAll('main *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > de.clientWidth + 1) {
      const rail = scrollable(el);
      if (!rail) {
        const cls = typeof el.className === 'string' && el.className ? el.className.split(' ')[0] : el.tagName;
        bad.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)} text="${(el.textContent ?? '').trim().slice(0, 40)}"`);
      }
    }
  }
  return { unclipped: bad.slice(0, 10), count: bad.length };
});

/* --------------------------------------- 2. credential boundary, live */

out.networkBodies = [];
const bodies = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!url.startsWith(BASE)) return;
  try {
    const ct = res.headers()['content-type'] ?? '';
    if (!ct.includes('json')) return;
    bodies.push({ url: url.replace(BASE, ''), body: (await res.text()).slice(0, 4000) });
  } catch {
    /* body already consumed or unavailable */
  }
});

await page.locator('#domain').scrollIntoViewIfNeeded();
await page.locator('.domain-finder__field input').fill('knoux');
await page.locator('.domain-finder__tld', { hasText: '.ae' }).click();
await page.locator('.domain-finder__submit').click();
await page.locator('.domain-finder__notice-title').waitFor({ timeout: 15000 });
out.networkBodies = bodies;

out.htmlSource = (await page.content()).slice(0, 200000);
await ctx.close();

/* ------------------------------------- 3. credential boundary, built assets */

const CHUNKS = join(process.cwd(), '.next', 'static', 'chunks');
const SECRET_PATTERNS = [
  /KNOUX_DOMAIN_[A-Z_]+/,
  /api_secret/i,
  /api_identifier/i,
  /accountId/,
  /super-secret/,
  /Bearer\s+[A-Za-z0-9._-]{12,}/,
  /namecheap\.com\/xml\.response/,
  /api\.cloudflare\.com\/client\/v4\/accounts/,
];
const findings = [];
let scanned = 0;
for (const name of readdirSync(CHUNKS)) {
  if (!/\.(js|css)$/.test(name)) continue;
  scanned++;
  const text = readFileSync(join(CHUNKS, name), 'utf8');
  for (const pattern of SECRET_PATTERNS) {
    const m = pattern.exec(text);
    if (m) findings.push(`${name}: ${pattern} -> "${m[0].slice(0, 60)}"`);
  }
}
out.clientChunksScanned = scanned;
out.clientChunkCredentialFindings = findings;

/* ---------------------------------------------------------------- 4. console */

const consoleErrors = out.allConsoleWarningsAndErrors.filter((t) => t.startsWith('error:'));
out.consoleErrorCount = consoleErrors.length;
out.consoleErrors = consoleErrors;
out.pageErrors = pageErrors;

await browser.close();

const bad =
  out.hydrationAndNestingWarnings.length ||
  out.escapingElements.count ||
  out.consoleErrorCount ||
  out.pageErrors.length ||
  findings.length;

console.log(JSON.stringify(out, null, 2));
console.log(bad ? '\nPROBLEMS FOUND' : '\nNO HYDRATION / NESTING / OVERFLOW / CREDENTIAL PROBLEMS');
process.exitCode = bad ? 1 : 0;
