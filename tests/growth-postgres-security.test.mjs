import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Executes the real migration SQL in Postgres. Supabase JWT plumbing and Vault
// are test peripherals; Vault encryption itself requires live Supabase proof.
test('Growth migrations enforce tenancy, protected writes and durable single-use OAuth in Postgres', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create schema vault; create table vault.secrets(id uuid primary key default gen_random_uuid(), secret text not null);
    create view vault.decrypted_secrets as select id, secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(p_value text) returns uuid language sql as $$insert into vault.secrets(secret) values(p_value) returning id$$;
  `);
  for (const name of ['20261005090000_knoux_growth_v1.sql', '20261005091000_knoux_growth_v2.sql', '20261007100000_knoux_growth_write_boundaries.sql', '20261007110000_knoux_growth_durable_oauth.sql']) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const viewer = '33333333-3333-4333-8333-333333333333';
  await db.exec(`insert into auth.users(id) values ('${owner}'),('${other}'),('${viewer}');
    insert into public.knoux_growth_clients(id,name) values ('a','Client A'),('b','Client B'),('c','Client C');
    insert into public.knoux_growth_memberships(user_id,client_id,role) values
      ('${owner}','a','OWNER'),('${owner}','b','VIEWER'),('${other}','b','OWNER'),('${viewer}','a','VIEWER');`);

  await t.test('authenticated reads exclude unrelated tenants and self-promotion is refused', async () => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false);`);
    assert.deepEqual((await db.query('select id from public.knoux_growth_clients order by id')).rows.map(row => row.id), ['a']);
    await assert.rejects(db.query(`insert into public.knoux_growth_memberships(user_id,client_id,role) values ($1,'b','OWNER')`, [viewer]), error => error.code === '42501');
    assert.equal((await db.query(`update public.knoux_growth_memberships set role='OWNER' where user_id=$1 returning role`, [viewer])).rows.length, 0);
    await db.exec('reset role');
    assert.equal((await db.query(`select role from public.knoux_growth_memberships where user_id=$1`, [viewer])).rows[0].role, 'VIEWER');
  });

  await t.test('all business writes and privileged OAuth/Vault calls refuse browser roles', async () => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
    await assert.rejects(db.query(`insert into public.knoux_growth_content(client_id) values ('a')`), error => error.code === '42501');
    await assert.rejects(db.query(`select public.knoux_growth_secret_get(gen_random_uuid(),'a',$1)`, [owner]), error => error.code === '42501');
    await assert.rejects(db.query('select * from knoux_growth_private.secret_owners'), error => error.code === '42501');
    await assert.rejects(db.query(`select public.knoux_growth_oauth_begin($1,$2,'a',$3,'meta',array['pages_show_list'])`, ['a'.repeat(64), 'b'.repeat(64), owner]), error => error.code === '42501');
    await db.exec('reset role');
  });

  await t.test('creative-only roles cannot read budgets directly through Supabase table grants', async () => {
    await db.query(`insert into public.knoux_growth_campaigns(client_id,name,objective,budget_minor,start_date,end_date) values ('a','Stored campaign','LEADS',12500,'2026-10-01','2026-10-20')`);
    await db.query(`insert into public.knoux_growth_metrics(client_id,channel,metric_key,value,period_start,period_end,origin,evidence) values ('a','meta','spend',125,'2026-10-01','2026-10-20','LIVE','test-provider'),('a','meta','clicks',4,'2026-10-01','2026-10-20','LIVE','test-provider')`);
    await db.query(`update public.knoux_growth_memberships set role='DESIGNER' where user_id=$1 and client_id='a'`, [viewer]);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false);`);
    assert.equal((await db.query('select budget_minor from public.knoux_growth_campaigns')).rows.length, 0);
    assert.deepEqual((await db.query('select metric_key from public.knoux_growth_metrics')).rows.map(row => row.metric_key), ['clicks']);
    await db.exec('reset role');
  });

  await t.test('server broker still refuses a non-owner of the target client', async () => {
    await db.exec('set role service_role');
    await assert.rejects(db.query(`select public.knoux_growth_oauth_begin($1,$2,'b',$3,'meta',array['pages_show_list'])`, ['a'.repeat(64), 'b'.repeat(64), owner]), error => error.code === '42501');
    await db.exec('reset role');
  });

  await t.test('state is bound to session, user, provider and ten-minute TTL', async () => {
    await db.exec('set role service_role');
    await db.query(`select public.knoux_growth_oauth_begin($1,$2,'a',$3,'meta',array['pages_show_list'])`, ['a'.repeat(64), 'b'.repeat(64), owner]);
    for (const [binding, user, provider] of [['c'.repeat(64), owner, 'meta'], ['b'.repeat(64), other, 'meta'], ['b'.repeat(64), owner, 'google']]) {
      assert.equal((await db.query('select * from public.knoux_growth_oauth_consume($1,$2,$3,$4)', ['a'.repeat(64), binding, user, provider])).rows.length, 0);
    }
    await db.exec('reset role');
    const lifetime = (await db.query(`select extract(epoch from expires_at-created_at) as seconds from public.knoux_growth_oauth_states where state_hash=$1`, ['a'.repeat(64)])).rows[0];
    assert.equal(Number(lifetime.seconds), 600);
  });

  await t.test('two consumption attempts have exactly one winner; replay returns no state', async () => {
    await db.exec('set role service_role');
    const attempts = await Promise.all([0, 1].map(() => db.query('select * from public.knoux_growth_oauth_consume($1,$2,$3,$4)', ['a'.repeat(64), 'b'.repeat(64), owner, 'meta'])));
    assert.equal(attempts.reduce((count, result) => count + result.rows.length, 0), 1);
    await db.exec('reset role');
  });

  await t.test('expired and revoked-owner handshakes cannot be consumed', async () => {
    await db.query(`select public.knoux_growth_oauth_begin($1,$2,'a',$3,'google',array['scope'])`, ['d'.repeat(64), 'e'.repeat(64), owner]);
    await db.query(`update public.knoux_growth_oauth_states set expires_at=now()-interval '1 second' where state_hash=$1`, ['d'.repeat(64)]);
    assert.equal((await db.query('select * from public.knoux_growth_oauth_consume($1,$2,$3,$4)', ['d'.repeat(64), 'e'.repeat(64), owner, 'google'])).rows.length, 0);
    await db.query(`select public.knoux_growth_oauth_begin($1,$2,'b',$3,'google',array['scope'])`, ['f'.repeat(64), 'e'.repeat(64), other]);
    await db.query(`update public.knoux_growth_memberships set role='VIEWER' where client_id='b' and user_id=$1`, [other]);
    assert.equal((await db.query('select * from public.knoux_growth_oauth_consume($1,$2,$3,$4)', ['f'.repeat(64), 'e'.repeat(64), other, 'google'])).rows.length, 0);
  });

  await t.test('finalization requires scoped persisted secrets, records verification/audit and cannot replay', async () => {
    const secretId = (await db.query(`select public.knoux_growth_secret_put('test-only-token','meta-access-token','a',$1) as id`, [owner])).rows[0].id;
    const args = ['a'.repeat(64), owner, 'facebook', `vault://growth/${secretId}`, null, ['pages_show_list'], null, true, []];
    await db.query('select public.knoux_growth_oauth_finish($1,$2,$3,$4,$5,$6,$7,$8,$9)', args);
    const row = (await db.query(`select state,last_verified_at,capability_state from public.knoux_growth_connections where client_id='a' and platform='facebook'`)).rows[0];
    assert.equal(row.state, 'CONNECTED'); assert.ok(row.last_verified_at); assert.equal(row.capability_state, 'LIVE_VERIFIED');
    assert.equal((await db.query(`select count(*) as count from public.knoux_growth_audit_log where client_id='a' and action='CONNECTION_COMPLETED'`)).rows[0].count, 1);
    await assert.rejects(db.query('select public.knoux_growth_oauth_finish($1,$2,$3,$4,$5,$6,$7,$8,$9)', args), /Consumed OAuth state required/);
    assert.equal((await db.query(`select public.knoux_growth_connection_remove('a',$1,'facebook') as removed`, [owner])).rows[0].removed, true);
    assert.equal((await db.query('select count(*) as count from vault.secrets')).rows[0].count, 0);
    assert.equal((await db.query(`select count(*) as count from public.knoux_growth_audit_log where client_id='a' and action='CONNECTION_REMOVED'`)).rows[0].count, 1);
  });
  await t.test('reauthorization preserves an omitted Google refresh token and atomically removes obsolete access secrets', async () => {
    const refresh = (await db.query(`select public.knoux_growth_secret_put('test-refresh','google-refresh-token','a',$1) as id`, [owner])).rows[0].id;
    const access = (await db.query(`select public.knoux_growth_secret_put('test-access','google-access-token','a',$1) as id`, [owner])).rows[0].id;
    const finish = async (hash, id, refreshRef) => {
      await db.query(`select public.knoux_growth_oauth_begin($1,$2,'a',$3,'google',array['scope'])`, [hash, 'b'.repeat(64), owner]);
      await db.query('select * from public.knoux_growth_oauth_consume($1,$2,$3,$4)', [hash, 'b'.repeat(64), owner, 'google']);
      await db.query('select public.knoux_growth_oauth_finish($1,$2,$3,$4,$5,$6,$7,$8,$9)', [hash, owner, 'youtube', `vault://growth/${id}`, refreshRef, ['scope'], null, false, []]);
    };
    await finish('1'.repeat(64), access, `vault://growth/${refresh}`);
    const replacement = (await db.query(`select public.knoux_growth_secret_put('test-replacement','google-access-token','a',$1) as id`, [owner])).rows[0].id;
    await finish('2'.repeat(64), replacement, null);
    const connection = (await db.query(`select secret_ref,refresh_secret_ref,state,last_verified_at from public.knoux_growth_connections where client_id='a' and platform='youtube'`)).rows[0];
    assert.equal(connection.secret_ref, `vault://growth/${replacement}`);
    assert.equal(connection.refresh_secret_ref, `vault://growth/${refresh}`);
    assert.equal(connection.state, 'CONNECTING');
    assert.equal(connection.last_verified_at, null);
    assert.equal((await db.query('select count(*) as count from vault.secrets where id=$1', [access])).rows[0].count, 0);
    assert.equal((await db.query(`select public.knoux_growth_connection_remove('a',$1,'youtube') as removed`, [owner])).rows[0].removed, true);
    assert.equal((await db.query('select count(*) as count from vault.secrets')).rows[0].count, 0);
  });
});
