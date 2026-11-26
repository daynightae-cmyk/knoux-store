import { expect, test } from '@playwright/test';

test('Plugin Intelligence selects a directory result and scopes an installation request from its tray', async ({ page }) => {
  await page.goto('/wordpress/plugins');
  await expect(page.getByRole('heading', { name: 'Plugin Intelligence', exact: true })).toBeVisible();
  const market = page.getByRole('region', { name: 'Plugins from the WordPress.org directory' });
  await expect(market.getByRole('status')).toContainText('Source: WordPress.org');
  const list = market.getByRole('list', { name: 'Plugins', exact: true });
  if (!await list.isVisible()) {
    await expect(market.getByRole('status')).toContainText(/unavailable|Showing 0/i);
    return;
  }
  const results = list.getByRole('listitem');
  const result = results.nth(await results.count() > 1 ? 1 : 0);
  await result.getByRole('button').first().click();
  const details = market.getByRole('complementary', { name: 'Selected plugin' });
  const name = await details.getByRole('heading', { level: 4 }).innerText();
  await expect(details.getByRole('link', { name: /Official page/ })).toHaveAttribute('href', /^https:\/\/wordpress\.org\/plugins\//);
  const tray = page.getByRole('dialog', { name: 'Selection tray' });
  await expect(tray).toBeHidden();

  await result.getByRole('button', { name: /Add .* to the selection tray/ }).click();
  await expect(tray).toBeHidden();
  const trigger = market.getByRole('button', { name: 'Review selected plugins (1)' });
  await trigger.click();
  await expect(tray.getByRole('list', { name: 'Selected plugins' })).toContainText(name);
  const request = new URL((await tray.getByRole('link', { name: /Request this set/ }).getAttribute('href'))!, page.url());
  expect(request.pathname).toBe('/contact');
  expect(request.searchParams.get('items')).toContain(name);
  expect(request.searchParams.get('items')).toContain('https://wordpress.org/plugins/');
  await page.keyboard.press('Escape');
  await expect(tray).toBeHidden();
  await expect(trigger).toBeFocused();
});
