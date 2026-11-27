import { expect, test, type Locator } from '@playwright/test';

type PreviewMetrics = {
  /** Layout boundary in CSS pixels — the real device width, unaffected by the fit-to-workspace zoom. */
  logicalWidth: number;
  /** Rendered geometry — includes the preview's honest fit-to-workspace scaling. */
  visualWidth: number;
  /** Active CSS zoom factor applied to the preview document. */
  zoom: number;
  /** The visible workspace the preview is fitted into. */
  available: number;
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
    const workspace = node.parentElement;
    if (!(workspace instanceof HTMLElement)) {
      throw new Error('The responsive preview must be fitted into a measured workspace element.');
    }
    const style = getComputedStyle(node);
    return {
      logicalWidth: node.offsetWidth,
      visualWidth: node.getBoundingClientRect().width,
      zoom: Number.parseFloat(style.zoom) || 1,
      available: workspace.getBoundingClientRect().width,
    };
  });
}

/**
 * The podium re-fits the previews whenever the device layout changes, and the
 * canvas learns the new workspace size through a ResizeObserver, so a preview
 * can be sampled while the fit it is drawn in is still moving. Wait until the
 * rendered geometry has stopped changing *and* agrees with the fit the canvas
 * should be applying, so every measurement is taken in a settled layout.
 */
async function settlePreview(viewport: Locator, multiplier: number): Promise<PreviewMetrics> {
  let previous = -1;
  let stable = 0;
  await expect.poll(async () => {
    const metrics = await measurePreview(viewport);
    const fit = Math.min(metrics.available / metrics.logicalWidth, 1);
    const ratio = metrics.visualWidth / metrics.logicalWidth;
    const settled = metrics.visualWidth === previous && Math.abs(ratio - fit * multiplier) < 0.002;
    stable = settled ? stable + 1 : 0;
    previous = metrics.visualWidth;
    return stable >= 3;
  }, { timeout: 15_000 }).toBe(true);
  return measurePreview(viewport);
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
  // The device has to be back on the podium before the canvas is measured: the
  // podium re-fits the remaining previews around it, so measuring while the
  // device is still missing samples a layout that no longer exists.
  await expect(tablet).toHaveCount(1);

  // Scaling to 125% changes the rendered geometry, never the logical document
  // width: the mobile document keeps laying out at 390px while the rendered
  // size grows by the scale factor on top of the fit-to-workspace zoom.
  const baseline = await settlePreview(mobile.locator('[data-logical-width]'), 1);
  await canvas.getByRole('button', { name: '125%', exact: true }).click();
  await expect(canvas.getByRole('button', { name: '125%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const zoomed = await settlePreview(mobile.locator('[data-logical-width]'), 1.25);
  expect(zoomed.logicalWidth, '125% zoom keeps the 390px logical layout').toBeCloseTo(390, 1);
  // The scale control multiplies the fit-to-workspace zoom by the scale
  // percentage; the fit factor itself is unchanged, so the zoom is the measured
  // fit times the requested 125%.
  expect(zoomed.zoom, '125% multiplies the fit-to-workspace zoom by 1.25')
    .toBeCloseTo(Math.min(zoomed.available / zoomed.logicalWidth, 1) * 1.25, 3);
  expect(zoomed.visualWidth, '125% rendered geometry matches the zoom').toBeCloseTo(390 * zoomed.zoom, 0);
  expect(zoomed.visualWidth, '125% visibly enlarges the preview').toBeGreaterThan(baseline.visualWidth);

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
