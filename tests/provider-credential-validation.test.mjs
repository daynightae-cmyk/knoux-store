import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { validateOpenAICredential } = await loadTypeScript('../src/lib/build/provider-probe.ts');
const credential = 'sk-validation-canary';

test('validates only against the provider models endpoint and never returns credential data', async () => {
  const result = await validateOpenAICredential(credential, {
    async fetcher(url, options) {
      assert.equal(url, 'https://api.openai.com/v1/models');
      assert.equal(options.method ?? 'GET', 'GET');
      assert.equal(options.headers.authorization, 'Bearer ' + credential);
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(credential);
    },
  });
  assert.equal(result.providerId, 'openai');
  assert.equal(result.httpStatus, 200);
  assert.equal(result.status, 'authenticated');
  assert.ok(Date.parse(result.at));
  assert.ok(!JSON.stringify(result).includes(credential));
});

test('distinguishes provider refusals from unavailable transport without leaking response bodies', async () => {
  for (const httpStatus of [401, 403, 429, 500]) {
    const result = await validateOpenAICredential(credential, {
      fetcher: async () => new Response(credential, { status: httpStatus }),
    });
    assert.equal(result.status, 'refused');
    assert.equal(result.httpStatus, httpStatus);
    assert.ok(!JSON.stringify(result).includes(credential));
  }
  const unavailable = await validateOpenAICredential(credential, {
    fetcher: async () => { throw new Error(credential); },
  });
  assert.equal(unavailable.status, 'unreachable');
  assert.equal(unavailable.httpStatus, null);
  assert.ok(!JSON.stringify(unavailable).includes(credential));
});

test('a cancelled validation does not call the provider', async () => {
  let calls = 0;
  const result = await validateOpenAICredential(credential, {
    signal: AbortSignal.abort(),
    fetcher: async () => { calls++; return new Response(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.status, 'cancelled');
});
