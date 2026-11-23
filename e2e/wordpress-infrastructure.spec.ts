import { expect, test } from '@playwright/test';

test('Infrastructure shows observed status and preserves hosting service selection', async ({ page }) => {
  await page.goto('/wordpress#infrastructure');
  const stage = page.getByRole('region', { name: 'Hosting and Infrastructure' });
  const healthResponse = await page.request.get('/api/health');
  expect(healthResponse.ok()).toBeTruthy();
  const health = await healthResponse.json();
  await expect(stage.locator('[data-deployment-health]')).toHaveAttribute('data-deployment-health', health.ready ? 'ready' : 'limited');

  const registrarResponse = await page.request.get('/api/domain/status');
  expect(registrarResponse.ok()).toBeTruthy();
  const registrar = await registrarResponse.json();
  await expect(stage.locator('[data-registrar-state]')).toHaveAttribute('data-registrar-state', registrar.status);

  const explore = stage.getByRole('button', { name: 'Explore infrastructure services' });
  await explore.click();
  const rack = stage.getByRole('dialog', { name: 'Infrastructure services' });
  await rack.getByRole('button', { name: /Business/ }).click();
  await expect(rack.getByText('An install carrying real editorial load, real roles and real traffic.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(explore).toBeFocused();

  await page.route('**/api/health', (route) => route.abort());
  await page.route('**/api/domain/status', (route) => route.abort());
  await page.reload();
  await expect(stage.locator('[data-deployment-health]')).toHaveAttribute('data-deployment-health', 'unavailable');
  await expect(stage.locator('[data-registrar-state]')).toHaveAttribute('data-registrar-state', 'unavailable');
});
