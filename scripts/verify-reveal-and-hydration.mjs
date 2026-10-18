import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

/**
 * Production gate for the two defects that hid content rather than styling it.
 *
 * Both were invisible in a screenshot and absent from every styling check, so
 * they are asserted directly against the built application.
 */
const base = process.env.BASE_URL ?? 'http://localhost:3050';
const browser = await chromium.launch();
const problems = [];

try {
  // 1. Every reveal-gated block must reach full opacity after the page is read.
  const routes = [
    '/solutions', '/creative', '/growth', '/engineering', '/web', '/products',
    '/work', '/labs', '/about', '/contact', '/wordpress',
  ];
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    // Read the page at a reader's pace, which is how a visitor meets it.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 280));
      }
    });
    await page.waitForTimeout(800);
    // Content inside a closed <details> is not on the page yet; judging it here
    // would report a block that is correctly waiting to be opened.
    const notRendered = (el) => Boolean(el.closest('details:not([open]), [hidden]'));
    const afterReading = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')]
      .filter((el) => !el.closest('details:not([open]), [hidden]'))
      .filter((el) => Number.parseFloat(getComputedStyle(el).opacity) < 0.9).length);

    // Then the impatient case: straight to the bottom, skipping everything in
    // between. Anything scrolled past before it was observed must still appear.
    const impatient = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await impatient.goto(base + route, { waitUntil: 'domcontentloaded' });
    await impatient.waitForTimeout(1500);
    await impatient.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await impatient.waitForTimeout(1200);
    const afterJump = await impatient.evaluate(() => [...document.querySelectorAll('[data-reveal]')]
      .filter((el) => !el.closest('details:not([open]), [hidden]'))
      .filter((el) => Number.parseFloat(getComputedStyle(el).opacity) < 0.9).length);
    await impatient.close();

    // Everything behind a disclosure must appear once the disclosure is opened.
    await page.locator('.evidence-disclosure summary').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(900);
    const afterOpening = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('details[open] [data-reveal]')];
      return shown.filter((el) => Number.parseFloat(getComputedStyle(el).opacity) < 0.9).length;
    });

    if (afterReading || afterJump || afterOpening) {
      problems.push(`${route}: ${afterReading} transparent after reading, ${afterJump} after jumping to the end, ${afterOpening} after opening a disclosure`);
    } else {
      console.log(`${route}: every reveal-gated block is visible, read, skipped and opened`);
    }
    await page.close();
  }

  // 2. No hydration mismatch on any auth route.
  for (const route of ['/login', '/register', '/forgot-password', '/update-password', '/account']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const hydration = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|did not match|server rendered HTML/i.test(message.text())) {
        hydration.push(message.text().slice(0, 160));
      }
    });
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    if (hydration.length) problems.push(`${route}: hydration -> ${hydration[0]}`);
    else console.log(`${route}: hydrates cleanly`);
    await page.close();
  }

  // 3. The chamber still animates: the pre-paint arming must survive.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const armed = await page.evaluate(() => document.documentElement.dataset.chamber);
  if (armed !== 'armed') problems.push(`/login: chamber was not armed before hydration (got ${armed})`);
  else console.log('/login: the chamber still arms itself before the first paint');
  await page.close();
} finally {
  await browser.close();
}

if (problems.length) {
  console.error('\nFAILURES:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('\nall reveal and hydration checks pass against the production build');
}