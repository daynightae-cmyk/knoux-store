import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeCapability } from '../src/lib/growth/connectors/boundary.ts';
import { CAPABILITIES } from '../src/lib/growth/connectors/registry.ts';

test('configured mutating connectors are refused without network access', async () => {
  const mutations = CAPABILITIES.filter(capability => capability.risk === 'MUTATING');
  assert.ok(mutations.length > 0);
  for (const capability of mutations) {
    let calls = 0;
    const result = await invokeCapability(capability.id, {
      env: Object.fromEntries(capability.requiredEnv.map(name => [name, 'test-secret'])),
      fetchImpl: async () => { calls++; throw new Error('Unexpected network call'); },
    });
    assert.equal(result.ok, false);
    assert.equal(result.failure, 'UNAVAILABLE');
    assert.equal(calls, 0);
    assert.ok(!JSON.stringify(result).includes('test-secret'));
  }
});
