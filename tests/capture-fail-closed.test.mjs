import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function exercise(file, mode) {
  const source = (await readFile(new URL(`../scripts/${file}`, import.meta.url), 'utf8')).replace(/^import .*;\s*$/gm, '');
  const events = new Map();
  const node = { click: async () => { if (mode === 'state') throw new Error('missing action'); } };
  const page = { on: (name, fn) => events.set(name, fn), goto: async () => ({ ok: () => mode !== 'http', status: () => mode === 'http' ? 500 : 200 }),
    waitForTimeout: async () => {}, evaluate: async () => mode === 'overflow' ? 30 : 0, screenshot: async () => {}, close: async () => {},
    getByRole: () => ({ ...node, getByRole: () => node }), locator: () => ({ ...node, first: () => ({ ...node, hover: async () => { if (mode === 'state') throw new Error('missing action'); } }) }) };
  const chromium = { launch: async () => ({ newPage: async () => page, close: async () => {} }) };
  const process = { env: {}, argv: ['node', 'capture', 'qa', 'build=/build;broken::click|#absent'], exitCode: undefined };
  await new AsyncFunction('chromium', 'prepareVisualOutputDirectory', 'process', 'console', source)(chromium, () => 'qa', process, { log() {} });
  return process.exitCode;
}
test('route capture fails closed on HTTP or requested-state failure; success is still distinguishable', async () => {
  assert.equal(await exercise('visual-capture.mjs', 'http'), 1);
  assert.equal(await exercise('visual-capture.mjs', 'state'), 1);
  assert.equal(await exercise('visual-capture.mjs', 'ok'), undefined);
});
test('workspace capture rejects overflow and non-success HTTP rather than returning green', async () => {
  assert.equal(await exercise('capture-build-workspace.mjs', 'overflow'), 1);
  await assert.rejects(exercise('capture-build-workspace.mjs', 'http'), /HTTP 500/);
  assert.equal(await exercise('capture-build-workspace.mjs', 'ok'), undefined);
});
