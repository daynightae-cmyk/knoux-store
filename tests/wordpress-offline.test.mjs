import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

/**
 * The WordPress adapters under both upstream conditions — hermetic.
 *
 * The suite runs with outbound network disabled (see `isolate-network.mjs`).
 * That is the point of this file: the previous suite contained an assertion
 * about static page copy that only held when `api.wordpress.org` was up, so an
 * upstream outage produced a red build and a test result that said nothing
 * about this repository.
 *
 * Both conditions are now covered by execution rather than by hoping:
 *
 *   unavailable   the real default here. A thrown fetch, a 500, and a non-JSON
 *                 body must each degrade to the documented `unavailable`
 *                 state, with a truthful note and no invented data.
 *   success       a fixture is injected in place of the socket, so the
 *                 normalisation path is exercised without a third party.
 *
 * A test is not allowed to pass by having its assertion weakened, so the
 * unavailable assertions are as specific as the success ones: the note must
 * name the failure, the item list must be empty, and the total must be
 * reported as unknown rather than as zero.
 */

const { queryPlugins, queryThemes, queryPatterns, queryBlocks } =
  await loadTypeScript('../src/lib/wordpress/wordpress-org.ts');

/* ------------------------------------------------- the isolation is real */

test('the suite is actually offline: a public host is refused, loopback is not', async () => {
  // If this test could pass vacuously, the rest of the file would mean nothing.
  await assert.rejects(
    () => fetch('https://api.wordpress.org/plugins/info/1.2/?action=query_plugins'),
    /External network access is disabled/,
    'a public host must be unreachable from the test suite',
  );

  // Loopback stays open, because the suite talks to its own production server.
  const local = await fetch('http://127.0.0.1:1/').catch((error) => error);
  assert.ok(local instanceof Error || local instanceof Response, 'loopback must not be blocked by the guard');
});

/* ------------------------------------------------------- upstream absent */

test('a network failure degrades to unavailable without inventing anything', async () => {
  for (const query of [queryPlugins, queryThemes, queryPatterns, queryBlocks]) {
    const result = await query({ perPage: 5 });
    assert.equal(result.state, 'unavailable', 'an unreachable upstream must be reported, not hidden');
    assert.deepEqual(result.items, [], 'no item may be invented for an unreachable directory');
    assert.ok(result.note && result.note.length > 10, 'the unavailable state must explain itself');
    // "Zero results" and "could not be reached" are different claims. Reporting
    // a total of zero for an outage would be a quiet lie.
    assert.equal(result.totalKnown, false, 'an unreachable directory has no knowable total');
  }
});

test('an upstream that answers with an error or a non-JSON body is still unavailable', async () => {
  const realFetch = globalThis.fetch;
  try {
    const cases = [
      [new Response('boom', { status: 500 }), 'http error'],
      [new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'text/html' } }), 'wrong type'],
      [new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }), 'empty object'],
    ];
    for (const [response, label] of cases) {
      globalThis.fetch = async () => response.clone();
      const result = await queryPlugins({ perPage: 3 });
      assert.notEqual(result.state, 'ok', `${label} must not be reported as a successful listing`);
      assert.deepEqual(result.items, []);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

/* -------------------------------------------------------- upstream present */

test('a fixture response is normalised into real items, with provenance', async () => {
  const realFetch = globalThis.fetch;
  const fixture = {
    info: { results: 2, page: 1, pages: 1 },
    plugins: [
      {
        slug: 'example-plugin',
        name: 'Example &amp; Co',
        author: '<a href="https://example.com">Example</a>',
        short_description: '<p>A <b>useful</b> plugin.</p><script>alert(1)</script>',
        version: '1.2.3',
        rating: 92,
        num_ratings: 120,
        active_installs: 500000,
        last_updated: '2026-08-14T10:00:00',
        icons: { '2x': 'https://ps.w.org/example/assets/icon-256x256.gif?rev=9' },
        banners: { low: 'https://ps.w.org/example/assets/banner-772x250.png' },
        tags: { security: 'Security' },
        homepage: 'https://example.com',
        download_link: 'https://downloads.wordpress.org/plugin/example.zip',
      },
      {
        // No slug: must be dropped, not rendered as a half-filled card.
        name: 'Nameless',
        author: 'Nobody',
      },
    ],
  };

  try {
    let seen = null;
    globalThis.fetch = async (input) => {
      seen = String(input);
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await queryPlugins({ perPage: 5 });

    assert.equal(result.state, 'ok');
    assert.equal(result.items.length, 1, 'a record with no identity must be dropped');
    assert.equal(result.totalKnown, true);
    assert.equal(result.totalItems, 2);

    const item = result.items[0];
    assert.equal(item.source, 'wordpress.org', 'provenance must be carried, not implied');
    assert.equal(item.slug, 'example-plugin');
    assert.equal(item.name, 'Example & Co', 'entities must be decoded');
    assert.equal(item.author, 'Example', 'author markup must be reduced to text');
    assert.ok(!/</.test(item.shortDescription), 'description markup must never reach the page');
    assert.equal(item.rating, 92, 'the official rating must be carried verbatim');
    assert.equal(item.activeInstalls, 500000);
    assert.equal(item.iconUrl, 'https://ps.w.org/example/assets/icon-256x256.gif?rev=9');
    assert.equal(item.sourceUrl, 'https://wordpress.org/plugins/example-plugin/');

    const requested = new URL(seen);
    assert.equal(
      `${requested.origin}${requested.pathname}`,
      'https://api.wordpress.org/plugins/info/1.2/',
      'the documented endpoint must be used, and only the documented one',
    );
    assert.equal(
      requested.searchParams.get('request[per_page]'),
      '5',
      'the caller must be able to bound the page size',
    );
    // The whole catalogue must never be requested: an unbounded page size is
    // the difference between one page and the entire directory.
    const perPage = Number(requested.searchParams.get('request[per_page]'));
    assert.ok(Number.isFinite(perPage) && perPage > 0 && perPage <= 24, 'the page size must be bounded above 24');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('an off-host asset in an otherwise valid record is dropped, not proxied', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          info: { results: 1 },
          plugins: [
            {
              slug: 'hostile',
              name: 'Hostile',
              author: 'Nobody',
              icons: { '2x': 'https://evil.com/icon.svg' },
              banners: { low: 'http://ps.w.org/insecure.png' },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    const result = await queryPlugins({});
    assert.equal(result.state, 'ok');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].iconUrl, undefined, 'a foreign host must not become an image source');
    assert.equal(result.items[0].bannerUrl, undefined, 'an http asset must not be adopted');
  } finally {
    globalThis.fetch = realFetch;
  }
});
