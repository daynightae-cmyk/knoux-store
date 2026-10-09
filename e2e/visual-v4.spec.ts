import { expect, test } from '@playwright/test';

test('ONE capability paths navigate to actual repository evidence and retain keyboard anatomy', async ({ page }) => {
  await page.goto('/products/knoux-one');
  await page.locator('.product-arrival').waitFor({ state: 'hidden' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/KNOuX\s+ONE/);
  const paths = page.getByRole('navigation', { name: 'ONE capability paths' }).getByRole('link');
  await expect(paths).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    await paths.nth(index).focus();
    await expect(paths.nth(index)).toBeFocused();
    await paths.nth(index).press('Enter');
    await expect(page).toHaveURL(new RegExp(`#knoux-one-capability-${index + 1}$`));
    const evidence = page.locator(`#knoux-one-capability-${index + 1}`);
    await expect(evidence).toBeInViewport();
    await expect(evidence).not.toBeEmpty();
  }
  await expect(page.getByText('Repository evidence · Windows runtime unverified')).toBeAttached();
  const index = page.getByRole('region', { name: 'Product system anatomy node index' });
  const nodes = index.getByRole('button');
  await nodes.first().focus();
  await nodes.first().press('ArrowDown');
  await expect(nodes.nth(1)).toBeFocused();
  await nodes.nth(1).press('Enter');
  await expect(nodes.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await nodes.nth(1).press('Escape');
  await expect(nodes.nth(1)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.store-starfield')).toHaveCount(1);
});

test('open connection lanes preserve explicit fixture boundaries and refuse live authorisation', async ({ page }) => {
  await page.goto('/command/connections');
  await expect(page.getByText(/This is an explicitly selected DEMO\/FIXTURE workspace/)).toBeVisible();
  const authorise = page.getByRole('button', { name: 'Authorise', exact: true });
  expect(await authorise.count()).toBeGreaterThan(0);
  for (const button of await authorise.all()) await expect(button).toBeDisabled();
  await page.getByRole('button', { name: 'Configure', exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Configure the provider app' })).toBeVisible();
  await expect(page.locator('.store-starfield')).toHaveCount(1);
});
