import { expect, test } from '@playwright/test';

test('Trusted WordPress operations open on demand and keep the real authorization boundary', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/wordpress/operations') requests.push(request.method());
  });
  await page.goto('/wordpress#operate');
  const stage = page.getByRole('region', { name: 'Operations Command Center' });
  const trigger = stage.getByRole('button', { name: 'Open trusted operations' });
  await expect(trigger).toBeVisible();
  await expect(stage.getByRole('dialog')).toHaveCount(0);
  expect(requests).toEqual([]);

  const response = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/wordpress/operations');
  await trigger.click();
  expect([401, 403]).toContain((await response).status());
  const panel = stage.getByRole('dialog', { name: 'Trusted operations' });
  await expect(panel.locator('[data-operation-config]')).toHaveAttribute('data-operation-config', 'AUTH_REQUIRED');
  await expect(panel.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fwordpress%23operate');
  await expect(panel.getByRole('button', { name: 'Send structured request' })).toHaveCount(0);
  await panel.getByRole('button', { name: /Move.*Content/ }).click();
  await expect(panel.getByRole('heading', { name: 'Migration', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(requests).toEqual(['GET']);
});
