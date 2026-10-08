import { test, expect } from '@playwright/test';
import { intelligenceFixture, planFixture, generateContract } from './fixtures/build-generator';

test('one persistent sky follows real request boundaries and returns to ambient outside Build', async ({ page }) => {
  await intelligenceFixture(page);
  let release: (() => void) | undefined;
  const preparing = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/build/ai/prepare', async (route) => { await preparing; await route.fulfill({ json: { decision: { selected: null, blocker: 'Explicit provider-blocked fixture' }, state: 'PROVIDER_BLOCKED' } }); });
  await page.goto('/build');
  const sky = page.locator('.store-starfield');
  await sky.evaluate((element) => element.setAttribute('data-persistence-proof', 'canonical-sky'));
  await expect(sky).toHaveAttribute('data-starfield-phase', 'ambient');
  await generateContract(page); await expect(sky).toHaveAttribute('data-starfield-phase', 'resolving');
  release?.(); await expect(sky).toHaveAttribute('data-starfield-phase', 'blocked');
  await planFixture(page); await generateContract(page);
  await expect(sky).toHaveAttribute('data-starfield-phase', 'planned');
  await expect(sky).toHaveAttribute('data-persistence-proof', 'canonical-sky');
  expect(Number(await sky.getAttribute('data-source-nodes'))).toBeGreaterThan(14);
  await expect(sky).toHaveCount(1);
  const menu = page.getByRole('button', { name: 'Open workspace navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.dev-sidebar__brand a[href="/"]').click();
  await expect(sky).toHaveAttribute('data-starfield-phase', 'ambient');
  await expect(sky).toHaveAttribute('data-persistence-proof', 'canonical-sky');
});

test('real stream boundaries drive routing then generating, and reduced motion remains static', async ({ page }) => {
  await intelligenceFixture(page);
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { decision: { selected: { providerId: 'gemini', modelId: 'contract-thinking' }, reasons: [], fallbackChain: [] } } }));
  let release: (() => void) | undefined;
  const response = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/build/ai/stream', async (route) => { await response; await route.fulfill({ contentType: 'text/event-stream', body: 'data: {"delta":"","done":true,"error":{"safeMessage":"Explicit fixture refusal"}}\n\n' }); });
  await page.goto('/build');
  const sky = page.locator('.store-starfield');
  await generateContract(page); await expect(sky).toHaveAttribute('data-starfield-phase', 'routing');
  const hash = () => sky.evaluate((canvas: HTMLCanvasElement) => { let result = 2166136261; for (const value of canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data) result = Math.imul(result ^ value, 16777619); return result; });
  await expect(sky).toHaveAttribute('data-motion', 'static');
  await expect(sky).toHaveAttribute('data-painted-phase', 'routing');
  // Prime readback: Chrome can migrate the backing store on its first pixel read.
  await hash();
  const initial = await hash(); const paints = await sky.getAttribute('data-static-paint-count');
  await page.waitForTimeout(200); expect(await sky.getAttribute('data-static-paint-count')).toBe(paints); expect(await hash()).toBe(initial);
  release?.(); await expect(sky).toHaveAttribute('data-starfield-phase', 'blocked');
  expect(await sky.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
});
