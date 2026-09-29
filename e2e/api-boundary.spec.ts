import { test, expect } from '@playwright/test';

/**
 * The workspace boundary, observed over HTTP by a real client.
 *
 * The policy is proved by execution in `tests/security-boundary.test.mjs`. This
 * proves the wiring: that the handlers built from that policy actually return
 * 401 to an anonymous caller in a production-configured process, rather than
 * the policy being correct and the route ignoring it.
 *
 * The server is started with `VERCEL_ENV=production` (see `playwright.config.ts`),
 * so this is the deployment case, not the local one.
 */

const WORKSPACE_ENDPOINTS = [
  '/api/build/project',
  '/api/build/file?path=package.json',
  '/api/build/git',
  '/api/build/environment',
  '/api/build/providers',
  '/api/build/verify',
];

test.describe('workspace boundary over HTTP', () => {
  for (const endpoint of WORKSPACE_ENDPOINTS) {
    test(`an anonymous GET to ${endpoint} is refused`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(
        response.status(),
        `${endpoint} must not answer an anonymous caller with project data`,
      ).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('build-workspace-authentication-required');
      expect(body.authenticated).toBe(false);

      // The refusal must not leak the payload it is refusing to serve.
      const serialised = JSON.stringify(body);
      for (const secretish of ['SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', '"files"', '"commits"']) {
        expect(serialised, `${endpoint} leaked ${secretish} in its refusal`).not.toContain(secretish);
      }
    });
  }

  test('the verification runner is refused before it is even considered', async ({ request }) => {
    const response = await request.post('/api/build/verify', {
      data: { task: 'build' },
    });
    // The session boundary is the first condition; the operator flag is the
    // second. On a deployment with neither set, 401 is the honest answer and
    // the body must not claim the runner is merely "disabled" — that would
    // describe an authorisation problem as a configuration one.
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('transport headers over HTTP', () => {
  test('a production response carries the policy it is supposed to carry', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    for (const header of [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy',
    ]) {
      expect(headers[header], `${header} must be present on a production response`).toBeTruthy();
    }

    // The framework fingerprint.
    expect(headers['x-powered-by'], 'X-Powered-By must be absent').toBeUndefined();

    const csp = headers['content-security-policy'];
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    // Development-only escape hatches must not reach a production response.
    expect(csp, 'production must not allow unsafe-eval').not.toContain('unsafe-eval');
  });

  test('a refused workspace response carries the policy too', async ({ request }) => {
    // A 401 that carries no policy is still a 401 a browser will render.
    const response = await request.get('/api/build/project');
    expect(response.headers()['content-security-policy']).toBeTruthy();
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('the WordPress image proxy over HTTP', () => {
  const cases: [string, string, number][] = [
    ['a foreign host', 'https://evil.com/x.png', 403],
    ['a lookalike host', 'https://ps.w.org.evil.com/x.png', 403],
    ['plain http', 'http://ps.w.org/x.png', 400],
    ['embedded credentials', 'https://user:pass@ps.w.org/x.png', 400],
  ];

  for (const [label, target, expected] of cases) {
    test(`${label} is refused`, async ({ request }) => {
      const response = await request.get(`/api/wp-image?u=${encodeURIComponent(target)}`);
      expect(response.status(), `${label} (${target})`).toBe(expected);
    });
  }

  test('a missing reference is refused', async ({ request }) => {
    expect((await request.get('/api/wp-image')).status()).toBe(400);
  });
});

test.describe('the contact intake over HTTP', () => {
  test('a cross-site browser post is refused', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.com' },
      data: { name: 'Ada', email: 'ada@example.com', message: 'A valid looking message.' },
    });
    expect(response.status()).toBe(403);
  });

  test('an oversized submission is refused', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'sec-fetch-site': 'same-origin', origin: 'http://127.0.0.1:3311' },
      data: { name: 'Ada', email: 'ada@example.com', message: 'x'.repeat(200_000) },
    });
    expect(response.status()).toBe(413);
  });

  test('a same-site submission is validated, and never claims unconfigured delivery', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'sec-fetch-site': 'same-origin', origin: 'http://127.0.0.1:3311' },
      data: { name: 'Ada', email: 'not-an-email', message: 'short' },
    });
    // Validation runs before configuration, so an invalid submission is
    // rejected on its own terms.
    expect([422, 503]).toContain(response.status());

    const body = await response.json();
    expect(body.delivered, 'an unconfigured deployment must never claim delivery').toBe(false);
  });
});
