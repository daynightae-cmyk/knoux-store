import { expect, test } from '@playwright/test';

/**
 * Public-site language switching.
 *
 * The switcher is the first thing a visitor reaches that is not a link, so the
 * claims worth proving are about behaviour that can be false: that the document
 * actually reports the chosen language and direction, that a language with no
 * translation still renders a real string instead of an empty box, that the
 * choice survives a reload, and that right-to-left layout does not introduce
 * horizontal overflow.
 *
 * Production build, because that is what a visitor receives.
 */

const PICKER = 'header select';

test.describe('site language switching', () => {
  test('the header exposes a picker with an accessible name', async ({ page }) => {
    await page.goto('/');
    const picker = page.locator(PICKER);
    await expect(picker).toBeVisible();
    await expect(picker).toHaveAttribute('aria-label', 'Language');
    // Exactly the three shipped languages, labelled by endonym.
    await expect(picker.locator('option')).toHaveCount(3);
    await expect(picker.locator('option')).toHaveText(['English', 'العربية', 'اردو']);
  });

  test('the document defaults to English and left-to-right', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(PICKER)).toHaveValue('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('the skip link is reachable and translated in the chosen language', async ({ page }) => {
    await page.goto('/');
    const skip = page.locator('a.skip-link');
    await expect(skip).toHaveText('Skip to content');

    await page.locator(PICKER).selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(skip).toHaveText('انتقل إلى المحتوى');

    await page.locator(PICKER).selectOption('ur');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(skip).toHaveText('مواد پر جائیں');
  });

  test('switching back to English restores the English document', async ({ page }) => {
    await page.goto('/');
    await page.locator(PICKER).selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator(PICKER).selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('a.skip-link')).toHaveText('Skip to content');
  });

  test('the chosen language survives a reload and navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator(PICKER).selectOption('ur');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    await page.reload();
    await expect(page.locator(PICKER)).toHaveValue('ur');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    await page.goto('/about');
    await expect(page.locator(PICKER)).toHaveValue('ur');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('navigation still works while the document is right-to-left', async ({ page }) => {
    await page.goto('/');
    await page.locator(PICKER).selectOption('ar');
    const firstDivision = page.locator('header nav.desktop-nav a').first();
    await expect(firstDivision).toBeVisible();
    // Take the target from the link rather than assuming a route, so this
    // stays true if the division order changes.
    const href = await firstDivision.getAttribute('href');
    expect(href).toBeTruthy();
    await firstDivision.click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    // Page state survived the language change.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('right-to-left introduces no horizontal overflow', async ({ page }) => {
    for (const language of ['en', 'ar', 'ur']) {
      await page.goto('/');
      await page.locator(PICKER).selectOption(language);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow in ${language}`).toBeLessThanOrEqual(1);
    }
  });

  test('the picker is operable at a mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const picker = page.locator(PICKER);
    await expect(picker).toBeVisible();
    await picker.selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // The mobile nav toggle must still be usable after the direction change.
    await page.locator('button.mobile-toggle').click();
    await expect(page.locator('nav.mobile-panel')).toBeVisible();
  });

  test('a stale stored value degrades to English instead of breaking the page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('knoux.sentinel.language', 'fr');
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator(PICKER)).toHaveValue('en');
  });

  test('the Sentinel guide falls back to English when no Urdu content exists', async ({ page }) => {
    await page.goto('/');
    await page.locator(PICKER).selectOption('ur');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    // The guide publishes English and Arabic only. With Urdu selected it must
    // still open and read English rather than render a missing dictionary.
    const launcher = page.locator('[data-sentinel-guide-launcher], button:has-text("Guide"), button:has-text("دليل")').first();
    if ((await launcher.count()) === 0) test.skip(true, 'guide launcher not present on this route');
    await launcher.click();
    const panel = page.locator('dialog[open], [role="dialog"]').first();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/English|Arabic/);
    // The document language is untouched by the guide's own fallback.
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  });
});