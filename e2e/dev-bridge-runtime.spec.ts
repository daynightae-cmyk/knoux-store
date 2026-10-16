import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Bridge availability and authentication UX in a real browser.
 *
 * The fixture runs with `VERCEL_ENV=production` and no session, which is what a
 * public visitor actually gets: the status route answers 401 from the workspace
 * guard. Every assertion here is about a claim that can be true or false —
 *
 *   - an unidentified visitor is told to sign in, not offered pairing
 *   - the bridge is never shown as connected when it answered nothing
 *   - no ticket or credential value appears anywhere in the rendered page
 *
 * Nothing here starts a shell. Proving the happy path would mean executing a
 * real command on the host, and a UI claim does not need that to be verified.
 */

const DEV_ROUTES = [
  { path: '/build/terminal', id: 'terminal' },
  { path: '/build/powershell', id: 'powershell' },
];

for (const route of DEV_ROUTES) {
  test(`${route.id} asks an unidentified visitor to sign in, not to pair`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(route.path, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);

    // The refusal is stated in terms of the remedy, and pairing is not offered.
    const signIn = page.getByRole('link', { name: /SIGN IN TO CONNECT/i });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', `/login?next=%2Fbuild%2F${route.id}`);

    // A privileged action must not be reachable from this state.
    await expect(page.getByRole('link', { name: /PAIR TRUSTED BRIDGE/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /PAIR TRUSTED BRIDGE/i })).toHaveCount(0);

    // And no session-shaped control is offered.
    await expect(page.getByRole('button', { name: /OPEN SESSION|START SESSION/i })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${route.id} never reports a live session without a bridge`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'load' });

    // `LIVE`, a pid, or a live stage would each be a false connected state.
    const body = (await page.locator('body').innerText()).toUpperCase();
    expect(body).not.toContain('BRIDGE CONNECTED');
    expect(body).not.toContain('SIGNAL LIVE');
    await expect(page.locator('.dev-console__bar')).not.toContainText(/PID \d+/);
  });

  test(`${route.id} exposes no ticket or key material to the page`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'load' });

    const html = await page.content();
    // A signed ticket is a JWT: three base64url segments beginning `eyJ`.
    expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(html).not.toContain('PRIVATE KEY');
    expect(html).not.toContain('KNOUX_BRIDGE_SIGNING_KEY');

    // No network response handed the page a bearer token either.
    const bodies: string[] = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/api/build/bridge')) return;
      try {
        bodies.push(await response.text());
      } catch {
        /* a body that cannot be read cannot have leaked */
      }
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    for (const body of bodies) {
      expect(body).not.toMatch(/"ticket"\s*:\s*"[^"]+"/);
      expect(body).not.toContain('BEGIN PRIVATE KEY');
    }
  });
}

test('the settings bridge check starts unverified and reports what it measured', async ({ page }) => {
  await page.goto('/build/settings', { waitUntil: 'load' });

  const status = page.getByRole('status').filter({ hasText: /Bridge connectivity/i });
  await expect(status).toBeVisible();
  await expect(status).toContainText(/Not checked yet/i);

  // The outcome is announced, not merely painted.
  await expect(status).toHaveAttribute('aria-live', 'polite');

  // The answer is observed, not inferred: the status route must actually have
  // been called, because a check that rendered a conclusion without asking
  // would be exactly the optimistic state this is meant to prevent.
  const answered = page.waitForResponse((response) => response.url().includes('/api/build/bridge/status'));
  await status.getByRole('button', { name: /CHECK BRIDGE CONNECTION/i }).click();
  const response = await answered;

  await expect(status).not.toContainText(/Not checked yet/i);
  const text = await status.innerText();

  if (response.status() === 401) {
    // The refusal names the remedy, and the remedy is a session — never pairing.
    expect(text).toMatch(/identified account/i);
    await expect(status.getByRole('link', { name: /Sign in to KNOuX/i })).toHaveAttribute(
      'href',
      '/login?next=%2Fbuild%2Fsettings',
    );
  } else {
    expect(text).toMatch(/answered|no bridge|could not be read|shell profile/i);
  }

  // Whatever the answer, no live session is implied.
  expect(text).not.toMatch(/\bLIVE\b/);
});

test('a sign-in return path survives the round trip to an off-origin target', async ({ page, baseURL }) => {
  // The hostile shapes a resolver must refuse. Landing must stay on-origin.
  const trusted = new URL(baseURL ?? 'http://127.0.0.1:3311').origin;

  for (const hostile of ['https://evil.example/steal', '//evil.example/steal', '/\\evil.example']) {
    await page.goto(`/login?next=${encodeURIComponent(hostile)}`, { waitUntil: 'load' });
    expect(new URL(page.url()).origin, `landing origin for ${hostile}`).toBe(trusted);

    // The submitted value is already-resolved, never the hostile original.
    const hidden = page.locator('input[name="next"]');
    if (await hidden.count()) {
      const value = await hidden.inputValue();
      expect(value).toBe('/account');
      expect(value).not.toContain('evil.example');
    }
  }
});

test('a safe return path is carried into the sign-in form', async ({ page }) => {
  await page.goto('/login?next=%2Fbuild%2Fterminal', { waitUntil: 'load' });
  const hidden = page.locator('input[name="next"]');
  await expect(hidden).toHaveCount(1);
  await expect(hidden).toHaveValue('/build/terminal');
});

test('DEV bridge routes have no machine-detectable accessibility violations', async ({ page }) => {
  for (const route of ['/build/terminal', '/build/powershell', '/build/settings']) {
    await page.goto(route, { waitUntil: 'load' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) => violation.impact !== 'minor'),
      `${route} accessibility violations`,
    ).toEqual([]);
  }
});

test('no horizontal overflow at mobile width on the bridge routes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const route of ['/build/terminal', '/build/powershell', '/build/settings']) {
    await page.goto(route, { waitUntil: 'load' });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      `${route} overflows the viewport at 320px`,
    ).toBeLessThanOrEqual(1);
  }
});
