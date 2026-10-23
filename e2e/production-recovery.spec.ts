import { expect, test } from '@playwright/test';

/**
 * Switch the site language through whichever language picker is actually on
 * screen. On command surfaces the site header is hidden below 900px and the
 * command bar's own picker is the visible authority; elsewhere it is the
 * header's picker. See growth-studio.spec.ts for the same helper.
 */
async function chooseLanguage(page: import('@playwright/test').Page, value: 'en' | 'ar' | 'ur') {
  const candidates = [
    page.locator('.site-header select'),
    page.locator('header[class*="commandBar"] select'),
  ];
  for (const candidate of candidates) {
    if ((await candidate.count()) > 0 && (await candidate.first().isVisible())) {
      await candidate.first().selectOption(value);
      return;
    }
  }
  throw new Error('no visible site language picker on this surface');
}


test('Growth uses the full content track and preserves progressive keyboard choices', async ({ page }) => {
  await page.goto('/growth');
  const fields = page.locator('.goal-fieldset');
  await expect(fields).toHaveCount(3);
  const first = fields.first().getByRole('button').first();
  await first.focus();
  await first.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(fields.nth(1).getByRole('button').first()).toBeEnabled();
  await fields.nth(1).getByRole('button').first().click();
  await expect(fields.nth(2).getByRole('button').first()).toBeEnabled();
  const width = page.viewportSize()!.width;
  const grid = await fields.first().locator('.option-grid').boundingBox();
  expect(grid!.width).toBeGreaterThan(width > 1000 ? width * .6 : width * .7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.store-starfield')).toHaveCount(1);
});

test('Signal is a primary destination and translates the usable search surface', async ({ page }) => {
  await page.goto('/signal');
  if (page.viewportSize()!.width <= 1100) await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: page.viewportSize()!.width <= 1100 ? 'Site navigation' : 'Divisions', exact: true }).getByRole('link', { name: /Signal/i })).toBeVisible();
  if (page.viewportSize()!.width <= 1100) await page.getByRole('button', { name: 'Close navigation' }).click();
  /**
   * One language authority governs the site: the header picker. The per-route
   * controls PR #46 shipped (`Switch to Arabic` on the Signal hero, `Switch
   * studio to Arabic` on the WordPress studio, a bare `العربية` button on the
   * Growth hero) were removed by the post-merge recovery because they could
   * disagree with the site-wide system. Switching through the header and
   * asserting document-level direction measures the unified behaviour.
   */
  await chooseLanguage(page, 'ar');
  await expect(page.getByRole('textbox', { name: 'رقم الهاتف' })).toHaveAttribute('placeholder', 'ابحث عن رقم هاتف');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await chooseLanguage(page, 'en');
  await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
  await expect(page.locator('.store-starfield')).toHaveCount(1);
});

test('WordPress studio changes official selection, sizes the screenshot and carries the request', async ({ page }) => {
  await page.goto('/wordpress');
  const studio = page.getByRole('region', { name: 'WordPress Studio' });
  const select = studio.getByRole('combobox');
  // A live upstream failure is a legitimate state, not a fixture substitute.
  if (await select.count() === 0) {
    await expect(studio.getByRole('status')).toContainText('unavailable');
    return;
  }
  const options = await select.locator('option').count();
  expect(options).toBeGreaterThan(0);
  if (options > 1) await select.selectOption({ index: 1 });
  const name = await select.locator('option:checked').textContent();
  const request = studio.getByRole('link', { name: 'Compose a site request' });
  expect(new URLSearchParams((await request.getAttribute('href'))!.split('?')[1]).get('items')).toContain(name);
  await expect(page.getByRole('button', { name: 'Mobile', exact: true })).not.toBeDisabled();
  // WordPress studio device press then Arabic switch on the site-wide picker.
  await studio.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(studio.getByRole('button', { name: 'Mobile', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await chooseLanguage(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(studio.getByRole('link', { name: /تكوين طلب موقع/ })).toBeVisible();
  await studio.getByRole('link', { name: /تكوين طلب موقع/ }).click();
  await expect(page.getByRole('complementary', { name: 'التركيب المستورد' })).toContainText(name!);
  await expect(page.getByRole('complementary', { name: 'التركيب المستورد' })).toContainText('https://wordpress.org/themes/');
  await page.getByRole('button', { name: 'إزالة هذا التحديد' }).click();
  await expect(page.getByRole('complementary', { name: 'التركيب المستورد' })).toHaveCount(0);
});
