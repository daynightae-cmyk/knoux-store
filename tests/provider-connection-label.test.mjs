import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { providerConnectionLabel } = await loadTypeScript('../src/lib/ai/provider-os/connection-label.ts');
const { EMPTY_CONNECTION } = await loadTypeScript('../src/lib/ai/provider-os/policy.ts');
const profile = patch => ({ enabled: true, connection: { ...EMPTY_CONNECTION, ...patch } });

test('saved credentials and authentication alone do not establish a verified connection', () => {
  assert.equal(providerConnectionLabel(), 'NOT_CONFIGURED');
  assert.equal(providerConnectionLabel(profile({})), 'NOT_CONFIGURED');
  assert.equal(providerConnectionLabel(profile({ configuration: 'CONFIGURED' })), 'SAVED_UNTESTED');
  assert.equal(providerConnectionLabel(profile({ configuration: 'CONFIGURED', auth: 'AUTHENTICATED' })), 'SAVED_UNTESTED');
  assert.equal(providerConnectionLabel(profile({ configuration: 'CONFIGURED', auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED' })), 'VERIFIED');
  assert.equal(providerConnectionLabel(profile({ auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED' })), 'NOT_CONFIGURED');
});

test('disabled, failed, blocked and budget states override retained success facts', () => {
  const success = { configuration: 'CONFIGURED', auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED' };
  assert.equal(providerConnectionLabel({ ...profile(success), enabled: false }), 'DISABLED');
  assert.equal(providerConnectionLabel(profile({ ...success, health: 'BLOCKED' })), 'UNAVAILABLE');
  assert.equal(providerConnectionLabel(profile({ ...success, health: 'LOCAL_RUNTIME_UNAVAILABLE' })), 'UNAVAILABLE');
  assert.equal(providerConnectionLabel(profile({ ...success, auth: 'FAILED' })), 'FAILED');
  assert.equal(providerConnectionLabel(profile({ ...success, discovery: 'FAILED' })), 'FAILED');
  for (const category of ['RATE_LIMIT', 'QUOTA_EXCEEDED', 'BILLING_REQUIRED', 'PERMISSION_DENIED']) {
    assert.equal(providerConnectionLabel(profile({ ...success, lastErrorCategory: category })), category === 'RATE_LIMIT' ? 'RATE_LIMITED' : category);
  }
});
