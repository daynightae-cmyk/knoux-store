import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { validateOpenAICredential, validateProviderCredential } = await loadTypeScript('../src/lib/build/provider-probe.ts');
const credential = 'sk-validation-canary';

test('each supported provider is probed on its own official authenticated endpoint with its own header format', async () => {
  const targets = {
    openai: ['https://api.openai.com/v1/models', { authorization: 'Bearer ' + credential }],
    anthropic: ['https://api.anthropic.com/v1/models?limit=1', { 'x-api-key': credential, 'anthropic-version': '2023-06-01' }],
    gemini: ['https://generativelanguage.googleapis.com/v1beta/models', { 'x-goog-api-key': credential }],
    openrouter: ['https://openrouter.ai/api/v1/auth/key', { authorization: 'Bearer ' + credential }],
    groq: ['https://api.groq.com/openai/v1/models', { authorization: 'Bearer ' + credential }],
    deepseek: ['https://api.deepseek.com/v1/models', { authorization: 'Bearer ' + credential }],
    moonshot: ['https://api.moonshot.ai/v1/models', { authorization: 'Bearer ' + credential }],
    cloudflare: ['https://api.cloudflare.com/client/v4/accounts/abc123xy/ai/models', { authorization: 'Bearer ' + credential }],
    'opencode-console-v2': ['https://opencode.ai/console/api/v2/config', { authorization: 'Bearer oc_sk_canary' }],
  };
  for (const [providerId, [url, headers]] of Object.entries(targets)) {
    const secret = providerId === 'opencode-console-v2' ? 'oc_sk_canary' : credential;
    const result = await validateProviderCredential(providerId, secret, {
      accountId: providerId === 'cloudflare' ? 'abc123xy' : undefined,
      fetcher: async (requested, options) => {
        assert.equal(requested, url, providerId);
        assert.equal(options.method ?? 'GET', 'GET', providerId);
        assert.deepEqual(options.headers, headers, providerId);
        assert.equal(options.redirect, 'error');
        assert.equal(options.cache, 'no-store');
        assert.ok(options.signal instanceof AbortSignal);
        return new Response('upstream-body-with-secret-' + secret);
      },
    });
    assert.equal(result.providerId, providerId);
    assert.equal(result.status, 'authenticated');
    assert.equal(result.httpStatus, 200);
    assert.ok(!JSON.stringify(result).includes(secret), providerId + ' leaked the secret');
    assert.ok(!JSON.stringify(result).includes('upstream-body'), providerId + ' leaked the upstream body');
  }
});

test('cloudflare requires a well-formed account ID and opencode requires a service-account token', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return new Response(); };
  assert.equal((await validateProviderCredential('cloudflare', credential, { accountId: '../me', fetcher })).status, 'refused');
  assert.equal((await validateProviderCredential('cloudflare', credential, { fetcher })).status, 'refused');
  assert.equal((await validateProviderCredential('opencode-console-v2', 'zen-legacy-key', { fetcher })).status, 'refused');
  assert.equal(calls, 0);
});

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
