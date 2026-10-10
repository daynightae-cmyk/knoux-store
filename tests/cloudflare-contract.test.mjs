import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { cloudflareProvider } = await loadTypeScript('../src/lib/domain/providers/cloudflare.ts');
test('Cloudflare uses the documented check contract and preserves distinct verdicts', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/test-account/registrar/domain-check');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const requested = JSON.parse(options.body).domains;
    assert.equal(requested.length, 6);
    return Response.json({ success: true, result: { domains: [
      { name: 'standard.com', registrable: true, tier: 'standard', pricing: { currency: 'USD', registration_cost: '10.11', renewal_cost: '12.34' } },
      { name: 'premium.com', registrable: true, tier: 'premium', pricing: { currency: 'USD', registration_cost: '1250' } },
      { name: 'taken.com', registrable: false, reason: 'domain_unavailable' },
      { name: 'unsupported.uk', registrable: false, reason: 'extension_not_supported_via_api' },
      { name: 'unknown.com', registrable: false, reason: 'new_reason' },
      { name: 'malformed.com', available: true, premium: true },
      { name: 'unsolicited.com', registrable: true }, null,
    ] } });
  };
  try {
    const result = await cloudflareProvider({ accountId: 'test-account', token: 'test-token' }).check(['standard.com', 'premium.com', 'taken.com', 'unsupported.uk', 'unknown.com', 'malformed.com']);
    assert.equal(result.ok, true);
    assert.deepEqual(result.results.map(item => item.state), ['available', 'premium', 'unavailable', 'unsupported', 'unknown', 'unknown']);
    assert.equal(result.results[0].registration.amount, 1011);
    assert.equal(result.results[0].renewal.amount, 1234);
    assert.equal(result.results[1].renewal, null);
  } finally { globalThis.fetch = original; }
});

test('Cloudflare legacy, malformed and unsuccessful envelopes never establish availability', async () => {
  const original = globalThis.fetch;
  try {
    for (const payload of [{ success: true, result: [{ id: 'example.com', available: true }] }, { success: false, result: { domains: [] } }, { success: true, result: { domains: [null] } }]) {
      globalThis.fetch = async () => Response.json(payload);
      const result = await cloudflareProvider({ accountId: 'test', token: 'test' }).check(['example.com']);
      assert.equal(result.ok, false);
      assert.equal(result.failure, 'error');
    }
  } finally { globalThis.fetch = original; }
});
