import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
page.on('console', m => console.log('CONSOLE', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:3101/wordpress#domain', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1000);
  console.log(i, await page.evaluate(() => ({ hash: location.hash, phase: document.querySelector('[data-wordpress-experience]')?.dataset.phase, studioHidden: document.querySelector('.wp-experience__studio')?.hasAttribute('hidden'), html: document.querySelector('[data-wordpress-experience]')?.outerHTML.slice(0, 180) })));
}
await page.screenshot({ path: 'references/store-20261123/qa/screen-01/debug-deeplink.png' });
await browser.close();
