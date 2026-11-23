import { expect, test } from '@playwright/test';

test('WordPress arrival swaps rendered documents and restores focus after the inspector and studio close', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/wordpress');

  const entry = page.locator('[data-enter-studio]');
  const studio = page.getByRole('dialog', { name: 'WordPress Studio' });
  await expect(studio).toBeHidden();
  await entry.click();
  await expect(page).toHaveURL(/\/wordpress#studio$/);
  await expect(entry).toBeHidden();
  await expect(studio.getByRole('button', { name: 'Exit to arrival' })).toBeFocused();

  const draft = studio.getByRole('article', { name: 'Layout draft' });
  const starter = studio.getByRole('article', { name: 'Starting layout' });
  const activePreview = studio.locator('[data-orbit-active=true]');
  await expect(activePreview).toHaveAttribute('data-orbit-preview', 'draft');
  await expect(draft.locator('[data-type=features]')).toBeVisible();
  await expect(starter.locator('[data-type=contact]')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);

  await studio.getByRole('button', { name: 'Show Starting layout' }).click();
  await expect(activePreview).toHaveAttribute('data-orbit-preview', 'starter');
  await starter.getByRole('button', { name: 'About this preview' }).click();
  await expect(starter.getByRole('button', { name: 'About this preview' })).toHaveAttribute('aria-expanded', 'true');
  await studio.getByRole('button', { name: 'Switch preview' }).press('ArrowLeft');
  await expect(activePreview).toHaveAttribute('data-orbit-preview', 'draft');

  const trigger = studio.getByRole('button', { name: 'Inspector', exact: true });
  await trigger.click();
  const inspector = page.getByRole('dialog', { name: 'Inspector' });
  await inspector.getByLabel('Hero alignment').selectOption('end');
  await page.keyboard.press('Escape');
  await expect(inspector).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(draft.locator('[data-type=hero]')).toHaveCSS('align-items', 'flex-end');

  await page.keyboard.press('Escape');
  await expect(studio).toBeHidden();
  await expect(entry).toBeFocused();
  await page.goForward();
  await expect(studio).toBeVisible();
  await expect(draft.locator('[data-type=hero]')).toHaveCSS('align-items', 'flex-end');
  await page.goBack();
  await expect(entry).toBeFocused();
  expect(errors).toEqual([]);
});

test('WordPress deep link opens the existing journey inside the immersive studio', async ({ page }) => {
  await page.goto('/wordpress#domain');
  const studio = page.getByRole('dialog', { name: 'WordPress Studio' });
  await expect(studio.getByRole('heading', { name: 'Domain Intelligence', exact: true }).first()).toBeVisible();
  await studio.getByRole('button', { name: 'Exit to arrival' }).click();
  await expect(page).toHaveURL(/\/wordpress$/);
  await expect(page.locator('[data-enter-studio]')).toBeFocused();
});

test('a touch swipe swaps the WordPress previews', async ({ page, browserName, hasTouch }) => {
  test.skip(browserName !== 'chromium' || !hasTouch, 'Requires the Chromium touch device profile.');
  await page.goto('/wordpress');
  await page.locator('[data-enter-studio]').tap();
  const orbit = page.locator('[data-preview-orbit]');
  const box = await orbit.boundingBox();
  expect(box).not.toBeNull();
  const { x, y, width } = box!;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + width * .24, y: y + 45 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + width * .64, y: y + 47 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(orbit.locator('[data-orbit-active=true]')).toHaveAttribute('data-orbit-preview', 'starter');
});
