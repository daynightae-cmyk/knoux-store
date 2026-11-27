import { expect, test, type Locator } from '@playwright/test';

type PreviewMetrics = {
  /** Layout boundary in CSS pixels — the real device width, unaffected by the fit-to-workspace zoom. */
  logicalWidth: number;
  /** Rendered geometry — includes the preview's honest fit-to-workspace scaling. */
  visualWidth: number;
  /** Active CSS zoom factor applied to the preview document. */
  zoom: number;
};

/**
 * The preview renders a real HTMLElement document (`[data-logical-width]`) scaled
 * with CSS `zoom`. `offsetWidth` is the layout boundary and does not include the
 * zoom transform, so it reports the actual logical device width; the bounding
 * client rect is the rendered geometry and must equal the logical width times the
 * active zoom. Measuring either one alone would hide a wrong document width.
 */
async function measurePreview(viewport: Locator): Promise<PreviewMetrics> {
  return viewport.evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new Error('The responsive preview must render an HTMLElement layout boundary.');
    }
    const style = getComputedStyle(node);
    return {
      logicalWidth: node.offsetWidth,
      visualWidth: node.getBoundingClientRect().width,
      zoom: Number.parseFloat(style.zoom) || 1,
    };
  });
}

test('Responsive canvas renders the same editable draft at three actual layout widths', async ({ page }) => {
  await page.goto('/wordpress#canvas');
  const canvas = page.getByRole('region', { name: 'Live Responsive Canvas' });
  const desktop = canvas.getByRole('region', { name: 'Desktop', exact: true });
  const tablet = canvas.getByRole('region', { name: 'Tablet', exact: true });
  const mobile = canvas.getByRole('region', { name: 'Mobile', exact: true });

  const measured = new Map<string, PreviewMetrics>();
  for (const [name, device, width] of [
    ['desktop', desktop, 1920],
    ['tablet', tablet, 1024],
    ['mobile', mobile, 390],
  ] as const) {
    const viewport = device.locator('[data-logical-width]');
    await expect(viewport).toBeVisible();
    const metrics = await measurePreview(viewport);
    measured.set(name, metrics);
    // The document really lays out at the device's logical width.
    expect(metrics.logicalWidth, `${name} logical layout width`).toBeCloseTo(width, 1);
    // The preview is honestly scaled to fit its workspace: rendered geometry is
    // the logical width times the active zoom (1 when the workspace fits).
    expect(metrics.visualWidth, `${name} rendered geometry`).toBeCloseTo(width * metrics.zoom, 0);
    expect(metrics.zoom, `${name} zoom factor`).toBeGreaterThan(0);
    expect(metrics.zoom, `${name} zoom factor`).toBeLessThanOrEqual(1);
  }

  // The same draft genuinely reflows through the document's container queries:
  // cards sit in a row above the mobile breakpoint and stack below it.
  await expect(desktop.locator('[data-section-cards]')).toHaveCSS('flex-direction', 'row');
  await expect(tablet.locator('[data-section-cards]')).toHaveCSS('flex-direction', 'row');
  await expect(mobile.locator('[data-section-cards]')).toHaveCSS('flex-direction', 'column');

  // The hero's min-height is a container-query decision (760 / 540 / 385 logical
  // px), so the layout boundary proves the real document width, not a label.
  const heroHeight = (device: Locator) => device.locator('[data-type="hero"]').evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw new Error('The hero section must be an HTMLElement.');
    return node.offsetHeight;
  });
  const [desktopHero, tabletHero, mobileHero] = await Promise.all([heroHeight(desktop), heroHeight(tablet), heroHeight(mobile)]);
  expect(desktopHero, 'desktop hero uses the >=1280px container layout').toBeGreaterThanOrEqual(760);
  expect(tabletHero, 'tablet hero uses the default container layout').toBeGreaterThanOrEqual(540);
  expect(tabletHero, 'tablet hero is shorter than the desktop hero').toBeLessThan(desktopHero);
  expect(mobileHero, 'mobile hero uses the <=767px container layout').toBeGreaterThanOrEqual(385);
  expect(mobileHero, 'mobile hero is shorter than the tablet hero').toBeLessThan(tabletHero);

  await desktop.getByRole('button', { name: 'About this preview' }).click();
  await expect(desktop.getByRole('button', { name: 'About this preview' })).toHaveAttribute('aria-expanded', 'true');

  await canvas.getByRole('switch', { name: 'Tablet', exact: true }).click();
  await expect(tablet).toHaveCount(0);
  await canvas.getByRole('switch', { name: 'Tablet', exact: true }).click();

  // Scaling to 125% changes the rendered geometry, never the logical document
  // width: the mobile document keeps laying out at 390px and the rendered size
  // grows by exactly the new zoom factor.
  await canvas.getByRole('button', { name: '125%', exact: true }).click();
  await expect(canvas.getByRole('button', { name: '125%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const zoomed = await measurePreview(mobile.locator('[data-logical-width]'));
  expect(zoomed.logicalWidth, '125% zoom keeps the 390px logical layout').toBeCloseTo(390, 1);
  expect(zoomed.visualWidth, '125% rendered geometry matches the zoom').toBeCloseTo(390 * zoomed.zoom, 0);
  expect(zoomed.zoom, '125% raises the fit-to-workspace zoom').toBeGreaterThan(measured.get('mobile')?.zoom ?? 0);
  expect(zoomed.visualWidth, '125% visibly enlarges the preview').toBeGreaterThan(measured.get('mobile')?.visualWidth ?? 0);

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
