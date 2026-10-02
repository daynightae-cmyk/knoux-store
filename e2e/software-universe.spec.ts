import { expect, test } from '@playwright/test';

test('recovered software universe exposes all ten real identities without replacing the audited topology', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('/products');
  const universe = page.locator('[data-task03-universe]');
  await expect(universe).toBeAttached();
  await expect(universe).toHaveAttribute('data-ksu-fallback', 'prefers-reduced-motion');

  const selectors = universe.getByRole('button', { name: /^Show / });
  await expect(selectors).toHaveCount(10);
  const logos = universe.locator('.ksu-rail img');
  await expect(logos).toHaveCount(10);
  const loadingModes = await logos.evaluateAll((images) => images.map((image) => (image as HTMLImageElement).loading));
  expect(loadingModes).toEqual(Array(10).fill('eager'));
  await expect.poll(
    () => logos.evaluateAll((images) => images.every((image) => {
      const img = image as HTMLImageElement;
      return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    })),
    { timeout: 15_000, message: 'all ten recovered product logos should finish loading' },
  ).toBe(true);
  const sources = await logos.evaluateAll((images) => images.map((image) => image.getAttribute('src')));
  expect(new Set(sources).size).toBe(10);

  await expect(page.getByRole('searchbox', { name: 'Search KNOuX products' })).toBeVisible();
  await selectors.filter({ hasText: 'Signal' }).click();
  await expect(universe.locator('.ksu-info-name')).toHaveText('KNOuX Signal');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);

  await universe.screenshot({ path: testInfo.outputPath('software-universe.png') });
});

test('software universe selection resolves Signal and Labs to real routes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/products');
  const universe = page.locator('[data-task03-universe]');
  await expect(universe).toHaveAttribute('data-ksu-fallback', 'prefers-reduced-motion');

  await universe.getByRole('button', { name: 'Show KNOuX Signal' }).click();
  await universe.getByRole('button', { name: 'Open record' }).click();
  await expect(page).toHaveURL(/\/signal$/);

  await page.goto('/products');
  const second = page.locator('[data-task03-universe]');
  await expect(second).toHaveAttribute('data-ksu-fallback', 'prefers-reduced-motion');
  await second.getByRole('button', { name: 'Show KNOuX Quill' }).click();
  await second.getByRole('button', { name: 'Open record' }).click();
  await expect(page).toHaveURL(/\/labs#lab-quill$/);
});
