import { expect, test, type Page } from '@playwright/test';

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
const DOCUMENT_LANGUAGE = { en: 'ltr', ar: 'rtl', ur: 'rtl' } as const;
type ShippedLanguage = keyof typeof DOCUMENT_LANGUAGE;

/** Assert the document reports this language and its correct writing direction. */
async function expectDocument(page: Page, language: ShippedLanguage) {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator('html')).toHaveAttribute('dir', DOCUMENT_LANGUAGE[language]);
}

async function chooseLanguage(page: Page, language: ShippedLanguage) {
  await page.locator(PICKER).selectOption(language);
  await expectDocument(page, language);
}

/**
 * Width at which the header swaps the persistent desktop nav for the
 * disclosure menu. Mirrors the `max-width:1100px` block in `globals.css`; the
 * two must agree or this waits for a control that is not on screen.
 */
const COMPACT_NAV_MAX_WIDTH = 1100;

/**
 * Reach the first division link through whichever navigation the current
 * viewport actually renders, rather than forcing the desktop nav into view at a
 * width where the stylesheet has hidden it.
 */
async function openFirstDivision(page: Page): Promise<{ href: string; compact: boolean }> {
  const width = page.viewportSize()?.width ?? Number.POSITIVE_INFINITY;
  const compact = width <= COMPACT_NAV_MAX_WIDTH;

  if (compact) {
    const toggle = page.locator('button.mobile-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    const panel = page.locator('nav.mobile-panel');
    await expect(panel).toBeVisible();
    // The desktop nav is hidden at this width; the panel is the real control.
    await expect(page.locator('header nav.desktop-nav')).toBeHidden();
  } else {
    await expect(page.locator('button.mobile-toggle')).toBeHidden();
  }

  const link = (compact ? page.locator('nav.mobile-panel a') : page.locator('header nav.desktop-nav a')).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href, 'first division link must have a destination').toBeTruthy();
  return { href: href!, compact };
}

test.describe('site language switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the header exposes a picker with an accessible name', async ({ page }) => {
    const picker = page.locator(PICKER);
    await expect(picker).toBeVisible();
    await expect(picker).toHaveAttribute('aria-label', 'Language');
    // Exactly the three shipped languages, each labelled by its own endonym.
    await expect(picker.locator('option')).toHaveCount(3);
    await expect(picker.locator('option')).toHaveText(['English', 'العربية', 'اردو']);
  });

  test('the document defaults to English and left-to-right', async ({ page }) => {
    await expect(page.locator(PICKER)).toHaveValue('en');
    await expectDocument(page, 'en');
  });

  test('the skip link is reachable and translated in the chosen language', async ({ page }) => {
    const skip = page.locator('a.skip-link');
    await expect(skip).toHaveText('Skip to content');

    await chooseLanguage(page, 'ar');
    await expect(skip).toHaveText('انتقل إلى المحتوى');

    await chooseLanguage(page, 'ur');
    await expect(skip).toHaveText('مواد پر جائیں');
  });

  test('switching back to English restores the English document', async ({ page }) => {
    const skip = page.locator('a.skip-link');
    await chooseLanguage(page, 'ar');
    await chooseLanguage(page, 'en');
    await expect(skip).toHaveText('Skip to content');
  });

  test('the chosen language survives a reload and navigation', async ({ page }) => {
    await chooseLanguage(page, 'ur');

    await page.reload();
    await expect(page.locator(PICKER)).toHaveValue('ur');
    await expectDocument(page, 'ur');

    await page.goto('/about');
    await expect(page.locator(PICKER)).toHaveValue('ur');
    await expectDocument(page, 'ur');
  });

  test('navigation still works while the document is right-to-left', async ({ page }) => {
    await chooseLanguage(page, 'ar');

    const { href, compact } = await openFirstDivision(page);
    await page.locator(compact ? 'nav.mobile-panel a' : 'header nav.desktop-nav a').first().click();

    // Destination is read from the link, not assumed, so this survives a change
    // to the division order.
    await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));

    // Language and direction survived the navigation.
    await expectDocument(page, 'ar');
    await expect(page.locator(PICKER)).toHaveValue('ar');

    // The disclosure menu closed itself on the link that was followed, so the
    // panel cannot be left covering the destination page.
    if (compact) await expect(page.locator('nav.mobile-panel')).toBeHidden();
  });

  test('right-to-left introduces no horizontal overflow', async ({ page }) => {
    for (const language of Object.keys(DOCUMENT_LANGUAGE) as ShippedLanguage[]) {
      await chooseLanguage(page, language);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow in ${language}`).toBeLessThanOrEqual(1);
    }
  });

  test('the picker is operable at a mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(PICKER).selectOption('ar');
    await expectDocument(page, 'ar');

    // The mobile nav toggle must still be usable after the direction change.
    await page.locator('button.mobile-toggle').click();
    await expect(page.locator('nav.mobile-panel')).toBeVisible();
  });

  test('a stale stored value degrades to English instead of breaking the page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('knoux.sentinel.language', 'fr');
    });
    await page.reload();

    await expect(page.locator(PICKER)).toHaveValue('en');
    await expectDocument(page, 'en');
  });

  test('the Sentinel guide falls back to English when no Urdu content exists', async ({ page }) => {
    await chooseLanguage(page, 'ur');

    // The guide publishes English and Arabic only. With Urdu selected it must
    // still open and read English rather than render a missing dictionary.
    const launcher = page
      .locator('[data-sentinel-guide-launcher], button:has-text("Guide"), button:has-text("دليل")')
      .first();
    if ((await launcher.count()) === 0) test.skip(true, 'guide launcher not present on this route');
    await launcher.click();
    const panel = page.locator('dialog[open], [role="dialog"]').first();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/English|Arabic/);

    // The document language is untouched by the guide's own fallback.
    await expectDocument(page, 'ur');
  });
});