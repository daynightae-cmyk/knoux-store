import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const areas = ['', 'analytics', 'google', 'reports', 'clients', 'campaigns', 'leads', 'creative', 'social', 'communities', 'intelligence', 'automations', 'connections', 'settings'];

test('Recovered Command Center routes render and fit the viewport', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const area of areas) {
    const response = await page.goto(`/command${area ? `/${area}` : ''}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('.command-root h1')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Command Center sections' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const violations = (await new AxeBuilder({ page }).include('.command-root').withTags(['wcag2a', 'wcag2aa']).analyze()).violations;
    expect(violations, `Accessibility: /command/${area}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('Intelligence refuses cross-site, invalid and oversized requests and labels demo reasoning', async ({ request }) => {
  const rejected = await request.post('/api/intelligence', { headers: { origin: 'https://example.invalid' }, data: {} });
  expect(rejected.status()).toBe(403);
  const invalid = await request.post('/api/intelligence', { data: 'null', headers: { 'content-type': 'application/json' } });
  expect(invalid.status()).toBe(400);
  const oversized = await request.post('/api/intelligence', { data: JSON.stringify({ prompt: 'x'.repeat(25 * 1024) }), headers: { 'content-type': 'application/json' } });
  expect(oversized.status()).toBe(413);
  const response = await request.post('/api/intelligence', { data: { intent: 'EXPLAIN', clientId: 'cl_swimfit', prompt: 'Explain this workspace.' } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.response.servedBy.providerId).toBe('knoux-local');
  expect(body.response.servedBy.degradedFrom).toBe('knoux-agent');
  expect(body.response.provisional).toBe(true);
});
