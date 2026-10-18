import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * Capture the Build workspace from behind its entry gate.
 *
 * The gate is a required modal, so the only honest way into the workspace is to
 * answer it the way a visitor does: pick a starter, press Enter.
 */
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const outDirRaw = process.argv[2] ?? 'visual-audit/workspace';
const outDir = resolve(outDirRaw);
if (basename(outDir).startsWith('.')) throw new Error('Invalid output directory');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['tablet', { width: 820, height: 1180 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(`${name}: ${error.message.slice(0, 160)}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text().slice(0, 160)}`); });

    await page.goto(`${base}/build?intro=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1100);
    await page.getByRole('group', { name: 'Starter intents' }).getByRole('button', { name: 'WEB APP' }).click();
    await page.locator('.dev-entry__field button').click();
    await page.waitForTimeout(1400);

    await page.screenshot({ path: `${outDir}/workspace-${name}-viewport.png` });
    await page.screenshot({ path: `${outDir}/workspace-${name}-full.png`, fullPage: true });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) errors.push(`${name}: horizontal overflow ${overflow}px`);
    console.log(`${name}: captured (overflow ${overflow}px)`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none');