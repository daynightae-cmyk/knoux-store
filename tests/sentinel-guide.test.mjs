import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTypeScript } from './load.mjs';

const { allEntities } = await loadTypeScript('../src/data/composer-rules.ts');
const { publicCatalog, findGuideEntries, entryForPage, describeEntry, guideEntryLabel, guideStatus, PUBLIC_READ_TOOLS } = await loadTypeScript('../src/lib/sentinel/guide.ts');
const { sentinelSpring } = await loadTypeScript('../src/components/identity/sentinel-motion.ts');
const { GET } = await loadTypeScript('../src/app/api/sentinel/catalog/route.ts');
const { resetRateLimits } = await loadTypeScript('../src/lib/http/rate-limit.ts');

test('public projection publishes registry facts and never arbitrary/private routes or fields', () => {
  const catalog = publicCatalog(allEntities);
  assert.ok(catalog.length > 20);
  for (const entry of catalog) {
    assert.ok(allEntities.some(source => source.id === entry.id && source.route === entry.route));
    assert.deepEqual(Object.keys(entry).sort(), ['division', 'id', 'kind', 'name', 'route', 'status', 'summary', 'terms'].sort());
  }
  const sample = allEntities[0];
  assert.deepEqual(publicCatalog([{ ...sample, route: '//private.example' }, { ...sample, route: 'https://private.example' }, { ...sample, route: null }]), []);
  assert.equal(entryForPage(catalog, '/engineering').id, 'route-engineering');
  assert.ok(findGuideEntries(catalog, 'متجر').some(entry => /store/i.test(entry.name)));
  assert.deepEqual(findGuideEntries(catalog, 'x'.repeat(257)), []);
  assert.match(describeEntry(entryForPage(catalog, '/signal'), 'ar', '/signal'), /ليست/);
});

test('Arabic recommendations use real source routes, localized labels and honest publication states', () => {
  const catalog = publicCatalog(allEntities);
  const matches = findGuideEntries(catalog, 'أريد إنشاء المتجر');
  assert.ok(matches.some(entry => entry.route === '/solutions/build-an-online-store'));
  const store = matches.find(entry => entry.route === '/solutions/build-an-online-store');
  assert.equal(guideEntryLabel(store, 'ar'), 'بناء متجر إلكتروني');
  assert.equal(guideStatus('in-development', 'ar'), 'قيد التطوير');
  assert.match(describeEntry(store, 'ar'), /الحالة المعلنة/);
});

test('spring converges across normal and delayed frames without sustained oscillation or runaway work', () => {
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 10]) {
    let position = 0, velocity = 0;
    for (let frame = 0; frame < 720; frame++) {
      const state = sentinelSpring(position, velocity, 500, dt);
      position = state.position; velocity = state.velocity;
      assert.ok(Number.isFinite(position) && position >= 0 && position <= 501);
    }
    assert.ok(Math.abs(position - 500) < .18);
    assert.ok(Math.abs(velocity) < 1);
  }
});

test('anonymous boundary has one PUBLIC_READ tool, no provider/private actions, bounded requests and abuse ceilings', async () => {
  resetRateLimits();
  assert.deepEqual(PUBLIC_READ_TOOLS, ['published_catalog']);
  const base = 'https://knoux.store/api/sentinel/catalog';
  const response = GET(new Request(base));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'REGISTRY_GUIDE');
  assert.equal(data.audit.providerCalls, 0); assert.equal(data.audit.privateTools, 0);
  assert.equal(GET(new Request(`${base}?tool=run_local_readonly_tool`)).status, 403);
  assert.equal(GET(new Request(base, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal(GET(new Request(base, { headers: { 'content-length': '4096' } })).status, 413);
  for (let n = 1; n < 30; n++) assert.equal(GET(new Request(base)).status, 200);
  assert.equal(GET(new Request(base)).status, 429);
  resetRateLimits();
  for (let n = 0; n < 300; n++) assert.equal(GET(new Request(base, { headers: { 'x-forwarded-for': `claimed-${n}` } })).status, 200);
  assert.equal(GET(new Request(base, { headers: { 'x-forwarded-for': 'fresh-spoof' } })).status, 429);
  const source = readFileSync(new URL('../src/app/api/sentinel/catalog/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from.*(?:\/ai\/|supabase|relay|gateway)/);
});

const { HintPolicy, contextPrompt } = await loadTypeScript('../src/lib/sentinel/context.ts');
test('context policy allows published intent once, cools each route and stops after repeated dismissals', () => {
  const policy = new HintPolicy();
  assert.equal(policy.allow('/engineering','/engineering',0),true);
  assert.equal(policy.allow('/engineering','/solutions',1000),false);
  assert.equal(policy.allow('/engineering','/engineering',40000),false);
  assert.equal(policy.allow('/engineering','/solutions',40000),true);
  policy.dismiss(); policy.dismiss(); policy.dismiss();
  assert.equal(policy.allow('/products','/products',100000),false);
  const entry=entryForPage(publicCatalog(allEntities),'/engineering');
  assert.match(contextPrompt(entry,'en'),/published engineering/);
  assert.match(contextPrompt(entry,'ar'),/الهندسة المنشور/);
});

const { companionFieldLabel } = await import('../src/lib/sentinel/companion-contract.ts');
const { isGuideTone, tonesForLanguage } = await import('../src/lib/sentinel/languages.ts');

test('contact field guidance stays localized and never invents unknown fields', () => {
  assert.match(companionFieldLabel('name', 'ar'), /الاسم/);
  assert.match(companionFieldLabel('email', 'ur'), /ای میل/);
  assert.match(companionFieldLabel('message', 'en'), /Do not include passwords/);
  assert.equal(companionFieldLabel('not-a-contact-field', 'en'), null);
});

test('Arabic regional tone choices remain scoped and are not offered as Urdu or English voices', () => {
  assert.equal(isGuideTone('egyptian'), true);
  assert.equal(isGuideTone('gulf'), true);
  assert.equal(isGuideTone('unrecognized'), false);
  assert.deepEqual(tonesForLanguage('ar'), ['standard', 'egyptian', 'gulf']);
  assert.deepEqual(tonesForLanguage('en'), []);
  assert.deepEqual(tonesForLanguage('ur'), []);
});
