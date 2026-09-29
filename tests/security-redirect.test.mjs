import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

/**
 * Post-authentication redirect safety — behavioural.
 *
 * These tests execute the actual redirect resolver that the OAuth callback
 * calls. They do not read its source to decide whether it is correct, because a
 * source-text assertion passes just as happily against a function with the
 * wrong behaviour: the previous `safeNext` shipped a `value.startsWith('//')`
 * guard that a source test could confirm while `/\evil.com` walked off-origin
 * at runtime.
 *
 * The threat is concrete. A redirect that leaves the origin converts a
 * successful sign-in into an attacker-chosen destination with the victim's
 * fresh session in hand. Every probe below states a same-origin-looking string
 * that some URL layer resolves off-origin.
 */

const { resolveRedirect, safeRedirectPath, trustedOrigins, DEFAULT_REDIRECT } =
  await import('../src/lib/auth/redirect.ts');

const ORIGIN = 'https://knoux.store';
const origins = new Set([ORIGIN]);

const decide = (candidate) => resolveRedirect(candidate, { origins });

const char = (code) => String.fromCharCode(code);

/**
 * The property under test, stated once: for any input, the URL a browser would
 * actually be sent to must remain on a trusted origin.
 */
function assertStaysOnOrigin(candidate) {
  const decision = decide(candidate);
  const landed = new URL(decision.path, ORIGIN);
  assert.equal(
    landed.origin,
    ORIGIN,
    `${JSON.stringify(candidate)} resolved to ${landed.origin} (reason: ${decision.reason})`,
  );
  return decision;
}

test('a real in-app path is preserved exactly', () => {
  assert.equal(decide('/account').path, '/account');
  assert.equal(decide('/account').ok, true);
  assert.equal(decide('/build').path, '/build');
  assert.equal(decide('/build/pipeline').path, '/build/pipeline');
  assert.equal(decide('/').path, '/');
});

test('a query string is preserved and a fragment is dropped', () => {
  assert.equal(decide('/account?tab=security').path, '/account?tab=security');
  // A fragment never reaches the server, so echoing one is pure attack surface.
  assert.equal(decide('/account#javascript:x').path, '/account');
});

test('protocol-relative and absolute forms are refused', () => {
  for (const candidate of [
    '//evil.com',
    '//evil.com/path',
    '///evil.com',
    'https://evil.com',
    'http://evil.com',
    'https://knoux.store.evil.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:a@b.c',
  ]) {
    const decision = assertStaysOnOrigin(candidate);
    assert.equal(decision.ok, false, `${JSON.stringify(candidate)} must be refused`);
    assert.equal(decision.path, DEFAULT_REDIRECT);
  }
});

test('backslash ambiguity is refused — the bypass that shipped', () => {
  const resolving = new URL('/\\evil.com', ORIGIN);
  assert.equal(
    resolving.origin,
    'https://evil.com',
    'precondition: this shape really does leave the origin once parsed',
  );

  for (const candidate of [
    '/\\evil.com',
    '/\\/evil.com',
    '/\\\\evil.com',
    '\\/evil.com',
    '/build\\..\\..\\evil.com',
  ]) {
    const decision = assertStaysOnOrigin(candidate);
    assert.equal(decision.ok, false, `${JSON.stringify(candidate)} must be refused`);
    assert.equal(decision.reason, 'backslash');
  }
});

test('control characters are refused', () => {
  const probes = [
    '/' + char(0) + '/evil.com',
    '/' + char(9) + '/evil.com',
    '/' + char(10) + '/evil.com',
    '/' + char(13) + '/' + char(10) + '/evil.com',
    '/' + char(1) + '/evil.com',
    '/build' + char(0),
    '/build' + char(127),
    '/build' + char(128),
    '/build' + char(159),
  ];
  for (const candidate of probes) {
    const decision = assertStaysOnOrigin(candidate);
    assert.equal(decision.ok, false, `U+${candidate.charCodeAt(1).toString(16)} probe must be refused`);
    assert.equal(decision.reason, 'control-characters');
  }
});

test('percent-encoded separators are refused, not merely parsed safely', () => {
  // These parse on-origin, so an origin-equality check alone would accept them.
  // They are refused anyway: the first proxy or CDN hop that decodes the path
  // reintroduces `//evil.com`, and the value must be unambiguous at every hop
  // rather than only the first.
  for (const candidate of [
    '/%5cevil.com',
    '/%5Cevil.com',
    '/%2f%2fevil.com',
    '/%2F%2Fevil.com',
    '/%2f%2F%2f%2fevil.com',
    '/search?q=a%2Fb',
  ]) {
    const decision = assertStaysOnOrigin(candidate);
    assert.equal(decision.ok, false, `${JSON.stringify(candidate)} must be refused`);
    assert.equal(decision.reason, 'encoded-separator');
  }
});

test('non-strings, absent values and over-long values fall back', () => {
  assert.equal(decide(null).reason, 'absent');
  assert.equal(decide(undefined).reason, 'absent');
  assert.equal(decide(undefined).path, DEFAULT_REDIRECT);
  assert.equal(decide(42).reason, 'not-a-string');
  assert.equal(decide({ path: '/build' }).reason, 'not-a-string');
  assert.equal(decide(['/build']).reason, 'not-a-string');
  assert.equal(decide('/' + 'a'.repeat(4000)).reason, 'too-long');
});

test('an unparseable candidate falls back instead of throwing', () => {
  for (const candidate of ['/%', '/[', '/ ', '/#', '/?']) {
    assertStaysOnOrigin(candidate);
  }
});

test('the trusted-origin set is built from configuration, not from the candidate', () => {
  const set = trustedOrigins('https://knoux.store', 'https://www.knoux.store, https://preview.vercel.app');
  assert.deepEqual([...set].sort(), [
    'https://knoux.store',
    'https://preview.vercel.app',
    'https://www.knoux.store',
  ]);

  // A configured origin that cannot be parsed is simply not trusted.
  assert.equal(trustedOrigins('https://knoux.store', 'not a url, ,::::').size, 1);
  // Absent configuration still trusts the request origin, so a deployment with
  // no environment set behaves correctly rather than breaking every sign-in.
  assert.deepEqual([...trustedOrigins('https://knoux.store')], ['https://knoux.store']);
});

test('a host outside the trusted set is refused even when it looks related', () => {
  const narrow = new Set(['https://knoux.store']);
  // A redirect to a sibling trusted origin is allowed…
  const wide = new Set(['https://knoux.store', 'https://www.knoux.store']);
  assert.equal(resolveRedirect('/account', { origins: wide }).ok, true);
  // …and a host that merely looks related is not.
  assert.equal(resolveRedirect('//knoux.store.evil.com', { origins: narrow }).ok, false);
  assert.equal(safeRedirectPath('//knoux.store.evil.com', { origins: narrow }), DEFAULT_REDIRECT);
});

test('the same host over http and over https are distinct origins', () => {
  const set = trustedOrigins('http://127.0.0.1:3000');
  assert.equal(resolveRedirect('/account', { origins: set }).ok, true);
  assert.equal(resolveRedirect('//127.0.0.1:3000', { origins: set }).ok, false);
});

test('the OAuth callback routes every target through the shared resolver', () => {
  const callback = readFileSync(join(root, 'src', 'app', 'auth', 'callback', 'route.ts'), 'utf8');
  // The contract is delegation, not the shape of a prefix test. An assertion
  // on a literal `startsWith('//')` passed against the vulnerable version and
  // describes nothing that is true now.
  assert.match(callback, /resolveRedirect\(/, 'the callback must use the shared redirect resolver');
  assert.match(callback, /trustedOrigins\(/, 'the callback must build its origins from configuration');
  assert.doesNotMatch(
    callback,
    /startsWith\('\/\/'\)/,
    'the callback must not re-derive the rule with a raw prefix test',
  );
});
