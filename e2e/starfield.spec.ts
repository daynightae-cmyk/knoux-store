import { test, expect } from '@playwright/test';

test('store sky fades, rests for reduced motion, and pauses in a hidden tab', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/contact');
  const sky = page.locator('.store-starfield');
  await expect(sky).toHaveAttribute('data-motion', 'animated');
  const sample = () => sky.evaluate((canvas: HTMLCanvasElement) => {
    const bytes = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    let lit = 0;
    for (let i = 3; i < bytes.length; i += 4) {
      hash = Math.imul(hash ^ bytes[i], 16777619);
      if (bytes[i] > 0) lit++;
    }
    return { hash, lit, area: canvas.width * canvas.height };
  });
  const first = await sample();
  expect(first.lit).toBeGreaterThan(100);
  expect(first.lit / first.area).toBeLessThan(0.015);
  await expect.poll(async () => (await sample()).hash).not.toBe(first.hash);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sky).toHaveAttribute('data-motion', 'static');
  const quiet = await sample();
  await page.waitForTimeout(300);
  expect((await sample()).hash).toBe(quiet.hash);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(sky).toHaveAttribute('data-motion', 'animated');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(sky).toHaveAttribute('data-motion', 'paused');
  const paused = await sample();
  await page.waitForTimeout(300);
  expect((await sample()).hash).toBe(paused.hash);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(sky).toHaveAttribute('data-motion', 'animated');
  await expect.poll(async () => (await sample()).hash).not.toBe(paused.hash);
  // Decorative light cannot cover an input's interaction layer.
  expect(await sky.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  const input = page.locator('input[name="name"]');
  await input.fill('Sky readability check');
  await expect(input).toHaveValue('Sky readability check');
});

test('the same star canvas survives native navigation and stays viewport bounded', async ({ page }) => {
  await page.goto('/');
  const sky = page.locator('.store-starfield');
  await expect(sky).toHaveAttribute('data-motion', 'static');
  await sky.evaluate(element => element.setAttribute('data-navigation-proof', 'same-sky'));
  await page.locator('footer a[href="/contact"]').first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(sky).toHaveAttribute('data-navigation-proof', 'same-sky');
  const geometry = await sky.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  expect(geometry.width).toBe(geometry.viewportWidth);
  expect(geometry.height).toBe(geometry.viewportHeight);
});
