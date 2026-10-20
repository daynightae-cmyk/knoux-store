/**
 * Traycer RTL overflow offender diagnostic.
 *
 * Reproduces the acceptance harness locale flow exactly (fresh context per
 * locale, sentinel language preset, guide panel opened) and, when the document
 * overflows horizontally, reports every element whose border box extends past
 * the viewport so the real offender is identified instead of guessed.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.QA_BASE ?? 'http://127.0.0.1:4321';
const folder = `qa/dev/rtl-offender-${Date.now()}`;
mkdirSync(folder, { recursive: true });

const sources = { en: 'Sources & settings', ar: 'المصادر والإعدادات', ur: 'ماخذ اور ترتیبات' };

const probe = () => {
  const vw = window.innerWidth;
  const offenders = [];
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 4).join('.')}`
      : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  for (const el of document.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const pastRight = rect.right - vw;
    const pastLeft = -rect.left;
    if (pastRight > 0 || pastLeft > 0) {
      const svg = el.ownerSVGElement;
      offenders.push({
        selector: describe(el),
        rect: { left: Math.round(rect.left * 100) / 100, right: Math.round(rect.right * 100) / 100, width: Math.round(rect.width * 100) / 100 },
        pastRight: Math.round(pastRight * 100) / 100,
        pastLeft: Math.round(pastLeft * 100) / 100,
        position: style.position,
        overflowX: style.overflowX,
        whiteSpace: style.whiteSpace,
        dir: el.getAttribute('dir'),
        inSvg: Boolean(svg),
        svgClipped: svg ? getComputedStyle(svg).overflow : null,
        text: (el.textContent || '').trim().slice(0, 60),
      });
    }
  }
  offenders.sort((a, b) => Math.max(b.pastRight, b.pastLeft) - Math.max(a.pastRight, a.pastLeft));
  return {
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    innerWidth: vw,
    dir: document.documentElement.dir,
    overflow: document.documentElement.scrollWidth > vw,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 25),
  };
};

const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const language of ['en', 'ar', 'ur']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      await context.addInitScript(value => localStorage.setItem('knoux.sentinel.language', value), language);
      await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
      const page = await context.newPage();
      const catalogReady = page.waitForResponse(r => r.url().endsWith('/api/sentinel/catalog') && r.ok());
      await page.goto(`${base}/products`);
      await catalogReady;
      await page.waitForFunction(v => document.querySelector('[data-sentinel-launcher]')?.getAttribute('lang') === v, language);

      const before = await page.evaluate(probe);
      await page.locator('[data-sentinel-launcher] .ks-trigger').first().click({ timeout: 60000 });
      await page.getByRole('button', { name: sources[language], exact: true }).click();
      await page.locator('#sentinel-guide-panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      const after = await page.evaluate(probe);
      await page.screenshot({ path: `${folder}/locale-${language}-overflow.png`, fullPage: false });
      results.push({ language, before, after });
      const tag = after.overflow ? 'OVERFLOW' : 'ok';
      console.log(`[${language}] before: ${before.scrollWidth}/${before.innerWidth} (${before.offenderCount} offenders) | after: ${after.scrollWidth}/${after.innerWidth} -> ${tag}`);
      for (const o of after.offenders.slice(0, 6)) {
        console.log(`    ${o.selector} right+${o.pastRight} left+${o.pastLeft} pos=${o.position} ws=${o.whiteSpace} "${o.text}"`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${folder}/report.json`, JSON.stringify({ base, folder, results }, null, 2));
console.log(`report: ${folder}/report.json`);
