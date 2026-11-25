import { expect, test } from '@playwright/test';

test('editing or cancelling a Signal lookup discards the pending response', async ({ page }) => {
  let release = () => {};
  let complete = () => {};
  let notifyIntercepted = () => {};
  let delay = new Promise<void>((resolve) => { release = resolve; });
  let completed = new Promise<void>((resolve) => { complete = resolve; });
  let intercepted = new Promise<void>((resolve) => { notifyIntercepted = resolve; });
  await page.route('**/api/signal/lookup', async (route) => {
    notifyIntercepted();
    await delay;
    try {
      await route.fulfill({ status: 400, json: { ok: false, error: 'Discard this response' } });
    } catch {
      // Cancelling fetch can close the browser route before the fixture is released.
    } finally {
      complete();
    }
  });

  await page.goto('/signal/lookup');
  const phone = page.getByLabel('Phone number', { exact: true });
  const resolve = page.getByRole('button', { name: 'Resolve number' });
  const cancel = page.getByRole('button', { name: 'Cancel lookup' });
  await phone.fill('+971501234567');
  await resolve.click();
  await expect(cancel).toBeVisible();
  await intercepted;
  await phone.fill('123');
  release();
  await completed;
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Discard this response')).toHaveCount(0);

  delay = new Promise<void>((resolve) => { release = resolve; });
  completed = new Promise<void>((resolve) => { complete = resolve; });
  intercepted = new Promise<void>((resolve) => { notifyIntercepted = resolve; });
  await phone.fill('+971501234567');
  await resolve.click();
  await intercepted;
  await cancel.click();
  release();
  await completed;
  await expect(resolve).toBeEnabled();
  await expect(page.getByText('Discard this response')).toHaveCount(0);
});
