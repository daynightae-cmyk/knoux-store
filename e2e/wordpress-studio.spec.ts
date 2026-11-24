import { expect, test } from '@playwright/test';

test('Studio preserves the selected journey through reload and browser navigation', async ({ page }) => {
  await page.goto('/wordpress');
  await page.getByRole('link', { name: /Enter WordPress Studio/ }).click();
  const studio = page.getByRole('dialog', { name: 'WordPress Studio', exact: true });
  await expect(studio.locator('[data-wordpress-cockpit]')).toBeVisible();
  const library = studio.getByRole('button', { name: 'WordPress library' });
  await library.click();
  const catalogue = studio.getByRole('dialog', { name: 'WordPress library' });
  await expect(catalogue.getByRole('navigation').getByRole('link', { name: /Blocks/ })).toHaveAttribute('href', '/wordpress/blocks');
  await page.keyboard.press('Escape');
  await expect(library).toBeFocused();

  await studio.getByRole('button', { name: 'Studio journeys' }).click();
  await studio.getByRole('navigation', { name: 'Studio journeys' }).getByRole('button', { name: 'Site Identity' }).click();
  await expect(page).toHaveURL(/#identity$/);
  await expect(studio.getByRole('heading', { name: 'Site Identity', exact: true })).toBeFocused();
  await page.reload();
  await expect(studio.getByRole('heading', { name: 'Site Identity', exact: true })).toBeVisible();
  await page.goBack();
  await expect(studio).toHaveCount(0);
  await page.goForward();
  await expect(studio.getByRole('heading', { name: 'Site Identity', exact: true })).toBeVisible();
  await studio.getByRole('button', { name: 'Preview orbit' }).click();
  await expect(page).toHaveURL(/#studio$/);
  await expect(studio.locator('[data-wordpress-cockpit]')).toBeVisible();
});
