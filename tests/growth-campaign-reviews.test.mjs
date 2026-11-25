import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const reviewer = '22222222-2222-4222-8222-222222222222';
const viewer = '33333333-3333-4333-8333-333333333333';
const outsider = '44444444-4444-4444-8444-444444444444';
const migrations = ['20261005090000_knoux_growth_v1.sql', '20261005091000_knoux_growth_v2.sql', '20261007100000_knoux_growth_write_boundaries.sql', '20261016045736_knoux_growth_atomic_drafts.sql', '20261016090000_knoux_growth_media_assets.sql', '20261124131141_knoux_growth_campaign_reviews.sql'];

test('campaign review transactions bind exact persisted work and enforce reviewer, version and audit boundaries', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create schema storage; create table storage.objects(bucket_id text,name text); alter table storage.objects enable row level security;`);
  for (const file of migrations) await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await db.exec(`insert into auth.users values ('${owner}'),('${reviewer}'),('${viewer}'),('${outsider}');
    insert into knoux_growth_clients(id,name) values ('a','A'),('b','B');
    insert into knoux_growth_memberships(user_id,client_id,role) values ('${owner}','a','OWNER'),('${reviewer}','a','CLIENT'),('${viewer}','a','VIEWER'),('${outsider}','b','OWNER');
    grant all on all tables in schema public to service_role;`);
  const create = async () => {
    const campaign = (await db.query(`insert into knoux_growth_campaigns(client_id,name,objective,budget_minor,currency,start_date,end_date,locations,languages,landing_page_url,created_by) values ('a','Exact campaign','LEADS',12000,'AED','2026-11-24','2026-12-01',array['Dubai'],array['en'],'https://example.test/landing',$1) returning to_jsonb(knoux_growth_campaigns) as row`, [owner])).rows[0].row;
    await db.query(`insert into knoux_growth_campaign_channels(campaign_id,client_id,platform) values ($1,'a','instagram');`, [campaign.id]);
    await db.query(`insert into knoux_growth_creatives(client_id,campaign_id,concept,headline,primary_text) values ('a',$1,'Concept','Headline','Saved copy')`, [campaign.id]);
    return campaign;
  };
  const act = async (campaign, action, actor = owner, approval = null, client = 'a') => (await db.query('select public.knoux_growth_review_campaign($1,$2,$3,$4,$5,$6,$7) as receipt', [client, actor, campaign.id, campaign.updated_at, action, approval?.id ?? null, 'Review test'])).rows[0].receipt;
  const get = async id => (await db.query('select to_jsonb(c) as row from knoux_growth_campaigns c where id=$1', [id])).rows[0].row;

  await t.test('a submit freezes campaign, linked creative, channels and brand in a durable record', async () => {
    const campaign = await create();
    const receipt = await act(campaign, 'SUBMIT');
    assert.equal(receipt.campaign.status, 'READY_FOR_REVIEW');
    assert.equal(receipt.approval.requested_by, owner);
    assert.equal(receipt.approval.budget_minor, 12000);
    assert.equal(receipt.approval.plan_snapshot.creatives[0].primary_text, 'Saved copy');
    assert.equal(receipt.approval.plan_snapshot.channels[0].platform, 'instagram');
    assert.equal(receipt.approval.plan_snapshot.brand.name, 'A');
    assert.equal((await db.query(`select count(*)::int as n from knoux_growth_audit_log where subject_id=$1 and action='CAMPAIGN_SUBMITTED'`, [campaign.id])).rows[0].n, 1);
  });
  await t.test('permission, tenant, unsupported launch and stale revisions fail before state mutation', async () => {
    const campaign = await create();
    for (const actor of [viewer, outsider, reviewer]) await assert.rejects(act(campaign, 'SUBMIT', actor), e => e.code === '42501');
    await assert.rejects(act(campaign, 'SUBMIT', owner, null, 'b'), e => e.code === '42501');
    await assert.rejects(act(campaign, 'LAUNCH'), e => e.code === '22023');
    const submitted = await act(campaign, 'SUBMIT');
    await assert.rejects(act(campaign, 'SUBMIT'), e => e.code === '40001');
    await assert.rejects(act(submitted.campaign, 'APPROVE', owner, submitted.approval), e => e.code === '42501');
    await assert.rejects(act(submitted.campaign, 'REJECT', viewer, submitted.approval), e => e.code === '42501');
    assert.equal((await get(campaign.id)).status, 'READY_FOR_REVIEW');
  });
  await t.test('only a separate client reviewer can approve; no launch or provider ID is fabricated', async () => {
    const submitted = await act(await create(), 'SUBMIT');
    const approved = await act(submitted.campaign, 'APPROVE', reviewer, submitted.approval);
    assert.equal(approved.campaign.status, 'APPROVED');
    assert.equal(approved.campaign.provider_campaign_id, null);
    assert.equal(approved.approval.decided_by, reviewer);
    assert.ok(approved.approval.decided_at);
    await assert.rejects(act(approved.campaign, 'REJECT', reviewer, approved.approval), e => e.code === '40001');
    const withdrawn = await act(approved.campaign, 'WITHDRAW', owner, approved.approval);
    assert.equal(withdrawn.campaign.status, 'DRAFT');
    assert.ok(withdrawn.approval.invalidated_at);
    assert.equal(withdrawn.approval.decision, 'APPROVE', 'the original decision remains in history');
  });
  await t.test('a changed creative or brand invalidates the exact review even if campaign version is forged unchanged', async () => {
    for (const change of ['creative', 'brand']) {
      const submitted = await act(await create(), 'SUBMIT');
      if (change === 'creative') await db.query(`update knoux_growth_creatives set headline='Tampered' where campaign_id=$1`, [submitted.campaign.id]);
      else await db.exec(`update knoux_growth_clients set brand_tone='Changed since submission' where id='a'`);
      await assert.rejects(act(submitted.campaign, 'APPROVE', reviewer, submitted.approval), e => e.code === '40001');
      assert.equal((await get(submitted.campaign.id)).status, 'READY_FOR_REVIEW');
    }
  });
  await t.test('request changes can be edited and resubmitted; older pending review is superseded', async () => {
    const submitted = await act(await create(), 'SUBMIT');
    const changed = await act(submitted.campaign, 'REQUEST_CHANGES', reviewer, submitted.approval);
    assert.equal(changed.campaign.status, 'CHANGES_REQUESTED');
    const resubmitted = await act(changed.campaign, 'SUBMIT');
    assert.notEqual(resubmitted.approval.id, changed.approval.id);
    const old = (await db.query('select invalidated_at from knoux_growth_campaign_approvals where id=$1', [changed.approval.id])).rows[0];
    assert.ok(old.invalidated_at);
    await assert.rejects(act(resubmitted.campaign, 'APPROVE', reviewer, changed.approval), e => e.code === '40001');
  });
  await t.test('audit insertion failure rolls back approval and campaign atomically', async () => {
    const submitted = await act(await create(), 'SUBMIT');
    await db.exec(`create function public.fail_review_audit() returns trigger language plpgsql as $$begin raise exception 'Injected audit failure' using errcode='23514';end$$;
      create trigger fail_review_audit before insert on knoux_growth_audit_log for each row execute function public.fail_review_audit();`);
    await assert.rejects(act(submitted.campaign, 'APPROVE', reviewer, submitted.approval), e => e.code === '23514');
    assert.deepEqual(await get(submitted.campaign.id), submitted.campaign);
    assert.equal((await db.query('select decision from knoux_growth_campaign_approvals where id=$1', [submitted.approval.id])).rows[0].decision, null);
    await db.exec('drop trigger fail_review_audit on knoux_growth_audit_log; drop function public.fail_review_audit();');
  });
  await t.test('browser roles cannot invoke privileged reviews while the service role can', async () => {
    const campaign = await create();
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(act(campaign, 'SUBMIT'), e => e.code === '42501');
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const result = await act(campaign, 'SUBMIT');
    assert.equal(result.campaign.status, 'READY_FOR_REVIEW');
    await db.exec('reset role');
  });
});
