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

test('auth celebration requires same profile, fresh verified test and updated revision', async () => {
  const { freshVerifiedConnection } = await loadTypeScript('../src/lib/ai/provider-os/connection-label.ts');
  const previous = {...profile({}), id:'p1', providerId:'openai', version:1};
  const now = '2026-11-19T10:00:00.000Z';
  const next = {...previous, version:2, connection:{...EMPTY_CONNECTION, configuration:'CONFIGURED', auth:'AUTHENTICATED', discovery:'DISCOVERY_VERIFIED', lastTestedAt:now, lastSuccessAt:now}};
  assert.equal(freshVerifiedConnection(previous,next),true);
  assert.equal(freshVerifiedConnection(next,next),false);
  assert.equal(freshVerifiedConnection(previous,{...next,id:'p2'}),false);
  assert.equal(freshVerifiedConnection(previous,{...next,providerId:'grok'}),false);
  assert.equal(freshVerifiedConnection(previous,{...next,enabled:false}),false);
  assert.equal(freshVerifiedConnection(previous,{...next,connection:{...next.connection,auth:'FAILED'}}),false);
  assert.equal(freshVerifiedConnection(previous,{...next,connection:{...next.connection,discovery:'FAILED'}}),false);
  assert.equal(freshVerifiedConnection(previous,{...next,connection:{...next.connection,lastSuccessAt:null}}),false);
  assert.equal(freshVerifiedConnection({...previous,connection:{...previous.connection,lastTestedAt:now}},next),false);
});
