import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * KNOuX Intelligence — behavioural.
 *
 * Three properties are under test, and they are the architectural commitments
 * the mission makes about the brain:
 *
 *   1. The user-facing identity is KNOuX, whatever served the request.
 *   2. A fallback is always labelled, and records which primary it degraded from.
 *   3. Repair intelligence is not reachable through the Growth surface, and the
 *      Growth families are not claimed as served before their sub-agents exist.
 */

const {
  USER_FACING_AI_NAME,
  FORBIDDEN_PROVIDER_IDENTITIES,
  isAcceptableIdentity,
  INTELLIGENCE_FAMILIES,
} = await import('../src/lib/growth/intelligence/types.ts');

const { KnouxIntelligenceRouter } = await import('../src/lib/growth/intelligence/router.ts');
const { KnouxAgentIntelligence } = await import(
  '../src/lib/growth/intelligence/adapters/knoux-agent.ts'
);
const { KnouxLocalIntelligence, scoreCommunity } = await import(
  '../src/lib/growth/intelligence/adapters/local.ts'
);

const FIXED_NOW = () => Date.parse('2026-10-04T00:00:00.000Z');

function request(overrides = {}) {
  return {
    requestId: 'req_1',
    intent: 'ANALYZE_PERFORMANCE',
    prompt: 'Analyse performance',
    context: {
      family: 'ANALYTICS',
      clientId: 'cl_test',
      clientName: 'Test client',
      autonomy: 'COPILOT',
    },
    ...overrides,
  };
}

/* --------------------------------------------------------------- identity */

test('KNOuX is the only acceptable user-facing identity', () => {
  assert.equal(isAcceptableIdentity('KNOuX'), true);
  assert.equal(isAcceptableIdentity('knoux'), true, 'casing is not a different identity');
  for (const forbidden of FORBIDDEN_PROVIDER_IDENTITIES) {
    assert.equal(isAcceptableIdentity(forbidden), false, `${forbidden} must never be a product surface`);
  }
  assert.equal(isAcceptableIdentity('Gemini'), false);
  assert.equal(isAcceptableIdentity('KNOuX powered by Gemini'), false);
  assert.equal(isAcceptableIdentity(''), false);
});

test('the intelligence families include Repair without extending it', () => {
  assert.ok(INTELLIGENCE_FAMILIES.includes('REPAIR'));
  for (const family of ['GROWTH', 'SOCIAL', 'ADVERTISING', 'COMMUNITY', 'ANALYTICS']) {
    assert.ok(INTELLIGENCE_FAMILIES.includes(family), `${family} must be a KNOuX intelligence family`);
  }
});

/* ----------------------------------------------------------- agent adapter */

test('an agent adapter with no endpoint reports NOT_CONFIGURED, not healthy', async () => {
  const agent = new KnouxAgentIntelligence({ now: FIXED_NOW });
  const probe = await agent.probe();

  assert.equal(probe.providerId, 'knoux-agent');
  assert.equal(probe.reachable, false);
  assert.equal(probe.verified, false, 'an unprobed provider must never claim verification');
  assert.equal(probe.failure, 'NOT_CONFIGURED');
  assert.match(probe.detail, /KNOUX_AGENT_ENDPOINT/);
  assert.deepEqual(probe.families, [], 'no family is served without a reachable agent');
});

test('an agent adapter with an endpoint but no token reports AUTH_REQUIRED', async () => {
  const agent = new KnouxAgentIntelligence({ endpointUrl: 'https://example.invalid', now: FIXED_NOW });
  const probe = await agent.probe();
  assert.equal(probe.failure, 'AUTH_REQUIRED');
  assert.match(probe.detail, /KNOUX_AGENT_TOKEN/);
});

test('the agent adapter reports a 401 as a permission failure, not as health', async () => {
  const agent = new KnouxAgentIntelligence({
    endpointUrl: 'https://example.invalid',
    bearerToken: 'token',
    now: FIXED_NOW,
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  const probe = await agent.probe();
  assert.equal(probe.reachable, false);
  assert.equal(probe.verified, false);
  assert.equal(probe.failure, 'PERMISSION_MISSING');
});

test('the deployed agent is claimed only for the family it actually serves', async () => {
  const agent = new KnouxAgentIntelligence({
    endpointUrl: 'https://example.invalid',
    bearerToken: 'token',
    now: FIXED_NOW,
    fetchImpl: async () => ({ ok: true, status: 200 }),
  });
  const probe = await agent.probe();
  assert.equal(probe.verified, true);
  assert.deepEqual(probe.families, ['REPAIR'], 'only Repair is deployed; Growth needs the sub-agent patch');
  assert.equal(
    probe.families.includes('GROWTH'),
    false,
    'claiming Growth before the sub-agent ships would be an overstatement',
  );
});

/* ---------------------------------------------------- local fallback path */

function localSnapshot() {
  return {
    performanceRows: [
      {
        key: 'a',
        clientId: 'cl_test',
        platformLabel: 'Meta',
        metrics: { spend: { value: 1000, origin: 'FIXTURE' }, leads: { value: 10, origin: 'FIXTURE' } },
        derived: { costPerLead: { value: 100, origin: 'FIXTURE' }, ctr: null, cpc: null, cpm: null, roas: null, costPerQualifiedLead: null, costPerBooking: null },
      },
      {
        key: 'b',
        clientId: 'cl_test',
        platformLabel: 'Google Ads',
        metrics: { spend: { value: 900, origin: 'FIXTURE' }, leads: { value: 30, origin: 'FIXTURE' } },
        derived: { costPerLead: { value: 30, origin: 'FIXTURE' }, ctr: null, cpc: null, cpm: null, roas: null, costPerQualifiedLead: null, costPerBooking: null },
      },
    ],
    communities: [],
  };
}

/* ------------------------------------------------------------------ router */

test('the router falls back and labels the degradation', async () => {
  const router = new KnouxIntelligenceRouter({
    now: FIXED_NOW,
    providers: [
      new KnouxAgentIntelligence({ now: FIXED_NOW }),
      new KnouxLocalIntelligence({ snapshot: localSnapshot(), now: FIXED_NOW }),
    ],
  });

  const response = await router.reason(request());

  assert.equal(response.identity, USER_FACING_AI_NAME, 'the router asserts the identity, not the adapter');
  assert.equal(response.provisional, true, 'a fallback answer must be provisional');
  assert.equal(response.servedBy.providerId, 'knoux-local');
  assert.equal(
    response.servedBy.degradedFrom,
    'knoux-agent',
    'a substitution must record what it substituted for',
  );
});

test('the router ranks on computed cost per lead and excludes rows without one', async () => {
  const snapshot = localSnapshot();
  snapshot.performanceRows.push({
    key: 'c',
    clientId: 'cl_test',
    platformLabel: 'No leads row',
    metrics: { spend: { value: 500, origin: 'FIXTURE' } },
    derived: { costPerLead: null, ctr: null, cpc: null, cpm: null, roas: null, costPerQualifiedLead: null, costPerBooking: null },
  });

  const router = new KnouxIntelligenceRouter({
    now: FIXED_NOW,
    providers: [new KnouxLocalIntelligence({ snapshot, now: FIXED_NOW })],
  });

  const response = await router.reason(request());
  assert.match(response.summary, /Google Ads/);
  assert.match(response.summary, /lowest/i);
  assert.equal(
    response.summary.includes('No leads row'),
    false,
    'a row without a comparable denominator must be excluded rather than ranked',
  );
});

test('a fixture-backed comparison says so in the sentence itself', async () => {
  const router = new KnouxIntelligenceRouter({
    now: FIXED_NOW,
    providers: [new KnouxLocalIntelligence({ snapshot: localSnapshot(), now: FIXED_NOW })],
  });

  const response = await router.reason(request());
  assert.match(
    response.sections[0].body,
    /demo fixtures, not live provider data/i,
    'the basis of a comparison must be stated, not assumed',
  );
  assert.ok(
    response.limitations.some((entry) => /must not be presented as live performance/i.test(entry)),
  );
});

test('with no provider at all the router returns a truthful refusal, not an empty answer', async () => {
  const router = new KnouxIntelligenceRouter({
    now: FIXED_NOW,
    providers: [new KnouxAgentIntelligence({ now: FIXED_NOW })],
  });

  // Only the agent is registered and it is unreachable, so no family is served.
  const response = await router.reason(request({ context: { family: 'REPAIR', autonomy: 'COPILOT' } }));

  assert.equal(response.identity, USER_FACING_AI_NAME);
  assert.equal(response.provisional, true);
  assert.equal(response.servedBy.providerId, 'none');
  assert.equal(response.servedBy.reason, 'PROVIDER_UNREACHABLE');
  assert.match(response.summary, /could not reach a reasoning backend/i);
  assert.ok(response.limitations.length > 0, 'a refusal must state what it could not do');
  assert.deepEqual(response.proposedActions, [], 'a refusal proposes nothing');
});

test('a provider that throws does not take down the intelligence layer', async () => {
  const throwing = {
    providerId: 'thrower',
    tier: 'primary',
    userFacingName: 'KNOuX',
    probe: async () => ({
      providerId: 'thrower',
      reachable: true,
      families: ['ANALYTICS'],
      verified: true,
      checkedAt: new Date(FIXED_NOW()).toISOString(),
    }),
    reason: async () => {
      throw new Error('provider exploded');
    },
  };

  const router = new KnouxIntelligenceRouter({ now: FIXED_NOW, providers: [throwing] });
  const response = await router.reason(request());

  assert.equal(response.servedBy.reason, 'API_ERROR');
  assert.match(response.servedBy.providerId, /none/);
  assert.ok(response.limitations.some((entry) => /provider exploded/.test(entry)));
});

/* ------------------------------------------------------- community scoring */

const community = {
  id: 'c1',
  name: 'Abu Dhabi Parents',
  platform: 'facebook',
  country: 'AE',
  region: 'Abu Dhabi',
  city: 'abu-dhabi',
  category: 'parents',
  language: 'ar',
  visibility: 'PUBLIC',
  activityEstimate: 'HIGH',
  promotionPolicy: 'ALLOWED',
  adminApprovalRequired: false,
  verificationStatus: 'NEEDS_REVIEW',
  relevanceTags: ['parents', 'family'],
  businessCategories: ['swimming'],
  origin: 'FIXTURE',
  createdAt: '',
  updatedAt: '',
};

test('a matching city and tag scores higher than a non-match', () => {
  const high = scoreCommunity(community, ['parents'], 'abu-dhabi');
  const low = scoreCommunity(community, ['football'], '');
  assert.ok(high > low, `expected ${high} > ${low}`);
});

test('a promotion-restricted community is ranked below an open one', () => {
  const open = scoreCommunity({ ...community, promotionPolicy: 'ALLOWED' }, ['parents'], 'abu-dhabi');
  const restricted = scoreCommunity(
    { ...community, promotionPolicy: 'RESTRICTED' },
    ['parents'],
    'abu-dhabi',
  );
  assert.ok(open > restricted, 'reachability is a real signal for a distribution destination');
});

test('scoring never returns a negative relevance', () => {
  const score = scoreCommunity({ ...community, promotionPolicy: 'RESTRICTED' }, ['nothing-matches'], 'nowhere');
  assert.ok(score >= 0);
});