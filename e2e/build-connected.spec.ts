import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const evidence = join(process.cwd(), 'references/build-connected/qa');
const routes = ['/build', '/build/apps', '/build/services', '/build/pipeline', '/build/deployments', '/build/docs', '/build/terminal', '/build/powershell', '/build/providers', '/build/settings'];
test.beforeEach(async ({ page }) => { mkdirSync(evidence, { recursive: true }); await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Build a real project')); });

test('all ten connected routes fit and produce fresh evidence at desktop, tablet and mobile', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The existing cinematic suite covers each browser profile; capture widths once.'); test.setTimeout(240_000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const route of routes) {
      expect((await page.goto(route))?.status()).toBe(200); await expect(page.locator('#main-content h1')).toHaveCount(1);
      await expect(page.locator('.dev-living-mark canvas')).toHaveAttribute('data-motion', 'stable');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: join(evidence, `${route === '/build' ? 'workspace' : route.split('/').at(-1)}-${width}.png`) });
    }
  }
  expect(errors).toEqual([]);
});

test('launcher, command palette and integration controls expose exact blockers with keyboard access', async ({ page }, info) => {
  await page.goto('/build');
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.getByRole('button', { name: 'New build', exact: true }).click();
  const launcher = page.getByRole('dialog', { name: 'Project launcher' }); await expect(launcher).toBeVisible();
  await expect(launcher.getByRole('button', { name: 'INSPECT & OPEN' })).toBeDisabled();
  await launcher.getByRole('button', { name: 'IMPORT FROM GITHUB', exact: true }).click();
  await expect(launcher.getByRole('button', { name: 'LIST MY REPOSITORIES' })).toBeDisabled();
  await expect(launcher).toContainText('CLONE BLOCKED');
  await expect(launcher.getByRole('button', { name: 'IMPORT & INSPECT' })).toHaveCount(0);
  if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'launcher-github-1440.png') });
  await page.keyboard.press('Escape'); await expect(launcher).toHaveCount(0);
  await page.keyboard.press('Control+k'); const palette = page.getByRole('dialog', { name: 'Command palette' }); await expect(palette).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Open Preview', exact: true })).toBeDisabled();
  await expect(palette.getByRole('button', { name: 'Run Tests', exact: true })).toBeDisabled();
  await palette.getByLabel('Search workspace commands').fill('Providers');
  await palette.getByRole('button', { name: 'Open Providers' }).click(); await expect(page).toHaveURL(/\/build\/providers/);
  for (const category of ['AI PROVIDERS', 'DEV PLATFORMS', 'LOCAL AGENTS', 'SECRETS & AUTH']) {
    await page.getByRole('group', { name: 'Integration category' }).getByRole('button', { name: category, exact: true }).click();
    if (category === 'LOCAL AGENTS') await expect(page.getByRole('button', { name: 'DETECT LOCAL TOOLS' })).toBeDisabled();
    if (category === 'SECRETS & AUTH') { await expect(page.getByRole('button', { name: 'SAVE API KEY' })).toBeDisabled(); await expect(page.locator('#main-content')).toContainText('SECRET STORAGE NOT CONFIGURED'); }
    if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, `integration-${category.toLowerCase().replaceAll(' ', '-').replace('&', 'and')}.png`) });
  }
  const audit = await new AxeBuilder({ page }).include('.dev-cinematic').analyze(); expect(audit.violations).toEqual([]);
});

test('persistent mark survives route changes and settings apply and persist only display preferences', async ({ page }, info) => {
  await page.goto('/build'); const canvas = await page.locator('.dev-living-mark canvas').elementHandle(); await expect(page.locator('.dev-living-mark canvas')).toHaveAttribute('data-motion', 'stable');
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.locator('.dev-nav-link[href="/build/settings"]').click(); await expect(page).toHaveURL(/\/build\/settings/);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByLabel('Compact lists & rail').check(); await expect(page.locator('html')).toHaveClass(/dev-shell--compact/);
  await page.getByLabel('Default viewport').selectOption('phone'); await page.getByLabel('Particle density').selectOption('low');
  await page.reload(); await expect(page.getByLabel('Compact lists & rail')).toBeChecked(); await expect(page.getByLabel('Default viewport')).toHaveValue('phone');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('knoux-dev-preferences')!)); expect(Object.keys(saved).sort()).toEqual(['compact', 'density', 'editorWrap', 'evidence', 'motion', 'showEvidence', 'viewport'].sort());
  if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'settings-applied-1440.png') });
  await page.getByRole('button', { name: /^ACTIVITY/ }).click(); await expect(page.getByRole('dialog', { name: 'Session activity' })).toContainText('Real events in this browser session'); await page.keyboard.press('Escape');
});

test('real local Preview studio observes DOM, console, resource failures, responsive frames and evidence exports', async ({ page, request }, info) => {
  test.setTimeout(180_000); const port = Number(process.env.KNOUX_E2E_PORT ?? 3311) + 2; const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: process.cwd(), env: { ...process.env, KNOUX_BUILD_ENVIRONMENT: 'local' }, stdio: 'ignore', windowsHide: true });
  try {
    await expect.poll(async () => { try { return (await request.get(`${origin}/build`)).status(); } catch { return 0; } }, { timeout: 30_000 }).toBe(200);
    await page.goto(`${origin}/build`); await expect(page.locator('.dev-sidebar__facts')).toContainText('LOCAL');
    await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'PREVIEW' }).click();
    const iframe = page.locator('iframe[title^="Live preview"]'); await expect(iframe).toHaveCount(1); await expect(page.getByRole('button', { name: 'INSPECT', exact: true })).toBeEnabled();
    const studio = page.getByRole('group', { name: 'Preview studio tools' });
    await page.getByRole('group', { name: 'Preview route' }).getByRole('button', { name: '/products', exact: true }).click();
    await expect(page.frameLocator('iframe[title^="Live preview"]').locator('h1').first()).toBeVisible(); await expect(page.getByRole('button', { name: 'INSPECT', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'INSPECT', exact: true }).click(); await page.frameLocator('iframe[title^="Live preview"]').locator('h1').first().click({ position: { x: 5, y: 5 } }); await expect(page.locator('.bo-preview')).toContainText('font-size');
    await studio.getByRole('button', { name: 'CONSOLE', exact: true }).click();
    const contentFrame = await iframe.elementHandle().then((element) => element!.contentFrame());
    await contentFrame!.evaluate(() => { console.error('Preview observation token=PRIVATE_CANARY'); const image = new Image(); image.src = '/not-a-real-preview-image.png?token=PRIVATE_CANARY'; document.body.append(image); });
    await expect(page.locator('.dev-console-line')).toContainText(['[REDACTED]']); await expect(page.locator('.dev-console-line').filter({ hasText: 'RESOURCE' })).toContainText('/not-a-real-preview-image.png'); expect((await page.locator('.dev-console-line').allTextContents()).join(' ')).not.toContain('PRIVATE_CANARY');
    if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'preview-console-resource.png') });
    await studio.getByRole('button', { name: 'ACCESSIBILITY', exact: true }).click(); await page.getByRole('button', { name: 'READ SEMANTIC DOM' }).click(); await expect(page.locator('.dev-semantic-row').first()).toBeVisible(); await expect(page.locator('.bo-preview')).toContainText('AUDIT NOT RUN');
    await studio.getByRole('button', { name: 'RESPONSIVE LAB', exact: true }).click(); await expect(page.locator('iframe[title^="Responsive sweep"]')).toHaveCount(3);
    await page.getByRole('button', { name: 'SYNC SCROLL', exact: true }).click(); await expect(page.getByRole('button', { name: 'SYNC SCROLL', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'preview-responsive-sweep.png') });
    await studio.getByRole('button', { name: 'LIVE PREVIEW', exact: true }).click(); await page.getByText('Canvas dimensions, zoom & reference', { exact: true }).click();
    const reference = join(evidence, `actual-preview-reference-${info.project.name}.png`); await iframe.screenshot({ path: reference }); await page.getByLabel('Approved reference screenshot').setInputFiles(reference); await expect(page.locator('.dev-reference-ghost')).toBeVisible();
    await page.getByRole('button', { name: 'DIFFERENCE VIEW', exact: true }).click(); await expect(page.locator('.dev-reference-ghost')).toHaveCSS('mix-blend-mode', 'difference');
    await page.getByLabel('Preview width', { exact: true }).fill('430'); await page.getByLabel('Preview height', { exact: true }).fill('932'); await page.getByRole('button', { name: 'APPLY SIZE' }).click(); await expect(iframe).toHaveAttribute('width', '430');
    await page.getByLabel('Real baseline URL').fill(`${origin}/services`); await page.getByRole('button', { name: 'COMPARE URL', exact: true }).click(); await expect(page.locator('iframe[title="User-supplied comparison baseline"]')).toHaveAttribute('src', `${origin}/services`);
    if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'preview-ghost-comparison.png') });
    await studio.getByRole('button', { name: 'EVIDENCE', exact: true }).click(); await expect(page.getByRole('button', { name: 'CAPTURE SCREENSHOT TO PROJECT' })).toBeDisabled();
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'EXPORT EVIDENCE METADATA' }).click(); const download = await downloaded; await download.saveAs(join(evidence, `preview-evidence-${info.project.name}.json`));
    const metrics = await page.locator('.dev-living-mark canvas').evaluate((element) => ({ particles: Number((element as HTMLElement).dataset.particles), sampleMs: Number((element as HTMLElement).dataset.sampleMs), motion: (element as HTMLElement).dataset.motion })); expect(metrics.particles).toBeGreaterThan(1000); expect(metrics.particles).toBeLessThanOrEqual(3600); writeFileSync(join(evidence, `particle-metrics-${info.project.name}.json`), JSON.stringify(metrics, null, 2));
  } finally { server.kill(); }
});

test('animated canonical mark has bounded particles, reuses its pool and pauses outside the render surface', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Measure the animation once; reduced motion is tested across all profiles.');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/build');
  const canvas = page.locator('.dev-living-mark canvas'); await expect(canvas).toHaveAttribute('data-motion', 'animated');
  const before = await canvas.evaluate((element) => ({ sampleMs: (element as HTMLElement).dataset.sampleMs, paints: Number((element as HTMLElement).dataset.paints) }));
  await page.evaluate(() => new Promise<void>((resolve) => { let frames = 0; const next = () => ++frames >= 60 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }));
  const measured = await canvas.evaluate((element) => ({ particles: Number((element as HTMLElement).dataset.particles), paints: Number((element as HTMLElement).dataset.paints), meanPaintMs: Number((element as HTMLElement).dataset.meanPaintMs), sampleMs: Number((element as HTMLElement).dataset.sampleMs) }));
  expect(measured.particles).toBeLessThanOrEqual(3600); expect(measured.paints - before.paints).toBeGreaterThan(10); expect(Number(before.sampleMs)).toBe(measured.sampleMs);
  const handle = await canvas.elementHandle(); await page.locator('.dev-nav-link[href="/build/apps"]').click(); expect(await handle!.evaluate((element) => element.isConnected)).toBe(true); await expect(canvas).toHaveAttribute('data-sample-ms', before.sampleMs!);
  await page.locator('.dev-living-mark').evaluate((element) => { (element as HTMLElement).style.display = 'none'; });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const paused = await canvas.getAttribute('data-paints');
  await page.evaluate(() => new Promise<void>((resolve) => { let frames = 0; const next = () => ++frames >= 20 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }));
  expect(await canvas.getAttribute('data-paints')).toBe(paused);
  await page.locator('.dev-living-mark').evaluate((element) => { (element as HTMLElement).style.display = ''; });
  await expect.poll(async () => Number(await canvas.getAttribute('data-paints'))).toBeGreaterThan(Number(paused));
  writeFileSync(join(evidence, 'particle-animation-measurement.json'), JSON.stringify({ measuredAt: new Date().toISOString(), source: 'Real browser animation; 60 browser frames, hidden box pause, persistent canvas across route navigation', ...measured }, null, 2));
});
