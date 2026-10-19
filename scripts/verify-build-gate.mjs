import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const errors = [];

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width > 1000 ? 900 : 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.slice(0, 160)}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 160)}`); });

    await page.goto(`${base}/build?intro=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const gate = page.locator('.dev-entry');
    assert.equal(await gate.count(), 1, `${width}: entry gate must open`);
    assert.equal(await gate.getAttribute('role'), 'dialog');
    assert.equal(await gate.getAttribute('aria-modal'), 'true');

    // The submit control must stay unavailable until there is something to submit.
    assert.equal(await page.locator('.dev-entry__field button').getAttribute('aria-disabled'), 'true', `${width}: submit must be unavailable before input`);

    // A starter fills the field and hands focus back to the input. Scoped to the
    // gate: the inert workspace behind it offers the same starters.
    await gate.getByRole('group', { name: 'Starter intents' }).getByRole('button', { name: 'WEB APP' }).click();
    await page.waitForTimeout(200);
    const value = await page.locator('#dev-entry-input').inputValue();
    assert.equal(value, 'Build a web app with React and TypeScript', `${width}: starter must fill the field`);
    assert.equal(await page.locator('#dev-entry-input').evaluate((el) => el === document.activeElement), true, `${width}: focus returns to the input`);
    assert.equal(await page.locator('.dev-entry__field button').getAttribute('aria-disabled'), 'false', `${width}: submit must become available`);

    // Entering the workspace must actually dismiss the gate.
    await page.locator('.dev-entry__field button').click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.dev-entry').count(), 0, `${width}: gate must dismiss after entry`);
    assert.equal(await page.locator('.dev-observatory').count(), 1, `${width}: the workspace must be revealed`);

    // The intent is remembered for this tab, so a plain reload does not re-ask.
    // (`?intro=1` is the explicit replay switch and always reopens the gate.)
    await page.goto(`${base}/build`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.dev-entry').count(), 0, `${width}: a stored intent must not re-ask`);

    // Escape must never dismiss the gate while it is up.
    await page.goto(`${base}/build?intro=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.locator('#dev-entry-input').press('Escape');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.dev-entry').count(), 1, `${width}: Escape must not dismiss the gate`);

    // No horizontal overflow at any width.
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);

    console.log(`build gate ${width}: starters, availability, entry, persistence, escape, overflow PASS`);
    await page.close();
  }

  // The starter list the gate offers is the same one the workspace offers.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${base}/build?intro=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const offered = await page.locator('.dev-entry__starters button').allInnerTexts();
  assert.deepEqual(offered, ['WEB APP', 'DESKTOP APP', 'ANDROID', 'SYSTEM TOOL', 'AI SYSTEM']);
  console.log(`starter list matches the shared registry: ${offered.join(', ')}`);
  await page.close();

  assert.deepEqual(errors, []);
  console.log('no console or page errors');
} finally {
  await browser.close();
}