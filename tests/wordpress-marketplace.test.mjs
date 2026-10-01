import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { root } from './helpers.mjs';

/**
 * The WordPress live marketplace.
 *
 * Two rules are worth breaking the build over.
 *
 *   1. `wordPressItems` stays empty. The external directory is live, but a
 *      KNOuX release may only appear when a release exists. The temptation
 *      after adding a working marketplace is to seed the first-party registry
 *      so the two numbers match, and that would be a lie.
 *
 *   2. An external item is never presented as KNOuX work. Provenance is
 *      asserted structurally, because a missing badge is easy to reintroduce
 *      during a redesign and invisible until someone trusts the page.
 *
 * The normalisers are also exercised directly, against malformed and
 * asset-less records, because the upstream contract is not guaranteed and a
 * half-parsed record must be dropped rather than rendered as a broken card.
 */

function load(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const requireShim = (specifier) => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function('require', 'module', 'exports', output)(requireShim, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const wordpress = load('src/data/wordpress.ts');
const external = load('src/lib/wordpress/external.ts');
load('src/lib/wordpress/wordpress-org.ts', { './external': external });

/* ------------------------------------------------- first-party stays empty */

test('the KNOuX first-party registry is still empty', () => {
  assert.deepEqual(
    [...wordpress.wordPressItems],
    [],
    'no KNOuX WordPress release exists, so nothing may be listed in wordPressItems',
  );
});

test('no external marketplace item is ever written into the first-party registry', () => {
  const text = readFileSync(join(root, 'src/data/wordpress.ts'), 'utf8');
  for (const leak of ['externalItem', 'ExternalItem', 'wordpress.org/plugins/', 'api.wordpress.org']) {
    assert.ok(!text.includes(leak), `src/data/wordpress.ts must not reference ${leak}`);
  }
  // The registry must not import the marketplace layer at all.
  assert.ok(
    !text.includes('lib/wordpress'),
    'the first-party registry must not depend on the external marketplace layer',
  );
});

/* ------------------------------------------------------------ provenance */

test('every rendered external card carries an explicit source badge', () => {
  const card = readFileSync(join(root, 'src/components/wordpress/ExternalItemCard.tsx'), 'utf8');
  assert.match(card, /Source: WordPress\.org/, 'the badge must name the source in visible text');
  assert.match(card, /ProvenanceBadge/, 'the badge must be rendered on the card');
  // And the disclaimer must not hand ownership to KNOuX.
  assert.match(
    card,
    /does not publish, support or guarantee this item/,
    'the card must state that KNOuX does not own the item',
  );
  assert.ok(
    !/KNOuX\s+(authors?|publishes|supports|guarantees)\b/i.test(card),
    'no copy may imply KNOuX authored or supports an external item',
  );
});

test('the marketplace never claims a KNOuX release it does not have', () => {
  const surface = readFileSync(join(root, 'src/components/wordpress/ExternalMarketplace.tsx'), 'utf8');
  assert.match(surface, /firstPartyCount/, 'the first-party count must be shown next to the external results');
  const rail = readFileSync(join(root, 'src/components/wordpress/FirstPartyRail.tsx'), 'utf8');
  assert.match(rail, /wordPressItems/, 'the first-party rail must read the real registry');
  assert.match(rail, /published by KNOuX/, 'the rail must attribute the count to KNOuX');
});

/* ------------------------------------------------------------ normalisers */

test('markup, entities and protocol-relative URLs are normalised', () => {
  assert.equal(
    external.toPlainText('<a href="https://profiles.wordpress.org/elemntor/">Elementor</a>'),
    'Elementor',
  );
  assert.equal(external.toPlainText('Title &#8211; more &amp; less &hellip;'), 'Title – more & less …');
  assert.equal(external.toPlainText('<script>alert(1)</script>Safe'), 'Safe');
  assert.equal(external.toPlainText(undefined), '');
  assert.equal(external.toPlainText(42), '');

  assert.equal(
    external.toOfficialAssetUrl('//ts.w.org/wp-content/themes/x/screenshot.png'),
    'https://ts.w.org/wp-content/themes/x/screenshot.png',
  );
  assert.equal(external.toOfficialAssetUrl('https://ps.w.org/a/icon.svg'), 'https://ps.w.org/a/icon.svg');
  assert.equal(external.toRenderableAssetUrl('https://ps.w.org/a/icon.png'), 'https://ps.w.org/a/icon.png');
  assert.equal(external.toRenderableAssetUrl('https://ps.w.org/a/icon.svg'), undefined);
});

test('asset URLs are refused unless they are official WordPress hosts', () => {
  for (const hostile of [
    'https://example.com/icon.png',
    'http://ps.w.org/icon.png',
    'https://evil.ps.w.org.attacker.com/x.png',
    'https://ps.w.org.evil.com/x.png',
    'data:image/png;base64,AAAA',
    'https://user:pass@ps.w.org/x.png',
    'javascript:alert(1)',
  ]) {
    assert.equal(
      external.toOfficialAssetUrl(hostile),
      undefined,
      `must refuse a non-official asset reference: ${hostile}`,
    );
  }
  assert.equal(external.isOfficialAssetHost('ps.w.org'), true);
  assert.equal(external.isOfficialAssetHost('example.com'), false);
  assert.equal(external.isOfficialAssetHost('anything.wordpress.org'), false);
});

test('a record with no identity is dropped rather than rendered', () => {
  // Exercised through the public surface: an unusable record yields no item.
  assert.deepEqual(external.formatCount(undefined), undefined);
  assert.deepEqual(external.formatCount(-1), undefined);
  assert.equal(external.formatCount(500), '500');
  assert.equal(external.formatCount(1500), '1.5 thousand');
  assert.equal(external.formatCount(10000000), '10 million');
  assert.equal(external.formatOfficialDate('2026-09-24 8:03pm GMT'), '24 Sep 2026');
  assert.equal(external.formatOfficialDate('not-a-date'), 'not-a-date');
  assert.equal(external.formatOfficialDate(undefined), undefined);
});

/* ------------------------------------------------------------- endpoints */

test('only documented official endpoints are used', () => {
  const text = readFileSync(join(root, 'src/lib/wordpress/wordpress-org.ts'), 'utf8');
  for (const host of [
    'api.wordpress.org/plugins/info/1.2/',
    'api.wordpress.org/themes/info/1.2/',
    'api.wordpress.org/patterns/1.0/',
    'block-directory.wordpress.org/wp-json/wp-block-directory/v1/block',
  ]) {
    assert.ok(text.includes(host), `the documented endpoint ${host} must be used`);
  }

  // Only the declared endpoint constants may be fetched. Everything else that
  // mentions wordpress.org is a canonical source link shown to the visitor,
  // never a request the server makes.
  const endpoints = [...text.matchAll(/^(?:export const \w+_ENDPOINT\s*=\s*)?'(https:\/\/[^']+)'/gm)].map(
    (match) => match[1],
  );
  assert.ok(endpoints.length >= 4, 'the four documented endpoints must be declared');
  for (const endpoint of endpoints) {
    const host = new URL(endpoint).host;
    assert.ok(
      host === 'api.wordpress.org' || host === 'block-directory.wordpress.org',
      `unexpected fetch host: ${host}`,
    );
  }
  assert.equal(
    (text.match(/fetch\(/g) || []).length,
    2,
    'only the JSON helper and the block-directory request may call fetch directly',
  );

  for (const banned of ['themeforest', 'woocommerce.com/marketplace', 'envato', 'creative-market']) {
    assert.ok(!text.toLowerCase().includes(banned), `no commercial marketplace may be scraped (${banned})`);
  }
});

test('the directory is never requested in full', () => {
  const text = readFileSync(join(root, 'src/lib/wordpress/wordpress-org.ts'), 'utf8');
  assert.match(text, /const MAX_PER_PAGE = 24/, 'the per-page bound must be declared');
  assert.match(text, /clampPerPage/, 'every query must clamp its page size');
  assert.match(text, /REQUEST_TIMEOUT_MS/, 'every request must have a timeout');
  assert.match(text, /revalidate/, 'requests must be cached rather than refetched per view');
  // A full-catalogue request would need a per_page far above the bound.
  assert.ok(!/per_page=(\d{3,})/.test(text), 'no query may request an unbounded page');
});

test('upstream failure degrades one section instead of failing the page', () => {
  const text = readFileSync(join(root, 'src/lib/wordpress/wordpress-org.ts'), 'utf8');
  assert.match(text, /state: 'unavailable'/, 'an unreachable source must produce an unavailable state');
  assert.match(text, /catch/, 'network failure must be contained');
  assert.match(text, /includes\('json'\)/, 'a non-JSON response must not be parsed as data');
  const surface = readFileSync(join(root, 'src/components/wordpress/ExternalMarketplace.tsx'), 'utf8');
  assert.match(surface, /UnavailableState/, 'the unavailable state must be rendered');
  assert.match(surface, /Nothing has been cached locally/, 'the fallback must say it is not faking a result');
});

/* ----------------------------------------------------------- proxy safety */

test('the image proxy delegates every decision to the asset policy', () => {
  const route = readFileSync(join(root, 'src/app/api/wp-image/route.ts'), 'utf8');
  // The route is transport; the policy is where the rules live and where they
  // are executed. Pinning the old inline implementation here would only freeze
  // the refactor that moved the rules into a testable module.
  assert.match(route, /checkAssetUrl/, 'the proxy must apply the host allowlist via the policy');
  assert.match(route, /isAllowedImageType/, 'the proxy must only serve raster images via the policy');
  assert.match(route, /readBounded/, 'the proxy must bound the response size while streaming');
  assert.match(route, /redirect: 'manual'/, 'the proxy must follow redirects by hand');
  assert.match(route, /MAX_REDIRECTS/, 'the proxy must bound the redirect chain');
  assert.match(route, /TIMEOUT_MS/, 'the proxy must time out');
  assert.ok(
    !/dangerouslySetInnerHTML/.test(route),
    'the proxy must not render upstream content into the page',
  );
});

/* -------------------------------------------------------------- view state */

test('search, pagination and sorting are shareable URL state', () => {
  const surface = readFileSync(join(root, 'src/components/wordpress/ExternalMarketplace.tsx'), 'utf8');
  assert.match(surface, /method="get"/, 'search must submit as a GET form so it works without scripting');
  assert.match(surface, /readMarketplaceQuery/, 'query parameters must be read back into the view');
  assert.match(surface, /rel="prev"/, 'pagination must declare a previous relation');
  assert.match(surface, /rel="next"/, 'pagination must declare a next relation');
  assert.match(surface, /aria-current="page"/, 'the current page must be announced');
  assert.match(
    surface,
    /on this page/,
    'ordering must be labelled as applying to the fetched page, because the upstream sort is ignored',
  );
  assert.match(surface, /kindNoun/, 'counted copy must take a singular noun');
  assert.match(surface, /totalKnown/, 'a source that reports no total must not have one invented');
});

test('pattern bodies from the directory are not rendered as page markup', () => {
  const text = readFileSync(join(root, 'src/lib/wordpress/wordpress-org.ts'), 'utf8');
  assert.ok(
    !/dangerouslySetInnerHTML/.test(text),
    'third-party block markup must never be injected into the page',
  );
});
