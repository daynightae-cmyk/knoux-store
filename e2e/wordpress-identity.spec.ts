import { expect, test } from '@playwright/test';

test('Site Identity validates and restores the same draft, page and modules after reload', async ({ page }) => {
  await page.goto('/wordpress#identity');
  const studio = page.getByRole('dialog', { name: 'WordPress Studio' });
  const identity = studio.getByRole('region', { name: 'Site Identity Setup' });
  const save = identity.getByRole('button', { name: 'Save draft' });
  await expect(identity.getByRole('navigation', { name: 'Preview pages' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);

  await save.click();
  const brand = page.getByRole('dialog', { name: 'Brand Controls' });
  await expect(brand.getByRole('alert')).toHaveText('Enter a brand name to save the draft.');
  const name = brand.getByRole('textbox', { name: 'Brand name' });
  await expect(name).toBeFocused();
  await name.fill('Orbital Lab QA');
  await brand.getByRole('textbox', { name: 'Tagline' }).fill('Draft preview QA');
  await brand.getByRole('button', { name: 'Leading' }).click();
  await page.keyboard.press('Escape');
  await expect(brand).toBeHidden();
  await expect(save).toBeFocused();
  await expect(identity.locator('[data-placement]')).toHaveAttribute('data-placement', 'start');
  await expect(identity.getByText('Draft preview QA')).toBeVisible();

  const structureTrigger = identity.getByRole('button', { name: 'Page Structure' });
  await structureTrigger.click();
  const structure = page.getByRole('dialog', { name: 'Page Structure' });
  await structure.getByRole('button', { name: 'About', exact: true }).click();
  await structure.getByRole('button', { name: 'Features', exact: true }).click();
  await structure.getByRole('button', { name: 'Close' }).click();
  await expect(structureTrigger).toBeFocused();

  const about = identity.getByRole('navigation', { name: 'Preview pages' }).getByRole('button', { name: 'About', exact: true });
  await about.click();
  await expect(about).toHaveAttribute('aria-current', 'page');
  await save.click();
  await expect(identity.getByRole('status')).toHaveText('Identity draft saved in this tab.');
  await page.reload();
  await expect(about).toHaveAttribute('aria-current', 'page');
  await expect(identity.getByText('Draft preview QA')).toBeVisible();
  await expect(identity.getByRole('list', { name: 'Modules in the draft' })).toContainText('Features');

  await identity.getByRole('button', { name: 'Inspector', exact: true }).click();
  const inspector = page.getByRole('dialog', { name: 'Inspector' });
  const request = inspector.getByRole('link', { name: /Request this identity/ });
  const href = new URL((await request.getAttribute('href'))!, page.url());
  expect(href.pathname).toBe('/contact');
  expect(href.searchParams.get('items')).toContain('name: Orbital Lab QA');
  expect(href.searchParams.get('items')).toContain('pages: Home, About');
});
