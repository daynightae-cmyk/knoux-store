import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = ['20261005090000_knoux_growth_v1.sql', '20261005091000_knoux_growth_v2.sql']
  .map(name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')).join('\n');
const hardening = readFileSync(new URL('../supabase/migrations/20261007100000_knoux_growth_write_boundaries.sql', import.meta.url), 'utf8');
const tables = [...base.matchAll(/create table if not exists public\.(knoux_growth_\w+)/g)].map(match => match[1]);

test('every recovered Growth table excludes PUBLIC and anon privileges', () => {
  assert.ok(tables.length >= 20);
  for (const table of tables) assert.ok(hardening.includes(`revoke all on table public.${table} from public, anon;`), table);
});

test('membership-only business policies cannot authorize direct browser mutations', () => {
  const writable = [...base.matchAll(/grant select, insert(?:, update, delete)? on table public\.(knoux_growth_\w+) to authenticated/g)]
    .map(match => match[1]).filter(table => !['knoux_growth_clients', 'knoux_growth_memberships', 'knoux_growth_ai_threads'].includes(table));
  for (const table of writable) {
    assert.ok(hardening.includes(`revoke insert, update, delete, truncate, references, trigger on table public.${table} from authenticated;`), table);
  }
  assert.doesNotMatch(hardening, /grant\s+(?:all|insert|update|delete)/i);
  assert.ok(hardening.includes('knoux_growth_audit_log from authenticated;'));
});

test('hardening is transactional and preserves all recovered rows and read policies', () => {
  assert.match(hardening, /^begin;$/m);
  assert.match(hardening, /^commit;$/m);
  assert.doesNotMatch(hardening, /^(?:drop|delete|truncate|update|alter table)\s/im);
  assert.match(hardening, /revoke all on function public\.knoux_growth_is_client_owner\(text\) from public, anon;/);
});
