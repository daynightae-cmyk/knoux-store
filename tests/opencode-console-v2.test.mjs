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

test('Console transport refuses missing models, foreign endpoints and unsupported SDK protocols before inference', async t => {
  let value = config(), calls = 0;
  t.mock.method(globalThis, 'fetch', async url => { calls++; assert.equal(url, 'https://opencode.ai/console/api/v2/config'); return Response.json(value); });
  const adapter = new OpenCodeConsoleV2Adapter();
  assert.equal((await adapter.generate({ ...request, modelId: 'missing' }, env)).error.category, 'MODEL_NOT_FOUND');
  value.providers.opencode.settings.baseURL = 'http://127.0.0.1:52440';
  assert.equal((await adapter.generate(request, env)).error.category, 'UNSUPPORTED_CAPABILITY');
  value = config(); value.providers.opencode.package = 'aisdk:@ai-sdk/anthropic';
  const chunks = [];
  for await (const chunk of adapter.stream(request, env)) chunks.push(chunk);
  assert.equal(chunks[0].error.category, 'UNSUPPORTED_CAPABILITY');
  assert.equal(calls, 3);
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
