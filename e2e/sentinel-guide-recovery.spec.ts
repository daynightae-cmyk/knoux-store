import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openGuide(page: Page) {
  await page.locator('[data-sentinel-launcher] button').first().click();
  await page.getByRole('button', { name: /Sources & settings|المصادر والإعدادات/ }).first().click();
}

test('published guide searches locally, persists Arabic, restores focus and closes on navigation', async ({ page }, testInfo) => {
  const queries: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/sentinel/')) queries.push(request.url()); });
  await page.goto('/solutions');
  const launcher = page.locator('[data-sentinel-launcher] button').first();
  await openGuide(page);
  const dialog = page.locator('#sentinel-guide-panel');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('status').first()).not.toContainText('Loading');
  await dialog.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(dialog).toHaveAttribute('dir', 'rtl');
  await expect(dialog).toHaveAttribute('lang', 'ar');
  await dialog.locator('input').fill('الْمَتْجَر،');
  await dialog.getByRole('button', { name: 'ابحث عن خدمة' }).click();
  await expect(dialog.locator('section nav a').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sentinel-ar.png') });
  expect(queries.every(url => url.endsWith('/api/sentinel/catalog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await openGuide(page);
  await expect(dialog).toHaveAttribute('dir', 'rtl');
  await dialog.getByRole('link', { name: /Composer/ }).click();
  await expect(page).toHaveURL(/\/build$/);
  await expect(dialog).toHaveCount(0);
});

test('guide fits supported widths, traps keyboard focus, and keeps its close action reachable', async ({ page }) => {
  await page.goto('/');
  await openGuide(page);
  const dialog = page.locator('#sentinel-guide-panel');
  for (const width of [320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await dialog.boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  }
  await dialog.getByRole('button', { name: 'Close guide' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('#sentinel-guide-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.map(({ id }) => id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('catalog failure is honest and closing and reopening retries', async ({ page }) => {
  await page.route('**/api/sentinel/catalog', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');
  await openGuide(page);
  await expect(page.getByRole('dialog').getByRole('status').first()).toContainText('Sources are unavailable');
  await expect(page.getByRole('button', { name: 'Find a service' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.unroute('**/api/sentinel/catalog');
  await openGuide(page);
  await expect(page.getByRole('dialog').getByRole('status').first()).toContainText('Published status');
});
