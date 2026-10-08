import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { intelligenceFixture, planFixture, generateContract } from './fixtures/build-generator';

test.beforeEach(async ({ page }) => { await intelligenceFixture(page); });

test('navigator is reachable in AUTO and keyboard selection explicitly enters MANUAL', async ({ page }) => {
  await page.goto('/build');
  const trigger = page.getByRole('button', { name: /INTELLIGENCE/ });
  await trigger.click();
  await expect(page.getByRole('list', { name: 'Provider runtime states' })).toContainText('CONFIG REQUIRED');
  await expect(page.getByRole('list', { name: 'Provider runtime states' })).toContainText('BLOCKED');
  expect((await new AxeBuilder({ page }).include('.dev-cinematic').analyze()).violations).toEqual([]);
  const search = page.getByRole('combobox', { name: 'Search intelligence' });
  await search.fill('gemini thinking');
  await expect(page.getByRole('listbox', { name: 'Canonical models' }).getByRole('option')).toHaveCount(1);
  await search.press('ArrowDown'); await search.press('Enter');
  await expect(page.getByLabel('Routing', { exact: true })).toHaveValue('manual');
  await expect(trigger).toBeFocused();
  await expect(page.getByText('Hidden reasoning: MODEL MANAGED', { exact: false })).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('listbox', { name: 'Canonical models' }).getByRole('option', { selected: true })).toHaveCount(1);
  await search.fill('no-such-model');
  await expect(page.getByRole('listbox', { name: 'Canonical models' }).getByRole('option')).toHaveCount(0);
  await expect(page.getByText('No matching discovered model.', { exact: false })).toBeVisible();
  await search.press('Escape'); await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel('Provider', { exact: true }).selectOption('deepseek');
  await search.fill('fixed'); await search.press('Enter');
  await expect(page.getByText('Hidden reasoning: FIXED BY PROVIDER', { exact: false })).toBeVisible();
});

test('all profiles reach the canonical request with supported, capped controls', async ({ page }) => {
  await planFixture(page);
  const requests: Record<string, unknown>[] = [];
  page.on('request', (request) => { if (request.url().endsWith('/api/build/ai/stream')) requests.push(request.postDataJSON()); });
  await page.goto('/build');
  await page.getByRole('button', { name: /INTELLIGENCE/ }).click();
  const search = page.getByRole('combobox', { name: 'Search intelligence' });
  await search.fill('gemini'); await search.press('Enter');
  for (const [profile, budget, temperature] of [['FAST', 2048, .2], ['BALANCED', 4096, .4], ['DEEP', 8192, .3], ['MAX', 8192, .1]] as const) {
    await page.getByRole('radio', { name: profile, exact: true }).check();
    await generateContract(page);
    await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toBeVisible();
    expect(requests.at(-1)?.generationProfile).toBe(profile);
    expect(requests.at(-1)?.controls).toEqual({ maxOutputTokens: budget, temperature });
    expect(JSON.stringify(requests.at(-1))).not.toContain('reasoningEffort');
  }
  await expect(page.getByLabel('Requested and actual intelligence')).toContainText('MANUAL · MAX');
  await expect(page.getByLabel('Requested and actual intelligence')).toContainText('contract-thinking-version');
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toContainText('cost UNKNOWN');
});

test('plan map preserves fourteen sections, one keyboard stop and verbatim evidence', async ({ page }) => {
  await planFixture(page); await page.goto('/build'); await generateContract(page);
  const map = page.getByRole('region', { name: 'Plan system map', exact: true });
  await expect(map).toBeVisible();
  const nodes = map.getByRole('list', { name: 'Plan section nodes' });
  await expect(nodes.getByRole('button')).toHaveCount(14);
  await expect(nodes.locator('button[tabindex="0"]')).toHaveCount(1);
  const first = nodes.getByRole('button').first(); await first.focus(); await first.press('ArrowDown');
  await expect(nodes.getByRole('button').nth(1)).toBeFocused();
  await nodes.getByRole('button').nth(1).press('Enter');
  await expect(map.getByLabel('Verbatim plan provenance')).toContainText('§PRODUCT TYPE · line 1');
  await nodes.getByRole('button').nth(1).press('Escape');
  await expect(map.getByLabel('Verbatim plan provenance')).toHaveCount(0);
  await nodes.getByRole('button').nth(1).press('End'); await expect(nodes.getByRole('button').last()).toBeFocused();
  await expect(page.locator('.dev-plan-sections details')).toHaveCount(14);
  await map.getByRole('button', { name: 'Product topology', exact: true }).click();
  await expect(map.getByRole('list', { name: 'Source-derived product nodes' })).toContainText('/dispatch');
  await expect(map).toContainText('2 explicit relationships');
  await page.getByRole('button', { name: 'Review plan', exact: true }).click();
  await page.getByRole('button', { name: 'Check execution availability', exact: true }).click();
  await expect(page.getByLabel('Execution review', { exact: true })).toContainText('EXECUTOR_NOT_CONNECTED');
  await expect(page.locator('.dev-engine')).not.toHaveAttribute('data-stage', /EXECUTING|VERIFYING|COMPLETE/);
  const result = await new AxeBuilder({ page }).include('.dev-cinematic').analyze();
  expect(result.violations).toEqual([]);
});

test('session-only plan survives native navigation and clears on reload', async ({ page }) => {
  await planFixture(page); await page.goto('/build'); await generateContract(page);
  const menu = page.getByRole('button', { name: 'Open workspace navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.dev-nav-link[href="/build/engineering"]').click();
  if (await menu.isVisible()) await menu.click();
  await page.locator('.dev-nav-link[href="/build"]').click();
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toHaveCount(0);
  await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'LISTENING');
});

test('auth, configuration and partial output stay blocked without a success plan', async ({ page }) => {
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ status: 401, json: { message: 'Isolated auth boundary fixture' } }));
  await page.goto('/build'); await generateContract(page);
  await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'AUTH_REQUIRED');
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'CONFIG_REQUIRED', decision: { selected: null, blocker: 'Explicit fixture: no configured provider' } } }));
  await generateContract(page); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'CONFIG_REQUIRED');
  await planFixture(page);
  await page.route('**/api/build/ai/stream', (route) => route.fulfill({ contentType: 'text/event-stream', body: 'data: {"delta":"{\\"GOAL\\":[\\"Confirmed fixture line\\"]}","done":true}\n\n' }));
  await generateContract(page); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'PROVIDER_BLOCKED');
  await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Draft architecture formation' })).toContainText('not a validated plan yet');
});
