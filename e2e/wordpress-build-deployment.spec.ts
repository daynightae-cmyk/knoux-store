import { expect, test } from '@playwright/test';

test('WordPress build scope carries the selected target without creating a release', async ({ page }) => {
  await page.goto('/wordpress#build');
  const stage = page.getByRole('region', { name: 'Build and Deployment Experience' });
  await stage.getByRole('list', { name: 'Pipeline order' }).getByRole('button', { name: /Deploy/ }).click();
  await expect(stage.getByRole('listitem').filter({ hasText: 'DNS and TLS verified' })).toBeVisible();
  await stage.getByRole('button', { name: /Staging/ }).click();
  await expect(stage.getByText('No execution requested from this studio.', { exact: true })).toBeVisible();
  const request = stage.getByRole('link', { name: /Request a build/ });
  const href = new URL((await request.getAttribute('href'))!, page.url());
  expect(href.pathname).toBe('/contact');
  expect(href.searchParams.get('items')).toContain('target: Staging; review stage: Deploy');

  await stage.getByRole('link', { name: /Real deployment receipts/ }).click();
  await expect(page).toHaveURL(/\/build\/deployments$/);
  await expect(page.getByRole('heading', { name: 'Deployments', exact: true })).toBeVisible();
  const build = page.getByRole('list', { name: 'Release progression' }).getByRole('listitem').filter({ has: page.getByText('Build', { exact: true }) });
  await expect(build).toHaveAttribute('data-state', 'unknown');
  await expect(build.getByText('NOT RUN', { exact: true })).toBeVisible();
});
