import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }, testInfo) => {
  const size = testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : testInfo.project.name === 'tablet' ? { width: 820, height: 1180 } : { width: 1440, height: 900 };
  await page.setViewportSize(size);
  await page.goto('/engineering');
});

test('architecture starts in the useful viewport and retains source dossiers', async ({ page }) => {
  const panel = page.getByRole('tabpanel');
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeLessThan((page.viewportSize()?.height ?? 900) - 100);
  await expect(panel.getByText('Desktop shell', { exact: true })).toBeVisible();
  await expect(page.locator('.engineering-dossier').first()).toContainText('Implementation evidence');
  await expect(page.locator('.engineering-dossier').first()).toContainText('Constraints & declared limits');
  await expect(page.locator('.engineering-dossier').first()).toContainText('0 runtime-verified');
  await page.getByRole('link', { name: 'Read the complete dossier' }).click();
  await expect(page).toHaveURL(/#engineering-knoux-one$/);
  const target = await page.locator('#engineering-knoux-one').boundingBox();
  expect(target!.y).toBeGreaterThanOrEqual(68);
});

test('workflow keyboard navigation changes evidence and supports wrap, Home and End', async ({ page }) => {
  const first = page.getByRole('tab', { name: '01 Interface' });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const runtime = page.getByRole('tab', { name: '02 Runtime' });
  await expect(runtime).toBeFocused();
  await expect(runtime).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Typed Rust-to-renderer command allowlist');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tabpanel')).toContainText('BLAKE3 digest');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: '04 Delivery' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('0 runtime-verified');
  await expect(page.getByRole('link', { name: 'Native validation workflow' })).toHaveAttribute('href', /m03-native-validation.yml$/);
  await page.keyboard.press('ArrowRight');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: '04 Delivery' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
});

test('all workflow states remain accessible, bounded and motion-free when requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const name of ['01 Interface', '02 Runtime', '03 Data', '04 Delivery']) {
    await page.getByRole('tab', { name }).click();
    await expect(page.locator('.store-starfield')).toHaveCount(1);
    const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    const result = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
  const styles = await page.locator('[data-stage="3"] [data-active="true"]').first().locator('div').first().evaluate(el => ({ transition: getComputedStyle(el).transitionDuration, transform: getComputedStyle(el).transform }));
  // The shared reduced-motion guard uses a 0.01ms duration for transition events.
  expect(styles.transition.split(',').every(value => Number.parseFloat(value) <= 0.00001)).toBe(true);
  expect(styles.transform).toBe('none');
});
