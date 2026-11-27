import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:3101/wordpress#domain', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
console.log(await page.evaluate(() => ({
  hash: location.hash,
  phase: document.querySelector('[data-wordpress-experience]')?.dataset.phase,
  pressed: Array.from(document.querySelectorAll('[aria-label="WordPress Studio"] button[aria-pressed]')).map(b => [b.textContent.trim(), b.getAttribute('aria-pressed')]),
  heading: document.querySelector('[aria-label="WordPress Studio"] h2')?.textContent,
  studioLabel: document.querySelector('[aria-label="WordPress Studio"]')?.getAttribute('aria-label'),
})));
await browser.close();
