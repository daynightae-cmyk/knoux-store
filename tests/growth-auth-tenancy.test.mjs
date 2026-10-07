import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Authentication and tenant boundary — behavioural.
 *
 * These are the tests the Phase 1 review flagged as missing. Each one drives the
 * decision that must be refused rather than reading the implementation, because
 * the property under test is a refusal.
 *
 * The load-bearing invariant, restated because it is the whole point:
 * **a CLIENT must never read or mutate another client's data.** A CLIENT role
 * holds real permissions, so the tests that matter are the ones where a permitted
 * role is still refused for a workspace it is not bound to.
 */

const {
  can,
  canAccessClient,
  visibleClientIds,
  canApproveOwnSubmission,
  ROLE_PERMISSIONS,
  ROLE_SCOPE,
  ROLES,
} = await import('../src/lib/growth/rbac.ts');

const { isAcceptableIdentity } = await import('../src/lib/growth/intelligence/types.ts');

/* ------------------------------------------------------------------ roles */

test('every mission role exists and carries a scope', () => {
  for (const role of ['OWNER', 'MANAGER', 'ADS_SPECIALIST', 'DESIGNER', 'CONTENT_CREATOR', 'CLIENT', 'VIEWER']) {
    assert.ok(ROLES.includes(role), `${role} must be a supported role`);
    assert.ok(ROLE_PERMISSIONS[role].length > 0, `${role} must hold at least one permission`);
    assert.ok(ROLE_SCOPE[role], `${role} must declare a scope`);
  }
});

test('an internal role is workspace-wide and a client role is bound to one', () => {
  assert.equal(ROLE_SCOPE.OWNER, 'ALL_CLIENTS');
  assert.equal(ROLE_SCOPE.CLIENT, 'OWN_CLIENTS_ONLY');
});

/* ------------------------------------------------- the client boundary */

const clients = ['cl_a', 'cl_b', 'cl_c'];

const clientUser = { userId: 'u_client', role: 'CLIENT', clientIds: ['cl_a'] };
const viewerUser = { userId: 'u_viewer', role: 'VIEWER', clientIds: ['cl_a'] };
const specialist = { userId: 'u_ads', role: 'ADS_SPECIALIST', clientIds: ['cl_a'] };
const managerUser = { userId: 'u_mgr', role: 'MANAGER', clientIds: [] };
const ownerUser = { userId: 'u_owner', role: 'OWNER', clientIds: [] };

test('server membership grants prevent owner escalation across clients', () => {
  const principal = { userId: 'u_mixed', role: 'OWNER', clientIds: ['cl_a', 'cl_b'], clientRoles: { cl_a: 'OWNER', cl_b: 'VIEWER' } };
  assert.equal(can({ principal, permission: 'client.manage', clientId: 'cl_a' }).allowed, true);
  assert.equal(can({ principal, permission: 'client.manage', clientId: 'cl_b' }).allowed, false);
  assert.equal(can({ principal, permission: 'client.view', clientId: 'cl_b' }).allowed, true);
  assert.equal(can({ principal, permission: 'client.view', clientId: 'cl_c' }).allowed, false);
  assert.equal(can({ principal, permission: 'connection.manage', clientId: 'cl_b', touchesCredentials: true }).allowed, false);
  assert.equal(can({ principal, permission: 'settings.manage' }).allowed, false);
  assert.deepEqual(visibleClientIds(principal, clients), ['cl_a', 'cl_b']);
});

test('a client cannot read another client workspace', () => {
  const decision = canAccessClient(clientUser, 'cl_b');
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /not bound/i);
});

test('a client cannot read ANY other client workspace, in every case', () => {
  for (const target of ['cl_b', 'cl_c']) {
    for (const permission of ['client.view', 'campaign.view', 'lead.view', 'budget.view']) {
      const decision = can({ principal: clientUser, permission, clientId: target });
      assert.equal(decision.allowed, false, `CLIENT must not ${permission} on ${target}`);
    }
  }
});

test('a client CAN read its own workspace', () => {
  const decision = can({ principal: clientUser, permission: 'client.view', clientId: 'cl_a' });
  assert.equal(decision.allowed, true);
});

test('the boundary is checked BEFORE the permission, not after', () => {
  // The point of this test is ordering. If permission were checked first, a role
  // holding the permission would pass and the boundary would never be consulted.
  assert.ok(
    ROLE_PERMISSIONS.CLIENT.includes('campaign.approve'),
    'precondition: CLIENT holds campaign.approve',
  );
  const refused = can({ principal: clientUser, permission: 'campaign.approve', clientId: 'cl_b' });
  assert.equal(refused.allowed, false);
  assert.match(refused.reason, /not bound/i, 'the refusal must be the boundary, not a missing permission');

  // Same role, same permission, own workspace: allowed. So the only difference
  // that produced the refusal above was the client.
  const allowed = can({ principal: clientUser, permission: 'campaign.approve', clientId: 'cl_a' });
  assert.equal(allowed.allowed, true);
});

test('a client-scoped action with no client supplied is refused', () => {
  // An absent scope is a refusal, not a permissive default. The alternative is
  // "no filter means everything", which is the exact bug this guards.
  for (const principal of [clientUser, viewerUser, specialist]) {
    const decision = can({ principal, permission: 'client.view' });
    assert.equal(decision.allowed, false, `${principal.role} must be refused without a client`);
    assert.match(decision.reason, /scoped to a client/i);
  }
});

test('an assigned staff role sees only assigned clients', () => {
  assert.deepEqual(visibleClientIds(specialist, clients), ['cl_a']);
  assert.deepEqual(visibleClientIds(clientUser, clients), ['cl_a']);
  assert.deepEqual(visibleClientIds(managerUser, clients), clients);
  assert.deepEqual(visibleClientIds(ownerUser, clients), clients);
});

test('a principal bound to nothing sees nothing', () => {
  const orphan = { userId: 'u_none', role: 'CLIENT', clientIds: [] };
  assert.deepEqual(visibleClientIds(orphan, clients), []);
  assert.equal(canAccessClient(orphan, 'cl_a').allowed, false);
  assert.equal(can({ principal: orphan, permission: 'client.view', clientId: 'cl_a' }).allowed, false);
});

/* ------------------------------------------------- role permission matrix */

test('a viewer is read-only', () => {
  const writes = [
    'campaign.approve',
    'campaign.launch',
    'campaign.create',
    'budget.edit',
    'lead.edit',
    'connection.manage',
    'automation.manage',
    'settings.manage',
    'content.publish',
  ];
  for (const permission of writes) {
    assert.equal(
      can({ principal: viewerUser, permission, clientId: 'cl_a' }).allowed,
      false,
      `VIEWER must not hold ${permission}`,
    );
  }
});

test('an ads specialist cannot approve or launch, only submit', () => {
  assert.equal(can({ principal: specialist, permission: 'campaign.submit', clientId: 'cl_a' }).allowed, true);
  assert.equal(can({ principal: specialist, permission: 'campaign.approve', clientId: 'cl_a' }).allowed, false);
  assert.equal(can({ principal: specialist, permission: 'campaign.launch', clientId: 'cl_a' }).allowed, false);
});

test('a designer has no budget access', () => {
  const designer = { userId: 'u_des', role: 'DESIGNER', clientIds: ['cl_a'] };
  assert.equal(can({ principal: designer, permission: 'creative.create', clientId: 'cl_a' }).allowed, true);
  assert.equal(can({ principal: designer, permission: 'budget.view', clientId: 'cl_a' }).allowed, false);
  assert.equal(can({ principal: designer, permission: 'budget.edit', clientId: 'cl_a' }).allowed, false);
});

/* ------------------------------------------- sensitive connection settings */

test('only the owner may change a connection credential path', () => {
  for (const principal of [managerUser, specialist, clientUser, viewerUser]) {
    const decision = can({
      principal,
      permission: 'connection.manage',
      clientId: 'cl_a',
      touchesCredentials: true,
    });
    assert.equal(decision.allowed, false, `${principal.role} must not change credentials`);
    assert.match(decision.reason, /workspace owner/i);
  }
  assert.equal(
    can({ principal: ownerUser, permission: 'connection.manage', clientId: 'cl_a', touchesCredentials: true })
      .allowed,
    true,
  );
});

test('reading connection state is ordinary operator work', () => {
  assert.equal(can({ principal: viewerUser, permission: 'connection.view', clientId: 'cl_a' }).allowed, true);
});

/* ------------------------------------------------------ approval authority */

test('a self-approval is refused in both directions', () => {
  assert.equal(canApproveOwnSubmission({ requestedBy: 'a', decidedBy: 'a' }).allowed, false);
  assert.equal(canApproveOwnSubmission({ requestedBy: 'a', decidedBy: 'b' }).allowed, true);
});

test('approval authority is not held by an assigned staff role', () => {
  assert.equal(can({ principal: specialist, permission: 'campaign.approve', clientId: 'cl_a' }).allowed, false);
  assert.equal(can({ principal: managerUser, permission: 'campaign.approve', clientId: 'cl_a' }).allowed, true);
});

/* ------------------------------------------------------- identity invariant */

test('the user-facing identity is KNOuX and only KNOuX', () => {
  assert.equal(isAcceptableIdentity('KNOuX'), true);
  for (const forbidden of ['Gemini Assistant', 'Google AI', 'OpenAI Assistant', 'Claude']) {
    assert.equal(isAcceptableIdentity(forbidden), false);
  }
});
