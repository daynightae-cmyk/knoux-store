import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Capability bridge and RBAC — behavioural.
 *
 * Two guarantees are under test. First, a capability cannot be made to look
 * verified by configuration alone. Second, a client role cannot reach another
 * client's workspace, and the check happens before the permission check so that
 * no permission set can accidentally grant cross-client reach.
 */

const {
  CAPABILITIES,
  capabilityById,
  resolveCapability,
  resolveAll,
  summariseCapabilities,
  requiredEnvNames,
} = await import('../src/lib/growth/connectors/registry.ts');

const {
  credentialPresence,
  describeCapabilities,
} = await import('../src/lib/growth/connectors/boundary.ts');

const {
  can,
  canAccessClient,
  visibleClientIds,
  canApproveOwnSubmission,
  isSensitivePlatform,
  ROLE_PERMISSIONS,
} = await import('../src/lib/growth/rbac.ts');

/* ------------------------------------------- configuration is not proof */

test('resolving a fully configured capability does not mark it LIVE_VERIFIED', () => {
  const capability = capabilityById('meta.campaigns.list');
  const status = resolveCapability(capability, {
    META_APP_ID: 'set',
    META_APP_SECRET: 'set',
  });

  assert.equal(
    status.resolved,
    'ADAPTER_READY',
    'being configured only makes a capability callable, not verified',
  );
  assert.notEqual(status.resolved, 'LIVE_VERIFIED');
  assert.match(status.remediation, /live authenticated call has not yet been made/i);
});

test('the type admits no LIVE_VERIFIED readiness from a static resolve', () => {
  for (const status of resolveAll({})) {
    assert.notEqual(status.resolved, 'LIVE_VERIFIED');
  }
  assert.equal(summariseCapabilities(resolveAll({ META_APP_ID: 'x', META_APP_SECRET: 'y' })).liveVerified, 0);
});

test('a capability with no credentials resolves to CONFIG_REQUIRED and names them', () => {
  const status = resolveCapability(capabilityById('meta.campaigns.list'), {});
  assert.equal(status.resolved, 'CONFIG_REQUIRED');
  assert.deepEqual(status.missingEnv.sort(), ['META_APP_ID', 'META_APP_SECRET']);
  assert.match(status.remediation, /META_APP_ID/);
});

test('a platform limitation is BLOCKED and no configuration can change it', () => {
  const communityPost = capabilityById('community.post');
  assert.ok(communityPost.platformLimitation, 'the reason must be recorded, not implied');
  const resolved = resolveCapability(communityPost, {});
  assert.equal(resolved.resolved, 'BLOCKED');
  assert.match(resolved.remediation, /No action available/i);
  assert.match(resolved.blockedReason, /no general Groups API/i);
});

test('WhatsApp sending is blocked because it is unimplemented, not unconfigured', () => {
  const send = capabilityById('whatsapp.send');
  assert.equal(send.requiredEnv.length, 0, 'a blocked capability must not be unblockable by a secret');
  assert.match(send.platformLimitation, /no sending code path exists/i);
});

test('credential presence reports counts and never a value', () => {
  const presence = credentialPresence(capabilityById('meta.campaigns.list'), { META_APP_ID: 'secret-value' });
  assert.equal(presence.present, false);
  assert.equal(presence.presentCount, 1);
  assert.equal(presence.requiredCount, 2);
  assert.deepEqual(presence.missing, ['META_APP_SECRET']);
  assert.equal(
    JSON.stringify(presence).includes('secret-value'),
    false,
    'presence must not be able to leak the configured value',
  );
});

test('the client-safe projection carries no secret field', () => {
  const described = describeCapabilities({ META_APP_ID: 'super-secret', META_APP_SECRET: 'also-secret' });
  const serialised = JSON.stringify(described);
  assert.equal(serialised.includes('super-secret'), false);
  assert.equal(serialised.includes('also-secret'), false);
  for (const entry of described) {
    assert.equal('token' in entry, false);
    assert.equal('secret' in entry, false);
  }
});

test('every capability in the registry is declared with a return statement', () => {
  for (const capability of CAPABILITIES) {
    assert.ok(capability.returns.length > 0, `${capability.id} must state what it returns`);
    assert.ok(capability.providerApi.length > 0);
  }
});

test('the mission\'s named capabilities are all present', () => {
  const ids = new Set(CAPABILITIES.map((capability) => capability.id));
  for (const required of [
    'meta.account.list',
    'meta.pages.list',
    'meta.instagram.list',
    'meta.ads.accounts',
    'meta.campaigns.list',
    'meta.campaign.read',
    'meta.insights.read',
    'meta.leads.read',
    'google.ads.accounts',
    'google.ads.campaigns',
    'google.ads.performance',
    'google.business.locations',
    'google.business.performance',
    'google.analytics.report',
    'google.searchconsole.performance',
    'community.search_public',
    'community.verify',
    'community.import',
    'community.refresh',
    'whatsapp.account.status',
    'whatsapp.templates',
    'whatsapp.leads',
  ]) {
    assert.ok(ids.has(required), `${required} must be registered`);
  }
});

test('required environment names are deduplicated and sorted', () => {
  const names = requiredEnvNames();
  assert.deepEqual(names, [...new Set(names)].sort());
  assert.ok(names.includes('META_APP_ID'));
  assert.ok(names.includes('KNOUX_AGENT_ENDPOINT'));
});

/* ------------------------------------------------------------------- RBAC */

const owner = { userId: 'owner@x', role: 'OWNER', clientIds: [] };
const manager = { userId: 'manager@x', role: 'MANAGER', clientIds: ['cl_a'] };
const clientUser = { userId: 'client@x', role: 'CLIENT', clientIds: ['cl_a'] };
const viewer = { userId: 'viewer@x', role: 'VIEWER', clientIds: ['cl_a'] };

test('a client role cannot reach another client workspace', () => {
  const decision = canAccessClient(clientUser, 'cl_b');
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /not bound/i);
});

test('the client boundary is checked before the permission', () => {
  // A CLIENT holds campaign.approve. It still must not reach cl_b.
  assert.ok(ROLE_PERMISSIONS.CLIENT.includes('campaign.approve'));
  const decision = can({
    principal: clientUser,
    permission: 'campaign.approve',
    clientId: 'cl_b',
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /not bound/i);
});

test('an internal role sees every client', () => {
  assert.equal(canAccessClient(owner, 'anything').allowed, true);
  assert.equal(canAccessClient(manager, 'cl_unassigned').allowed, true, 'MANAGER scope is all clients');
});

test('a client-scoped action without a client is refused, not defaulted', () => {
  const decision = can({ principal: clientUser, permission: 'campaign.view' });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /scoped to a client/i);
});

test('a viewer holds no write permission', () => {
  for (const permission of [
    'campaign.approve',
    'campaign.launch',
    'budget.edit',
    'connection.manage',
    'settings.manage',
  ]) {
    assert.equal(
      can({ principal: viewer, permission, clientId: 'cl_a' }).allowed,
      false,
      `VIEWER must not hold ${permission}`,
    );
  }
});

test('only the owner may change a connection credential path', () => {
  const asManager = can({
    principal: manager,
    permission: 'connection.manage',
    clientId: 'cl_a',
    touchesCredentials: true,
  });
  assert.equal(asManager.allowed, false);
  assert.match(asManager.reason, /workspace owner/i);

  const asOwner = can({
    principal: owner,
    permission: 'connection.manage',
    clientId: 'cl_a',
    touchesCredentials: true,
  });
  assert.equal(asOwner.allowed, true);
});

test('every sensitive platform is recognised as credential-bearing', () => {
  for (const platform of ['facebook', 'instagram', 'meta_ads', 'google_ads', 'ga4', 'whatsapp']) {
    assert.equal(isSensitivePlatform(platform), true, `${platform} holds a credential`);
  }
});

test('visibleClientIds is the intersection for a client-bound role', () => {
  assert.deepEqual(visibleClientIds(clientUser, ['cl_a', 'cl_b']), ['cl_a']);
  assert.deepEqual(visibleClientIds(owner, ['cl_a', 'cl_b']), ['cl_a', 'cl_b']);
});

test('an approval cannot be granted by its own author', () => {
  assert.equal(canApproveOwnSubmission({ requestedBy: 'a', decidedBy: 'a' }).allowed, false);
  assert.equal(canApproveOwnSubmission({ requestedBy: 'a', decidedBy: 'b' }).allowed, true);
});