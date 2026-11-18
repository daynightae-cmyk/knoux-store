import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const evidence = path.resolve('references/build V3/qa/final-verified');
const viewports = [[1920, 1080], [1366, 768], [768, 1024], [390, 844], [360, 800]] as const;
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Atmosphere regression verification'));
});

test('shared atmosphere is bounded, click-through, static in reduced motion and suspended when hidden', async ({ page }) => {
  await page.goto('/build');
  const sky = page.locator('canvas.dev-cosmic-field');
  await expect(sky).toHaveAttribute('data-motion', 'stable');
  await expect(sky).toHaveCSS('pointer-events', 'none');
  const stable = await sky.getAttribute('data-paints');
  await page.waitForTimeout(250);
  expect(await sky.getAttribute('data-paints')).toBe(stable);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(sky).toHaveAttribute('data-motion', 'animated');
  await expect.poll(async () => Number(await sky.getAttribute('data-paints'))).toBeGreaterThan(Number(stable));
  expect(Number(await sky.getAttribute('data-stars'))).toBeLessThanOrEqual(120);
  expect(Number(await sky.getAttribute('data-mean-paint-ms'))).toBeLessThan(16);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const paused = await sky.getAttribute('data-paints');
  await page.waitForTimeout(250);
  expect(await sky.getAttribute('data-paints')).toBe(paused);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => Number(await sky.getAttribute('data-paints'))).toBeGreaterThan(Number(paused));
});

test('real launcher activation coalesces repeated triggers and follows all four phases before settling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/build');
  const stage = page.locator('.dev-shell__stage');
  await expect(page.locator('canvas.dev-cosmic-field')).toHaveAttribute('data-motion', 'animated');
  // Record the actual render lifecycle; no fake generation or model API is supplied.
  await page.evaluate(() => {
    const host = document.querySelector('.dev-shell__stage')!;
    const evidence: { phase: string; at: number }[] = [];
    (window as unknown as { activationEvidence: typeof evidence }).activationEvidence = evidence;
    new MutationObserver(() => {
      const phase = (host as HTMLElement).dataset.cosmicPhase ?? 'idle';
      if (evidence.at(-1)?.phase !== phase) evidence.push({ phase, at: performance.now() });
    }).observe(host, { attributes: true, attributeFilter: ['data-cosmic-phase'] });
  });
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.getByRole('button', { name: 'New build', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Project launcher' })).toBeVisible();
  await expect(stage).toHaveAttribute('data-cosmic-energy', 'active');
  await page.keyboard.press('Escape');
  // Getting Started is another real activation entry, but cannot stack with New build.
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.locator('.dev-nav-link[href="/build"]').click();
  await expect(stage).not.toHaveAttribute('data-cosmic-energy', 'active', { timeout: 7000 });
  const measured = await page.evaluate(() => (window as unknown as { activationEvidence: { phase: string; at: number }[] }).activationEvidence);
  expect(measured.map(item => item.phase)).toEqual(['prepare', 'gather', 'discharge', 'settle', 'idle']);
  const start = measured[0].at;
  for (const [index, lower, upper] of [[1, 230, 400], [2, 680, 900], [3, 1480, 1750], [4, 4700, 5300]]) {
    expect(measured[index].at - start).toBeGreaterThanOrEqual(lower);
    expect(measured[index].at - start).toBeLessThan(upper);
  }
});

test('native Web Audio requires trusted activation, suspends hidden audio and persists mute', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('knoux-build-sound', 'on');
    const NativeAudio = window.AudioContext;
    const contexts: AudioContext[] = [];
    (window as unknown as { measuredAudioContexts: AudioContext[] }).measuredAudioContexts = contexts;
    window.AudioContext = class extends NativeAudio {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
  });
  await page.goto('/build');
  const sound = page.getByRole('button', { name: 'Build sound', exact: true });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  });
  expect(await page.evaluate(() => (window as unknown as { measuredAudioContexts: AudioContext[] }).measuredAudioContexts.length)).toBe(0);
  await sound.click(); await expect(sound).toHaveAttribute('aria-pressed', 'true');
  const audioState = () => page.evaluate(() => (window as unknown as { measuredAudioContexts: AudioContext[] }).measuredAudioContexts.map(context => context.state));
  await expect.poll(audioState).toEqual(['running']);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(audioState).toEqual(['suspended']);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200); expect(await audioState()).toEqual(['suspended']);
  await page.locator('.dev-crumb').click(); await expect.poll(audioState).toEqual(['running']);
  await sound.click(); await expect(sound).toHaveAttribute('aria-pressed', 'false'); await expect.poll(audioState).toEqual(['closed']);
  expect(await page.evaluate(() => localStorage.getItem('knoux-build-sound'))).toBe('off');
});

test('compact provider orbit remains visible, pageable and touch-sized below 1000 pixels', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Explicit compact widths are measured here.');
  for (const width of [999, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1024 }); await page.goto('/build/providers');
    const shortcuts = page.getByRole('complementary', { name: 'Provider shortcuts' });
    await expect(shortcuts).toBeVisible();
    const next = shortcuts.getByRole('button', { name: 'Next provider orbit page' });
    await expect(next).toBeEnabled();
    const first = await shortcuts.locator('[class*="orbitOptions"] button').allTextContents();
    for (const button of await shortcuts.getByRole('button').all()) {
      const box = await button.boundingBox(); if (!box) continue;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await next.click();
    expect(await shortcuts.locator('[class*="orbitOptions"] button').allTextContents()).not.toEqual(first);
    await shortcuts.getByRole('button', { name: 'Previous provider orbit page' }).click();
    expect(await shortcuts.locator('[class*="orbitOptions"] button').allTextContents()).toEqual(first);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

for (const [width, height] of viewports) {
  test(`final live layout and two motion recordings ${width}x${height}`, async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop', 'This test supplies the five required exact viewports.');
    test.setTimeout(60000); mkdirSync(evidence, { recursive: true });
    const git = process.platform === 'win32' ? 'C:/Program Files/Git/cmd/git.exe' : '/usr/bin/git';
    const sourceSha = execFileSync(git, ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
    const buildId = readFileSync(path.resolve(process.env.NEXT_DIST_DIR ?? '.next', 'BUILD_ID'), 'utf8').trim();
    const records: { route: string; file: string | null; stars: number; meanPaintMs: number; cues: string[] }[] = [];
    for (const route of ['/build', '/build/engineering']) {
      const context = await browser.newContext({ baseURL, viewport: { width, height }, reducedMotion: 'no-preference', hasTouch: width < 500,
        ...(process.env.KNOUX_RECORD_VIDEO === '1' ? { recordVideo: { dir: evidence, size: { width, height } } } : {}) });
      await context.addInitScript(() => {
        sessionStorage.setItem('knoux-dev-entry-intent', 'Measured live layout; no generated runtime claim');
        const cues: string[] = [];
        (window as unknown as { measuredAtmosphereCues: string[] }).measuredAtmosphereCues = cues;
        window.addEventListener('knoux:atmosphere-cue', event => cues.push((event as CustomEvent<string>).detail));
      });
      const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator('canvas.dev-cosmic-field')).toHaveAttribute('data-motion', 'animated');
      await expect(page.locator('#main-content h1')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const scene = route.includes('engineering') ? 'engineering' : 'landing';
      await page.screenshot({ path: path.join(evidence, `${scene}-${width}x${height}.png`) });
      if (scene === 'landing') {
        if (width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
        await page.getByRole('button', { name: 'New build', exact: true }).click(); await page.keyboard.press('Escape');
      } else {
        const bounds = await page.locator('.dev-shell__stage').boundingBox();
        if (bounds) {
          if (width < 500) await page.touchscreen.tap(bounds.x + bounds.width * .8, bounds.y + bounds.height * .35);
          else await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .35);
        }
      }
      await page.waitForTimeout(scene === 'engineering' ? 22000 : 5200);
      const cues = await page.evaluate(() => (window as unknown as { measuredAtmosphereCues: string[] }).measuredAtmosphereCues);
      expect(cues).toContain(scene === 'engineering' ? 'ambient-storm' : 'activation-storm');
      const metrics = await page.locator('canvas.dev-cosmic-field').evaluate(element => ({ stars: Number((element as HTMLElement).dataset.stars), meanPaintMs: Number((element as HTMLElement).dataset.meanPaintMs) }));
      expect(metrics.stars).toBeLessThanOrEqual(width < 700 ? 48 : 120); expect(metrics.meanPaintMs).toBeLessThan(16);
      expect(errors).toEqual([]); const video = page.video(); await context.close();
      const file = video ? path.join(evidence, `${scene}-${width}x${height}.webm`) : null;
      if (video && file) await video.saveAs(file);
      records.push({ route, file: file ? path.relative(process.cwd(), file).replaceAll('\\', '/') : null, cues, ...metrics });
    }
    writeFileSync(path.join(evidence, `motion-${width}x${height}.json`), JSON.stringify({ sourceSha, buildId, baseURL, width, height, scope: 'Real served UI, launcher, ambient storm and engineering decoration; not generated file execution or deployment', audioRecorded: false, records }, null, 2));
  });
}
