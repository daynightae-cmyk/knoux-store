import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', '20261016090000_knoux_growth_media_assets.sql'), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');

test('media assets migration is additive, guarded and tenant-scoped', () => {
  assert.match(code, /create table if not exists public\.knoux_growth_media_assets/);
  assert.match(code, /enable row level security/);
  assert.match(code, /knoux_growth_memberships/);
  assert.match(code, /^begin;$/m);
  assert.match(code, /^commit;$/m);
});

test('media migration holds no secret, no public grant and no destructive statement', () => {
  const statements = code.replace(/revoke[^;]+;/gi, '');
  for (const [pattern, label] of [[/\bdrop\s+table\b/i, 'DROP TABLE'], [/\btruncate\b/i, 'TRUNCATE'], [/\bdelete\s+from\b/i, 'DELETE FROM']]) {
    assert.equal(pattern.test(statements), false, `${label} forbidden`);
  }
  assert.doesNotMatch(code, /secret|token|password/i);
  assert.match(code, /revoke all on table public\.knoux_growth_media_assets from public, anon;/);
  assert.match(code, /grant select on table public\.knoux_growth_media_assets to authenticated;/);
  assert.doesNotMatch(code, /grant\s+(?:all|insert|update|delete)\s+on table public\.knoux_growth_media_assets/i);
});

test('media MIME allowlist matches the application validator', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']) assert.ok(code.includes(mime), mime);
  assert.ok(!code.includes('image/gif'), 'gif must stay rejected');
});
