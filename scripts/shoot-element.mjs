import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Scroll one element into view and photograph it.
 *
 * A full-page screenshot of a long route is stitched after the page has already
 * scrolled back to the top, so reveal-gated blocks can appear empty in it while
 * being perfectly present for a visitor. This photographs the element itself,
 * in the viewport, at the position a visitor actually meets it.
 *
 *   node scripts/shoot-element.mjs /creative ".dev-state" creative-devstate
 */
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const route = process.argv[2] ?? '/';
const selector = process.argv[3] ?? '.dev-state';
const name = process.argv[4] ?? 'element';
mkdirSync('visual-audit', { recursive: true });

const browser = await chromium.launch();
try {
  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2400);
    const target = page.locator(selector).first();
    if ((await target.count()) === 0) {
      console.log(`${label}: ${selector} not found on ${route}`);
      await page.close();
      continue;
    }
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    const state = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: s.opacity, classes: el.className, text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 70) };
    });
    await page.screenshot({ path: `visual-audit/${name}-${label}.png` });
    console.log(`${label}: opacity=${state.opacity} classes="${state.classes}" text="${state.text}"`);
    await page.close();
  }
} finally {
  await browser.close();
}