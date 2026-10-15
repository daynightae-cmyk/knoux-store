import { test, expect } from '@playwright/test';
import { providerFixture } from './fixtures/provider-os';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Provider recovery QA'));
});

test('a failed credential save keeps the unsaved value and synchronous duplicate submissions issue one command', async ({ page }) => {
  await providerFixture(page);
  let writes = 0;
  await page.route('**/api/build/provider-os', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++;
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.fulfill({ status: 503, json: { message: 'CONTRACT FIXTURE refusal: no credential stored.' } });
  });
  await page.goto('/build/providers');
  await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /^Groq\b/ }).click();
  await expect(page.locator('[data-provider-connection]')).toContainText('VERIFIED');
  await page.getByRole('navigation', { name: 'Groq sections' }).getByRole('button', { name: 'Credentials', exact: true }).click();
  await page.getByLabel('Credential name', { exact: true }).fill('CONTRACT FIXTURE only');
  const secret = page.getByLabel('Secret (write only)', { exact: true });
  await secret.fill('TEST_ONLY_UNSAVED_CREDENTIAL');
  await secret.evaluate(element => {
    const form = element.closest('form')!;
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByRole('status')).toContainText('CONTRACT FIXTURE refusal');
  expect(writes).toBe(1);
  await expect(secret).toHaveValue('TEST_ONLY_UNSAVED_CREDENTIAL');
  expect(await page.locator('body').innerText()).not.toContain('TEST_ONLY_UNSAVED_CREDENTIAL');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('TEST_ONLY_UNSAVED_CREDENTIAL');
  const registry = page.getByRole('navigation', { name: 'Provider registry' });
  if (!await registry.isVisible()) await page.locator('summary').filter({ hasText: 'Browse providers' }).click();
  await registry.getByRole('button', { name: /^OpenAI\b/ }).click();
  if (!await registry.isVisible()) await page.locator('summary').filter({ hasText: 'Browse providers' }).click();
  await registry.getByRole('button', { name: /^Groq\b/ }).click();
  await page.getByRole('navigation', { name: 'Groq sections' }).getByRole('button', { name: 'Credentials', exact: true }).click();
  await expect(secret).toHaveValue('');
});
