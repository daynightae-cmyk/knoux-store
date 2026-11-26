import { expect, test } from '@playwright/test';

test('Domain Intelligence reports the registrar configuration and preserves the actual search outcome', async ({ page }) => {
  const statusResponse = await page.request.get('/api/domain/status');
  expect(statusResponse.ok()).toBeTruthy();
  const config = await statusResponse.json() as { status: string };
  await page.goto('/wordpress#domain');
  const stage = page.getByRole('region', { name: 'Domain Intelligence', exact: true });
  const provider = stage.locator('[data-registrar-state]');
  await expect(provider).toHaveAttribute('data-registrar-state', config.status);

  const search = stage.getByRole('button', { name: /Search Domains/ });
  const input = stage.getByRole('textbox', { name: 'Find your domain' });
  await search.click();
  await expect(stage.getByText('Enter a name to search for.', { exact: true })).toBeVisible();
  await input.fill('example.com');
  const result = page.waitForResponse((response) => response.url().includes('/api/domain/search?'));
  await search.click();
  const outcome = await (await result).json();
  if (config.status !== 'configured') {
    expect(outcome.state).toBe('unconfigured');
    await expect(stage.getByText('Provider not configured', { exact: true })).toBeVisible();
    const assist = new URL((await stage.getByRole('link', { name: /Request domain setup/ }).getAttribute('href'))!, page.url());
    expect(assist.pathname).toBe('/contact');
    expect(assist.searchParams.get('items')).toContain('example.com');
    await expect(stage.getByRole('button', { name: /Review registration/ })).toHaveCount(0);
  } else if (outcome.state === 'checked') {
    await expect(stage.getByText('example.com', { exact: true }).first()).toBeVisible();
  } else {
    expect(outcome.state).toBe('error');
    await expect(stage.getByText('Check failed', { exact: true })).toBeVisible();
  }
  await input.fill('example.net');
  await expect(stage.getByText(/Awaiting a query/)).toBeVisible();
});
