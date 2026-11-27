import { expect, test } from '@playwright/test';

test('Responsive canvas renders the same editable draft at three actual layout widths', async ({ page }) => {
  await page.goto('/wordpress#canvas');
  const canvas = page.getByRole('region', { name: 'Live Responsive Canvas' });
  const desktop = canvas.getByRole('region', { name: 'Desktop', exact: true });
  const tablet = canvas.getByRole('region', { name: 'Tablet', exact: true });
  const mobile = canvas.getByRole('region', { name: 'Mobile', exact: true });

  for (const [device, width] of [[desktop, 1920], [tablet, 1024], [mobile, 390]] as const) {
    const viewport = device.locator('[data-logical-width]');
    await expect(viewport).toBeVisible();
    const measured = await viewport.evaluate((node) => node.getBoundingClientRect().width);
    expect(measured).toBeCloseTo(width, 1);
  }
  await expect(desktop.locator('[data-section-cards]')).toHaveCSS('flex-direction', 'row');
  await expect(mobile.locator('[data-section-cards]')).toHaveCSS('flex-direction', 'column');
  await desktop.getByRole('button', { name: 'About this preview' }).click();
  await expect(desktop.getByRole('button', { name: 'About this preview' })).toHaveAttribute('aria-expanded', 'true');

  await canvas.getByRole('switch', { name: 'Tablet', exact: true }).click();
  await expect(tablet).toHaveCount(0);
  await canvas.getByRole('switch', { name: 'Tablet', exact: true }).click();
  await canvas.getByRole('button', { name: '125%', exact: true }).click();
  await expect(canvas.getByRole('button', { name: '125%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const zoomedWidth = await mobile.locator('[data-logical-width]').evaluate((node) => Number.parseFloat(getComputedStyle(node).width));
  expect(zoomedWidth).toBeCloseTo(390, 1);

  await canvas.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await expect(page).toHaveURL(/#launch$/);
  const composer = page.getByRole('region', { name: 'Visual Website Composer' });
  await composer.getByRole('button', { name: 'Components', exact: true }).click();
  await composer.getByRole('dialog', { name: 'Components' }).getByRole('button', { name: /Gallery/ }).click();
  await page.keyboard.press('Escape');
  await composer.getByRole('button', { name: 'Preview on devices' }).click();
  await expect(page).toHaveURL(/#canvas$/);
  await expect(canvas.locator('[data-type="gallery"]')).toHaveCount(3);
  await canvas.getByRole('button', { name: 'Official theme screenshot', exact: true }).click();
  await expect(canvas.locator('[data-logical-width]')).toHaveCount(0);
  await expect(canvas.getByText(/Official screenshot resized for comparison/)).toBeVisible();
});
