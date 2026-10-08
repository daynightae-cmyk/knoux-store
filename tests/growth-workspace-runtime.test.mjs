import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { assembleLiveWorkspace } = await import('../src/lib/growth/persistence/workspace.ts');
const { projectPerformance } = await import('../src/lib/growth/persistence/workspace-projection.ts');

const ok = value => ({ ok: true, data: { value, meta: { origin: 'LIVE', stored: true, store: 'test-store' } } });
function repository() {
  const queried = [];
  const list = name => async client => { queried.push([name, client]); return ok([]); };
  return {
    id: 'test-store', holdsLiveData: true, queried,
    listClientIds: async () => ok(['allowed']),
    getClient: async id => ok({ id, name: 'Stored tenant', origin: 'LIVE', branches: [] }),
    listCampaigns: list('campaigns'), listCommunities: list('communities'), listLeads: list('leads'),
    listConnections: async client => { queried.push(['connections', client]); return ok([{ id: 'connection', client_id: client, platform: 'facebook', state: 'CONNECTED', origin: 'LIVE', secret_ref: 'private-reference', refresh_secret_ref: 'private-refresh', token_expires_at: '2000-01-01' }]); },
    listAudit: list('audit'), listWorkspaceRecords: async (client, resource) => { queried.push([resource, client]); return ok([]); },
    listMetrics: list('metrics'),
  };
}
test('live command snapshot reads every operational resource only for repository-authorized tenants', async () => {
  const repo = repository();
  const result = await assembleLiveWorkspace(repo);
  assert.equal(result.ok, true);
  assert.equal(result.data.value.source, 'LIVE');
  assert.deepEqual(Object.keys(result.data.value.recordsByClient), ['allowed']);
  assert.equal(repo.queried.length, 11);
  assert.ok(repo.queried.every(([, tenant]) => tenant === 'allowed'));
  const connection = result.data.value.recordsByClient.allowed.connections[0];
  assert.equal(connection.state, 'EXPIRED');
  assert.equal(JSON.stringify(result).includes('private-reference'), false);
  assert.equal(JSON.stringify(result).includes('private-refresh'), false);
  assert.deepEqual(result.data.value.clients[0].connectedPlatforms, []);
});
test('missing schema, failed queries and fixture repositories cannot turn into live demo success', async () => {
  const failure = { ok: false, failure: 'SCHEMA_ABSENT', message: 'Schema absent. Fixtures were not substituted.' };
  const repo = repository();
  repo.listWorkspaceRecords = async () => failure;
  assert.deepEqual(await assembleLiveWorkspace(repo), failure);
  repo.holdsLiveData = false;
  assert.equal((await assembleLiveWorkspace(repo)).failure, 'FIXTURE_FALLBACK_REFUSED');
  const empty = repository();
  empty.listClientIds = async () => ok([]);
  assert.deepEqual((await assembleLiveWorkspace(empty)).data.value.clients, []);
});
test('imported fixtures preserve provenance and invalid provenance fails closed', async () => {
  const repo = repository();
  repo.getClient = async id => ok({ id, name: 'Imported fixture', origin: 'FIXTURE', branches: [] });
  assert.equal((await assembleLiveWorkspace(repo)).data.value.clients[0].origin, 'FIXTURE');
  repo.getClient = async id => ok({ id, name: 'Invalid origin', origin: 'UNKNOWN', branches: [] });
  assert.equal((await assembleLiveWorkspace(repo)).failure, 'QUERY_FAILED');
});
test('metrics preserve evidence, reject non-finite observations and do not add overlapping periods', () => {
  const row = { channel: 'meta', metricKey: 'clicks', value: 4, origin: 'FIXTURE', evidence: 'imported fixture' };
  const result = projectPerformance('allowed', [row, { ...row, value: 9 }, { ...row, metricKey: 'spend', value: NaN }]);
  assert.deepEqual(result[0].metrics.clicks, { value: 4, origin: 'FIXTURE', evidence: 'imported fixture' });
  assert.equal(result[0].metrics.spend, undefined);
  const latest = { ...row, periodStart: '2026-10-01', periodEnd: '2026-10-07' };
  const previous = { ...latest, metricKey: 'spend', value: 100, periodEnd: '2026-10-06' };
  const scoped = projectPerformance('allowed', [latest, previous]);
  assert.equal(scoped[0].metrics.spend, undefined, 'an earlier window cannot supply the denominator of a current derived ratio');
});
