import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { loadTypeScript } from './load.mjs';

const { parseWordPressDraftCreate, parseWordPressDraftSave } = await loadTypeScript('../src/lib/wordpress/site-drafts.ts');
const id = '11111111-1111-4111-8111-111111111111';
const document = {
  schema: 1,
  identity: {
    name: 'Example', tagline: 'A draft', style: 'modern', placement: 'center',
    headingFont: 'sans', bodyFont: 'serif', primary: '#000000', secondary: '#ffffff', backdrop: '#112233',
    pages: ['Home'], modules: ['Hero'], activePage: 'Home',
  },
  blocks: [{ key: 1, type: 'hero', align: 'center', gap: 16 }],
  themeSlug: 'twentytwentyfive',
  pluginSlugs: ['wordpress-seo'],
};

test('studio values round-trip through the draft contract and unknown fields fail closed', () => {
  const draft = { id, title: ' Studio ', document };
  assert.deepEqual(parseWordPressDraftCreate(draft), { ...draft, title: 'Studio' });
  assert.equal(parseWordPressDraftSave({ ...draft, expectedRevision: 2 }).expectedRevision, 2);
  assert.equal(parseWordPressDraftCreate({ ...draft, owner_id: id }), null);
  assert.equal(parseWordPressDraftSave({ ...draft, expectedRevision: 0 }), null);
  assert.equal(parseWordPressDraftCreate({ ...draft, document: { ...document, themeSlug: '../theme' } }), null);
  assert.equal(parseWordPressDraftCreate({ ...draft, document: { ...document, blocks: [...document.blocks, ...document.blocks] } }), null);
  assert.equal(parseWordPressDraftCreate({ ...draft, document: { ...document, identity: { ...document.identity, primary: 'url(https://external.invalid/x)' } } }), null);
});

test('WordPress draft migration enforces owner isolation, idempotent IDs and revision checks in Postgres', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); grant usage on schema auth to authenticated;");
  await db.exec("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;");
  await db.exec(readFileSync(new URL('../supabase/migrations/20261124003425_knoux_wordpress_site_drafts.sql', import.meta.url), 'utf8'));

  const owner = '22222222-2222-4222-8222-222222222222';
  const other = '33333333-3333-4333-8333-333333333333';
  await db.query('insert into auth.users values ($1), ($2)', [owner, other]);
  await db.exec("set role anon");
  await assert.rejects(db.query('select id from public.knoux_wordpress_site_drafts'), { code: '42501' });
  await db.exec("reset role; set role authenticated");
  const setOwner = (account) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [account]);
  await setOwner(owner);

  const create = 'insert into public.knoux_wordpress_site_drafts (id,title,document) values ($1,$2,$3) returning owner_id, revision, document';
  const inserted = await db.query(create, [id, 'Draft', document]);
  assert.equal(inserted.rows[0].owner_id, owner);
  assert.equal(inserted.rows[0].revision, 1);
  assert.deepEqual(inserted.rows[0].document, document);
  await assert.rejects(db.query(create, [id, 'Duplicate', document]), { code: '23505' });
  await assert.rejects(db.query("insert into public.knoux_wordpress_site_drafts (owner_id,id,title,document) values ($1,$2,$3,$4)", [other, id, 'Spoofed', document]), { code: '42501' });
  await assert.rejects(db.query('update public.knoux_wordpress_site_drafts set revision = 100'), { code: '42501' });
  await assert.rejects(db.query('delete from public.knoux_wordpress_site_drafts'), { code: '42501' });

  const update = 'update public.knoux_wordpress_site_drafts set title=$1 where id=$2 and revision=$3 returning revision,title';
  const edits = await Promise.all([db.query(update, ['first', id, 1]), db.query(update, ['second', id, 1])]);
  assert.equal(edits.filter((edit) => edit.rows.length === 1).length, 1);
  assert.equal(edits.flatMap((edit) => edit.rows)[0].revision, 2);

  await setOwner(other);
  assert.deepEqual((await db.query('select id from public.knoux_wordpress_site_drafts where id=$1', [id])).rows, []);
  assert.deepEqual((await db.query(update, ['spoofed', id, 2])).rows, []);
  assert.equal((await db.query(create, [id, 'Independent draft', document])).rows[0].owner_id, other);
  await setOwner(owner);
  const reopened = await db.query('select id,revision,document from public.knoux_wordpress_site_drafts');
  assert.deepEqual(reopened.rows, [{ id, revision: 2, document }]);
});
