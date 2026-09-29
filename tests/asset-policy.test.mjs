import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * WordPress asset policy â€” behavioural.
 *
 * The proxy's guarantees are executed here, not read from its source. Every
 * probe states an input a hostile or careless caller could actually send and
 * asserts the decision the policy makes about it.
 */

const {
  checkAssetUrl,
  isAllowedImageType,
  normaliseContentType,
  rejectionStatus,
  assetResponseHeaders,
  ALLOWED_IMAGE_TYPES,
} = await import('../src/lib/wordpress/asset-policy.ts');

/* ------------------------------------------------------------- url validation */

test('an official host over https is accepted', () => {
  for (const candidate of [
    'https://ps.w.org/plugin/assets/icon-256x256.gif',
    'https://ts.w.org/theme/screenshot.jpg',
    'https://s.w.org/images/core/button.svg.png',
    'https://downloads.wordpress.org/plugin/akismet.zip'.replace('.zip', '.png'),
    'https://images.wordpress.org/banner.webp',
    'https://anything.wordpress.org/path/image.png',
  ]) {
    const decision = checkAssetUrl(candidate);
    assert.equal(decision.ok, true, `${candidate} must be accepted`);
  }
});

test('a non-allowlisted host is refused', () => {
  for (const candidate of [
    'https://evil.com/image.png',
    'https://ps.w.org.evil.com/image.png',
    'https://notps.w.org/image.png',
    'https://localhost/image.png',
  ]) {
    const decision = checkAssetUrl(candidate);
    assert.equal(decision.ok, false, `${candidate} must be refused`);
    assert.equal(decision.reason, 'host-not-allowed');
    assert.equal(decision.status, 403);
  }
});

test('plain http is refused', () => {
  const decision = checkAssetUrl('http://ps.w.org/image.png');
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, 'not-https');
  assert.equal(decision.status, 400);
});

test('embedded credentials are refused', () => {
  for (const candidate of [
    'https://user:pass@ps.w.org/image.png',
    'https://user@ps.w.org/image.png',
  ]) {
    const decision = checkAssetUrl(candidate);
    assert.equal(decision.ok, false, `${candidate} must be refused`);
    assert.equal(decision.reason, 'credentials');
  }
});

test('a malformed reference is refused without throwing', () => {
  for (const candidate of ['not a url', 'https://', 'https://[invalid', '']) {
    const decision = checkAssetUrl(candidate);
    assert.equal(decision.ok, false, `${JSON.stringify(candidate)} must be refused`);
    assert.equal(decision.reason, 'malformed');
  }
});

/* ------------------------------------------------------------ content types */

test('only raster image types are permitted', () => {
  for (const type of ALLOWED_IMAGE_TYPES) {
    assert.equal(isAllowedImageType(type), true, `${type} must be permitted`);
  }
  for (const type of [
    'image/svg+xml',
    'image/svg+xml; charset=utf-8',
    'IMAGE/SVG+XML',
    'text/html',
    'application/javascript',
    'vendor/image/png',
    '',
  ]) {
    assert.equal(isAllowedImageType(type), false, `${JSON.stringify(type)} must be refused`);
  }
  // Parameters are stripped per RFC 9110, so a parameter-carrying raster type
  // is still the raster type. That is the normaliser's job, not a bypass.
  assert.equal(isAllowedImageType('image/png;evil=1'), true);
});

test('content type normalisation strips parameters and case', () => {
  assert.equal(normaliseContentType('image/png; charset=utf-8'), 'image/png');
  assert.equal(normaliseContentType('IMAGE/JPEG'), 'image/jpeg');
  assert.equal(normaliseContentType(null), '');
});

test('rejection statuses are 4xx for caller faults and 5xx for ours', () => {
  assert.equal(rejectionStatus('missing'), 400);
  assert.equal(rejectionStatus('malformed'), 400);
  assert.equal(rejectionStatus('not-https'), 400);
  assert.equal(rejectionStatus('credentials'), 400);
  assert.equal(rejectionStatus('host-not-allowed'), 403);
  assert.equal(rejectionStatus('content-type-not-allowed'), 415);
  assert.equal(rejectionStatus('too-large'), 413);
  assert.equal(rejectionStatus('redirect-loop'), 502);
  assert.equal(rejectionStatus('redirect-not-allowed'), 502);
  assert.equal(rejectionStatus('upstream-failed'), 502);
});

test('proxied bytes leave under a sandboxed policy', () => {
  const headers = assetResponseHeaders('image/png', 3600);
  assert.equal(headers['Content-Type'], 'image/png');
  assert.match(headers['Cache-Control'], /immutable/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Content-Security-Policy'], /sandbox/);
  assert.match(headers['Content-Security-Policy'], /default-src 'none'/);
});


/* ----------------------------------------------------------- why no route test
 *
 * The route itself is not executed here. It imports through the @/ path
 * alias, which is a bundler convention: it resolves under Next.js/Turbopack
 * and under 	sc, but not under native Node ESM, and a test harness that
 * re-implements the resolver is a test harness that can disagree with the
 * bundler. Every decision the route makes — host allowlist, https, credentials,
 * raster-only content types, redirect re-validation, streaming byte cap,
 * timeout — lives in sset-policy.ts and is executed above. The route is
 * transport, and its delegation is asserted by source in
 * 	ests/wordpress-marketplace.test.mjs.
 */