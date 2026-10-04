import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Automations and community safety — behavioural.
 *
 * The claim "no automation can spend" is only real if the engine cannot be made
 * to, so these tests drive the evaluator with threshold breaches and assert that
 * every outcome is advisory. The community tests assert the boundaries the
 * mission sets: no member lists, no private records, and no platform where KNOuX
 * would post automatically.
 */

const {
  evaluateRules,
  validateRule,
  templateRules,
  requiresThreshold,
  TRIGGER_LABELS,
  ACTION_LABELS,
} = await import('../src/lib/growth/automation.ts');

const { DEMO_COMMUNITIES, distributionListsFor, communityById } = await import(
  '../src/data/growth/communities.ts'
);
const { COMMUNITY_PLATFORMS, platformById, COMMUNITY_CATEGORIES, COMMUNITY_GEOGRAPHY, citiesFor } =
  await import('../src/data/growth/taxonomy.ts');

const rule = (overrides) => ({
  id: 'rule_1',
  clientId: 'cl_test',
  name: 'Test rule',
  trigger: 'CAMPAIGN_CPL_ABOVE',
  threshold: 45,
  action: 'FLAG_FOR_REVIEW',
  enabled: true,
  risk: 1,
  createdAt: '2026-10-04T00:00:00.000Z',
  ...overrides,
});

const event = (overrides) => ({
  type: 'CAMPAIGN_CPL_ABOVE',
  clientId: 'cl_test',
  observedAt: '2026-10-04T00:00:00.000Z',
  ...overrides,
});

/* --------------------------------------------------------------- advisory */

test('every outcome is advisory and every action is risk 1 or lower', () => {
  const outcomes = evaluateRules([rule()], event({ value: 90, currency: 'AED' }));
  assert.equal(outcomes.length, 1);

  const [outcome] = outcomes;
  assert.equal(outcome.advisoryOnly, true);
  assert.ok(outcome.risk <= 1, `action risk must not exceed 1, got ${outcome.risk}`);
});

test('no action kind can express a provider mutation', () => {
  // If someone adds a spend/pause/launch action kind, this fails. That is the
  // point: making the rules engine able to spend is a visible type change.
  for (const action of Object.keys(ACTION_LABELS)) {
    assert.ok(
      /FLAG_FOR_REVIEW|CREATE_APPROVAL_TASK|ROUTE_TO_PIPELINE|RAISE_ALERT|MARK_NEEDS_REVIEW/.test(action),
      `${action} is not an advisory action`,
    );
  }
  assert.equal(
    Object.values(ACTION_LABELS).some((label) => /pause|budget|launch|spend|stop campaign/i.test(label)),
    false,
    'an action label must not describe a provider mutation',
  );
});

test('every shipped rule is advisory and validated', () => {
  for (const shipped of templateRules('cl_test', '2026-10-04T00:00:00.000Z')) {
    const validation = validateRule(shipped);
    assert.equal(validation.ok, true, `${shipped.name} must validate: ${validation.reason}`);
    assert.ok(validation.risk <= 1);
    assert.ok(TRIGGER_LABELS[shipped.trigger]);
  }
});

/* ------------------------------------------------------------- thresholds */

test('a threshold rule does not fire below its threshold', () => {
  assert.equal(evaluateRules([rule()], event({ value: 10 })).length, 0);
  assert.equal(evaluateRules([rule()], event({ value: 45 })).length, 0, 'equal is not above');
  assert.equal(evaluateRules([rule()], event({ value: 45.01 })).length, 1);
});

test('a threshold rule does not fire when the provider reported nothing', () => {
  assert.equal(
    evaluateRules([rule()], event({ value: undefined })).length,
    0,
    'an absent value must not be treated as a breach',
  );
});

test('a threshold rule without a threshold is invalid and fires never', () => {
  const broken = rule({ threshold: undefined });
  const validation = validateRule(broken);
  assert.equal(validation.ok, false);
  assert.match(validation.reason, /positive threshold/i);
  assert.equal(evaluateRules([broken], event({ value: 999 })).length, 0);
});

test('a negative or zero threshold is refused', () => {
  assert.equal(validateRule(rule({ threshold: 0 })).ok, false);
  assert.equal(validateRule(rule({ trigger: 'CAMPAIGN_SPEND_ABOVE', threshold: -1 })).ok, false);
  assert.equal(validateRule(rule({ threshold: Number.NaN })).ok, false);
});

test('requiresThreshold matches only the two value-comparing triggers', () => {
  assert.equal(requiresThreshold('CAMPAIGN_CPL_ABOVE'), true);
  assert.equal(requiresThreshold('CAMPAIGN_SPEND_ABOVE'), true);
  assert.equal(requiresThreshold('LEAD_RECEIVED'), false);
  assert.equal(requiresThreshold('CONTENT_NEEDS_APPROVAL'), false);
});

/* ------------------------------------------------------------- evaluation */

test('a disabled rule never fires', () => {
  assert.equal(evaluateRules([rule({ enabled: false })], event({ value: 999 })).length, 0);
});

test('a rule never fires for another client', () => {
  assert.equal(
    evaluateRules([rule({ clientId: 'cl_a' })], event({ clientId: 'cl_b', value: 999 })).length,
    0,
    'client scoping must be enforced by the evaluator',
  );
});

test('a rule only fires for its own trigger', () => {
  assert.equal(evaluateRules([rule()], event({ type: 'LEAD_RECEIVED', value: 999 })).length, 0);
});

test('a non-threshold trigger fires on occurrence with no value', () => {
  const outcomes = evaluateRules(
    [rule({ trigger: 'LEAD_RECEIVED', threshold: undefined, action: 'ROUTE_TO_PIPELINE' })],
    event({ type: 'LEAD_RECEIVED', leadId: 'ld_1' }),
  );
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].action, 'ROUTE_TO_PIPELINE');
});

test('the evaluator is total: no input throws and no input performs I/O', () => {
  for (const value of [-100, 0, 1e12, Number.POSITIVE_INFINITY, Number.NaN]) {
    const outcomes = evaluateRules([rule()], event({ value }));
    assert.ok(Array.isArray(outcomes));
  }
  assert.deepEqual(evaluateRules([], event({ value: 999 })), []);
  assert.match(evaluateRules([rule()], event({ value: 90, currency: 'AED' }))[0].summary, /threshold/);
});

test('a spend-limit outcome quotes both the amount and the limit', () => {
  const [outcome] = evaluateRules(
    [rule({ trigger: 'CAMPAIGN_SPEND_ABOVE', threshold: 750, action: 'RAISE_ALERT' })],
    event({ type: 'CAMPAIGN_SPEND_ABOVE', value: 812.5, currency: 'AED' }),
  );
  assert.match(outcome.summary, /AED 812\.50/);
  assert.match(outcome.summary, /AED 750\.00/);
  assert.match(outcome.summary, /Raise an alert/);
});

/* --------------------------------------------------------- community data */

test('no community record carries member data of any kind', () => {
  for (const community of DEMO_COMMUNITIES) {
    assert.equal('members' in community, false, `${community.id} must not hold a member list`);
    assert.equal('memberCount' in community, false, `${community.id} must not hold a member count`);
    assert.equal('memberIds' in community, false);
    assert.notEqual(community.visibility, 'PRIVATE', 'a private group must not be stored as a destination');
    assert.notEqual(community.visibility, 'UNKNOWN');
  }
});

test('no demo community URL can resolve to a real host', () => {
  // Demo records use the reserved .invalid TLD so an accidental fetch fails
  // immediately instead of reaching someone else's group.
  for (const community of DEMO_COMMUNITIES) {
    if (!community.publicUrl) continue;
    assert.match(community.publicUrl, /\.invalid\b/, `${community.id} must not carry a resolvable URL`);
  }
});

test('Facebook is not modelled as automatically postable', () => {
  const facebook = platformById('facebook');
  assert.equal(facebook.automaticPosting, false, 'there is no general Groups API to post through');
  assert.match(facebook.mechanism, /manual/i);
  assert.match(facebook.mechanism, /no member list/i);

  for (const platform of COMMUNITY_PLATFORMS) {
    if (platform.id === 'directory') {
      assert.equal(platform.automaticPosting, true, 'a directory submission is a permitted mechanism');
      continue;
    }
    assert.equal(platform.automaticPosting, false, `${platform.id} must not be automatically posted to`);
  }
});

test('WhatsApp is not offered as a discovery source', () => {
  const whatsapp = platformById('whatsapp');
  assert.match(whatsapp.mechanism, /do not offer public discovery/i);
  assert.match(whatsapp.mechanism, /sends no messages/i);
});

test('an unknown verification status is rendered as an explicit unknown', () => {
  const unknown = DEMO_COMMUNITIES.filter((c) => c.verificationStatus === 'UNKNOWN');
  assert.ok(unknown.length > 0, 'the unknown state must be represented in the fixtures');
  for (const community of unknown) {
    assert.equal(community.lastCheckedAt, undefined, 'an unchecked record must not claim a check time');
  }
});

test('a distribution entry never claims KNOuX posted it', () => {
  for (const list of distributionListsFor('cl_swimfit')) {
    for (const entry of list.entries) {
      assert.ok(
        ['QUEUED', 'NEEDS_APPROVAL', 'POSTED', 'SKIPPED', 'BLOCKED'].includes(entry.status),
      );
      if (entry.status === 'POSTED') {
        assert.ok(entry.postedBy, 'a posted entry must name the operator who posted it');
      }
    }
  }
});

test('every community id referenced by a distribution list resolves', () => {
  for (const list of ['dl_ad_parents', 'dl_dxb_multi', 'dl_sands_interior'].flatMap((id) =>
    distributionListsFor(id.replace('dl_ad_parents', 'cl_swimfit').replace('dl_dxb_multi', 'cl_northbay').replace('dl_sands_interior', 'cl_sands')),
  )) {
    for (const communityId of list.communityIds) {
      assert.ok(communityById(communityId), `${list.id} references unknown community ${communityId}`);
    }
  }
});

/* -------------------------------------------------------------- taxonomy */

test('the geography covers the required UAE emirates and Egyptian cities', () => {
  const uaeCities = citiesFor('AE').map((city) => city.slug);
  for (const required of [
    'abu-dhabi',
    'dubai',
    'sharjah',
    'ajman',
    'ras-al-khaimah',
    'fujairah',
    'umm-al-quwain',
  ]) {
    assert.ok(uaeCities.includes(required), `${required} must be present`);
  }

  const egyptCities = citiesFor('EG').map((city) => city.slug);
  for (const required of ['cairo', 'giza', 'alexandria', 'mansoura']) {
    assert.ok(egyptCities.includes(required), `${required} must be present`);
  }
  assert.equal(COMMUNITY_GEOGRAPHY.length, 2);
});

test('no city slug is duplicated within a country', () => {
  for (const country of COMMUNITY_GEOGRAPHY) {
    const slugs = country.cities.map((city) => city.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${country.code} has a duplicated city`);
  }
});

test('every mission category is present', () => {
  const slugs = COMMUNITY_CATEGORIES.map((category) => category.slug);
  for (const required of [
    'parents',
    'schools',
    'sports',
    'swimming',
    'football',
    'buy-sell',
    'local-business',
    'residents',
    'jobs',
    'services',
    'women',
    'families',
    'arab-communities',
    'egyptians-abroad',
    'local-communities',
    'directories',
  ]) {
    assert.ok(slugs.includes(required), `${required} must be a category`);
  }
});

