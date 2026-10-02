import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const bytes = await page.screenshot({ path: testInfo.outputPath(name) });
  await mkdir('references/visual-audit/closure', { recursive: true });
  await writeFile(`references/visual-audit/closure/${testInfo.project.name}-${name}`, bytes);
}

test('founder identity uses the recovered image, static particles and accessible controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/about#about-founder');
  const founder = page.getByRole('region', { name: 'Sadek Elgazar.' });
  await founder.scrollIntoViewIfNeeded();
  await expect(founder.getByRole('heading')).toBeVisible();
  const image = founder.getByRole('img', { name: /Sadek Elgazar, founder/ });
  await expect(image).toHaveAttribute('src', '/founder/sadek-elgazar.jpg');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 460)).toBe(true);
  const canvas = founder.locator('canvas');
  await expect(canvas).toHaveAttribute('data-render-state', 'static');
  const count = Number(await canvas.getAttribute('data-particle-count'));
  expect(count).toBeGreaterThan(500);
  expect(count).toBeLessThanOrEqual(testInfo.project.name === 'mobile' ? 2000 : 5500);
  const draws = await canvas.getAttribute('data-draw-count');
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-draw-count')).toBe(draws);
  await capture(page, testInfo, 'about-founder-particles.png');
  const toggle = founder.getByRole('button', { name: /View photograph/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(founder.locator('[data-portrait-mode]')).toHaveAttribute('data-portrait-mode', 'photograph');
  await expect(image).toHaveCSS('opacity', '1');
  await expect(canvas).toHaveAttribute('data-render-state', 'paused');
  await capture(page, testInfo, 'about-founder-photograph.png');
  await founder.getByRole('button', { name: /View particle portrait/ }).click();
  await expect(canvas).toHaveAttribute('data-render-state', 'static');
  await expect(founder.getByRole('link', { name: /Contact KNOuX/ })).toHaveAttribute('href', '/contact');
  await expect(founder.getByRole('link', { name: /Explore verified work/ })).toHaveAttribute('href', '/work');
  const accessibility = await new AxeBuilder({ page }).include('#about-founder')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('portrait assembles, reacts to motion preference and stops offscreen', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/about#about-founder');
  const founder = page.locator('#about-founder');
  await founder.scrollIntoViewIfNeeded();
  const canvas = founder.locator('canvas');
  try { await expect(canvas).toHaveAttribute('data-render-state', 'assembling'); }
  catch (error) {
    const lifecycle = await canvas.evaluate(async element => {
      const rect = element.getBoundingClientRect();
      const intersection = await new Promise<{ intersecting: boolean; ratio: number }>(resolve => {
        const observer = new IntersectionObserver(([entry]) => {
          observer.disconnect(); resolve({ intersecting: entry.isIntersecting, ratio: entry.intersectionRatio });
        }, { threshold: .05 });
        observer.observe(element);
      });
      return { state: element.getAttribute('data-render-state'), reason: element.getAttribute('data-pause-reason'),
        hidden: document.hidden, visibility: document.visibilityState,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, intersection };
    });
    await testInfo.attach('portrait-lifecycle.json', { body: JSON.stringify(lifecycle), contentType: 'application/json' });
    console.log('Portrait lifecycle failure', JSON.stringify(lifecycle));
    throw error;
  }
  await capture(page, testInfo, 'about-founder-assembling.png');
  await expect(canvas).toHaveAttribute('data-render-state', 'animated');
  const before = Number(await canvas.getAttribute('data-draw-count'));
  await page.waitForTimeout(350);
  expect(Number(await canvas.getAttribute('data-draw-count'))).toBeGreaterThan(before);
  // Offscreen suspension matters: this route already has its own WebGL room.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(canvas).toHaveAttribute('data-render-state', 'paused');
  const paused = await canvas.getAttribute('data-draw-count');
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-draw-count')).toBe(paused);
  await founder.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-render-state', 'animated');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try { await expect(canvas).toHaveAttribute('data-render-state', 'static'); }
  catch (error) {
    const preference = await page.evaluate(() => ({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      visibility: document.visibilityState, canvas: document.querySelector('#about-founder canvas')?.getAttribute('data-render-state') }));
    await testInfo.attach('portrait-preference.json', { body: JSON.stringify(preference), contentType: 'application/json' });
    console.log('Portrait preference failure', JSON.stringify(preference));
    throw error;
  }
  const frozen = await canvas.getAttribute('data-draw-count');
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-draw-count')).toBe(frozen);
  expect(errors).toEqual([]);
});

test('unsupported particle canvas retains the actual photograph and founder content', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      return args[0] === '2d' ? null : original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/about#about-founder');
  const founder = page.locator('#about-founder');
  await founder.scrollIntoViewIfNeeded();
  const image = founder.getByRole('img', { name: /Sadek Elgazar, founder/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveCSS('opacity', '1');
  await expect(founder.getByRole('heading')).toBeVisible();
  await expect(founder.getByRole('link', { name: /Contact KNOuX/ })).toBeVisible();
});

test('Founder record leads to the integrated identity section', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('button', { name: /ENTER KNOuX/ }).click();
  await expect(page.locator('.origin-room')).toHaveClass(/origin-room--ready/);
  await page.getByRole('group', { name: 'Inspect the institution' }).getByRole('button', { name: /Founder/ }).click();
  await page.getByRole('link', { name: /Meet the founder/ }).click();
  await expect(page).toHaveURL(/#about-founder$/);
  await expect(page.locator('#founder-title')).toBeInViewport();
});
