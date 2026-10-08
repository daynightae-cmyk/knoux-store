import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

test('probe exceptions redact credential-like strings in the entire browser response', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const original = globalThis.fetch;
  const marker = 'sk-testonly-securityregression000';
  globalThis.fetch = async () => { throw new Error(`Authorization: Bearer ${marker}`); };
  try {
    const result = await registry.getAdapter('deepseek').probe({ DEEPSEEK_API_KEY: 'test-only-credential' });
    assert.equal(result.authenticated, false);
    assert.equal(result.error.category, 'NETWORK');
    assert.equal(JSON.stringify(result).includes(marker), false);
    assert.match(result.error.safeMessage, /REDACTED/);
  } finally { globalThis.fetch = original; }
});

test('a rejected arena adapter cannot serialize a raw exception to the browser', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { POST } = await loadTypeScript('../src/app/api/build/ai/arena/route.ts');
  const adapter = registry.getAdapter('deepseek');
  const generate = adapter.generate, configured = adapter.isConfigured;
  const environment = process.env.KNOUX_BUILD_ENVIRONMENT;
  const marker = 'sk-testonly-arenaregression000';
  process.env.KNOUX_BUILD_ENVIRONMENT = 'local';
  adapter.isConfigured = () => true;
  adapter.generate = async () => { throw new Error(`Authorization: Bearer ${marker}`); };
  try {
    const response = await POST(new Request('http://localhost/api/build/ai/arena', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'Explicit isolated contract fixture', selections: [
        { providerId: 'deepseek', modelId: 'fixture' }, { providerId: 'deepseek', modelId: 'fixture' },
      ] }),
    }));
    const result = await response.json();
    assert.equal(JSON.stringify(result).includes(marker), false);
    assert.equal(result.results.length, 2);
    for (const entry of result.results) {
      assert.equal(entry.response.ok, false);
      assert.equal(entry.response.error.message, 'Arena generation failed.');
      assert.equal(entry.response.error.safeMessage, 'Generation failed in arena.');
    }
  } finally {
    adapter.generate = generate; adapter.isConfigured = configured;
    if (environment === undefined) delete process.env.KNOUX_BUILD_ENVIRONMENT;
    else process.env.KNOUX_BUILD_ENVIRONMENT = environment;
  }
});
