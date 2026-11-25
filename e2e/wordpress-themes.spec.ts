import { expect, test } from '@playwright/test';

test('Theme Explorer selects a live directory result, preserves it on reload, and carries its source into the request', async ({ page }) => {
  await page.goto('/wordpress/themes');
  await expect(page.getByRole('heading', { name: 'Theme Explorer', exact: true })).toBeVisible();
  const marketplace = page.getByRole('region', { name: 'Themes from the WordPress.org directory' });
  const status = marketplace.locator('.mp__status');
  await expect(status).toContainText('Source: WordPress.org');

  const list = marketplace.getByRole('list', { name: 'Themes', exact: true });
  if (!await list.isVisible()) {
    await expect(status).toContainText(/unavailable|Showing 0/i);
    return;
  }
  const results = list.getByRole('button');
  const count = await results.count();
  expect(count).toBeGreaterThan(0);
  const selection = results.nth(count > 1 ? 1 : 0);
  await selection.click();
  await expect(selection).toHaveAttribute('aria-pressed', 'true');
  const details = marketplace.getByRole('complementary', { name: 'Selected theme' });
  const name = await details.getByRole('heading', { level: 4 }).innerText();
  const official = await details.getByRole('link', { name: /Official page/ }).getAttribute('href');
  expect(official).toMatch(/^https:\/\/wordpress\.org\/themes\/[^/]+\/$/);
  const request = new URL((await details.getByRole('link', { name: /Use this theme/ }).getAttribute('href'))!, page.url());
  expect(request.pathname).toBe('/contact');
  expect(request.searchParams.get('items')).toContain(name);
  expect(request.searchParams.get('items')).toContain(official);
  const preview = details.getByRole('link', { name: /Open live preview/ });
  if (await preview.count()) {
    const target = new URL((await preview.getAttribute('href'))!);
    expect(target.protocol).toBe('https:');
    expect(target.hostname).toMatch(/^(?:wp-themes\.com|[a-z0-9-]+\.wordpress\.net)$/i);
  }
  await page.reload();
  await expect(details.getByRole('heading', { level: 4 })).toHaveText(name);

  await marketplace.getByRole('searchbox').fill('Twenty Twenty-Five');
  await marketplace.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=Twenty\+Twenty-Five/);
  await expect(status).toContainText('Source: WordPress.org');
});
