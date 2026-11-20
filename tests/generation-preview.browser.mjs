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
    await page.getByRole('button', { name: 'Open Preview & Code' }).click();
    const split = page.getByRole('region', { name: 'Generation result: preview and code' });
    const splitPreview = split.locator('.bo-pane').first();
    await expect(splitPreview).toBeVisible();
    const mountedPreview = await splitPreview.elementHandle();
    await split.getByRole('button', { name: 'Code', exact: true }).click();
    await expect(splitPreview).toBeHidden();
    assert.equal(await mountedPreview.evaluate((element) => element.isConnected), true);
    await split.getByRole('button', { name: 'Split', exact: true }).click();
    await expect(splitPreview).toBeVisible();
    await split.getByRole('button', { name: 'Close split view' }).click();
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
  await generatedProjectScenario();
} finally {
  await browser.close();
}

async function generatedProjectScenario() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await intelligenceFixture(page);
    const generatedPlan = {
      ...contractPlan('delivery platform'),
      generatedProject: {
        kind: 'static-web',
        files: [
          { path: 'index.html', content: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Contract static app</title></head><body><main><h1>Reviewed contract fixture</h1></main></body></html>' },
          { path: 'assets/app.js', content: 'document.querySelector("h1").dataset.contract = "reviewed";' },
        ],
      },
    };
    await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'ROUTING', decision } }));
    await page.route('**/api/build/ai/stream', (route) => route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ delta: JSON.stringify(generatedPlan), done: true })}\n\n` }));
    let appliedBody = null;
    let operationId = null;
    const preview = { url: 'about:blank', origin: 'http://127.0.0.1:4555', processId: 4242, httpStatus: 200, readinessMs: 5, expiresAt: '2026-11-19T00:15:00Z', blocker: null };
    const receipt = (state, patch = {}) => ({
      operationId, ownerId: 'fixture-owner', kind: 'static-web', planSha256: 'a'.repeat(64), state,
      sourceSha256: 'd'.repeat(64),
      source: { bytes: 226, sha256: 'd'.repeat(64), files: [{ path: 'index.html', bytes: 158, sha256: 'b'.repeat(64) }, { path: 'assets/app.js', bytes: 68, sha256: 'c'.repeat(64) }] },
      compiled: { bytes: 226, sha256: 'f'.repeat(64), files: [{ path: 'index.html', bytes: 158, sha256: 'b'.repeat(64) }, { path: 'assets/app.js', bytes: 68, sha256: 'c'.repeat(64) }], build: { command: 'knoux-static-validate@1 · no shell', exitCode: 0, status: 'passed', evidence: 'Fixture only.', durationMs: null } },
      files: [{ path: 'index.html', bytes: 158, sha256: 'b'.repeat(64) }, { path: 'assets/app.js', bytes: 68, sha256: 'c'.repeat(64) }],
      bytes: 226,
      build: { command: 'knoux-static-validate@1 · no shell', exitCode: 0, status: 'passed', evidence: 'Fixture only.', durationMs: null },
      export: { path: 'artifacts/knoux-static-app.zip', bytes: 320, sha256: 'e'.repeat(64), format: 'zip', durationMs: null },
      bundle: { path: 'artifacts/knoux-static-app.zip', bytes: 320, sha256: 'e'.repeat(64), format: 'zip', durationMs: null },
      deploy: { target: 'local', status: 'not-requested', confirmation: null, reference: null, blocker: null, error: null, appliedAt: null },
      preview, externalReference: `generated-static:${operationId}`,
      createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:01Z', error: null, ...patch,
    });
    await page.route('**/api/build/generated-projects', async (route) => {
      if (route.request().method() !== 'POST') return route.fulfill({ json: { enabled: true, kind: 'static-web', limits: { files: 32 } } });
      appliedBody = route.request().postDataJSON();
      operationId = appliedBody.operationId;
      return route.fulfill({ status: 201, json: { receipt: receipt('ready') } });
    });
    await page.route(/\/api\/build\/generated-projects\/[0-9a-f-]+$/, (route) => {
      assert.equal(route.request().method(), 'DELETE');
      return route.fulfill({ json: { receipt: receipt('cancelled', { preview: { ...preview, processId: null, blocker: 'Preview stopped by the operator.' } }) } });
    });
    await page.goto(`${baseURL}/build`);
    await page.getByLabel('Describe what you want to build', { exact: true }).fill('Explicit generated-project browser contract');
    await page.getByRole('button', { name: 'Generate engineering plan', exact: true }).click();
    await page.getByRole('button', { name: 'Review plan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Reviewed static application', exact: true });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('static-web · 2 files');
    const apply = panel.getByRole('button', { name: 'Apply reviewed static project', exact: true });
    await expect(apply).toBeDisabled();
    await panel.getByRole('checkbox').check();
    await panel.getByLabel(/Type APPLY STATIC PROJECT to authorize/).fill('APPLY STATIC PROJECT');
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(panel).toContainText('PREVIEW LIVE');
    await expect(page.getByRole('region', { name: 'Generation evidence lifecycle' })).toContainText('PREVIEW LIVE');
    assert.equal(appliedBody.confirmation, 'APPLY STATIC PROJECT');
    assert.equal(appliedBody.artifact.kind, 'static-web');
    assert.equal(appliedBody.artifact.files.length, 2);
    assert.match(operationId, /^[0-9a-f-]{36}$/);
    await panel.getByRole('button', { name: 'Stop preview', exact: true }).click();
    await expect(panel).toContainText('CANCELLED');
    await expect(panel).toContainText('Preview stopped by the operator.');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    console.log('PASS generated-project review, exact confirmation, preview receipt and operator stop at 1440px');
  } finally {
    await page.close();
  }
}
