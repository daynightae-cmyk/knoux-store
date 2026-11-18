import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { loadTypeScript } from './load.mjs';

// Explicit browser contracts against the already-running server. No server,
// credentials, screenshots, persistent browser profile or report is created.
const { intelligenceFixture, planFixture, contractPlan, decision } = await loadTypeScript('../e2e/fixtures/build-generator.ts');
const baseURL = process.env.KNOUX_GENERATION_TEST_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true, ...(process.env.KNOUX_E2E_BROWSER_CHANNEL === 'chrome' ? { channel: 'chrome' } : {}) });
try {
  for (const width of [1440, 820, 390, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await intelligenceFixture(page);
    await planFixture(page);
    let releasePrepare;
    const prepared = new Promise((resolve) => { releasePrepare = resolve; });
    let sawPrepare;
    const prepareEntered = new Promise((resolve) => { sawPrepare = resolve; });
    const blockedPrepare = async (route) => {
      sawPrepare();
      await prepared;
      await route.fulfill({ json: { decision } }).catch(() => {});
    };
    await page.route('**/api/build/ai/prepare', blockedPrepare);
    let streams = 0, fallbacks = 0;
    page.on('request', (request) => { if (request.url().endsWith('/api/build/ai/stream')) streams++; if (request.url().endsWith('/api/build/ai/generate')) fallbacks++; });
    await page.goto(`${baseURL}/build`);
    await expect(page.getByText('Reading canonical model metadata…', { exact: true })).toHaveCount(0);
    await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'LISTENING');
    await page.getByLabel('Describe what you want to build', { exact: true }).fill('Explicit test-only lifecycle requirement');
    await page.getByRole('button', { name: 'Generate engineering plan', exact: true }).click();
    await prepareEntered;
    const homeCancel = page.getByRole('button', { name: 'Cancel planning', exact: true });
    await expect(homeCancel).toBeVisible();
    const homeTarget = await homeCancel.boundingBox();
    assert.ok(homeTarget.width >= 44 && homeTarget.height >= 44);
    await homeCancel.click();
    await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'CANCELLED');
    releasePrepare();
    await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage', 'CANCELLED');
    assert.equal(streams, 0);
    assert.equal(fallbacks, 0);
    await page.unroute('**/api/build/ai/prepare', blockedPrepare);
    await page.getByRole('button', { name: 'Generate engineering plan', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Engineering plan', exact: true })).toBeVisible();
    assert.equal(streams, 1);
    assert.equal(fallbacks, 0);
    await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'PREVIEW', exact: true }).click();
    if (width <= 900) await page.getByRole('group', { name: 'Compact workspace panel' }).getByRole('button', { name: 'Generation', exact: true }).click();
    const monitor = page.getByRole('region', { name: 'Generation Process', exact: true });
    await expect(monitor).toBeVisible();
    const rail = monitor.getByRole('region', { name: 'Generation evidence lifecycle' });
    await expect(rail.locator('li')).toHaveCount(7);
    await expect(rail).toContainText('READY FOR REVIEW');
    await expect(rail.locator('li').filter({ hasText: 'Real file execution' })).toContainText('UNCONNECTED');
    await expect(rail.locator('li').filter({ hasText: 'Deployment' })).toContainText('UNCONNECTED');
    const revisions = [];
    await page.route('**/api/build/ai/stream', (route) => {
      revisions.push(route.request().postDataJSON());
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ delta: JSON.stringify(contractPlan('academy')), done: true })}\n\n` });
    });
    await monitor.getByLabel('What should change?', { exact: true }).fill('Add an academy learning flow');
    await monitor.getByRole('button', { name: 'Generate revised plan', exact: true }).click();
    await expect.poll(() => revisions.length).toBe(1);
    await expect(monitor.getByRole('status')).toHaveText('PLANNED');
    assert.equal(revisions.length, 1);
    const prompt = JSON.parse(revisions[0].messages[0].content);
    assert.equal(prompt.requirement, 'Add an academy learning flow');
    assert.ok(prompt.previousProposal.GOAL.length > 0);
    assert.deepEqual(prompt.tools, []);
    let releaseMonitor, sawMonitor;
    const heldMonitor = new Promise((resolve) => { releaseMonitor = resolve; });
    const monitorEntered = new Promise((resolve) => { sawMonitor = resolve; });
    await page.route('**/api/build/ai/prepare', async (route) => { sawMonitor(); await heldMonitor; await route.fulfill({ json: { decision } }).catch(() => {}); });
    const streamCount = streams;
    await monitor.getByRole('button', { name: 'Generate engineering plan', exact: true }).click();
    await monitorEntered;
    const monitorCancel = monitor.getByRole('button', { name: 'Cancel planning', exact: true });
    const monitorTarget = await monitorCancel.boundingBox();
    assert.ok(monitorTarget.width >= 44 && monitorTarget.height >= 44);
    await monitorCancel.click();
    await expect(monitor.getByRole('status')).toHaveText('CANCELLED');
    releaseMonitor();
    assert.equal(streams, streamCount);
    assert.equal(fallbacks, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    for (const button of await monitor.getByRole('button').all()) {
      if (!(await button.isVisible())) continue;
      const box = await button.boundingBox();
      assert.ok(box.height >= 44, `Primary monitor target must be >=44px at ${width}px`);
    }
    console.log(`PASS explicit browser contract ${width}px: real cancel, no fallback, proposal revision, seven-step rail, primary targets, no overflow`);
    await page.close();
  }
} finally {
  await browser.close();
}
