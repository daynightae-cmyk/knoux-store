import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const operations = await loadTypeScript('../src/lib/wordpress/operations.ts');
const executor = await loadTypeScript('../src/lib/wordpress/executor.ts');
const requestId = '6ca05bf1-4b74-43b4-b68c-8534ea37f839';
const env = { KNOUX_WORDPRESS_EXECUTOR_URL: 'https://trusted-executor.example/', KNOUX_WORDPRESS_EXECUTOR_TOKEN: 'isolated-test-token', KNOUX_WORDPRESS_SITE_IDS: 'site-a' };

test('WordPress boundary rejects shell input, unknown sites, slugs and actions', () => {
  const base = { siteId: 'site-a', action: 'plugin.install', requestId, slug: 'woocommerce' };
  for (const change of [{ command: 'whoami' }, { siteId: 'site-b' }, { action: 'shell' }, { slug: '../plugin' }, { slug: 'foo;whoami' }, { requestId: 'not-unique' }]) assert.throws(() => operations.validateWordPressOperation({ ...base, ...change }, ['site-a']));
  assert.throws(() => operations.validateWordPressOperation(base, ['site-a']), /explicitly confirm/);
  assert.equal(operations.validateWordPressOperation({ ...base, confirmation: operations.confirmationFor(base) }, ['site-a']).slug, 'woocommerce');
});

test('restore, migration and deployment require trusted IDs, never paths or URLs', () => {
  for (const action of ['restore', 'migration', 'deploy']) for (const reference of ['/backup.sql', 'https://remote.example', '../outside', 'a;rm']) assert.throws(() => operations.validateWordPressOperation({ siteId: 'site-a', action, requestId, reference, confirmation: `${action}:site-a:${reference}` }, ['site-a']));
});

test('missing executor configuration never makes a network call or reports READY', async () => {
  const result = await executor.runWordPressOperation({}, 'owner-a', {}, () => { throw new Error('Must not call'); });
  assert.equal(result.state, 'NOT_CONFIGURED');
  assert.equal(result.externalReference, null);
  assert.equal(executor.wordpressExecutorConfig({ ...env, KNOUX_WORDPRESS_EXECUTOR_URL: 'http://unsafe.example' }).configured, false);
  assert.equal(executor.wordpressExecutorConfig(env).state, 'EXECUTOR_NOT_CONNECTED');
});

test('executor request uses fixed HTTPS endpoint, server bearer and stable idempotency ID', async () => {
  const request = { siteId: 'site-a', action: 'plugins.list', requestId };
  const result = await executor.runWordPressOperation(request, 'owner-a', env, async (url, options) => {
    assert.equal(String(url), 'https://trusted-executor.example/v1/wordpress/operations');
    assert.equal(options.headers.authorization, `Bearer ${env.KNOUX_WORDPRESS_EXECUTOR_TOKEN}`);
    assert.equal(options.headers['idempotency-key'], requestId);
    assert.equal(options.redirect, 'error');
    assert.equal(JSON.parse(options.body).ownerId, 'owner-a');
    return Response.json({ ...request, state: 'SUCCEEDED', externalReference: 'receipt-1', items: [{ slug: 'woocommerce', version: '10.2.0', active: true, secret: env.KNOUX_WORDPRESS_EXECUTOR_TOKEN }], credentials: env.KNOUX_WORDPRESS_EXECUTOR_TOKEN });
  });
  assert.equal(result.state, 'SUCCEEDED');
  assert.deepEqual(result.items, [{ slug: 'woocommerce', version: '10.2.0', active: true }]);
  assert.equal(JSON.stringify(result).includes(env.KNOUX_WORDPRESS_EXECUTOR_TOKEN), false);
});

test('a 200, mismatched identity or missing receipt cannot impersonate executor success', async () => {
  const request = { siteId: 'site-a', action: 'site.probe', requestId };
  for (const value of [{ ok: true }, { ...request, siteId: 'site-b', state: 'SUCCEEDED', externalReference: 'receipt-1' }, { ...request, state: 'SUCCEEDED' }]) {
    assert.equal((await executor.runWordPressOperation(request, 'owner-a', env, async () => Response.json(value))).state, 'FAILED');
  }
  const failure = await executor.runWordPressOperation(request, 'owner-a', env, async () => { throw new Error(env.KNOUX_WORDPRESS_EXECUTOR_TOKEN); });
  assert.equal(failure.state, 'EXECUTOR_NOT_CONNECTED');
  assert.equal(JSON.stringify(failure).includes(env.KNOUX_WORDPRESS_EXECUTOR_TOKEN), false);
});
