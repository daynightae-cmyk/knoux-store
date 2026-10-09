/**
 * One-off diagnostic: find the elements responsible for horizontal overflow.
 * Reports the widest offenders with enough ancestry to locate the rule.
 */
import { chromium } from '@playwright/test';

const PORT = Number(process.env.KNOUX_V4_PORT ?? 4411);
const BASE = `http://127.0.0.1:${PORT}`;
const routes = (process.env.KNOUX_V4_ROUTES ?? '/command/connections').split(',');
const width = Number(process.env.KNOUX_V4_WIDTH ?? 1440);
const height = Number(process.env.KNOUX_V4_HEIGHT ?? 900);

const browser = await chromium.launch({ channel: 'chrome' });

for (const route of routes) {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width, height },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(700);

  const report = await page.evaluate((vw) => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const offenders = [];

    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.right <= vw + 1) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed') continue;

      // Keep only the outermost offender in each chain, so the report names a
      // container rather than every descendant inside it.
      let parent = el.parentElement;
      let nestedInOffender = false;
      while (parent) {
        const pr = parent.getBoundingClientRect();
        if (pr.right > vw + 1) {
          nestedInOffender = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (nestedInOffender) continue;

      const path = [];
      let node = el;
      while (node && node !== document.body && path.length < 4) {
        const cls =
          typeof node.className === 'string' && node.className
            ? `.${node.className.trim().split(/\s+/).slice(0, 3).join('.')}`
            : '';
        path.unshift(`${node.tagName.toLowerCase()}${cls}`);
        node = node.parentElement;
      }

      offenders.push({
        path: path.join(' > '),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        display: style.display,
        gridCols: style.gridTemplateColumns,
        minWidth: style.minWidth,
        whiteSpace: style.whiteSpace,
        overflowX: style.overflowX,
      });
    }

    offenders.sort((a, b) => b.right - a.right);
    return { route: location.pathname, viewport: vw, overflow, offenders: offenders.slice(0, 6) };
  }, width);

  process.stdout.write(`\n=== ${report.route} @${width} — overflow ${report.overflow}px ===\n`);
  for (const o of report.offenders) {
    process.stdout.write(`  right=${o.right} w=${o.width} display=${o.display} minW=${o.minWidth}\n`);
    process.stdout.write(`    grid: ${o.gridCols}\n`);
    process.stdout.write(`    ${o.path}\n`);
  }
  if (report.offenders.length === 0) process.stdout.write('  (no single offender found)\n');

  await page.close();
  await context.close();
}

await browser.close();