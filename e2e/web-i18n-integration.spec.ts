import { expect, test } from '@playwright/test';

const locales = {
  en: {
    direction: 'ltr',
    filter: 'Filter capabilities',
    divisions: 'ALL DIVISIONS',
    explore: 'EXPLORE SYSTEM',
  },
  ar: {
    direction: 'rtl',
    filter: 'تصفية القدرات',
    divisions: 'جميع الأقسام',
    explore: 'استكشاف النظام',
  },
  ur: {
    direction: 'rtl',
    filter: 'صلاحیتیں فلٹر کریں',
    divisions: 'تمام شعبے',
    explore: 'نظام دیکھیں',
  },
} as const;

test('Web capability and system controls translate and remain usable across shipped languages', async ({ page }, testInfo) => {
  await page.goto('/web');
  // The capability matrix is intentionally behind a native details disclosure.
  await page.locator('details.evidence-disclosure summary').click();
  const picker = page.locator('header select');
  for (const [language, copy] of Object.entries(locales)) {
    await picker.selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('dir', copy.direction);
    const filter = page.getByRole('searchbox', { name: copy.filter });
    await expect(filter).toBeVisible();
    await expect(page.getByRole('button', { name: copy.divisions })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(copy.explore) }).first()).toHaveAttribute('href', /^\/web\//);
    await filter.fill('NO_MATCH_KNOUX_TEST');
    await expect(filter).toHaveValue('NO_MATCH_KNOUX_TEST');
    await filter.fill('');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `Unexpected horizontal overflow for ${language}`).toBeLessThanOrEqual(1);
    if (language === 'ar') {
      await page.screenshot({ path: `e2e/.artifacts/web-i18n-ar-${testInfo.project.name}.png`, fullPage: true });
    }
  }
});
