import { expect, test } from '@playwright/test';

test('Composer applies, reorders, saves and includes real sections in a project request', async ({ page }) => {
  await page.goto('/wordpress#launch');
  const composer = page.getByRole('region', { name: 'Visual Website Composer', exact: true });
  const canvas = composer.getByRole('region', { name: 'Composed preview' });
  const gallery = canvas.locator('[data-type="gallery"]');
  const undo = composer.getByRole('button', { name: 'Undo', exact: true });

  await expect(composer.getByRole('dialog')).toHaveCount(0);
  await expect(undo).toBeDisabled();
  const components = composer.getByRole('button', { name: 'Components', exact: true });
  await components.click();
  await composer.getByRole('dialog', { name: 'Components' }).getByRole('button', { name: /Gallery/ }).click();
  await page.keyboard.press('Escape');
  await expect(components).toBeFocused();
  await expect(gallery).toBeVisible();

  await undo.click();
  await expect(gallery).toHaveCount(0);
  await composer.getByRole('button', { name: 'Redo', exact: true }).click();
  await gallery.click();
  await composer.getByRole('button', { name: 'Inspector', exact: true }).click();
  await composer.getByRole('dialog', { name: 'Inspector' }).getByRole('button', { name: 'End', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(gallery).toHaveCSS('align-items', 'flex-end');

  await composer.getByRole('button', { name: 'Layers', exact: true }).click();
  await composer.getByRole('dialog', { name: 'Layers' }).getByRole('listitem').filter({ hasText: 'Gallery' }).getByRole('button', { name: 'Move up' }).click();
  await page.keyboard.press('Escape');
  await expect(canvas.locator('[data-type]').last()).not.toHaveAttribute('data-type', 'gallery');

  await composer.getByRole('button', { name: 'Request this layout' }).click();
  const request = composer.getByRole('dialog', { name: 'Project scope' }).getByRole('link', { name: /Request these|Start a WordPress request/i });
  const href = new URL((await request.getAttribute('href'))!, page.url());
  expect(href.pathname).toBe('/contact');
  expect(href.searchParams.get('items')).toContain('gallery (end');
  await page.reload();
  await expect(gallery).toHaveCSS('align-items', 'flex-end');
});
