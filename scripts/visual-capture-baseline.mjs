import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const routes = [
  ['home', '/'],
  ['products', '/products'],
  ['engineering', '/engineering'],
  ['wordpress', '/wordpress'],
  ['web', '/web'],
  ['growth', '/growth'],
  ['creative', '/creative'],
  ['solutions', '/solutions'],
  ['build', '/build'],
  ['command', '/command'],
  ['work', '/work'],
  ['labs', '/labs'],
  ['about', '/about'],
  ['contact', '/contact'],
];

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const outDir = process.argv[2] ?? 'visual-audit/baseline';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

for (const [name, path] of routes) {
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${name}:${vp.name}: ${msg.text().slice(0, 300)}`);
    });
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${outDir}/${name}-${vp.name}-viewport.png` });
      await page.screenshot({ path: `${outDir}/${name}-${vp.name}-full.png`, fullPage: true });
    } catch (e) {
      errors.push(`${name}:${vp.name}: NAV FAIL ${e.message?.slice(0, 200)}`);
    }
    await page.close();
  }
}
await browser.close();
console.log('ERRORS:', JSON.stringify(errors, null, 2));
