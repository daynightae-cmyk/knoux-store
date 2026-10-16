import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTypeScript } from './load.mjs';

const { allEntities } = await loadTypeScript('../src/data/composer-rules.ts');
const { publicCatalog, findGuideEntries, entryForPage, describeEntry, PUBLIC_READ_TOOLS } = await loadTypeScript('../src/lib/sentinel/guide.ts');
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
  assert.ok(findGuideEntries(catalog, 'الْمَتْجَر،').some(entry => /store/i.test(entry.name)), 'Arabic articles, punctuation and vowel marks preserve the same need');
  assert.deepEqual(findGuideEntries(catalog, 'store store'), findGuideEntries(catalog, 'store'), 'repeating a word must not inflate its ranking');
  assert.deepEqual(findGuideEntries(catalog, 'x'.repeat(257)), []);
  assert.match(describeEntry(entryForPage(catalog, '/signal'), 'ar', '/signal'), /ليست/);
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
  assert.equal(GET(new Request(`${base}?${'a'.repeat(1100)}`)).status, 413);
  for (let n = 1; n < 30; n++) assert.equal(GET(new Request(base)).status, 200);
  assert.equal(GET(new Request(base)).status, 429);
  resetRateLimits();
  for (let n = 0; n < 300; n++) assert.equal(GET(new Request(base, { headers: { 'x-forwarded-for': `claimed-${n}` } })).status, 200);
  assert.equal(GET(new Request(base, { headers: { 'x-forwarded-for': 'fresh-spoof' } })).status, 429);
  const source = readFileSync(new URL('../src/app/api/sentinel/catalog/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from.*(?:\/ai\/|supabase|relay|gateway)/);
});
