import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

/**
 * Mission selection must follow a choice, not the pointer.
 *
 * PR #53 is merged: hover-selection was removed from MissionPath because the
 * handoff tracked whatever the pointer passed over. This asserts the contract
 * rather than trusting the comment.
 */
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width > 1000 ? 900 : 844 } });
    await page.goto(`${base}/solutions`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2400);

    const stations = page.locator('.mission-path__station');
    const count = await stations.count();
    assert.ok(count > 1, `${width}: the mission path must list missions`);

    const selection = () => page.locator('.mission-path__station[aria-pressed="true"] strong').innerText();
    const handoff = () => page.locator('#selected-mission-title').innerText();

    assert.equal(await stations.nth(0).getAttribute('aria-pressed'), 'true', `${width}: first mission starts selected`);
    const before = await selection();

    // Hovering must not select. Anything the pointer merely passes over is not
    // a choice, and on touch it is not even a deliberate pointer position.
    for (const index of [1, 2, 3]) {
      await stations.nth(index).hover();
      await page.waitForTimeout(250);
      assert.equal(await selection(), before, `${width}: hovering mission ${index + 1} must not select it`);
    }

    // A click must select, and the handoff must follow it.
    await stations.nth(2).click();
    await page.waitForTimeout(450);
    const clicked = await selection();
    assert.notEqual(clicked, before, `${width}: clicking a mission must select it`);
    assert.equal(await handoff(), clicked, `${width}: the handoff must follow the chosen mission`);

    // Hovering after a choice must not move it either.
    await stations.nth(4).hover();
    await page.waitForTimeout(250);
    assert.equal(await selection(), clicked, `${width}: hovering after a choice must not move the selection`);

    // The keyboard path is a first-class choice, not a fallback.
    await stations.nth(2).focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    const arrowed = await selection();
    assert.notEqual(arrowed, clicked, `${width}: arrow keys must move the selection`);
    assert.equal(await handoff(), arrowed, `${width}: the handoff must follow the keyboard choice`);

    // Every station is a real button, so it is reachable and operable natively.
    const tags = await stations.evaluateAll((els) => els.map((el) => el.tagName.toLowerCase()));
    assert.deepEqual([...new Set(tags)], ['button'], `${width}: stations must be buttons`);

    console.log(`solutions ${width}: hover does not select, click and arrow keys do, handoff follows PASS`);
    await page.close();
  }
} finally {
  await browser.close();
}