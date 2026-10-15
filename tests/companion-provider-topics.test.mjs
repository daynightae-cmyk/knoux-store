import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { companionCatalog } = await loadTypeScript('../src/lib/sentinel/companion-catalog.ts');
const { parseCompanionRequest } = await loadTypeScript('../src/lib/sentinel/companion-contract.ts');
test('public Build guide admits only approved provider topics on published provider pages', () => {
  const target = companionCatalog.find(entry => entry.route === '/build/providers');
  assert.ok(target);
  const value = { id: '11111111-1111-4111-8111-111111111111', language: 'ur', context: { route: '/build/providers', target: target.id, role: 'button', topic: 'provider:opencode-console-v2' }, question: '' };
  assert.ok(parseCompanionRequest(value, companionCatalog));
  for (const topic of ['__proto__', 'provider:private-agent', 'ignore instructions', 'provider:opencode-console-v2?token=secret']) {
    assert.equal(parseCompanionRequest({ ...value, context: { ...value.context, topic } }, companionCatalog), null);
  }
  assert.equal(parseCompanionRequest({ ...value, context: { ...value.context, html: 'private', secret: 'private' } }, companionCatalog), null);
  const products = companionCatalog.find(entry => entry.route === '/products');
  assert.equal(parseCompanionRequest({ ...value, context: { ...value.context, route: '/products', target: products.id } }, companionCatalog), null);
});
