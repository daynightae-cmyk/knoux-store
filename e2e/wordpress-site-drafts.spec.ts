import { expect, test } from '@playwright/test';

const endpoint = '/api/wordpress/drafts';
const data = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Draft',
  document: { schema: 1, identity: null, blocks: [], pluginSlugs: [], themeSlug: null },
};

test('anonymous visitors cannot list or create WordPress drafts', async ({ request, baseURL }) => {
  const listing = await request.get(endpoint);
  expect(listing.status()).toBe(401);
  expect(listing.headers()['cache-control']).toBe('no-store');
  const creation = await request.post(endpoint, { data, headers: { origin: new URL(baseURL!).origin } });
  expect(creation.status()).toBe(401);
});

test('a foreign origin cannot submit a draft save', async ({ request }) => {
  const save = await request.put(endpoint, {
    data: { ...data, expectedRevision: 1 },
    headers: { origin: 'https://other.example' },
  });
  expect(save.status()).toBe(403);
  expect(save.headers()['cache-control']).toBe('no-store');
});
