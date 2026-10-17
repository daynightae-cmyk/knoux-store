import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const media = await import('../src/lib/growth/media.ts');
const studio = await import('../src/lib/growth/studio.ts');

test('upload validation accepts images/video within caps and refuses the rest', () => {
  assert.equal(media.validateUpload({ mimeType: 'image/jpeg', byteSize: 1024, clientId: 'client-a', fileName: 'hero.jpg' }).ok, true);
  assert.equal(media.validateUpload({ mimeType: 'video/mp4', byteSize: 15 * 1024 * 1024, clientId: 'client-a', fileName: 'reel.mp4' }).ok, true);
  assert.equal(media.validateUpload({ mimeType: 'image/gif', byteSize: 100, clientId: 'client-a', fileName: 'anim.gif' }).ok, false);
  assert.equal(media.validateUpload({ mimeType: 'image/png', byteSize: 11 * 1024 * 1024, clientId: 'client-a', fileName: 'big.png' }).ok, false);
  assert.equal(media.validateUpload({ mimeType: 'image/jpeg', byteSize: 100, clientId: '../evil', fileName: 'x.jpg' }).ok, false);
});

test('tenant paths scope to client and filenames are traversal-safe', () => {
  assert.equal(media.tenantPath('client-a', 'asset-1', 'hero.jpg'), 'client-a/asset-1-hero.jpg');
  assert.equal(media.safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(media.safeFileName(''), 'asset');
});

test('media resolution distinguishes EMPTY / UNRESOLVED / RESOLVED', () => {
  assert.deepEqual(media.resolveMediaState({}), { state: 'EMPTY' });
  assert.equal(media.resolveMediaState({ mediaAssetId: 'a1' }).state, 'UNRESOLVED');
  const resolved = media.resolveMediaState({ mediaAssetId: 'a1', signedUrl: 'https://cdn/x.jpg', mimeType: 'image/jpeg' });
  assert.equal(resolved.state, 'RESOLVED');
  assert.equal(resolved.url, 'https://cdn/x.jpg');
  assert.equal(media.resolveMediaState({ mediaAssetId: 'v1', signedUrl: 'https://cdn/v.mp4', mimeType: 'video/mp4' }).kind, 'VIDEO');
});

test('media attachment starts from stored draft, bumps revision and invalidates fingerprint', () => {
  const draft = { id: 'c1', clientId: 'client-a', headline: 'H', primaryText: 'P', cta: 'C', languages: ['en'], mediaAssetId: 'a1', updatedAt: '2026-10-16T00:00:00Z', status: 'APPROVED', reviewedBy: 'r' };
  const plan = { id: 'p1', clientId: 'client-a', name: 'N', objective: 'LEADS', platforms: ['instagram'], budgetMinor: 1000, currency: 'AED', locations: ['Dubai'], languages: ['en'], startDate: '2026-10-16', endDate: '2026-10-31', creativeSetIds: ['c1'] };
  const before = studio.reviewFingerprint(plan, [studio.beginEdit(draft)]);
  assert.equal(studio.beginEdit(draft).mediaAssetId, 'a1');
  const changed = studio.updateEdit(studio.beginEdit(draft), { mediaAssetId: 'a2' }, 'client-a', draft);
  assert.equal(changed.mediaAssetId, 'a2');
  assert.equal(changed.revision, 1);
  assert.equal(changed.creative.status, 'DRAFT');
  assert.notEqual(studio.reviewFingerprint(plan, [changed]), before);
});


test('media signatures refuse spoofed MIME and truncated content', () => {
  for (const mime of Object.keys(media.ALLOWED_MIME)) assert.equal(media.matchesMediaSignature(new TextEncoder().encode('<script>bad</script>'),mime),false);
  const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0s8AAAAASUVORK5CYII=','base64'));
  assert.equal(media.matchesMediaSignature(png,'image/png'),true);
  assert.equal(media.matchesMediaSignature(png,'image/jpeg'),false);
  assert.equal(media.matchesMediaSignature(png.slice(0,8),'image/png'),false);
});

test('multipart uploads enforce declared and actual byte caps', async () => {
  await assert.rejects(media.boundedMediaForm(new Request('https://example.test',{method:'POST',headers:{'content-length':String(22*1024*1024)},body:'x'})),RangeError);
  let cancelled=false;
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(22*1024*1024));},cancel(){cancelled=true;}});
  await assert.rejects(media.boundedMediaForm(new Request('https://example.test',{method:'POST',body,duplex:'half'})),RangeError);
  assert.equal(cancelled,true);
});
