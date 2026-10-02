import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const evidence = join(process.cwd(), 'references/build-cinematic/qa');
const routes = ['/build', '/build/apps', '/build/services', '/build/pipeline', '/build/deployments', '/build/docs', '/build/terminal', '/build/powershell', '/build/providers', '/build/settings'];
const widths = [1440, 1280, 1024, 768, 390];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Build a web app with React'));
  mkdirSync(evidence, { recursive: true });
});

for (const width of widths) {
  test(`Build routes retain navigation and fit ${width}px`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && !/status of (401|403)/.test(message.text())) errors.push(message.text()); });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('#main-content h1')).toHaveCount(1);
      await expect(page.locator(route === '/build' ? '.dev-stage-head' : '.dev-crumb')).toBeVisible();
      await expect(page.locator(`.dev-nav-link[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.locator('#main-content').evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      if (info.project.name === 'desktop' && (route === '/build' || width === 1440 && ['/build/terminal', '/build/powershell', '/build/apps'].includes(route))) {
        if (route === '/build') await expect(page.locator('.dev-cosmic-field')).toBeAttached();
        const name = route === '/build' ? `build-${width === 1440 ? 'desktop' : width === 768 ? 'tablet' : width === 390 ? 'mobile' : 'desktop'}-${width}.png` : `${route.slice(7)}-1440.png`;
        await page.screenshot({ path: join(evidence, name) });
      }
    }
    expect(errors).toEqual([]);
  });
}

test('Composer compiles real categories and the registry remains interactive', async ({ page }) => {
  await page.goto('/build');
  await page.getByRole('button', { name: 'DESKTOP APP', exact: true }).click();
  await expect(page.getByLabel('Describe what you want to build', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Compile intent', exact: true }).click();
  await expect(page.locator('.dev-intent-reading')).toContainText('DESKTOP');
  await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'REGISTRY' }).click();
  const products = page.getByRole('group', { name: 'KNOuX products' }).getByRole('button');
  await products.nth(1).click();
  await expect(products.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.dev-machine__detail h3')).not.toBeEmpty();
});

test('Refused access stays honest in the cinematic preview', async ({ page }) => {
  await page.goto('/build');
  await expect(page.locator('.dev-access-note')).toContainText('require an account');
  await expect(page.locator('.dev-sidebar__facts')).toContainText('SIGN IN REQUIRED');
  await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'PREVIEW' }).click();
  await expect(page.locator('.bo-blocked__title')).toContainText('NO ACTIVE RUNTIME');
  await expect(page.locator('.dev-stage-surface iframe')).toHaveCount(0);
});

test('Drawer traps focus, closes on Escape and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/build');
  const toggle = page.getByRole('button', { name: 'Open workspace navigation' });
  await toggle.click();
  await expect(page.getByRole('dialog', { name: 'KNOuX DEV workspace' })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#dev-sidebar'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.locator('.dev-nav-link[href="/build/apps"]').click();
  await expect(page).toHaveURL(/\/build\/apps/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Entry gate compiles intent, contains keyboard focus and launches projects', async ({ page }) => {
  await page.goto('/build?intro=1');
  const gate = page.getByRole('dialog', { name: 'What are you here to build?' });
  await expect(gate).toBeVisible();
  await page.getByLabel('Your intent', { exact: true }).fill('Build a web app');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.dev-entry'))).toBe(true);
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  await expect(gate).toHaveCount(0);
  await expect(page.locator('.dev-intent-reading')).toContainText('WEB');
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.getByRole('button', { name: 'New build', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Project launcher' })).toBeVisible();
});

test('Build shell and composer pass automated accessibility at desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/build');
    await expect(page.locator('.dev-access-note')).toBeVisible();
    const result = await new AxeBuilder({ page }).include('.dev-cinematic').analyze();
    expect(result.violations).toEqual([]);
  }
});

test('Reduced motion paints a stable, nonempty KNOuX particle subject', async ({ page }) => {
  await page.goto('/build');
  const particles = page.locator('.dev-living-mark canvas');
  const signature = () => particles.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
    return opaque;
  });
  await expect.poll(signature).toBeGreaterThan(1000);
  const initial = await signature();
  // Waiting two browser frames checks a stopped renderer without a timing sleep.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await signature()).toBe(initial);
});

test('Real local preview loads, resizes, refreshes and inspects DOM facts', async ({ page, request }, info) => {
  test.setTimeout(180_000);
  const port = Number(process.env.KNOUX_E2E_PORT ?? 3311) + 1;
  const origin = `http://127.0.0.1:${port}`;
  // The existing local access policy authorizes this developer-owned checkout.
  // No API interception or fabricated provider/project state is used.
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: process.cwd(), env: { ...process.env, KNOUX_BUILD_ENVIRONMENT: 'local' }, stdio: 'ignore' });
  try {
    await expect.poll(async () => { try { return (await request.get(`${origin}/build`)).status(); } catch { return 0; } }, { timeout: 30_000 }).toBe(200);
    await page.goto(`${origin}/build`);
    await expect(page.locator('.dev-sidebar__facts')).toContainText('LOCAL');
    await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'PREVIEW' }).click();
    const iframe = page.locator('iframe[title^="Live preview"]');
    await expect(iframe).toHaveCount(1);
    await page.getByRole('group', { name: 'Preview viewport' }).getByRole('button', { name: 'MOBILE' }).click();
    await expect(iframe).toHaveAttribute('width', '390');
    await page.getByRole('group', { name: 'Preview viewport' }).getByRole('button', { name: 'TABLET' }).click();
    await expect(iframe).toHaveAttribute('width', '768');
    await page.getByRole('group', { name: 'Preview viewport' }).getByRole('button', { name: 'DESKTOP' }).click();
    await expect(iframe).toHaveAttribute('width', '1600');
    await page.getByRole('group', { name: 'Preview route' }).getByRole('button', { name: '/products', exact: true }).click();
    await expect(iframe).toHaveAttribute('src', `${origin}/products`);
    await expect(page.frameLocator('iframe[title^="Live preview"]').locator('h1')).toBeVisible();
    const refresh = page.waitForResponse((response) => response.url() === `${origin}/products` && response.request().resourceType() === 'document');
    await page.getByRole('button', { name: 'REFRESH', exact: true }).click();
    expect((await refresh).status()).toBe(200);
    await page.getByRole('button', { name: 'INSPECT', exact: true }).click();
    await page.frameLocator('iframe[title^="Live preview"]').locator('h1').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.bo-preview')).toContainText('h1');
    await expect(page.locator('.bo-preview')).toContainText('font-size');
    if (info.project.name === 'desktop') await page.screenshot({ path: join(evidence, 'preview-1440.png') });
  } finally { server.kill(); }
});
