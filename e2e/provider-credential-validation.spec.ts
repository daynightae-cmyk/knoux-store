import { expect, test } from '@playwright/test';

const endpoint = '/api/build/provider-os/credentials/validate';
const data = { providerId: 'openai', secret: 'sk-validation-canary' };

test('provider credential validation requires the application origin', async ({ request }) => {
  const response = await request.post(endpoint, { data, headers: { origin: 'https://other.example' } });
  expect(response.status()).toBe(403);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.text()).not.toContain(data.secret);
});

test('same-origin provider credential validation still requires sign-in', async ({ request, baseURL }) => {
  const response = await request.post(endpoint, { data, headers: { origin: new URL(baseURL!).origin } });
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.text()).not.toContain(data.secret);
});
