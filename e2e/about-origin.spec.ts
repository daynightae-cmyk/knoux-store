import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Origin Room entry, all records, return and normal About reading work without WebGL', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/about');

  await expect(page.getByRole('heading', { name: 'The Origin Room.' })).toBeVisible();
  await expect(page.locator('.origin-room__fallback-mark')).toHaveCSS('opacity', '0');
  const enter = page.getByRole('button', { name: /ENTER KNOuX/ });
  if (testInfo.project.name === 'mobile') await enter.tap();
  else { await enter.focus(); await page.keyboard.press('Enter'); }
  const registry = page.getByRole('group', { name: 'Inspect the institution' });
  await expect(registry.getByRole('button')).toHaveCount(5);
  await expect(page.locator('.origin-room__fallback-mark')).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);

  for (const title of ['Who we are', 'What we build', 'Verified work', 'How we build', 'Founder']) {
    const anchor = registry.getByRole('button', { name: new RegExp(title, 'i') });
    if (title === 'Who we are' && testInfo.project.name !== 'mobile') { await anchor.focus(); await page.keyboard.press('Space'); }
    else if (testInfo.project.name === 'mobile') await anchor.tap();
    else await anchor.click();
    await expect(page.getByRole('complementary', { name: `${title} details` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary', { name: `${title} details` })).toHaveCount(0);
  }

  await page.locator('#about-point-of-view').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: /Make the complex/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
