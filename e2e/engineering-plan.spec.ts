import { test, expect } from '@playwright/test';

const sections = ['GOAL', 'PRODUCT TYPE', 'ARCHITECTURE', 'STACK', 'ROUTES', 'DATA MODEL', 'AUTH', 'INTEGRATIONS', 'UI SYSTEM', 'FILES / MODULES', 'TEST PLAN', 'DEPLOYMENT PLAN', 'RISKS', 'EXECUTION PLAN'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Build a portal'));
});

test('main Build prompt calls the canonical stream and renders a reviewable proposal', async ({ page }) => {
  // Explicit browser contract fixture, not evidence of live provider execution.
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'ROUTING', decision: { selected: { providerId: 'groq', modelId: 'contract-model' }, reasons: ['Isolated browser contract fixture'], fallbackChain: [] } } }));
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/build/ai/stream', async (route) => {
    requests.push(route.request().postDataJSON());
    const artifact = Object.fromEntries(sections.map((section) => [section, [`Proposed ${section.toLowerCase()} for a customer portal.`]]));
    await route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ delta: JSON.stringify(artifact), done: false })}\n\ndata: ${JSON.stringify({ delta: '', done: true, usage: { inputTokens: 12, outputTokens: 40 }, latencyMs: 10 })}\n\n` });
  });
  await page.goto('/build');
  await page.getByLabel('Describe what you want to build').fill('Build a customer portal with React and TypeScript');
  await page.getByRole('button', { name: 'Generate engineering plan' }).click();
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toBeVisible();
  await expect(page.getByText('PLANNED', { exact: false }).first()).toBeVisible();
  expect(requests[0]?.providerId).toBe('groq');
  expect(requests[0]?.modelId).toBe('contract-model');
  expect(requests[0]?.system).toContain('Return ONLY one JSON object');
  await page.getByRole('button', { name: 'Review plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review before execution' })).toBeVisible();
  await page.getByRole('button', { name: 'Check execution availability' }).click();
  await expect(page.getByText('This plan has no structured write executor.', { exact: false })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open workspace navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.dev-nav-link[href="/build/engineering"]').click();
  if (await menu.isVisible()) await menu.click();
  await page.locator('.dev-nav-link[href="/build"]').click();
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toBeVisible();
});

test('main Build refuses to manufacture a plan when no provider is eligible', async ({ page }) => {
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'CONFIG_REQUIRED', decision: { selected: null, blocker: 'No configured provider', fallbackChain: [] } } }));
  let streamCalled = false;
  await page.route('**/api/build/ai/stream', (route) => { streamCalled = true; return route.abort(); });
  await page.goto('/build');
  await page.getByLabel('Describe what you want to build').fill('Build a portal');
  await page.getByRole('button', { name: 'Generate engineering plan' }).click();
  await expect(page.locator('.dev-plan-error[role="alert"]')).toContainText('No configured provider');
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toHaveCount(0);
  expect(streamCalled).toBe(false);
});

test('a provider error stream remains blocked without a success artifact', async ({ page }) => {
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'ROUTING', decision: { selected: { providerId: 'deepseek', modelId: 'contract-model' }, reasons: [], fallbackChain: [] } } }));
  await page.route('**/api/build/ai/stream', (route) => route.fulfill({ contentType: 'text/event-stream', body: 'data: {"delta":"","done":true,"error":{"safeMessage":"Provider generation blocked"}}\n\n' }));
  await page.goto('/build');
  await page.getByLabel('Describe what you want to build').fill('Build a portal');
  await page.getByRole('button', { name: 'Generate engineering plan' }).click();
  await expect(page.locator('.dev-plan-error[role="alert"]')).toContainText('Provider generation blocked');
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toHaveCount(0);
});
