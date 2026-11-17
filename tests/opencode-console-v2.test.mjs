import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { OpenCodeConsoleV2Adapter } = await import('../src/lib/ai/adapters/opencode-console-v2.ts');
const env = { OPENCODE_CONSOLE_TOKEN: 'oc_sk_TEST_ONLY_NEVER_LIVE' };
const request = { providerId: 'opencode-console-v2', modelId: 'kimi-k2.6', messages: [{ role: 'user', content: 'Contract fixture only' }] };
const config = () => ({ providers: { opencode: { package: 'aisdk:@ai-sdk/openai-compatible', settings: { baseURL: 'https://opencode.ai/inference/openai/v1' }, headers: { 'x-opencode-org-id': 'org_fixture' }, models: { 'kimi-k2.6': { name: 'Fixture model' } } } }, mcp: { private: { token: 'NEVER_PROJECT_THIS' } } });

test('Console V2 never borrows Go/Zen credentials and never probes without its service account', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Unexpected network'); });
  const adapter = new OpenCodeConsoleV2Adapter();
  assert.equal((await adapter.probe({ OPENCODE_GO_API_KEY: 'TEST_ONLY', OPENCODE_ZEN_API_KEY: 'TEST_ONLY' })).authenticated, false);
  assert.equal((await adapter.probe({ OPENCODE_CONSOLE_TOKEN: 'user_token' })).authenticated, false);
  assert.equal(calls, 0);
});

test('Console authentication uses only non-inference config; discovery projects no private inventory', async t => {
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://opencode.ai/console/api/v2/config');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.authorization, `Bearer ${env.OPENCODE_CONSOLE_TOKEN}`);
    return Response.json(config());
  });
  const adapter = new OpenCodeConsoleV2Adapter();
  assert.equal((await adapter.probe(env)).authenticated, true);
  const result = await adapter.discoverModels(env);
  assert.equal(result.models.length, 1);
  assert.equal(result.models[0].capabilities.streaming, 'UNKNOWN');
  assert.equal(result.models[0].pricing.inputPerMillion, null);
  assert.doesNotMatch(JSON.stringify(result), /NEVER_PROJECT_THIS|oc_sk_|org_fixture/);
});

test('Console transport accepts newer config without package/baseURL and routes to fixed inference endpoint', async t => {
  let value = config();
  // Newer Console V2 config: no package, no settings.baseURL — only name, headers, models.
  delete value.providers.opencode.package;
  delete value.providers.opencode.settings;
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, 'https://opencode.ai/console/api/v2/config');
    return Response.json(value);
  });
  const adapter = new OpenCodeConsoleV2Adapter();
  // Missing model still refused before inference.
  assert.equal((await adapter.generate({ ...request, modelId: 'missing' }, env)).error.category, 'MODEL_NOT_FOUND');
  // Newer config without package/baseURL is accepted; org header present so we proceed to inference.
  // The chat endpoint isn't mocked, so fetch throws → NETWORK error (not the old UNSUPPORTED_CAPABILITY protocol blocker).
  const result = await adapter.generate(request, env);
  assert.notEqual(result.error?.category, 'UNSUPPORTED_CAPABILITY');
  assert.equal(result.error?.category, 'NETWORK');
});

test('Console transport still refuses disabled models before inference', async t => {
  let value = config(), calls = 0;
  value.providers.opencode.models['kimi-k2.6'] = { name: 'Fixture model', disabled: true };
  t.mock.method(globalThis, 'fetch', async url => {
    calls++;
    assert.equal(url, 'https://opencode.ai/console/api/v2/config');
    return Response.json(value);
  });
  const adapter = new OpenCodeConsoleV2Adapter();
  const result = await adapter.generate(request, env);
  assert.equal(result.error.category, 'AUTHENTICATION');
  assert.equal(result.error.httpStatus, 403);
  assert.match(result.error.safeMessage, /Model access is disabled/);
  assert.match(result.error.safeMessage, /opencode\.ai\/console/);
  assert.equal(calls, 1);
});

test('Console chat contract uses a per-request workspace header and sanitizes authentication failures', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push(url);
    if (url.endsWith('/config')) return Response.json(config());
    assert.equal(url, 'https://opencode.ai/inference/openai/v1/chat/completions');
    assert.equal(init.headers['x-opencode-org-id'], 'org_fixture');
    return Response.json({ choices: [{ message: { content: 'Fixture response' }, finish_reason: 'stop' }], model: request.modelId });
  });
  assert.equal((await new OpenCodeConsoleV2Adapter().generate(request, env)).text, 'Fixture response');
  assert.equal(calls.length, 2);
  t.mock.method(globalThis, 'fetch', async () => new Response('oc_sk_SECRET in error body', { status: 403 }));
  const result = await new OpenCodeConsoleV2Adapter().probe(env);
  assert.equal(result.authenticated, false);
  assert.doesNotMatch(JSON.stringify(result), /oc_sk_SECRET/);
});

const zenIdentity = await import('../src/lib/ai/adapters/opencode-zen.ts');

test('legacy Zen recovery identity stays distinct from Go and Console V2 without claiming runtime support', () => {
  assert.equal(zenIdentity.OPENCODE_ZEN_ID, 'opencode-zen');
  assert.equal(zenIdentity.OPENCODE_GO_ID, 'opencode-go');
  assert.equal(zenIdentity.OPENCODE_ZEN_ENV, 'OPENCODE_ZEN_API_KEY');
  assert.equal(zenIdentity.OPENCODE_GO_ENV, 'OPENCODE_GO_API_KEY');
  assert.notEqual(zenIdentity.OPENCODE_ZEN_BASE_URL, zenIdentity.OPENCODE_GO_BASE_URL);
  assert.equal(zenIdentity.OPENCODE_ZEN_STATUS.identity, 'PARTIAL');
  assert.equal(zenIdentity.OPENCODE_ZEN_STATUS.auth, 'UNTESTED');
  assert.equal(zenIdentity.OPENCODE_ZEN_STATUS.inference, 'BLOCKED');
});
