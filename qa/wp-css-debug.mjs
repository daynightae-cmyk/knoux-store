import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
await page.goto('http://localhost:3101/wordpress', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const rules = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let list; try { list = sheet.cssRules; } catch { continue; }
    const walk = (rules) => { for (const r of rules) { if (r.cssRules) walk(r.cssRules); if (r.selectorText && /satellite|pylon|gateBody/.test(r.selectorText)) out.push(r.cssText.slice(0, 600)); } };
    walk(list);
  }
  return out;
});
console.log(rules.join('\n---\n'));
await browser.close();
