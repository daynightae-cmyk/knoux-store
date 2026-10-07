import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { beginDurableOAuth, completeDurableOAuth, VaultSecretStore } = await import('../src/lib/growth/connectors/durable-oauth.ts');
const { hashState, scopesFor } = await import('../src/lib/growth/connectors/oauth.ts');
const owner = { userId: 'test-user', clientId: 'allowed' };
const env = {
  META_APP_ID: 'test-app', META_APP_SECRET: 'test-app-secret', META_OAUTH_REDIRECT_URI: 'https://example.invalid/api/growth/oauth/meta/callback',
  GOOGLE_CLIENT_ID: 'test-app', GOOGLE_CLIENT_SECRET: 'test-app-secret', GOOGLE_OAUTH_REDIRECT_URI: 'https://example.invalid/api/growth/oauth/google/callback',
};
function storage() {
  const states = new Map(), secrets = new Map(), calls = [];
  let counter = 0;
  return { states, secrets, calls, async rpc(name, params) {
    calls.push({ name, params });
    let data = null;
    if (name.endsWith('oauth_begin')) states.set(params.p_hash, { ...params, consumed: false });
    if (name.endsWith('oauth_consume')) {
      const state = states.get(params.p_hash);
      data = [];
      if (state && !state.consumed && state.p_binding === params.p_binding && state.p_user === params.p_user && state.p_provider === params.p_provider) {
        state.consumed = true; data = [{ client_id: state.p_client, requested_scopes: state.p_scopes, return_path: '/command/connections' }];
      }
    }
    if (name.endsWith('secret_put')) { data = `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`; secrets.set(data, params.p_value); }
    if (name.endsWith('secret_get')) data = secrets.get(params.p_id);
    if (name.endsWith('secret_delete')) data = secrets.delete(params.p_id);
    return { data, error: null };
  } };
}
async function start(client, provider = 'meta') {
  const result = await beginDurableOAuth({ client, owner, provider, capability: provider === 'meta' ? 'META_PAGES' : 'GOOGLE_YOUTUBE', env, callbackOrigin: 'https://example.invalid' });
  assert.equal(result.ok, true);
  return { state: new URL(result.url).searchParams.get('state'), binding: result.binding };
}
test('start persists hashes and refuses a callback on another deployment', async () => {
  const client = storage();
  const started = await start(client);
  const stored = client.states.get(hashState(started.state));
  assert.equal(stored.p_binding, hashState(started.binding));
  assert.equal(stored.p_client, owner.clientId);
  assert.equal(JSON.stringify(stored).includes(started.state), false);
  const denied = await beginDurableOAuth({ client, owner, provider: 'meta', capability: 'META_PAGES', env, callbackOrigin: 'https://other.invalid' });
  assert.equal(denied.ok, false);
});
for (const provider of ['meta', 'google']) test(`${provider} callback persists secrets and verification without returning credentials; replay never exchanges again`, async () => {
  const client = storage();
  const started = await start(client, provider);
  let exchanges = 0;
  const scopes = scopesFor([provider === 'meta' ? 'META_PAGES' : 'GOOGLE_YOUTUBE']);
  const fakeToken = 'test-only-access-token';
  const fetchImpl = async (url, options) => {
    assert.equal(String(url).includes(fakeToken), false);
    if (String(url).includes('oauth')) {
      exchanges++;
      return { ok: true, json: async () => ({ access_token: fakeToken, refresh_token: provider === 'google' ? 'test-only-refresh-token' : undefined, scope: scopes.join(' '), expires_in: 3600 }) };
    }
    assert.equal(options.headers.Authorization, `Bearer ${fakeToken}`);
    return { ok: true, json: async () => ({ data: scopes.map(permission => ({ permission, status: 'granted' })) }) };
  };
  const params = { client, userId: owner.userId, provider, ...started, code: 'test-only-code', env, fetchImpl };
  const completed = await completeDurableOAuth(params);
  assert.equal(completed.ok, true);
  assert.equal(completed.verified, true);
  assert.equal(JSON.stringify(completed).includes(fakeToken), false);
  assert.equal(client.secrets.size, provider === 'google' ? 2 : 1);
  assert.equal(client.calls.find(call => call.name.endsWith('oauth_finish')).params.p_verified, true);
  assert.equal((await completeDurableOAuth(params)).ok, false);
  assert.equal(exchanges, 1);
});
test('wrong binding refuses exchange and provider cancellation consumes state', async () => {
  const client = storage();
  const started = await start(client);
  const params = { client, userId: owner.userId, provider: 'meta', ...started, code: '', env, fetchImpl: async () => { throw new Error('must not exchange'); } };
  assert.equal((await completeDurableOAuth({ ...params, binding: 'x'.repeat(43) })).ok, false);
  assert.equal(client.states.get(hashState(started.state)).consumed, false);
  assert.equal((await completeDurableOAuth(params)).ok, false);
  assert.equal(client.states.get(hashState(started.state)).consumed, true);
});
test('failed final storage removes only newly minted references and cannot echo tokens', async () => {
  const client = storage();
  const started = await start(client, 'google');
  const rpc = client.rpc.bind(client);
  client.rpc = async (name, params) => name.endsWith('oauth_finish') ? { data: null, error: { message: 'test-only-access-token' } } : rpc(name, params);
  const result = await completeDurableOAuth({ client, userId: owner.userId, provider: 'google', ...started, code: 'test-code', env,
    fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: 'test-only-access-token', refresh_token: 'test-only-refresh-token', scope: scopesFor(['GOOGLE_YOUTUBE']).join(' ') }) }) });
  assert.equal(result.ok, false);
  assert.equal(client.secrets.size, 0);
  assert.equal(JSON.stringify(result).includes('test-only-access-token'), false);
});
test('vault rejects ownership mismatch before invoking any credential RPC', async () => {
  const client = storage();
  const store = new VaultSecretStore(client, owner);
  await assert.rejects(store.put('test-value', { kind: 'meta-access-token', clientId: 'other', userId: owner.userId }));
  assert.equal(client.calls.length, 0);
});
