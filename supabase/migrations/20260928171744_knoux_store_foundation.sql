-- KNOuX Store Supabase foundation.
-- Public catalogue data is readable; mutations remain service-side.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.content_registry (
  id text primary key,
  entity_type text not null,
  code text,
  slug text,
  title text not null,
  status text,
  route text,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  search_terms text[] not null default '{}'::text[],
  related_ids text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  published boolean not null default true,
  source_file text not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists content_registry_type_slug_uidx
  on public.content_registry(entity_type, slug)
  where slug is not null;

create index if not exists content_registry_type_idx
  on public.content_registry(entity_type);
create index if not exists content_registry_published_idx
  on public.content_registry(published, entity_type);
create index if not exists content_registry_status_idx
  on public.content_registry(status)
  where status is not null;
create index if not exists content_registry_payload_gin
  on public.content_registry using gin(payload);
create index if not exists content_registry_search_terms_gin
  on public.content_registry using gin(search_terms);
create index if not exists content_registry_related_ids_gin
  on public.content_registry using gin(related_ids);

drop trigger if exists content_registry_updated_at on public.content_registry;
create trigger content_registry_updated_at
before update on public.content_registry
for each row execute function public.set_updated_at();

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user'
    check (role in ('user','editor','admin')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  request_type text,
  message text not null,
  source_path text,
  status text not null default 'new'
    check (status in ('new','reviewing','replied','closed','spam')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_requests_status_created_idx
  on public.contact_requests(status, created_at desc);
create index if not exists contact_requests_user_idx
  on public.contact_requests(user_id)
  where user_id is not null;

drop trigger if exists contact_requests_updated_at on public.contact_requests;
create trigger contact_requests_updated_at
before update on public.contact_requests
for each row execute function public.set_updated_at();

create table if not exists public.content_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_revision text,
  source_hash text,
  row_count integer not null default 0,
  status text not null
    check (status in ('started','completed','failed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.content_registry enable row level security;
alter table public.site_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.contact_requests enable row level security;
alter table public.content_sync_runs enable row level security;
drop policy if exists "published content is public" on public.content_registry;
create policy "published content is public"
on public.content_registry for select
to anon, authenticated
using (published = true);

drop policy if exists "public settings are readable" on public.site_settings;
create policy "public settings are readable"
on public.site_settings for select
to anon, authenticated
using (is_public = true);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);
drop policy if exists "users read own contact requests" on public.contact_requests;
create policy "users read own contact requests"
on public.contact_requests for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on public.contact_requests from anon, authenticated;
grant select on public.contact_requests to authenticated;

create or replace function public.submit_contact_request(
  p_name text,
  p_email text,
  p_message text,
  p_phone text default null,
  p_company text default null,
  p_request_type text default null,
  p_source_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'invalid_name';
  end if;
  if position('@' in coalesce(p_email,'')) < 2 then
    raise exception 'invalid_email';
  end if;
  if length(trim(coalesce(p_message,''))) < 10 then
    raise exception 'invalid_message';
  end if;

  insert into public.contact_requests(
    user_id, name, email, phone, company, request_type,
    message, source_path, metadata
  )
  values (
    (select auth.uid()),
    trim(p_name),
    lower(trim(p_email)),
    nullif(trim(p_phone),''),
    nullif(trim(p_company),''),
    nullif(trim(p_request_type),''),
    trim(p_message),
    nullif(trim(p_source_path),''),
    coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_contact_request(
  text,text,text,text,text,text,text,jsonb
) from public;
grant execute on function public.submit_contact_request(
  text,text,text,text,text,text,text,jsonb
) to anon, authenticated;
grant select on public.content_registry to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

comment on table public.content_registry is
  'Canonical KNOuX Store public content registry, seeded from verified repository data.';
comment on table public.contact_requests is
  'Contact submissions. Direct table writes are blocked; use submit_contact_request().';
comment on table public.content_sync_runs is
  'Server-side audit trail for repository-to-database content synchronization.';
