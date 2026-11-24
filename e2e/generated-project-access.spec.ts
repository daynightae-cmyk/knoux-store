import { expect, test } from '@playwright/test';

test('the published Build routes enforce sign-in and same-origin execution', async ({ request, baseURL }) => {
  const status = await request.get('/api/build/generated-projects');
  expect(status.status()).toBe(401);
  expect(status.headers()['cache-control']).toBe('no-store');

  const crossOrigin = await request.post('/api/build/generated-projects', {
    headers: { origin: 'https://untrusted.invalid', 'sec-fetch-site': 'cross-site' },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);

  const signedOut = await request.post('/api/build/generated-projects', {
    headers: { origin: new URL(baseURL!).origin, 'sec-fetch-site': 'same-origin' },
    data: {},
  });
  expect(signedOut.status()).toBe(401);
});

test('production Build hash renders an interactive workspace entry', async ({ page }, info) => {
  await page.goto('/build/#build');
  const workspace = page.getByRole('region', { name: 'Build workspace', exact: true });
  const view = workspace.getByRole('group', { name: 'Workspace view' });
  await view.getByRole('button', { name: 'REGISTRY', exact: true }).click();
  await expect(page.getByRole('group', { name: 'KNOuX products', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('production-build-entry.png') });
});
