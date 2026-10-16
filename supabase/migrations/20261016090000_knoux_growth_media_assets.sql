-- KNOuX Growth media assets: tenant-scoped creative media with provenance.
--
-- Additive only. Nothing is dropped or altered in place.
-- Browser roles hold NO direct write grant; all writes go through service-role
-- API routes that enforce RBAC + membership tenancy + validation.
-- Reads are membership-scoped via RLS; signed delivery URLs are minted
-- server-side with short lifetimes, never stored as public URLs.

begin;

create table if not exists public.knoux_growth_media_assets (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  storage_path text not null,
  file_name text not null default '',
  mime_type text not null default '',
  byte_size integer not null default 0,
  width integer,
  height integer,
  duration_seconds numeric,
  -- 'IMAGE' | 'VIDEO'. Posters/thumbnails reuse the IMAGE row via poster_asset_id.
  kind text not null default 'IMAGE',
  poster_asset_id uuid references public.knoux_growth_media_assets(id) on delete set null,
  -- License / provenance: who may reuse this file and where it came from.
  source text not null default 'CLIENT_UPLOAD',
  license text not null default 'CLIENT_OWNED',
  source_url text,
  uploaded_by uuid references auth.users(id) on delete set null,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  constraint knoux_growth_media_assets_client_identity unique (client_id, id),
  constraint knoux_growth_media_assets_path check (storage_path like client_id || '/%' and position('..' in storage_path) = 0),
  constraint knoux_growth_media_assets_kind_mime check ((kind = 'VIDEO') = (mime_type = 'video/mp4')),
  constraint knoux_growth_media_assets_kind check (kind in ('IMAGE', 'VIDEO')),
  constraint knoux_growth_media_assets_origin check (origin in ('FIXTURE', 'LIVE')),
  constraint knoux_growth_media_assets_size check (byte_size > 0 and byte_size <= case when mime_type = 'video/mp4' then 20971520 else 10485760 end),
  constraint knoux_growth_media_assets_mime check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4'
  ))
);

create index if not exists knoux_growth_media_assets_client_idx
  on public.knoux_growth_media_assets(client_id, created_at desc);

alter table public.knoux_growth_media_assets enable row level security;

drop policy if exists knoux_growth_media_assets_member_read on public.knoux_growth_media_assets;
create policy knoux_growth_media_assets_member_read on public.knoux_growth_media_assets
  for select to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_media_assets.client_id and m.user_id = auth.uid()));

-- No insert/update/delete policy for browser roles: writes are service-role only.

-- Creative rows gain an optional resolved media reference. Additive column only.
alter table public.knoux_growth_creatives
  add column if not exists media_asset_id uuid references public.knoux_growth_media_assets(id) on delete set null;

-- Enforce the related-row tenant boundary even for future server-side writers.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='knoux_growth_creatives_media_client_fk' and conrelid='public.knoux_growth_creatives'::regclass) then
    alter table public.knoux_growth_creatives add constraint knoux_growth_creatives_media_client_fk
      foreign key (client_id,media_asset_id) references public.knoux_growth_media_assets(client_id,id);
  end if;
end $$;

-- Storage bucket `growth-media` must be created by the operator as PRIVATE.
-- Object-level policies: tenant path is "<client_id>/<asset_id>-<safe-name>".
-- Authenticated reads require membership of the first path segment.
-- Service role bypasses RLS for upload/signing; anon holds nothing.

-- These policies apply when the bucket exists; they fail closed otherwise.
-- Run the bucket creation from the Supabase dashboard or SQL editor:
--   insert into storage.buckets (id, name, public) values ('growth-media', 'growth-media', false);

drop policy if exists growth_media_member_read on storage.objects;
create policy growth_media_member_read on storage.objects
  for select to authenticated
  using (bucket_id = 'growth-media'
    and exists (select 1 from public.knoux_growth_memberships m
                where m.user_id = auth.uid()
                  and m.client_id = split_part(name, '/', 1)));

revoke all on table public.knoux_growth_media_assets from public, anon;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_media_assets from authenticated;
grant select on table public.knoux_growth_media_assets to authenticated;

commit;
