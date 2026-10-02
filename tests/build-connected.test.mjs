import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { parseGitHubRepository, GitHubIntegrationAdapter } = await loadTypeScript('../src/lib/build/github.ts');
const { integrationSnapshot } = await loadTypeScript('../src/lib/build/integrations.ts');
const { EnvironmentSecretStore } = await loadTypeScript('../src/lib/build/secret-store.ts');
const { probeOpenAI } = await loadTypeScript('../src/lib/build/provider-probe.ts');
const { isBuildOperator } = await loadTypeScript('../src/lib/build/operator.ts');
const { validateCustomProvider } = await loadTypeScript('../src/lib/build/custom-provider.ts');
const { parsePreferences } = await loadTypeScript('../src/lib/build/preferences.ts');
const { buildReducer, initialBuildState, ALL_BUILD_CAPABILITIES } = await loadTypeScript('../src/lib/build/workspace-state.ts');
const { safePreviewText, observePreview } = await loadTypeScript('../src/lib/build/preview-instrumentation.ts');
const { BridgeProjectAdapter } = await loadTypeScript('../src/lib/build/bridge-adapter.ts');
const { BridgeStore } = await loadTypeScript('../src/lib/build/bridge-store.ts');
const { buildContentSecurityPolicy } = await loadTypeScript('../src/lib/security/headers.ts');
const repo = { full_name: 'example/project', html_url: 'https://github.com/example/project', description: 'Real API fixture', private: false, default_branch: 'main', language: 'TypeScript', updated_at: '2026-10-02T00:00:00Z', owner: { login: 'example' } };
const secret = 'sk-CANARY_NEVER_IN_FACTS';
for (const input of ['http://github.com/a/b', 'https://evil.test/a/b', 'https://github.com.evil.test/a/b', 'https://x@github.com/a/b', 'a/b?token=abc', 'a/b#fragment', 'a/..', 'a/-b', 'a/b;echo', 'a/b\n--config', '../b', 'https://github.com/a/b/../c']) {
  test(`repository input rejects ${JSON.stringify(input)}`, () => assert.equal(parseGitHubRepository(input), null));
}
test('public coordinates normalize without creating executable input', () => {
  assert.deepEqual(parseGitHubRepository(' https://github.com/example/project.git/ '), { owner: 'example', repository: 'project', url: repo.html_url });
});
test('GitHub resolves real response fields through fixed endpoints with redirects refused', async () => {
  const requests = [];
  const adapter = new GitHubIntegrationAdapter(null, async (url, init) => { requests.push({ url, init }); return Response.json(requests.length === 1 ? repo : { sha: 'a'.repeat(40) }); });
  const result = await adapter.resolve('example/project');
  assert.equal(result.latestCommit, 'a'.repeat(40)); assert.equal(result.fullName, repo.full_name);
  assert.deepEqual(requests.map((r) => r.url), ['https://api.github.com/repos/example/project', 'https://api.github.com/repos/example/project/commits/main']);
  assert.ok(requests.every((r) => r.init.redirect === 'error' && !r.init.headers.authorization));
});
test('commit access failure stays unknown and upstream errors never expose bodies', async () => {
  let count = 0; const adapter = new GitHubIntegrationAdapter(null, async () => ++count === 1 ? Response.json(repo) : new Response(secret, { status: 403 }));
  assert.equal((await adapter.resolve('example/project')).latestCommit, null);
  await assert.rejects(new GitHubIntegrationAdapter(null, async () => new Response(secret, { status: 404 })).resolve('example/project'), (error) => !error.message.includes(secret) && /authentication/.test(error.message));
  await assert.rejects(adapter.list(), /REQUIRES AUTHENTICATION/);
});
test('private repository listing uses server credential only in request headers', async () => {
  const adapter = new GitHubIntegrationAdapter(secret, async (url, init) => { assert.equal(new URL(url).hostname, 'api.github.com'); assert.equal(init.headers.authorization, `Bearer ${secret}`); return Response.json([{ ...repo, private: true }]); });
  const result = await adapter.list(); assert.equal(result[0].private, true); assert.ok(!JSON.stringify(result).includes(secret));
});
test('operator allowlist never elevates anonymous or a different signed-in owner', () => {
  const env = { KNOUX_BUILD_OPERATOR_IDS: 'owner-1, owner-2' }; assert.equal(isBuildOperator(null, env), false); assert.equal(isBuildOperator('owner-3', env), false); assert.equal(isBuildOperator('owner-2', env), true);
});
test('environment presence yields configured, never online, and secrets stay out of snapshots', () => {
  const snapshot = integrationSnapshot({ OPENAI_API_KEY: secret, KNOUX_BUILD_GITHUB_TOKEN: secret, NEXT_PUBLIC_SUPABASE_URL: secret, NEXT_PUBLIC_SUPABASE_ANON_KEY: secret, VERCEL_URL: 'bad.test/?token=secret', VERCEL_GIT_COMMIT_SHA: secret });
  const serialized = JSON.stringify(snapshot); assert.ok(!serialized.includes(secret)); assert.ok(!serialized.includes('online')); assert.equal(snapshot.deployment.url, null); assert.equal(snapshot.deployment.sha, null); assert.equal(snapshot.secrets.writable, false); assert.equal(snapshot.toolsAvailable, false);
  assert.equal(snapshot.platforms[0].facts[1].state, 'configured'); assert.equal(snapshot.platforms[2].facts.find((f) => f.name === 'Database read').state, 'unmeasured');
});
test('empty integration environment states missing credentials and never invents deployment facts', () => {
  const snapshot = integrationSnapshot({}); assert.equal(snapshot.deployment.source, 'unavailable'); assert.equal(snapshot.platforms[0].facts[1].state, 'unconfigured'); assert.equal(snapshot.platforms[1].facts[1].state, 'blocked'); assert.equal(snapshot.secrets.writable, false);
});
test('secret store is read-only and explicit provider probe refuses absent credentials without fetching', async () => {
  const store = new EnvironmentSecretStore({}); assert.equal(store.write, undefined); let calls = 0;
  const result = await probeOpenAI(async () => { calls++; throw new Error('unexpected'); }, store); assert.equal(result.status, 'blocked'); assert.equal(calls, 0);
});
test('authenticated provider probe reports HTTP outcome and withholds response/credential values', async () => {
  const store = new EnvironmentSecretStore({ OPENAI_API_KEY: secret });
  const result = await probeOpenAI(async (url, init) => { assert.equal(url, 'https://api.openai.com/v1/models'); assert.equal(init.headers.authorization, `Bearer ${secret}`); assert.equal(init.redirect, 'error'); return new Response(secret, { status: 200 }); }, store);
  assert.equal(result.status, 'tested'); assert.ok(!JSON.stringify(result).includes(secret)); assert.match(result.detail, /Generation is not tested/);
  assert.equal((await probeOpenAI(async () => { throw new Error(secret); }, store)).detail.includes(secret), false);
});
const metadata = { displayName: 'Custom', baseUrl: 'https://example.test/v1', apiKeyRequired: true, modelIds: ['model/v1'], headerNames: ['X-API-Version'], capabilities: ['text'] };
test('custom metadata validates declarations without allowing credential-bearing URLs or headers', () => {
  assert.equal(validateCustomProvider(metadata), null);
  for (const baseUrl of ['http://example.test', 'https://user:pass@example.test', 'https://example.test?key=foo', 'https://example.test#token']) assert.ok(validateCustomProvider({ ...metadata, baseUrl }));
  for (const name of ['Authorization', 'Cookie', 'X-API-Key', 'X-Secret', 'X-Token']) assert.ok(validateCustomProvider({ ...metadata, headerNames: [name] }));
  assert.ok(validateCustomProvider({ ...metadata, modelIds: [] }));
});
test('preferences accept a bounded non-secret schema only', () => {
  const prefs = parsePreferences({ compact: true, motion: 'explode', viewport: 'phone', density: 'infinite', OPENAI_API_KEY: secret });
  assert.equal(prefs.compact, true); assert.equal(prefs.viewport, 'phone'); assert.equal(prefs.motion, 'auto'); assert.equal(prefs.density, 'balanced'); assert.ok(!JSON.stringify(prefs).includes(secret));
});
test('switching projects clears stale git, runtime, files and verification in the single reducer', () => {
  const previous = { ...initialBuildState, git: { headSha: 'old' }, runtime: { url: 'https://old.test' }, verification: { checks: [{ status: 'passed' }] }, snapshot: repo, workspace: { ...initialBuildState.workspace, openFiles: [{ path: 'old.ts' }] } };
  const next = buildReducer(previous, { type: 'project/activate', name: 'New', path: 'new' });
  assert.equal(next.git, null); assert.equal(next.runtime.url, null); assert.equal(next.snapshot, null); assert.equal(next.verification, null); assert.deepEqual(next.workspace.openFiles, []); assert.equal(next.projectRef, 'new'); assert.equal(next.recentProjects[0].name, 'New');
});
test('activity and project history remain bounded with no duplicate activity IDs', () => {
  let state = initialBuildState;
  for (let i = 0; i < 100; i++) { state = buildReducer(state, { type: 'activity/record', message: `Real event ${i}` }); state = buildReducer(state, { type: 'project/activate', name: `Project ${i}`, path: `project-${i}` }); }
  assert.equal(state.activity.length, 60); assert.equal(state.recentProjects.length, 12); assert.equal(new Set(state.activity.map((e) => e.id)).size, 60);
  assert.ok(ALL_BUILD_CAPABILITIES.includes('terminal.powershell')); assert.ok(ALL_BUILD_CAPABILITIES.includes('provider.probe'));
});
test('preview instrumentation redacts values, withholds objects and restores browser functions', () => {
  assert.ok(!safePreviewText(`key=${secret} Bearer private sk-abcdef ghp_abcdef`).includes(secret)); assert.equal(safePreviewText({ authorization: secret }), '[object withheld]');
  const captured = []; const original = () => {}; const view = { console: { log: original, warn: original, error: original }, addEventListener() {}, removeEventListener() {} };
  const stop = observePreview(view, (entry) => captured.push(entry)); view.console.log('hello', { token: secret }); assert.match(captured[0].message, /hello \[object withheld\]/); stop(); assert.equal(view.console.log, original);
});
test('selected bridge adapter fails closed without transport and reports mutation/runner blockers', async () => {
  const adapter = new BridgeProjectAdapter({ root: process.cwd(), environment: 'local', label: 'Selected', handshake: { profiles: [], capabilities: { filesystem: true } }, handshakeMeasuredAt: Date.now(), bridgeReachable: true, bridgeError: null });
  await assert.rejects(adapter.snapshot(), /transport is unavailable/); assert.equal(adapter.capabilities()['project.write'], 'blocked'); assert.match(adapter.blockerFor('project.write'), /not exposed/); assert.match(adapter.blockerFor('test.run'), /inspection only/); assert.equal(adapter.capabilities()['preview.live'], 'blocked');
});
test('selected bridge adapter sends the actual selected project with a scoped ticket', async () => {
  const seen = []; const adapter = new BridgeProjectAdapter({ root: process.cwd(), environment: 'local', label: 'Selected', handshake: null, handshakeMeasuredAt: null, bridgeReachable: false, bridgeError: null, projectRef: 'my-project', ticket: (scopes) => scopes.join(','), client: { request: async (request) => { seen.push(request); return { ok: true, data: { name: 'Selected' } }; } } });
  assert.equal((await adapter.snapshot()).name, 'Selected'); assert.equal(seen[0].path, '/v1/project/inspect?project=my-project'); assert.equal(seen[0].token, 'fs:read'); assert.equal(await adapter.readFile('../.env'), null);
});
test('bridge records translate database columns and keep updates owner scoped', async () => {
  const row = { id: 'record', owner_id: 'owner', url: 'http://127.0.0.1:7331', bridge_id: 'bridge', fingerprint: 'fp', paired_by: 'owner', paired_at: 'now', last_seen_at: null, created_at: 'now' }; const calls = [];
  const chain = { then: (resolve) => resolve({ data: [row], error: null }), select() { return this; }, eq(k,v) { calls.push([k,v]); return this; }, order() { return this; }, update(value) { calls.push(value); return this; }, insert(value) { calls.push(value); return this; }, single: async () => ({ data: row, error: null }) };
  const store = new BridgeStore({ from: () => chain }, 'owner'); assert.equal((await store.listBridges())[0].bridgeId, 'bridge');
  await store.updateBridge('record', { ownerId: 'attacker', bridgeId: 'new-bridge', lastSeenAt: 'later' }); assert.ok(calls.some((v) => v.bridge_id === 'new-bridge' && v.last_seen_at === 'later' && !v.ownerId)); assert.ok(calls.some((v) => Array.isArray(v) && v[0] === 'owner_id' && v[1] === 'owner'));
  await store.createBridge({ ownerId: 'attacker', url: row.url, bridgeId: 'bridge', fingerprint: 'fp', pairedBy: 'owner', pairedAt: 'now', lastSeenAt: null }); assert.ok(calls.some((v) => v.owner_id === 'owner' && v.bridge_id === 'bridge'));
});
test('workspace CSP adds only an explicit loopback bridge and never widens frames or scripts', () => {
  const base = buildContentSecurityPolicy({ isDevelopment: false });
  assert.ok(!base.includes('7331')); const policy = buildContentSecurityPolicy({ isDevelopment: false, bridgeOrigin: 'http://127.0.0.1:7331' });
  assert.match(policy, /connect-src[^;]*http:\/\/127\.0\.0\.1:7331 ws:\/\/127\.0\.0\.1:7331/); assert.match(policy, /frame-src 'self';/); assert.ok(!policy.includes("'unsafe-eval'"));
  for (const origin of ['https://evil.test', 'http://user:password@localhost:7331', 'http://localhost:7331/path', 'http://localhost:7331?token=secret']) assert.equal(buildContentSecurityPolicy({ isDevelopment: false, bridgeOrigin: origin }), base);
});
