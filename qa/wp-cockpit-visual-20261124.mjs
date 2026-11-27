import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] === 'after' ? 'after' : 'before';
const base = process.env.KNOUX_WP_URL ?? 'http://localhost:3001';
const out = `references/owner-curation-20261124/qa-cockpit-20261124/${phase}`;
const viewports = phase === 'before'
  ? [{ width: 1440, height: 900 }, { width: 390, height: 844 }]
  : [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { phase, base, capturedAt: new Date().toISOString(), results: [] };

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('_next/hmr')) errors.push(`console: ${message.text()}`);
  });

  const result = { viewport, errors, interactions: {} };
  try {
    await page.goto(`${base}/wordpress#studio`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('[data-wordpress-experience][data-phase="studio"]', { timeout: 30000 });
    await page.locator('dialog#studio[open]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-wordpress-cockpit]').waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);

    result.interactions.directStudioEntry = true;
    result.initial = await page.evaluate(() => {
      const cockpit = document.querySelector('[data-wordpress-cockpit]');
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
      };
      return {
        kind: cockpit?.getAttribute('data-preview-kind'),
        title: document.querySelector('#wp-cockpit-preview-title')?.textContent,
        themeChoices: document.querySelectorAll('[data-cockpit-theme]').length,
        pluginChoices: document.querySelectorAll('[data-cockpit-plugin]').length,
        cockpit: rect('[data-wordpress-cockpit]'),
        themesPanel: rect('aside[aria-labelledby="wp-cockpit-themes"]'),
        previewPanel: rect('section[aria-labelledby="wp-cockpit-preview-title"]'),
        pluginsPanel: rect('aside[aria-labelledby="wp-cockpit-plugins"]'),
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    const screenshot = `${out}/wordpress-cockpit-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });
    result.screenshot = screenshot;

    if (viewport.width === 1440) {
      const themeButtons = page.locator('.wp-experience__studio [data-cockpit-theme]');
      const pluginButtons = page.locator('.wp-experience__studio [data-cockpit-plugin]');
      if (await themeButtons.count() > 1) {
        const slug = await themeButtons.nth(1).getAttribute('data-cockpit-theme');
        const expected = await themeButtons.nth(1).locator('strong').innerText();
        await themeButtons.nth(1).click();
        await page.waitForFunction((name) => document.querySelector('#wp-cockpit-preview-title')?.textContent === name, expected);
        result.interactions.themeSelection = { slug, expected, actual: await page.locator('#wp-cockpit-preview-title').innerText() };
        await page.screenshot({ path: `${out}/theme-selected-${viewport.width}x${viewport.height}.png` });
      }
      if (await pluginButtons.count() > 1) {
        const slug = await pluginButtons.nth(1).getAttribute('data-cockpit-plugin');
        const expected = await pluginButtons.nth(1).locator('strong').innerText();
        await pluginButtons.nth(1).click();
        await page.waitForFunction((name) => document.querySelector('#wp-cockpit-preview-title')?.textContent === name, expected);
        result.interactions.pluginSelection = { slug, expected, actual: await page.locator('#wp-cockpit-preview-title').innerText() };
        await page.screenshot({ path: `${out}/plugin-selected-${viewport.width}x${viewport.height}.png` });
      }
      const desktopDevice = page.getByRole('button', { name: 'Mobile', exact: true }).last();
      if (await desktopDevice.count()) {
        await desktopDevice.click();
        result.interactions.mobileDevicePressed = await desktopDevice.getAttribute('aria-pressed');
      }
    }

    if (viewport.width === 390) {
      const themesDock = page.getByRole('button', { name: /^Themes/ }).last();
      await themesDock.click();
      const sheet = page.locator('dialog[aria-labelledby="wp-theme-sheet-title"][open]');
      await sheet.waitFor({ state: 'visible' });
      result.interactions.mobileThemeSheet = true;
      await page.screenshot({ path: `${out}/mobile-theme-sheet-${viewport.width}x${viewport.height}.png` });
      const choices = sheet.locator('[data-cockpit-theme]');
      if (await choices.count() > 1) {
        const expected = await choices.nth(1).locator('strong').innerText();
        await choices.nth(1).click();
        await page.waitForFunction((name) => document.querySelector('#wp-cockpit-preview-title')?.textContent === name, expected);
        result.interactions.mobileSelection = { expected, actual: await page.locator('#wp-cockpit-preview-title').innerText() };
        result.interactions.mobileSheetClosed = await sheet.count() === 0;
      }
      await page.screenshot({ path: `${out}/mobile-theme-selected-${viewport.width}x${viewport.height}.png` });
    }

    result.finalMetrics = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      studioScrollWidth: document.querySelector('dialog#studio')?.scrollWidth,
      studioClientWidth: document.querySelector('dialog#studio')?.clientWidth,
    }));
  } catch (error) {
    result.failure = error instanceof Error ? error.message : String(error);
    await page.screenshot({ path: `${out}/failure-${viewport.width}x${viewport.height}.png` }).catch(() => {});
  }
  report.results.push(result);
  await context.close();
}

// Verify the visible arrival control opens the same dialog after hydration.
if (phase === 'after') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const entry = { interactions: {} };
  try {
    await page.goto(`${base}/wordpress`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const trigger = page.locator('[data-enter-studio]').first();
    await trigger.waitFor({ state: 'visible', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await trigger.click();
    await page.locator('dialog#studio[open]').waitFor({ state: 'visible', timeout: 15000 });
    entry.interactions.arrivalClickOpensStudio = true;
    entry.hash = await page.evaluate(() => location.hash);
    await page.screenshot({ path: `${out}/arrival-click-studio-1440x900.png` });
  } catch (error) {
    entry.failure = error instanceof Error ? error.message : String(error);
  }
  report.arrivalEntry = entry;
  await context.close();
}

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (report.results.some((result) => result.failure) || report.arrivalEntry?.failure) process.exitCode = 1;
