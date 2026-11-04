import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.KX_BASE_URL || 'http://127.0.0.1:3925';
const output = process.env.KX_SCREENSHOT_DIR || 'KX-QA-LOCAL';
const routes = [
  '/software/kx-private-vpn',
  '/docs/kx-private-vpn',
  '/legal/kx-private-vpn/privacy',
  '/support/kx-private-vpn',
  '/software/kx-private-vpn/releases',
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
try {
  for (const [width, height, label] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message.slice(0, 250)));
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = response?.status() ?? 0;
      const count = await page.locator('main#main-content').count();
      const h1 = await page.locator('main#main-content h1').count();
      const hasBrand = (await page.locator('body').innerText()).includes('KX PRIVATE VPN');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 3);
      const filename = route.replaceAll('/', '_').replace(/^_/, '') + '-' + label + '.png';
      await page.screenshot({ path: output + '/' + filename, fullPage: true });
      const ok = status === 200 && count === 1 && h1 === 1 && hasBrand && !overflow && errors.length === 0;
      if (!ok) failures++;
      console.log(JSON.stringify({ route, label, status, mainCount: count, h1Count: h1, hasBrand, horizontalOverflow: overflow, jsErrors: errors, passed: ok, screenshot: filename }));
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log('SMOKE_FAILURES=' + failures);
process.exitCode = failures ? 1 : 0;
