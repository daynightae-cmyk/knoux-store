import { expect, test } from '@playwright/test';

test('Build hub links to the real platform and preserves workspace entry in browser history', async ({ page }) => {
  await page.goto('/build');
  const hub = page.getByRole('region', { name: 'Welcome to KNOUX STORE' });
  const platform = hub.getByRole('navigation', { name: 'Build platform' });
  await expect(platform.getByRole('link', { name: 'Verification pipeline' })).toHaveAttribute('href', '/build/pipeline');
  const destinations = hub.getByRole('navigation', { name: 'Build destinations' });
  await expect(destinations.getByRole('link', { name: 'Providers' })).toHaveAttribute('href', '/build/providers');
  await expect(destinations.getByRole('link', { name: 'Models' })).toHaveAttribute('href', '/build/ai/models');
  await expect(destinations.getByRole('link', { name: 'Deployments' })).toHaveAttribute('href', '/build/deployments');

  await platform.getByRole('link', { name: 'One Platform' }).click();
  await expect(page).toHaveURL(/\/build\/platform$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goBack();
  await hub.getByRole('button', { name: /enter the engineering workspace/ }).click();
  await expect(page).toHaveURL(/\/build#workspace$/);
  const workspace = page.getByRole('region', { name: 'Build workspace' });
  await expect(workspace).toBeFocused();
  await page.reload();
  await expect(workspace.getByRole('group', { name: 'Workspace view' })).toBeVisible();
  await page.goBack();
  await expect(hub).toBeVisible();
});
