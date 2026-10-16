import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const {projectWorkspace}=await import('../src/lib/growth/persistence/workspace-projection.ts');
const {beginEdit}=await import('../src/lib/growth/studio.ts');

const owner='11111111-1111-4111-8111-111111111111';
const viewer='22222222-2222-4222-8222-222222222222';
const campaignInput={name:'Persisted draft',objective:'LEADS',budget_minor:12000,currency:'AED',start_date:'2026-10-16',end_date:'2026-10-31',locations:['Dubai'],languages:['en'],platforms:['instagram']};
const creativeInput={concept:'Real draft',headline:'Headline',primary_text:'Body',languages:['en'],destination_url:'https://example.com/landing'};

test('draft transactions execute on PostgreSQL with tenant and revision enforcement', async t => {
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create schema storage; create table storage.objects(bucket_id text,name text); alter table storage.objects enable row level security;`);
  for(const name of ['20261005090000_knoux_growth_v1.sql','20261005091000_knoux_growth_v2.sql','20261007100000_knoux_growth_write_boundaries.sql','20261016045736_knoux_growth_atomic_drafts.sql','20261016090000_knoux_growth_media_assets.sql']) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
  }
  await db.exec(`insert into auth.users values ('${owner}'),('${viewer}');
    insert into knoux_growth_clients(id,name) values ('a','A'),('b','B');
    insert into knoux_growth_memberships(user_id,client_id,role) values ('${owner}','a','OWNER'),('${owner}','b','OWNER'),('${viewer}','a','VIEWER');
    grant all on all tables in schema public to service_role;`);
  const call=async(kind,client,input,id=null,expected=null,actor=owner)=>(await db.query(`select public.knoux_growth_save_${kind}_draft($1,$2,$3,$4,$5::jsonb) as result`,[client,actor,id,expected,JSON.stringify({ request_key: randomUUID(), ...input })])).rows[0].result;
  const get=async(table,id)=>(await db.query(`select to_jsonb(t) as result from public.knoux_growth_${table} t where id=$1`,[id])).rows[0]?.result;
  let a,b,creative;
  await t.test('owner onboarding creates client and membership atomically with idempotency',async()=>{
    const input={name:'Authorized test client',city:'Dubai',request_key:randomUUID()};
    const create=async(actor)=>(await db.query('select public.knoux_growth_create_client($1,$2,$3::jsonb) as result',['a',actor,JSON.stringify(input)])).rows[0].result;
    await assert.rejects(create(viewer),e=>e.code==='42501');
    const created=await create(owner); const repeated=await create(owner);
    assert.equal(created.id,repeated.id); assert.equal(created.origin,'LIVE'); assert.equal(created.autonomy_mode,'ADVISOR');
    assert.equal((await db.query('select role from knoux_growth_memberships where client_id=$1 and user_id=$2',[created.id,owner])).rows[0].role,'OWNER');
  });
  await t.test('creates scoped campaign channels and saves own campaign',async()=>{
    a=await call('campaign','a',campaignInput); b=await call('campaign','b',campaignInput);
    const channels=(await db.query('select client_id,platform from knoux_growth_campaign_channels where campaign_id=$1',[a.id])).rows;
    assert.deepEqual(channels,[{client_id:'a',platform:'instagram'}]);
    a=await call('campaign','a',{...campaignInput,name:'Updated'},a.id,a.updated_at);
    assert.equal(a.name,'Updated'); assert.equal(a.version,2);
  });
  await t.test('duplicate create requests reuse a durable receipt without duplicate rows',async()=>{
    const input={...campaignInput,request_key:randomUUID()};
    const first=await call('campaign','a',input); const retry=await call('campaign','a',input);
    assert.equal(first.id,retry.id);
    await assert.rejects(call('campaign','a',{...input,name:'Different'}),e=>e.code==='40001');
  });
  await t.test('foreign campaign IDs cannot be moved even for an actor with both memberships',async()=>{
    await assert.rejects(call('campaign','a',campaignInput,b.id,b.updated_at),e=>e.code==='P0002');
    assert.equal((await get('campaigns',b.id)).client_id,'b');
  });
  await t.test('own creative survives reload with authoritative media ID and destination',async()=>{
    const asset=(await db.query(`insert into knoux_growth_media_assets(client_id,storage_path,mime_type,byte_size) values ('a','a/test.png','image/png',24) returning id`)).rows[0];
    creative=await call('creative','a',{...creativeInput,campaign_id:a.id,media_asset_id:asset.id});
    creative=await call('creative','a',{...creativeInput,headline:'Edited',campaign_id:a.id,media_asset_id:asset.id},creative.id,creative.updated_at);
    const stored=await get('creatives',creative.id);
    assert.equal(stored.headline,'Edited'); assert.equal(stored.media_asset_id,asset.id); assert.equal(stored.destination_url,creativeInput.destination_url);
    const projected=projectWorkspace({id:'a',branches:[]},{campaigns:[],communities:[],leads:[],connections:[],activity:[],content:[],creatives:[stored],collections:[],automations:[]},[]);
    const rehydrated=beginEdit(projected.creatives[0]);
    assert.equal(rehydrated.mediaAssetId,asset.id); assert.equal(rehydrated.destination,creativeInput.destination_url); assert.equal(rehydrated.creative.headline,'Edited');
    const foreign=await call('creative','b',creativeInput);
    await assert.rejects(call('creative','a',creativeInput,foreign.id,foreign.updated_at),e=>e.code==='P0002');
  });
  await t.test('storage path constraint uses exact tenant segments rather than LIKE wildcards',async()=>{
    await db.query(`insert into knoux_growth_clients(id,name) values ('tenant_a','Scoped test tenant')`);
    await assert.rejects(db.query(`insert into knoux_growth_media_assets(client_id,storage_path,mime_type,byte_size) values ('tenant_a','tenantXa/forged.png','image/png',64)`),e=>e.code==='23514');
  });
  await t.test('migration constraints reject foreign asset attachment even through a privileged writer',async()=>{
    const asset=(await db.query(`insert into knoux_growth_media_assets(client_id,storage_path,mime_type,byte_size) values ('b','b/other.png','image/png',24) returning id`)).rows[0];
    await assert.rejects(db.query('update knoux_growth_creatives set media_asset_id=$1 where id=$2',[asset.id,creative.id]),e=>e.code==='23503');
  });
  await t.test('forged campaign and foreign media associations roll back completely',async()=>{
    await assert.rejects(call('creative','a',{...creativeInput,campaign_id:b.id}),e=>e.code==='42501');
    const asset=(await db.query(`insert into knoux_growth_media_assets(client_id,storage_path,mime_type,byte_size) values ('b','b/foreign.png','image/png',24) returning id`)).rows[0];
    await assert.rejects(call('creative','a',{...creativeInput,media_asset_id:asset.id}),e=>e.code==='42501');
  });
  await t.test('missing edit permission refuses database calls and browser roles cannot execute RPC',async()=>{
    await assert.rejects(call('campaign','a',campaignInput,null,null,viewer),e=>e.code==='42501');
    await assert.rejects(call('creative','a',creativeInput,null,null,viewer),e=>e.code==='42501');
    await db.exec('set role authenticated');
    await assert.rejects(call('creative','a',creativeInput),e=>e.code==='42501');
    await db.exec('reset role');
  });
  await t.test('approval invalidation, version and hash changes are durable',async()=>{
    a=await get('campaigns',a.id);
    await db.query(`insert into knoux_growth_campaign_approvals(campaign_id,client_id,approved_plan_hash,campaign_version,budget_minor,currency,duration_days,requested_by) values ($1,'a','old',$2,12000,'AED',15,$3)`,[a.id,a.version,owner]);
    await db.query(`update knoux_growth_campaigns set plan_hash='old' where id=$1`,[a.id]);
    creative=await call('creative','a',{...creativeInput,campaign_id:a.id},creative.id,creative.updated_at);
    assert.ok((await db.query('select invalidated_at from knoux_growth_campaign_approvals where campaign_id=$1',[a.id])).rows[0].invalidated_at);
    const after=await get('campaigns',a.id); assert.equal(after.plan_hash,null); assert.equal(after.version,a.version+1);
  });
  await t.test('duplicate and concurrent update requests have one winner',async()=>{
    const args=['creative','a',creativeInput,creative.id,creative.updated_at];
    const results=await Promise.allSettled([call(...args),call(...args)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.code,'40001');
    creative=await get('creatives',creative.id);
  });
  await t.test('failed channel persistence rolls back parent, channels, approval and audit',async()=>{
    a=await get('campaigns',a.id);
    const pending=(await db.query(`insert into knoux_growth_campaign_approvals(campaign_id,client_id,approved_plan_hash,campaign_version,budget_minor,currency,duration_days,requested_by) values ($1,'a','still-current',$2,12000,'AED',15,$3) returning id`,[a.id,a.version,owner])).rows[0];
    const audit=(await db.query('select count(*)::int as n from knoux_growth_audit_log')).rows[0].n;
    await assert.rejects(call('campaign','a',{...campaignInput,name:'Must roll back',platforms:['instagram','unsupported']},a.id,a.updated_at),e=>e.code==='23514');
    assert.deepEqual(await get('campaigns',a.id),a);
    assert.equal((await db.query('select invalidated_at from knoux_growth_campaign_approvals where id=$1',[pending.id])).rows[0].invalidated_at,null);
    assert.equal((await db.query('select count(*)::int as n from knoux_growth_audit_log')).rows[0].n,audit);
    assert.equal((await db.query('select platform from knoux_growth_campaign_channels where campaign_id=$1',[a.id])).rows[0].platform,'instagram');
  });
  await t.test('actual service_role can execute invoker RPCs and browser roles cannot',async()=>{
    await db.exec('set role service_role');
    const created=await call('campaign','a',{...campaignInput,request_key:randomUUID()});
    assert.equal(created.client_id,'a');
    const draft=await call('creative','a',{...creativeInput,campaign_id:created.id});
    assert.equal(draft.campaign_id,created.id);
    await db.exec('reset role');
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(call('creative','a',creativeInput),e=>e.code==='42501');
      await db.exec('reset role');
    }
  });
  await t.test('an audit write failure rolls back the creative and pending approvals',async()=>{
    a=await get('campaigns',a.id); creative=await get('creatives',creative.id);
    const pending=(await db.query(`insert into knoux_growth_campaign_approvals(campaign_id,client_id,approved_plan_hash,campaign_version,budget_minor,currency,duration_days,requested_by) values ($1,'a','audit-failure',$2,12000,'AED',15,$3) returning id`,[a.id,a.version,owner])).rows[0];
    await db.exec(`create function public.test_reject_audit() returns trigger language plpgsql as $$begin raise exception 'Injected audit persistence failure' using errcode='23514'; end $$;
      create trigger test_reject_audit before insert on public.knoux_growth_audit_log for each row execute function public.test_reject_audit();`);
    await assert.rejects(call('creative','a',{...creativeInput,headline:'Must roll back',campaign_id:a.id},creative.id,creative.updated_at),e=>e.code==='23514');
    assert.deepEqual(await get('creatives',creative.id),creative);
    assert.deepEqual(await get('campaigns',a.id),a);
    assert.equal((await db.query('select invalidated_at from knoux_growth_campaign_approvals where id=$1',[pending.id])).rows[0].invalidated_at,null);
    await db.exec('drop trigger test_reject_audit on public.knoux_growth_audit_log; drop function public.test_reject_audit();');
  });
  await t.test('direct browser profile writes cannot bypass approval invalidation',async()=>{
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
    await assert.rejects(db.query(`update knoux_growth_clients set brand_tone='Bypass' where id='a'`),e=>e.code==='42501');
    await assert.rejects(db.query(`delete from knoux_growth_clients where id='a'`),e=>e.code==='42501');
    await db.exec('reset role');
  });
  await t.test('brand profiles are scoped, revision-checked and invalidate draft approvals',async()=>{
    const client=(await db.query(`select to_jsonb(c) as row from knoux_growth_clients c where id='a'`)).rows[0].row;
    const input={name:'Updated client',business_category:'Sports',city:'Dubai',brand_colors:['#334455'],brand_fonts:['Inter'],brand_tone:'Clear',forbidden_claims:['Guaranteed result'],arabic_style:'واضح',english_style:'Clear'};
    const save=async(actor,expected)=>(await db.query('select public.knoux_growth_save_brand_profile($1,$2,$3,$4::jsonb) as result',['a',actor,expected,JSON.stringify(input)])).rows[0].result;
    await assert.rejects(save(viewer,client.updated_at),e=>e.code==='42501');
    const updated=await save(owner,client.updated_at);assert.equal(updated.name,input.name);assert.deepEqual(updated.forbidden_claims,input.forbidden_claims);
    assert.equal((await db.query(`select count(*)::int as n from knoux_growth_campaign_approvals where client_id='a' and invalidated_at is null`)).rows[0].n,0);
    await assert.rejects(save(owner,client.updated_at),e=>e.code==='40001');
    assert.equal((await db.query(`select name from knoux_growth_clients where id='b'`)).rows[0].name,'B');
    a=await get('campaigns',a.id);
    await db.query(`update knoux_growth_campaigns set status='APPROVED' where id=$1`,[a.id]);
    await assert.rejects(save(owner,updated.updated_at),e=>e.code==='42501');
    await db.query(`update knoux_growth_campaigns set status='DRAFT' where id=$1`,[a.id]);
  });
  await t.test('cross-tenant channel tampering and protected statuses are refused',async()=>{
    await db.query(`update knoux_growth_campaign_channels set client_id='b' where campaign_id=$1`,[a.id]);
    await assert.rejects(call('campaign','a',campaignInput,a.id,a.updated_at),e=>e.code==='42501');
    await db.query(`update knoux_growth_campaign_channels set client_id='a' where campaign_id=$1`,[a.id]);
    await db.query(`update knoux_growth_campaigns set status='APPROVED' where id=$1`,[a.id]);
    await assert.rejects(call('campaign','a',campaignInput,a.id,a.updated_at),e=>e.code==='42501');
    await assert.rejects(call('creative','a',{...creativeInput,campaign_id:a.id},creative.id,creative.updated_at),e=>e.code==='42501');
  });
  await t.test('tenant media RLS prevents a different client retrieving stored media',async()=>{
    await db.exec(`grant usage on schema auth to authenticated; set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false)`);
    const assets=(await db.query('select client_id from knoux_growth_media_assets')).rows;
    assert.deepEqual(assets.map(r=>r.client_id),['a']);
    await db.exec('reset role');
  });
});
