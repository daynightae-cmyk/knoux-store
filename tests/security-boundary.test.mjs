import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, codeOnly } from './helpers.mjs';
import { loadTypeScript } from './load.mjs';

/**
 * Transport, boundary and media policy â€” behavioural.
 *
 * Each block below executes the module that makes the decision, rather than
 * asserting that a source file mentions a keyword. The distinction is not
 * pedantry: the previous OAuth guard satisfied a source-text test while
 * `/\evil.com` resolved off-origin at runtime, so a green test in this
 * repository was demonstrably not evidence of the property it appeared to
 * cover.
 */

const {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} = (await loadTypeScript('../src/lib/security/headers.ts'));

const { evaluateBuildAccess, authorizeBuildAccess, BUILD_API_DENIED } = (await loadTypeScript('../src/lib/build/deployment.ts'));
const { guardBuildApi } = (await loadTypeScript('../src/lib/build/api-guard.ts'));
const { clientAddress, rateLimit, resetRateLimits } = (await loadTypeScript('../src/lib/http/rate-limit.ts'));

const { resolveDeploymentEnvironment } = (await loadTypeScript('../src/lib/build/deployment.ts'));

const {
  ALLOWED_IMAGE_TYPES,
  assetResponseHeaders,
  checkAssetUrl,
  isAllowedImageType,
  normaliseContentType,
} = (await loadTypeScript('../src/lib/wordpress/asset-policy.ts'));

const {
  MAX_BODY_BYTES,
  checkDeclaredLength,
  checkRequestOrigin,
  intakeRateLimit,
  readBoundedJson,
} = (await loadTypeScript('../src/lib/contact/intake-guard.ts'));

const headerMap = (headers) => Object.fromEntries(headers.map((h) => [h.key.toLowerCase(), h.value]));

/* ================================================================== F-01 */

test('every required security header is present in production', () => {
  const map = headerMap(buildSecurityHeaders({ isDevelopment: false, canonicalOrigin: 'https://knoux.store' }));

  for (const required of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
    'permissions-policy',
  ]) {
    assert.ok(map[required], `production must send ${required}`);
  }
  assert.equal(map['x-content-type-options'], 'nosniff');
  assert.equal(map['x-frame-options'], 'SAMEORIGIN');
  assert.match(map['strict-transport-security'], /max-age=\d{7,}/);
});

test('HSTS is withheld on a development server, which is served over http', () => {
  const map = headerMap(buildSecurityHeaders({ isDevelopment: true, canonicalOrigin: 'https://knoux.store' }));
  // Pinning localhost to https in a developer's own browser profile is a
  // self-inflicted outage, and HSTS is meaningless without a real origin.
  assert.equal(map['strict-transport-security'], undefined);
});

test('the CSP forbids plugins, cross-origin framing and form posts', () => {
  const csp = buildContentSecurityPolicy({ isDevelopment: false });
  const directive = (name) => {
    const found = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `) || part === name);
    assert.ok(found, `CSP must declare ${name}`);
    return found;
  };

  assert.equal(directive('object-src'), "object-src 'none'");
  assert.equal(directive('frame-ancestors'), "frame-ancestors 'self'");
  assert.equal(directive('base-uri'), "base-uri 'self'");
  assert.equal(directive('form-action'), "form-action 'self'");
  assert.equal(directive('default-src'), "default-src 'self'");
  assert.ok(csp.includes('upgrade-insecure-requests'), 'production must upgrade insecure requests');
});

test("'unsafe-eval' is a development-only allowance", () => {
  const production = buildContentSecurityPolicy({ isDevelopment: false });
  const development = buildContentSecurityPolicy({ isDevelopment: true });
  // React uses eval in development to rebuild server stack traces in the
  // browser. Shipping that escape hatch to production removes the main thing
  // script-src exists to prevent.
  assert.ok(!production.includes('unsafe-eval'), 'production CSP must not contain unsafe-eval');
  assert.ok(development.includes('unsafe-eval'), 'development CSP must allow unsafe-eval');
});

test('the CSP is built from what the site actually loads', () => {
  const csp = buildContentSecurityPolicy({ isDevelopment: false });

  // System font stack only: no next/font, no @font-face, no webfont host.
  assert.match(csp, /font-src 'self' data:/);
  assert.ok(!/fonts\.(googleapis|gstatic)/.test(csp), 'no webfont host may be permitted');

  // Every third-party image is fetched server-side and served same-origin
  // through /api/wp-image, so no image host is needed client-side.
  assert.match(csp, /img-src 'self' blob: data:/);

  // The Supabase project is the one outbound call the bundle makes.
  assert.ok(csp.includes('supabase.co'), 'the Supabase project must be reachable');
  assert.ok(csp.includes('wss://'), 'Supabase realtime needs a websocket origin');
});

test('the Next config declares the headers and does not advertise the framework', () => {
  // Next.js 16 migrates `next.config.ts` to `next.config.mjs` on first run, so
  // the assertion follows whichever file the toolchain settled on rather than
  // pinning a filename the framework owns.
  const candidates = ['next.config.mjs', 'next.config.ts'].map((name) => join(root, name));
  const path = candidates.find((candidate) => existsSync(candidate));
  assert.ok(path, 'a Next config must exist');

  const config = readFileSync(path, 'utf8');
  assert.match(config, /poweredByHeader:\s*false/, 'X-Powered-By must be disabled');
  assert.match(config, /buildSecurityHeaders/, 'headers must come from the shared policy');
  assert.match(config, /async headers\(\)/, 'a headers block must exist');
});

/* ================================================================== F-14 */

test('the environment is derived once and identically for every route', () => {
  // The four routes that hard-coded `production` and the one that derived from
  // VERCEL_ENV disagreed; the fix is one derivation, not five.
  const production = { VERCEL_ENV: 'production' };
  const preview = { VERCEL_ENV: 'preview' };
  const local = { VERCEL_ENV: 'development' };

  assert.equal(resolveDeploymentEnvironment(production), 'production');
  assert.equal(resolveDeploymentEnvironment(preview), 'preview');
  assert.equal(resolveDeploymentEnvironment(local), 'local');
  assert.equal(resolveDeploymentEnvironment({}), 'local');
  assert.equal(resolveDeploymentEnvironment({ NODE_ENV: 'production' }), 'production');
});

test('an operator override is honoured but a typo cannot invent an environment', () => {
  assert.equal(resolveDeploymentEnvironment({ KNOUX_BUILD_ENVIRONMENT: 'preview' }), 'preview');
  // A misspelled override falls through to the real sources rather than
  // producing a fourth environment nothing else understands.
  assert.equal(resolveDeploymentEnvironment({ KNOUX_BUILD_ENVIRONMENT: 'prod', VERCEL_ENV: 'production' }), 'production');
  assert.equal(resolveDeploymentEnvironment({ KNOUX_BUILD_ENVIRONMENT: 'nonsense' }), 'local');
});

test('no route may take its environment from a request', () => {
  for (const route of ['project', 'file', 'git', 'environment', 'providers', 'verify']) {
    const source = readFileSync(join(root, 'src', 'app', 'api', 'build', route, 'route.ts'), 'utf8');
    assert.doesNotMatch(
      source,
      /environment:\s*'(production|preview|local)'/,
      `/api/build/${route} must not hard-code an environment`,
    );
    assert.doesNotMatch(
      source,
      /searchParams\.get\(['"]environment['"]\)|body\.environment/,
      `/api/build/${route} must not read an environment from the request`,
    );
  }
});

/* ================================================================== F-03 */

test('a public deployment refuses an anonymous workspace read', () => {
  const access = evaluateBuildAccess({ VERCEL_ENV: 'production' });
  assert.equal(access.allowed, false);
  assert.equal(access.status, 401);
  assert.equal(access.code, BUILD_API_DENIED);
  assert.match(access.message, /Sign in/i);
});

test('a verified hosted session may read the workspace', () => {
  for (const VERCEL_ENV of ['production', 'preview']) {
    const env = { VERCEL_ENV };
    assert.equal(authorizeBuildAccess(env, null).allowed, false);
    assert.deepEqual(authorizeBuildAccess(env, 'verified-user'), {
      allowed: true, reason: 'authenticated', userId: 'verified-user',
    });
  }
});

test('the HTTP guard checks hosted sessions before refusing access', async () => {
  resetRateLimits();
  const request = new Request('https://knoux.store/api/build/project');
  for (const VERCEL_ENV of ['production', 'preview']) {
    let calls = 0;
    const options = { scope: `project-${VERCEL_ENV}`, env: { VERCEL_ENV } };
    const allowed = await guardBuildApi(request, {
      ...options,
      session: async () => { calls += 1; return { id: 'verified-user' }; },
    });
    assert.equal(allowed, null, `${VERCEL_ENV} must accept a verified user`);
    assert.equal(calls, 1);

    const refused = await guardBuildApi(request, { ...options, session: async () => null });
    assert.equal(refused?.status, 401);
    assert.equal((await refused.json()).error, BUILD_API_DENIED);
    const unavailable = await guardBuildApi(request, { ...options, session: async () => { throw new Error('offline'); } });
    assert.equal(unavailable?.status, 401);
  }
  resetRateLimits();
});

test('a local checkout stays usable without an account', () => {
  // Requiring a sign-in to read your own machine would be security theatre.
  const access = evaluateBuildAccess({ VERCEL_ENV: 'development' });
  assert.equal(access.allowed, true);
  assert.equal(access.reason, 'local-checkout');
});

test('a preview deployment is treated as public, not as a trusted dev box', () => {
  const access = evaluateBuildAccess({ VERCEL_ENV: 'preview' });
  assert.equal(access.allowed, false, 'a preview URL is reachable by anyone with the link');
  assert.equal(access.status, 401);
});

test('anonymous access is only ever granted by the one explicit opt-in', () => {
  assert.equal(evaluateBuildAccess({ VERCEL_ENV: 'production', KNOUX_BUILD_PUBLIC: '1' }).allowed, true);

  // A near-miss must not count as the opt-in.
  for (const nearMiss of ['true', '', '0', 'yes', 'KNOUX_BUILD_PUBLIC']) {
    const access = evaluateBuildAccess({ VERCEL_ENV: 'production', KNOUX_BUILD_PUBLIC: nearMiss });
    assert.equal(access.allowed, false, `${JSON.stringify(nearMiss)} must not grant anonymous access`);
  }
});

test('the guard is wired to the policy and fails closed on an unreachable identity provider', () => {
  const code = codeOnly(readFileSync(join(root, 'src', 'lib', 'build', 'api-guard.ts'), 'utf8'));
  // An identity provider that cannot be reached is not an authenticated
  // visitor. Failing open here would make every outage a full disclosure.
  assert.match(code, /evaluateBuildAccess\(/, 'the guard must ask the policy');
  assert.match(code, /catch\s*\{\s*user = null;\s*\}/, 'a failed session lookup must fail closed');
  assert.match(code, /status: 401/, 'a denial must be a 401');
});

test('every workspace route asks the guard before touching the project', () => {
  for (const route of ['project', 'file', 'git', 'environment', 'providers', 'verify']) {
    const source = readFileSync(join(root, 'src', 'app', 'api', 'build', route, 'route.ts'), 'utf8');
    assert.match(source, /guardBuildApi\(/, `/api/build/${route} must call the workspace guard`);
    // Every route that needs the adapter gets it from the one factory; the one
    // route that does not need an adapter still derives its environment from
    // the one source.
    assert.match(
      source,
      /createProjectAdapter\(|resolveDeploymentEnvironment\(/,
      `/api/build/${route} must use the shared adapter/environment factory`,
    );
  }
});

test('every bridge route guards before identifying the owner, and never mints without both', () => {
  for (const route of ['bridge/pair', 'bridge/status', 'bridge/ticket', 'exec']) {
    const source = readFileSync(join(root, 'src', 'app', 'api', 'build', route, 'route.ts'), 'utf8');
    const code = codeOnly(source);
    assert.match(code, /guardBuildApi\(/, `/api/build/${route} must call the workspace guard`);
    assert.match(code, /resolveBuildOwnerId\(/, `/api/build/${route} must resolve the owner`);
    const guardAt = code.indexOf('guardBuildApi(');
    const ownerAt = code.indexOf('resolveBuildOwnerId(');
    assert.ok(
      guardAt >= 0 && guardAt < ownerAt,
      `/api/build/${route} must guard before identifying the owner`,
    );
  }
});

test('the ticket route mints terminal scope only, with a 60 second life', () => {
  const source = readFileSync(join(root, 'src', 'app', 'api', 'build', 'bridge', 'ticket', 'route.ts'), 'utf8');
  const code = codeOnly(source);
  // String literals are stripped from `code`, so the scope names — the exact
  // thing this test pins down — are asserted against the raw source.
  assert.match(source, /scopesForAction\('terminal:open'\)/, 'the ticket must be terminal-scoped');
  assert.doesNotMatch(source, /scopesForAction\('exec/, 'the ticket must not carry exec scope');
  assert.doesNotMatch(source, /scopesForAction\('fs:/, 'the ticket must not carry filesystem scope');
  // Lifetime is enforced by the minter, but the route must not ask for more.
  assert.doesNotMatch(code, /ttlSeconds/, 'the route must not override the ticket lifetime');
  // The signing key never appears here: minting takes the loaded keys, and the
  // raw key material stays in the server-only loader.
  assert.doesNotMatch(code, /KNOUX_BRIDGE_SIGNING_KEY/, 'the route must not touch key material');
});

test('the expensive project scan is cached rather than repeated per request', () => {
  const source = readFileSync(join(root, 'src', 'app', 'api', 'build', 'project', 'route.ts'), 'utf8');
  assert.match(source, /withShortCache\(/, 'the project snapshot must be served from a short cache');
});

test('rate limiting bounds a burst and reports how long to wait', () => {
  resetRateLimits();
  const now = 1_000_000;
  for (let i = 0; i < 30; i += 1) {
    assert.equal(rateLimit('burst', { max: 30, now }).allowed, true, `request ${i} should pass`);
  }
  const blocked = rateLimit('burst', { max: 30, now });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0, 'a refusal must say when to retry');

  // A different address has its own budget: the limiter bounds work, it does
  // not identify a person.
  assert.equal(rateLimit('other', { max: 30, now }).allowed, true);
  resetRateLimits();
});

test('the client address is treated as a bucket key, never as identity', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' });
  assert.equal(clientAddress(headers), '203.0.113.7');
  assert.equal(clientAddress(new Headers({ 'x-real-ip': '198.51.100.4' })), '198.51.100.4');
  assert.equal(clientAddress(new Headers()), 'unknown');
  // An unbounded header must not become an unbounded map key.
  assert.equal(clientAddress(new Headers({ 'x-forwarded-for': 'a'.repeat(5000) })).length, 64);
});

test('a spray of fresh addresses cannot grow the rate-limit map without bound', () => {
  resetRateLimits();
  for (let i = 0; i < 4100; i += 1) {
    assert.equal(rateLimit(`spray-${i}`, { max: 1, now: 3_000_000 }).allowed, i < 4096);
  }
  // Existing callers keep their budget; a sprayed key must not reset it.
  assert.equal(rateLimit('spray-0', { max: 1, now: 3_000_000 }).allowed, false);
  assert.equal(rateLimit('spray-4099', { max: 1, now: 3_000_000 }).allowed, false);
  assert.equal(rateLimit('spray-4099', { max: 1, now: 3_060_001 }).allowed, true);
  resetRateLimits();
});

/* ================================================================== F-04 */

test('the image proxy allows only official WordPress hosts over https', () => {
  for (const host of ['ps.w.org', 'ts.w.org', 'downloads.wordpress.org', 'images.wordpress.org']) {
    const check = checkAssetUrl(`https://${host}/some/icon.gif`);
    assert.equal(check.ok, true, `${host} must be allowed`);
  }
});

test('the image proxy refuses every off-origin shape', () => {
  const cases = [
    ['https://evil.com/x.png', 'host-not-allowed'],
    ['https://ps.w.org.evil.com/x.png', 'host-not-allowed'],
    ['http://ps.w.org/x.png', 'not-https'],
    ['ftp://ps.w.org/x.png', 'not-https'],
    ['https://user:pass@ps.w.org/x.png', 'credentials'],
    ['https://user@ps.w.org/x.png', 'credentials'],
    ['not a url', 'malformed'],
    ['', 'malformed'],
  ];
  for (const [candidate, reason] of cases) {
    const check = checkAssetUrl(candidate);
    assert.equal(check.ok, false, `${candidate} must be refused`);
    assert.equal(check.reason, reason, `${candidate} must be refused as ${reason}`);
  }
});

test('SVG is never served from this origin, whatever it is labelled', () => {
  // The threat: an SVG opened top-level runs script on knoux.store. The
  // allowlist is the control, and it is enforced on the declared type.
  for (const header of [
    'image/svg+xml',
    'image/svg+xml; charset=utf-8',
    'IMAGE/SVG+XML',
    'image/svg+xml;charset=UTF-8',
  ]) {
    assert.equal(isAllowedImageType(header), false, `${header} must be refused`);
  }
  assert.ok(!ALLOWED_IMAGE_TYPES.includes('image/svg+xml'));
});

test('the content-type check is an allowlist, not a blocklist', () => {
  for (const header of ['image/png', 'image/png; charset=binary', 'IMAGE/JPEG', 'image/gif', 'image/webp', 'image/avif']) {
    assert.equal(isAllowedImageType(header), true, `${header} must be allowed`);
  }
  for (const header of [
    'text/html',
    'application/javascript',
    'application/octet-stream',
    'image/svg+xml',
    'application/xhtml+xml',
    'video/mp4',
    null,
    '',
  ]) {
    assert.equal(isAllowedImageType(header), false, `${header} must be refused`);
  }
  assert.equal(normaliseContentType('IMAGE/SVG+XML; charset=utf-8'), 'image/svg+xml');
});

test('proxied bytes carry a policy that neutralises script even if the type is wrong', () => {
  const headers = assetResponseHeaders('image/png', 3600);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Content-Security-Policy'], "default-src 'none'; sandbox; frame-ancestors 'none'");
  assert.equal(headers['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.match(headers['Cache-Control'], /max-age=\d+/);
});

test('the proxy re-validates redirect targets instead of following them', () => {
  const source = readFileSync(join(root, 'src', 'app', 'api', 'wp-image', 'route.ts'), 'utf8');
  // A default-follow fetch resolves the whole chain before the allowlist is
  // consulted, so the allowlist would only ever have covered the first URL.
  assert.match(source, /redirect:\s*'manual'/, 'redirects must be followed manually');
  assert.match(source, /checkAssetUrl\(/, 'every hop must be re-checked against the allowlist');
  assert.match(source, /isAllowedImageType\(/, 'the response type must be checked');
});

test('the byte cap is enforced while the body streams', () => {
  const code = codeOnly(readFileSync(join(root, 'src', 'app', 'api', 'wp-image', 'route.ts'), 'utf8'));
  assert.match(code, /getReader\(\)/, 'the body must be read incrementally');
  assert.match(code, /reader\.cancel\(\)/, 'an oversized stream must be cancelled, not drained');
  // Buffering the whole body and comparing lengths afterwards bounds the
  // response but not the memory.
  assert.doesNotMatch(code, /arrayBuffer\(\)/, 'buffering the whole body first defeats the cap');
});

/* ================================================================== F-06 */

test('a cross-site browser request cannot post to the intake endpoint', () => {
  const own = 'https://knoux.store';
  assert.equal(checkRequestOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), own).ok, true);
  assert.equal(checkRequestOrigin(new Headers({ 'sec-fetch-site': 'none' }), own).ok, true);

  for (const site of ['cross-site', 'same-site', 'cors']) {
    const verdict = checkRequestOrigin(new Headers({ 'sec-fetch-site': site }), own);
    assert.equal(verdict.ok, false, `sec-fetch-site: ${site} must be refused`);
  }

  const foreign = checkRequestOrigin(new Headers({ origin: 'https://evil.com' }), own);
  assert.equal(foreign.ok, false, 'a foreign Origin must be refused');
  assert.equal(checkRequestOrigin(new Headers({ origin: own }), own).ok, true);
});

test('a non-browser client is allowed, because refusing it would refuse the flood', () => {
  // A `curl` sends neither header. A cross-site check that rejected every
  // header-less request would be rejecting the abuse it was added to stop.
  assert.equal(checkRequestOrigin(new Headers(), 'https://knoux.store').ok, true);
  // An opaque origin is what a sandboxed document sends; it is not a foreign
  // site and is not the signal this check is reading.
  assert.equal(checkRequestOrigin(new Headers({ origin: 'null' }), 'https://knoux.store').ok, true);
});

test('an oversized submission is refused before and during the read', async () => {
  assert.equal(checkDeclaredLength(new Headers()).ok, true, 'an absent length passes the cheap check');

  const declaredTooBig = new Headers();
  declaredTooBig.set('content-length', String(MAX_BODY_BYTES * 4));
  assert.equal(checkDeclaredLength(declaredTooBig).ok, false);

  // A client that under-reports is caught by the streaming cap.
  const liar = new Headers({ 'content-length': '10' });
  assert.equal(checkDeclaredLength(liar).ok, true, 'a small declared length passes the cheap check');

  const body = JSON.stringify({ message: 'x'.repeat(MAX_BODY_BYTES + 1024) });
  const request = new Request('https://knoux.store/api/contact', { method: 'POST', body });
  const result = await readBoundedJson(request);
  assert.equal(result.ok, false, 'an oversized body must be refused');
  assert.equal(result.reason, 'body-too-large');
});

test('a body within the cap parses, and a malformed one is refused', async () => {
  const good = await readBoundedJson(
    new Request('https://knoux.store/api/contact', { method: 'POST', body: JSON.stringify({ name: 'Ada' }) }),
  );
  assert.equal(good.ok, true);
  assert.deepEqual(good.value, { name: 'Ada' });

  const bad = await readBoundedJson(
    new Request('https://knoux.store/api/contact', { method: 'POST', body: '{not json' }),
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'body-unreadable');
});

test('a submission flood is bounded and says when to retry', () => {
  resetRateLimits();
  const now = 2_000_000;
  const request = new Request('https://knoux.store/api/contact', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9' },
  });

  let allowed = 0;
  let refused = null;
  for (let i = 0; i < 12; i += 1) {
    const verdict = intakeRateLimit(request, now);
    if (verdict.ok) allowed += 1;
    else refused = verdict;
  }
  assert.ok(allowed >= 5, `real submissions must still get through (got ${allowed})`);
  assert.ok(refused, 'a flood must be refused');
  assert.equal(refused.reason, 'rate-limited');
  assert.ok(refused.retryAfterSeconds > 0, 'a refusal must say when to retry');
  resetRateLimits();
});

test('the intake still refuses to claim delivery when unconfigured', () => {
  const source = readFileSync(join(root, 'src', 'app', 'api', 'contact', 'route.ts'), 'utf8');
  // The abuse controls must not have been bought with a fake success path.
  assert.match(source, /503/, 'an unconfigured deployment must return 503');
  assert.doesNotMatch(source, /delivered:\s*true[\s\S]{0,400}webhook\s*===\s*undefined/);
  assert.match(source, /if \(!webhook\)/, 'the webhook check must precede delivery');
});

/* =========================================================== integration */

test('no route handler returns a workspace payload before the guard runs', () => {
  // A handler that built its adapter above the guard call would leak the
  // inventory even though it returned 401. The guard has to be the first
  // statement that touches anything.
  for (const route of ['project', 'file', 'git', 'environment', 'providers', 'verify']) {
    const source = readFileSync(join(root, 'src', 'app', 'api', 'build', route, 'route.ts'), 'utf8');
    const guardAt = source.indexOf('guardBuildApi(');
    const adapterAt = source.indexOf('createProjectAdapter(');
    if (adapterAt >= 0) {
      assert.ok(guardAt >= 0 && guardAt < adapterAt, `/api/build/${route} must guard before constructing the adapter`);
    }
  }
});
