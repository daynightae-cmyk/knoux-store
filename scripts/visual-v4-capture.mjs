/**
 * Visual System V4 — before/after evidence capture.
 *
 * Uses the system Chrome channel (`channel: 'chrome'`) so no Playwright browser
 * download is required. Reduced motion is forced on so a capture never measures
 * an animation the user asked the system not to run, matching
 * `playwright.config.ts`.
 *
 * Usage:
 *   node scripts/visual-v4-capture.mjs before
 *   node scripts/visual-v4-capture.mjs after
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const PHASE = process.argv[2] ?? 'before';
if (PHASE !== 'before' && PHASE !== 'after') {
  throw new Error('phase must be "before" or "after"');
}

/** Resume an interrupted run rather than recapturing what already exists. */
const RESUME = process.env.KNOUX_V4_RESUME !== '0';

const PORT = Number(process.env.KNOUX_V4_PORT ?? 4411);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(process.cwd(), 'references', 'visual-v4', PHASE);

/** App families that actually ship, grouped for the gallery. */
const FAMILIES = [
  { family: 'home', route: '/' },
  { family: 'products', route: '/products' },
  { family: 'product-detail', route: '/products/knoux-one' },
  { family: 'command', route: '/command' },
  { family: 'command-analytics', route: '/command/analytics' },
  { family: 'command-social', route: '/command/social' },
  { family: 'command-campaigns', route: '/command/campaigns' },
  { family: 'command-reports', route: '/command/reports' },
  { family: 'command-leads', route: '/command/leads' },
  { family: 'command-clients', route: '/command/clients' },
  { family: 'command-connections', route: '/command/connections' },
  { family: 'command-communities', route: '/command/communities' },
  { family: 'command-automations', route: '/command/automations' },
  { family: 'command-intelligence', route: '/command/intelligence' },
  { family: 'growth', route: '/growth' },
  { family: 'wordpress', route: '/wordpress' },
  { family: 'creative', route: '/creative' },
  { family: 'web', route: '/web' },
  { family: 'solutions', route: '/solutions' },
  { family: 'build', route: '/build' },
  { family: 'build-providers', route: '/build/providers' },
  { family: 'build-ai-models', route: '/build/ai/models' },
  { family: 'build-ai-router', route: '/build/ai/router' },
  { family: 'build-terminal', route: '/build/terminal' },
  { family: 'build-engineering', route: '/build/engineering' },
  { family: 'auth', route: '/login' },
  { family: 'register', route: '/register' },
];

/** The width matrix the mission requires. */
const VIEWPORTS = [
  { name: '1904x880', width: 1904, height: 880, cls: 'desktop' },
  { name: '1600x1000', width: 1600, height: 1000, cls: 'desktop' },
  { name: '1440x900', width: 1440, height: 900, cls: 'desktop' },
  { name: '1366x768', width: 1366, height: 768, cls: 'desktop' },
  { name: '1280x800', width: 1280, height: 800, cls: 'desktop' },
  { name: '1024x1366', width: 1024, height: 1366, cls: 'tablet' },
  { name: '820x1180', width: 820, height: 1180, cls: 'tablet' },
  { name: '768x1024', width: 768, height: 1024, cls: 'tablet' },
  { name: '430x932', width: 430, height: 932, cls: 'mobile' },
  { name: '390x844', width: 390, height: 844, cls: 'mobile' },
  { name: '360x800', width: 360, height: 800, cls: 'mobile' },
];

const records = [];

await mkdir(OUT, { recursive: true });

const existing = new Set(
  RESUME
    ? (await readdir(OUT)).filter((name) => name.endsWith('.png'))
    : [],
);

const browser = await chromium.launch({ channel: 'chrome' });

for (const entry of FAMILIES) {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  for (const vp of VIEWPORTS) {
    const file = `${entry.family}-${vp.name}.png`;

    if (existing.has(file)) {
      records.push({
        phase: PHASE,
        family: entry.family,
        route: entry.route,
        viewport: vp.name,
        widthClass: vp.cls,
        status: -1,
        overflow: -1,
        docHeight: -1,
        consoleErrorCount: -1,
        consoleErrors: [],
        file,
        resumed: true,
      });
      continue;
    }

    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    let status = 0;
    let overflow = 0;
    let docHeight = 0;
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
    });

    try {
      /**
       * `load`, not `networkidle`. Several surfaces hold a connection open for
       * the whole page's life — the Build bridge polls, the starfield and scene
       * canvases keep work queued — so `networkidle` never fires and every one of
       * those captures burned its full timeout. A fixed settle after `load` is
       * both faster and a more honest measurement: it does not wait for a
       * condition this site is never going to reach.
       */
      const response = await page.goto(`${BASE}${entry.route}`, {
        waitUntil: 'load',
        timeout: 30_000,
      });
      status = response ? response.status() : 0;
      await page.waitForTimeout(700);

      const geometry = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          overflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
          docHeight: doc.scrollHeight,
        };
      });
      overflow = geometry.overflow;
      docHeight = geometry.docHeight;
    } catch (error) {
      consoleErrors.push(`NAV: ${error instanceof Error ? error.message : String(error)}`);
    }

    await page.screenshot({ path: join(OUT, file), fullPage: false });
    await page.close();

    records.push({
      phase: PHASE,
      family: entry.family,
      route: entry.route,
      viewport: vp.name,
      widthClass: vp.cls,
      status,
      overflow,
      docHeight,
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 3),
      file,
    });
    process.stdout.write(
      `${PHASE} ${entry.family} ${vp.name} status=${status} overflow=${overflow} h=${docHeight} err=${consoleErrors.length}\n`,
    );
  }

  await context.close();
}

await browser.close();

await writeFile(join(OUT, 'capture-matrix.json'), `${JSON.stringify(records, null, 2)}\n`, 'utf8');

const bad = records.filter((r) => r.status >= 400 || r.overflow > 0);
process.stdout.write(`\n=== ${PHASE} complete: ${records.length} captures ===\n`);
process.stdout.write(`failures/overflow: ${bad.length}\n`);
for (const row of bad) {
  process.stdout.write(
    `  ${row.family} ${row.viewport} status=${row.status} overflow=${row.overflow}\n`,
  );
}