import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { beginEdit, updateEdit, destinationValid, brandViolations, reviewFingerprint, PLACEMENTS } = await import('../src/lib/growth/studio.ts');
const draft = { id: 'creative-a', clientId: 'client-a', headline: 'Original headline', primaryText: 'Original copy', cta: 'Learn more', languages: ['en'], updatedAt: '2026-10-15T00:00:00Z', status: 'APPROVED', reviewedBy: 'reviewer' };
const plan = { id: 'campaign-a', clientId: 'client-a', name: 'Acquisition', objective: 'LEADS', platforms: ['instagram'], budgetMinor: 50000, currency: 'AED', locations: ['Dubai'], languages: ['en'], startDate: '2026-10-15', endDate: '2026-10-31', creativeSetIds: ['creative-a'] };

test('editing shared creative copy creates a local revision and clears prior approval', () => {
  const source = beginEdit(draft);
  const changed = updateEdit(source, { creative: { headline: 'New headline', primaryText: 'Arabic العربية', cta: 'Contact us' }, locale: 'ar' }, 'client-a', draft);
  assert.equal(changed.creative.headline, 'New headline');
  assert.equal(changed.creative.primaryText, 'Arabic العربية');
  assert.equal(changed.locale, 'ar');
  assert.equal(changed.revision, 1);
  assert.equal(changed.creative.status, 'DRAFT');
  assert.equal(changed.creative.reviewedBy, undefined);
  assert.equal(source.creative.headline, 'Original headline');
});
test('stale revisions and cross-client mutations are refused', () => {
  const edit = beginEdit(draft);
  assert.throws(() => updateEdit(edit, {}, 'client-b', draft), /cross-client/);
  assert.throws(() => updateEdit(edit, {}, 'client-a', { ...draft, updatedAt: 'changed' }), /Stale/);
  assert.throws(() => updateEdit(edit, { creative: { clientId: 'client-b' } }, 'client-a', draft), /ownership/);
  assert.throws(() => updateEdit(edit, {}, 'client-a', { ...draft, id: 'other' }), /Stale/);
});
test('switching clients derives independent content without mutating the prior draft', () => {
  const a = updateEdit(beginEdit(draft), { creative: { headline: 'Client A local' } }, 'client-a', draft);
  const other = { ...draft, id: 'creative-b', clientId: 'client-b', headline: 'Client B' };
  const b = beginEdit(other);
  assert.equal(b.creative.headline, 'Client B');
  assert.equal(b.revision, 0);
  assert.equal(a.creative.headline, 'Client A local');
});
test('every plan, budget, asset and creative change invalidates the review fingerprint', () => {
  const edit = beginEdit(draft);
  const fingerprint = reviewFingerprint(plan, [edit]);
  for (const patch of [{ budgetMinor: 50001 }, { currency: 'USD' }, { locations: ['Cairo'] }, { endDate: '2026-11-01' }, { platforms: ['facebook'] }, { landingPageUrl: 'https://example.org' }, { languages: ['ar'] }, { audienceNotes: 'New audience' }]) assert.notEqual(reviewFingerprint({ ...plan, ...patch }, [edit]), fingerprint);
  for (const patch of [{ asset: 'brand/new.png' }, { destination: 'https://example.org' }, { locale: 'ar' }, { creative: { headline: 'Changed' } }]) assert.notEqual(reviewFingerprint(plan, [updateEdit(edit, patch, 'client-a', draft)]), fingerprint);
});
test('destination validation refuses executable, credential-bearing and insecure URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.org', 'https://user:pass@example.org', 'not a url']) assert.equal(destinationValid(value), false);
  assert.equal(destinationValid('https://example.org/path?utm_source=google'), true);
});
test('brand phrases remain warnings and placement layouts are genuinely distinct', () => {
  assert.deepEqual(brandViolations(beginEdit({ ...draft, headline: 'Guaranteed results' }), ['guaranteed results']), ['guaranteed results']);
  assert.equal(PLACEMENTS.length, 8);
  assert.equal(PLACEMENTS.find((item) => item.id === 'google-search').kind, 'search');
  assert.equal(PLACEMENTS.find((item) => item.id === 'whatsapp').kind, 'message');
  assert.equal(PLACEMENTS.find((item) => item.id === 'instagram-story').ratio, '9 / 16');
});
