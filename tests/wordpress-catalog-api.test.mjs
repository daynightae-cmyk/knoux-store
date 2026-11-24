import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypeScript } from './load.mjs';

const { GET } = await loadTypeScript('../src/app/api/wordpress/catalog/route.ts');
const endpoint = 'https://store.example/api/wordpress/catalog';

test('catalog search, tag and page are sent to the official directory', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url, init) => {
    const upstream = new URL(url);
    assert.equal(upstream.origin, 'https://api.wordpress.org');
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(upstream.searchParams.get('request[search]'), 'website');
    assert.equal(upstream.searchParams.get('request[tag]'), 'blog');
    assert.equal(upstream.searchParams.get('request[page]'), '2');
    assert.equal(upstream.searchParams.get('request[per_page]'), '1');
    if (upstream.pathname.startsWith('/themes/')) {
      assert.equal(upstream.searchParams.get('action'), 'query_themes');
      return Response.json({
        info: { results: 3, pages: 3 },
        themes: [
          { slug: 'example', name: 'Example', description: 'Real source metadata.', requires: '6.5', preview_url: 'https://wp-themes.com/example/' },
          { slug: 'extra', name: 'This surplus row must be omitted' },
        ],
      });
    }
    assert.equal(upstream.searchParams.get('action'), 'query_plugins');
    return Response.json({ info: { results: 0, pages: 0 }, plugins: [] });
  });

  const suffix = '&search=website&tag=BLOG&page=2&perPage=1';
  const response = await GET(new Request(endpoint + '?kind=theme' + suffix));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const theme = await response.json();
  assert.equal(theme.state, 'ok');
  assert.equal(theme.page, 2);
  assert.equal(theme.totalPages, 3);
  assert.equal(theme.items.length, 1);
  assert.equal(theme.items[0].source, 'wordpress.org');
  assert.equal(theme.items[0].previewUrl, 'https://wp-themes.com/example/');
  assert.equal(theme.items[0].requiresWp, '6.5');

  const plugin = await GET(new Request(endpoint + '?kind=plugin' + suffix));
  assert.equal(plugin.status, 200);
  assert.equal((await plugin.json()).state, 'empty');
  assert.equal(fetch.mock.callCount(), 2);
});

test('invalid requests and cancelled queries do not call WordPress.org', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected upstream call'); });
  for (const query of ['kind=other', 'kind=theme&page=201', 'kind=theme&perPage=25', 'kind=plugin&tag=../../unsafe']) {
    assert.equal((await GET(new Request(endpoint + '?' + query))).status, 400);
  }
  const cancelled = await GET(new Request(endpoint + '?kind=theme', { signal: AbortSignal.abort() }));
  assert.equal(cancelled.status, 503);
  assert.equal(fetch.mock.callCount(), 0);
});

test('a malformed upstream payload is unavailable instead of an empty result', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Source unavailable' }));
  const response = await GET(new Request(endpoint + '?kind=theme'));
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.state, 'unavailable');
  assert.equal(result.totalKnown, false);
  assert.deepEqual(result.items, []);
});
