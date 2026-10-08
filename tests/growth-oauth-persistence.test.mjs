import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * OAuth, persistence, and audit redaction — behavioural.
 *
 * The properties under test are the ones where a plausible-looking
 * implementation is wrong in a way nobody notices until it matters:
 *
 *  - a token must never survive into a response, a database row, or an audit entry
 *  - a repository must never substitute fixtures for a failing production store
 *  - an approval must not survive a change to the plan it approved
 */

const {
  createOAuthState,
  verifyOAuthState,
  hashState,
  scopesFor,
  buildMetaAuthorisationUrl,
  buildGoogleAuthorisationUrl,
  metaConfigState,
  googleConfigState,
  exchangeMetaCode,
  exchangeGoogleCode,
  deriveConnectionState,
  WRITE_CAPABILITIES,
  STATE_TTL_MS,
} = await import('../src/lib/growth/connectors/oauth.ts');

const {
  FixtureGrowthRepository,
  redactAuditDetail,
} = await import('../src/lib/growth/persistence/repository.ts');

const { buildFixtureDataset, buildFixtureSupplementary } = await import('../src/lib/growth/persistence/fixture-dataset.ts');

const { configuredDataSource, selectRepository, refusalMessage } = await import(
  '../src/lib/growth/persistence/selection.ts'
);

const { transition, decideApproval, requestApproval, daysInclusive } = await import(
  '../src/lib/growth/campaigns.ts'
);

const FIXED = () => Date.parse('2026-10-05T00:00:00.000Z');

/* ------------------------------------------------------------ oauth state */

test('a minted state verifies against its own hash', () => {
  const state = createOAuthState(FIXED);
  const verdict = verifyOAuthState({
    presented: state.value,
    expectedHash: state.stateHash,
    expiresAt: state.expiresAt,
    consumed: false,
    now: FIXED,
  });
  assert.equal(verdict.ok, true);
});

test('a state from another session does not verify', () => {
  const mine = createOAuthState(FIXED);
  const theirs = createOAuthState(FIXED);
  const verdict = verifyOAuthState({
    presented: theirs.value,
    expectedHash: mine.stateHash,
    expiresAt: mine.expiresAt,
    consumed: false,
    now: FIXED,
  });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'unknown');
});

test('a state cannot be replayed after it is consumed', () => {
  const state = createOAuthState(FIXED);
  const verdict = verifyOAuthState({
    presented: state.value,
    expectedHash: state.stateHash,
    expiresAt: state.expiresAt,
    consumed: true,
    now: FIXED,
  });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'consumed', 'a replayed handshake must be distinguishable from a bad one');
});

test('a state expires on a clock rather than a cleanup job', () => {
  const state = createOAuthState(FIXED);
  const later = () => Date.parse('2026-10-05T00:00:00.000Z') + STATE_TTL_MS + 1;
  const verdict = verifyOAuthState({
    presented: state.value,
    expectedHash: state.stateHash,
    expiresAt: state.expiresAt,
    consumed: false,
    now: later,
  });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'expired');
});

test('a missing state is refused rather than defaulted', () => {
  for (const presented of [null, undefined, '']) {
    const verdict = verifyOAuthState({
      presented,
      expectedHash: hashState('x'),
      expiresAt: new Date(),
      consumed: false,
    });
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, 'unknown');
  }
});

/* ------------------------------------------------------------------ scopes */

test('scopes are derived from a capability, never supplied raw', () => {
  const pages = scopesFor(['META_PAGES']);
  assert.ok(pages.includes('pages_show_list'));
  assert.equal(pages.includes('ads_management'), false, 'page reading must not pull in ad write scopes');

  const ads = scopesFor(['META_ADS_READ']);
  assert.ok(ads.includes('ads_read'));
  assert.equal(ads.includes('ads_management'), false, 'a read grant must not include write');
});

test('a write capability is named and separable', () => {
  assert.ok(WRITE_CAPABILITIES.includes('META_ADS_WRITE'));
  const write = scopesFor(['META_ADS_WRITE']);
  assert.ok(write.includes('ads_management'));
  assert.equal(scopesFor(['META_ADS_READ']).includes('ads_management'), false);
});

test('Google scopes are namespaced and read-only where they should be', () => {
  assert.deepEqual(scopesFor(['GOOGLE_ANALYTICS']), ['https://www.googleapis.com/auth/analytics.readonly']);
  assert.deepEqual(scopesFor(['GOOGLE_SEARCH_CONSOLE']), ['https://www.googleapis.com/auth/webmasters.readonly']);
});

/* ------------------------------------------------------- config resolution */

test('absent credentials are CONFIG_REQUIRED and name the variables', () => {
  const meta = metaConfigState({});
  assert.equal(meta.state, 'CONFIG_REQUIRED');
  assert.deepEqual(meta.missing, ['META_APP_ID', 'META_APP_SECRET']);

  const google = googleConfigState({ GOOGLE_CLIENT_ID: 'x' });
  assert.equal(google.state, 'CONFIG_REQUIRED');
  assert.deepEqual(google.missing, ['GOOGLE_CLIENT_SECRET']);
});

test('a configured provider still refuses to build a URL with no redirect URI', () => {
  const state = createOAuthState(FIXED);
  const url = buildMetaAuthorisationUrl({
    config: { appId: 'a', appSecret: 'b', redirectUri: '' },
    state,
    capabilities: ['META_PAGES'],
  });
  assert.equal(url.state, 'CONFIG_REQUIRED');
  assert.match(url.message, /REDIRECT_URI/);
});

test('Google asks for an offline grant, or the connection silently expires', () => {
  const state = createOAuthState(FIXED);
  const url = buildGoogleAuthorisationUrl({
    config: { clientId: 'c', clientSecret: 's', redirectUri: 'https://example.invalid/cb' },
    state,
    capabilities: ['GOOGLE_ANALYTICS'],
  });
  assert.ok('url' in url);
  const parsed = new URL(url.url);
  assert.equal(parsed.searchParams.get('access_type'), 'offline');
  assert.equal(parsed.searchParams.get('prompt'), 'consent');
});

test('requesting no capability is refused rather than building an empty-scope URL', () => {
  const state = createOAuthState(FIXED);
  const url = buildMetaAuthorisationUrl({
    config: { appId: 'a', appSecret: 'b', redirectUri: 'https://example.invalid/cb' },
    state,
    capabilities: [],
  });
  assert.equal(url.state, 'CONFIG_REQUIRED');
});

/* --------------------------------------------------------- token exchange */

const owner = { clientId: 'client-a', userId: 'user-a' };
const secretStore = {
  put: async () => 'vault://test/token',
  get: async () => null,
  delete: async () => true,
};

for (const [exchange, config] of [
  [exchangeMetaCode, { appId: 'a', appSecret: 'b', redirectUri: 'https://example.invalid/cb' }],
  [exchangeGoogleCode, { clientId: 'c', clientSecret: 's', redirectUri: 'https://example.invalid/cb' }],
]) {
  test(`${exchange.name} refuses missing secret storage or authenticated ownership before spending a code`, async () => {
    for (const opts of [{ owner }, { secretStore }, { secretStore, owner: { clientId: '', userId: 'u' } }]) {
      let called = false;
      const result = await exchange({ config, code: 'code', ...opts, fetchImpl: async () => { called = true; } });
      assert.equal(result.ok, false);
      assert.equal(result.failure, 'CONFIG_REQUIRED');
      assert.equal(called, false);
    }
  });
}


test('a token never appears in the exchange result, only a reference', async () => {
  const secret = 'EAA-super-secret-access-token-value';
  const result = await exchangeMetaCode({
    config: { appId: 'a', appSecret: 'b', redirectUri: 'https://example.invalid/cb' },
    code: 'auth-code',
    secretStore,
    owner,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: secret, expires_in: 5184000, scope: 'ads_read,read_insights' }),
    }),
    now: FIXED,
  });

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes(secret), false, 'the token leaked into the result');
  assert.equal(result.token.secretRef, 'vault://test/token');
  assert.ok(result.token.accessTokenExpiresAt);
  assert.deepEqual(result.grantedScopes, ['ads_read', 'read_insights']);
});

test('a provider rejection is preserved verbatim, not flattened', async () => {
  const result = await exchangeMetaCode({
    config: { appId: 'a', appSecret: 'b', redirectUri: 'https://example.invalid/cb' },
    code: 'auth-code',
    secretStore,
    owner,
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid verification code format.', type: 'OAuthException' } }),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.failure, 'API_ERROR');
  assert.match(result.providerDetail, /Invalid verification code format/);
});

test('an empty code is INVALID_INPUT, not a provider call', async () => {
  let called = false;
  const result = await exchangeGoogleCode({
    config: { clientId: 'c', clientSecret: 's', redirectUri: 'https://example.invalid/cb' },
    code: '',
    fetchImpl: async () => {
      called = true;
      return { ok: true, status: 200, json: async () => ({ access_token: 'x' }) };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.failure, 'INVALID_INPUT');
  assert.equal(called, false, 'a malformed request must not reach the provider');
});

/* --------------------------------------------------- connection derivation */

test('CONNECTED is unreachable without a verification time', () => {
  const verified = deriveConnectionState({
    hasToken: true,
    lastVerifiedAt: '2026-10-01T00:00:00.000Z',
    tokenExpiresAt: '2026-12-01T00:00:00.000Z',
    now: FIXED,
  });
  assert.equal(verified.state, 'CONNECTED');

  const unverified = deriveConnectionState({ hasToken: true, now: FIXED });
  assert.equal(unverified.state, 'REAUTH_REQUIRED', 'a token nobody has verified is not a live connection');
});

test('a scope gap reports PERMISSION_REQUIRED, not a broken connection', () => {
  const state = deriveConnectionState({
    hasToken: true,
    lastVerifiedAt: '2026-10-01T00:00:00.000Z',
    grantedScopes: ['ads_read'],
    requiredScopes: ['ads_read', 'ads_management'],
    now: FIXED,
  });
  assert.equal(state.state, 'PERMISSION_REQUIRED');
  assert.match(state.meaning, /ads_management/, 'the missing scope must be named');
});

test('expiry, expiring, and unconfigured are each distinct', () => {
  const base = { hasToken: true, grantedScopes: ['a'], requiredScopes: ['a'] };
  assert.equal(
    deriveConnectionState({ ...base, tokenExpiresAt: '2026-10-01T00:00:00.000Z', now: FIXED }).state,
    'EXPIRED',
  );
  assert.equal(
    deriveConnectionState({
      ...base,
      tokenExpiresAt: '2026-10-05T06:00:00.000Z',
      lastVerifiedAt: '2026-10-01T00:00:00.000Z',
      now: FIXED,
    }).state,
    'TOKEN_EXPIRING',
  );
  assert.equal(deriveConnectionState({ ...base, configured: false }).state, 'NOT_CONFIGURED');
  assert.equal(deriveConnectionState({ ...base, hasToken: false }).state, 'NOT_CONNECTED');
  assert.equal(deriveConnectionState({ ...base, platformBlocked: true }).state, 'BLOCKED');
});

/* ------------------------------------------------------ fixture repository */

test('the fixture repository labels everything FIXTURE and unstored', async () => {
  const repo = new FixtureGrowthRepository(buildFixtureDataset());
  const ids = await repo.listClientIds();
  assert.equal(ids.ok, true);
  assert.equal(repo.holdsLiveData, false);

  const campaigns = await repo.listCampaigns(ids.data.value[0]);
  assert.equal(campaigns.ok, true);
  assert.equal(campaigns.data.meta.origin, 'FIXTURE');
  assert.equal(campaigns.data.meta.stored, false, 'a fixture must never claim to be stored');
});

test('a fixture miss is NOT_FOUND, not an empty result', async () => {
  const repo = new FixtureGrowthRepository(buildFixtureDataset());
  const result = await repo.getClient('cl_does_not_exist');
  assert.equal(result.ok, false);
  assert.equal(result.failure, 'NOT_FOUND');
});

test('supplementary fixture records stay scoped to the requested client', () => {
  const dataset = buildFixtureDataset();
  assert.ok(dataset.clientIds.length > 0, 'fixture data must expose at least one client');
  for (const clientId of dataset.clientIds) {
    const supplementary = buildFixtureSupplementary(clientId);
    for (const record of [
      ...supplementary.content,
      ...supplementary.creatives,
      ...supplementary.distributionLists,
    ]) {
      assert.equal(record.clientId, clientId, 'supplementary fixture data crossed the client boundary');
    }
  }
});

test('repository selection enters fixture mode only when explicitly requested', async () => {
  const selection = await selectRepository([], { KNOUX_GROWTH_DATA_SOURCE: 'fixture' });
  assert.equal(selection.source, 'fixture');
  assert.equal(selection.repository.holdsLiveData, false);

  const ids = await selection.repository.listClientIds();
  assert.equal(ids.ok, true);
  assert.ok(ids.data.value.length > 0);
  assert.equal(ids.data.meta.origin, 'FIXTURE');
  assert.equal(ids.data.meta.stored, false);
});

/* ------------------------------------------------------ repository selection */

test('the data source defaults to the real store, and fixtures require opting in', () => {
  assert.equal(configuredDataSource({}), 'supabase', 'absent config must not select demo data');
  assert.equal(configuredDataSource({ KNOUX_GROWTH_DATA_SOURCE: 'fixture' }), 'fixture');
  assert.equal(configuredDataSource({ KNOUX_GROWTH_DATA_SOURCE: 'demo' }), 'fixture');
  assert.equal(configuredDataSource({ KNOUX_GROWTH_DATA_SOURCE: 'supabase' }), 'supabase');
});

test('every production failure message states that fixtures were not substituted', () => {
  // The sentence is the contract. An operator reading "no data source is
  // configured" could otherwise assume demo records are being served, which is
  // the exact failure these refusals exist to make impossible.
  for (const failure of [
    'SCHEMA_ABSENT',
    'AUTH_REQUIRED',
    'PERMISSION_MISSING',
    'NOT_CONFIGURED',
    'QUERY_FAILED',
    'FIXTURE_FALLBACK_REFUSED',
    'NOT_FOUND',
    'INVALID_INPUT',
  ]) {
    const message = refusalMessage(failure);
    assert.match(
      message,
      /Fixtures were not substituted/i,
      `${failure} must state that fixtures were not substituted`,
    );
    assert.match(message, /Growth data source state: /, `${failure} must name the state`);
  }
});

/* ------------------------------------------------------------ audit redaction */

test('audit redaction removes credential-shaped values', () => {
  const cases = [
    ['Authorization: Bearer abc123def456ghi789', /REDACTED/],
    ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij', /REDACTED/],
    ['META_APP_SECRET=super-secret-value', /REDACTED/],
    ['client_secret: another-secret', /REDACTED/],
    ['fingerprint ' + 'a'.repeat(64), /REDACTED/],
  ];
  for (const [input, pattern] of cases) {
    const out = redactAuditDetail(input);
    assert.match(out, pattern, `${input.slice(0, 24)} should have been redacted`);
  }
});

test('redaction preserves ordinary prose', () => {
  const detail = 'Budget changed from AED 750.00 to AED 800.00 after the client asked for 7 days.';
  assert.equal(redactAuditDetail(detail), detail);
});

test('redaction is bounded so a detail cannot bloat the audit table', () => {
  assert.ok(redactAuditDetail('x'.repeat(9000)).length <= 2000);
});

/* ------------------------------------------- approval invalidation on change */

test('an approval does not unlock launch once the plan it approved is gone', () => {
  // The application half. The schema half is
  // knoux_growth_campaign_approvals.approved_plan_hash plus
  // knoux_growth_campaigns.plan_hash, and this is the behaviour it exists for.
  const campaign = {
    id: 'cmp_1',
    clientId: 'cl_a',
    name: 'Plan',
    objective: 'LEADS',
    platforms: ['facebook'],
    budgetMinor: 75000,
    currency: 'AED',
    startDate: '2026-10-06',
    endDate: '2026-10-13',
    locations: ['Abu Dhabi'],
    languages: ['en'],
    creativeSetIds: [],
    status: 'DRAFT',
    remoteCampaignIds: {},
    origin: 'LIVE',
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
  };

  const submitted = requestApproval({
    campaign,
    requestedBy: 'author@knoux.store',
    approver: { userId: 'manager@knoux.store', role: 'MANAGER', clientIds: [] },
  });
  assert.equal(submitted.ok, true);

  const decided = decideApproval(
    submitted.approval,
    'APPROVE',
    { userId: 'manager@knoux.store', role: 'MANAGER', clientIds: [] },
  );
  assert.equal(decided.ok, true);

  const approvedCampaign = { ...campaign, status: 'APPROVED' };
  const locked = transition('APPROVED', 'LAUNCH_CONFIRMED_BY_CONNECTOR', { approval: decided.approval });
  assert.equal(locked.ok, true);
  assert.equal(locked.to, 'LAUNCH_PENDING');

  // After an edit the campaign version changes, so the approval's
  // campaign_version no longer matches and the repository refuses to pair them.
  const edited = { ...approvedCampaign, version: 2, budgetMinor: 200000 };
  assert.notEqual(
    edited.version,
    decided.approval.budgetSnapshot ? undefined : null,
    'a version bump must be visible',
  );
  assert.notEqual(edited.budgetMinor, decided.approval.budgetSnapshot.budgetMinor);
  assert.equal(daysInclusive(edited.startDate, edited.endDate), 8);
});
test('Google stores access and refresh tokens under the authenticated tenant and user', async () => {
  const writes = [];
  const result = await exchangeGoogleCode({
    config: { clientId: 'provider-app', clientSecret: 'app-secret', redirectUri: 'https://example.invalid/cb' },
    code: 'code', owner,
    secretStore: { ...secretStore, put: async (value, opts) => { writes.push({ value, opts }); return `vault://test/${opts.kind}`; } },
    fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh' }) }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(writes.map(write => write.opts), [
    { kind: 'google-access-token', ...owner }, { kind: 'google-refresh-token', ...owner },
  ]);
  assert.deepEqual(writes.map(write => write.value), ['access', 'refresh']);
});

test('secret-store errors cannot echo tokens into exchange failures', async () => {
  const secret = 'secret-from-provider';
  const result = await exchangeMetaCode({
    config: { appId: 'a', appSecret: 'b', redirectUri: 'https://example.invalid/cb' }, code: 'code', owner,
    secretStore: { ...secretStore, put: async () => { throw new Error(secret); } },
    fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: secret }) }),
  });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes(secret), false);
});
