import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.KNOUX_WP_URL ?? 'http://localhost:3101';
const OUT = 'references/store-20261123/qa/screen-01';
const VIEWPORTS = [
  { width: 1672, height: 941 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${BASE}/wordpress`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-wordpress-experience]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);

  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    };
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scene: rect('[data-scene="wordpress-welcome"]'),
      header: rect('h1'),
      gateway: rect('[class*="gateway"]'),
      library: rect('[class*="library"]'),
      monitor: rect('[class*="monitor"]'),
      enter: rect('[data-enter-studio]'),
      features: rect('nav[aria-label="Studio shortcuts"]'),
      overflow: [...document.querySelectorAll('body *')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && (box.right > innerWidth + 2 || box.left < -2);
        })
        .slice(0, 8)
        .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 48)} @${Math.round(element.getBoundingClientRect().left)}..${Math.round(element.getBoundingClientRect().right)}`),
    };
  });

  const shot = `${OUT}/after-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: shot });

  const state = { viewport, shot, errors, metrics };
  if (viewport.width === 1440) {
    await page.screenshot({ path: `${OUT}/after-1440x900-full.png`, fullPage: true });
    await page.click('[data-enter-studio]');
    await page.waitForTimeout(900);
    state.studioHash = await page.evaluate(() => window.location.hash);
    state.studioVisible = await page.isVisible('[aria-label="WordPress Studio"]');
    state.arrivalHidden = await page.isHidden('[data-scene="wordpress-welcome"]');
    await page.screenshot({ path: `${OUT}/after-studio-1440x900.png` });
    await page.goBack();
    await page.waitForTimeout(700);
    state.backArrivalVisible = await page.isVisible('[data-scene="wordpress-welcome"]');
    state.backHash = await page.evaluate(() => window.location.hash);
    state.focusAfterBack = await page.evaluate(() => document.activeElement?.hasAttribute('data-enter-studio') ?? false);

    await page.click('[data-enter-studio]');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    state.escapeReturnsArrival = await page.isVisible('[data-scene="wordpress-welcome"]');
    state.escapeHash = await page.evaluate(() => window.location.hash);

    const deep = await context.newPage();
    await deep.goto(`${BASE}/wordpress#domain`, { waitUntil: 'domcontentloaded' });
    await deep.waitForSelector('[data-wordpress-experience][data-phase="studio"]', { timeout: 15000 });
    await deep.waitForTimeout(700);
    state.deepLinkJourney = await deep.locator('[aria-label="WordPress Studio"] nav [aria-pressed="true"]').first().innerText().catch(() => null);
    await deep.screenshot({ path: `${OUT}/after-deeplink-domain-1440x900.png` });
    await deep.close();
  }
  report.push(state);
  await context.close();
}

await writeFile(`${OUT}/after-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
