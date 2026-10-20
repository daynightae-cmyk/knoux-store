import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const folder = `qa/dev/locale-diagnostic-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const records = [];
try {
  for (const language of ['en', 'ar', 'ur']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      await context.addInitScript(value => localStorage.setItem('knoux.sentinel.language', value), language);
      await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'Diagnostic: inference disabled' } }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:3999/products');
      await page.locator('[data-sentinel-launcher] .ks-trigger').click();
      const expected = { en: 'Sources & settings', ar: 'المصادر والإعدادات', ur: 'ماخذ اور ترتیبات' }[language];
      let failure = null;
      try { await page.getByRole('button', { name: expected, exact: true }).waitFor({ state: 'visible', timeout: 2500 }); }
      catch (error) { failure = error.message; }
      const state = await page.evaluate(() => ({
        url: location.href, readyState: document.readyState, storedLanguage: localStorage.getItem('knoux.sentinel.language'),
        root: { lang: document.documentElement.lang, dir: document.documentElement.dir },
        launcher: [...document.querySelectorAll('[data-sentinel-launcher]')].map(node => ({ lang: node.lang, phase: node.dataset.phase, expanded: node.dataset.expanded })),
        bubbles: [...document.querySelectorAll('[data-sentinel-bubble]')].map(node => ({ lang: node.lang, dir: node.dir, visible: node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}), text: node.innerText })),
        buttons: [...document.querySelectorAll('button')].map(node => ({ text: node.innerText, ariaLabel: node.getAttribute('aria-label'), visible: node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) })),
        // Public product DOM only; no provider forms or credentials on this route.
        sentinelDOM: document.querySelector('[data-sentinel-launcher]')?.outerHTML ?? null,
      }));
      await page.screenshot({ path: `${folder}/${language}-${failure ? 'failure' : 'visible'}.png` });
      writeFileSync(`${folder}/${language}-dom.json`, JSON.stringify({ state, errors, failure }, null, 2));
      records.push({ language, failure, launcherLanguage: state.launcher[0]?.lang, bubbleLanguages: state.bubbles.map(b=>b.lang), expectedButton: expected });
    } finally { await context.close(); }
  }
  const result = { folder, purpose: 'Replays historical early-click sequence without catalog/hydration wait; not acceptance', records };
  writeFileSync(`${folder}/report.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
