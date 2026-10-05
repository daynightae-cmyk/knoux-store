import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeCapability } from '../src/lib/growth/connectors/boundary.ts';
import { CAPABILITIES } from '../src/lib/growth/connectors/registry.ts';
import { can } from '../src/lib/growth/rbac.ts';

test('creative roles cannot view or edit a client campaign budget', () => {
  for (const role of ['DESIGNER', 'CONTENT_CREATOR']) {
    const principal = { userId: 'creative-user', role, clientIds: ['assigned'] };
    for (const permission of ['budget.view', 'budget.edit']) {
      assert.equal(can({ principal, permission, clientId: 'assigned' }).allowed, false);
    }
    assert.equal(can({ principal, permission: 'creative.view', clientId: 'assigned' }).allowed, true);
    assert.equal(can({ principal, permission: 'creative.view', clientId: 'other' }).allowed, false);
  }
});

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
