import { expect, test } from '@playwright/test';

test('Starter layouts and blocks add real sections to the same composer draft', async ({ page }) => {
  await page.goto('/wordpress/starter-sites');
  const library = page.getByRole('region', { name: 'Studio layout library' });
  const preview = library.getByRole('region', { name: 'Layout preview' });
  const layout = library.getByRole('button', { name: 'Contact layout' });
  await layout.click();
  await expect(layout).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.locator('[data-type=contact]')).toBeVisible();
  await library.getByRole('button', { name: 'Add to draft' }).click();
  await expect(library.getByRole('status')).toHaveCount(0);
  await library.getByRole('button', { name: 'Confirm addition' }).click();
  await expect(library.getByRole('status')).toHaveText('Added to your composer draft.');

  await library.getByRole('link', { name: 'Blocks', exact: true }).click();
  await expect(page).toHaveURL(/\/wordpress\/blocks$/);
  await library.getByRole('button', { name: 'Gallery', exact: true }).click();
  await expect(preview.locator('[data-type=gallery]')).toBeVisible();
  await library.getByRole('button', { name: 'Add to draft' }).click();
  await library.getByRole('button', { name: 'Confirm addition' }).click();
  await expect(library.getByRole('status')).toHaveText('Added to your composer draft.');
  await library.getByRole('button', { name: 'Undo addition' }).click();
  await expect(library.getByRole('status')).toHaveText('The addition was undone.');
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('knoux-wp-composer-draft') ?? '[]').map((block: { type: string }) => block.type))).toEqual(['hero', 'text', 'contact']);
  await library.getByRole('button', { name: 'Add to draft' }).click();
  await library.getByRole('button', { name: 'Confirm addition' }).click();
  await library.getByRole('link', { name: /Open composer/ }).click();
  await expect(page).toHaveURL(/\/wordpress#launch$/);

  const composer = page.getByRole('region', { name: 'Visual Website Composer' });
  await expect(composer.locator('[data-type=hero]')).toHaveCount(1);
  await expect(composer.locator('[data-type=contact]')).toHaveCount(1);
  await expect(composer.locator('[data-type=gallery]')).toHaveCount(1);
  await page.reload();
  await expect(composer.locator('[data-type=contact]')).toHaveCount(1);
  await expect(composer.locator('[data-type=gallery]')).toHaveCount(1);
});
