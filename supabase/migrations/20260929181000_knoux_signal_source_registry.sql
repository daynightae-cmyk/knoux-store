-- KNOuX Signal source registry and business-phone ingestion foundation.
-- Only approved, provenance-bearing sources may feed live lookup results.

create table if not exists public.signal_source_catalog (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  source_kind text not null
    check (source_kind in ('numbering','business_registry','public_map','regulatory','knowledge','commercial','other')),
  approval_status text not null
    check (approval_status in ('approved','quarantined','rejected')),
  license_name text,
  homepage_url text,
  countries text[] not null default '{}',
  ingestion_mode text not null default 'manual'
    check (ingestion_mode in ('library','api','bulk','overpass','document','manual','none')),
  attribution_required boolean not null default false,
  enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_ingestion_runs (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.signal_source_catalog(id) on delete restrict,
  artifact_name text,
  artifact_sha256 text,
  status text not null check (status in ('started','completed','failed','quarantined')),
  rows_seen bigint not null default 0,
  rows_imported bigint not null default 0,
  rows_rejected bigint not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);
create table if not exists public.signal_business_phone_records (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.signal_source_catalog(id) on delete restrict,
  source_record_id text not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  country_code text,
  business_name text not null,
  category text,
  locality text,
  source_url text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  unique(source_id, source_record_id, phone_e164)
);

create index if not exists signal_business_phone_idx
  on public.signal_business_phone_records(phone_e164);

create index if not exists signal_business_source_idx
  on public.signal_business_phone_records(source_id);

create index if not exists signal_ingestion_source_idx
  on public.signal_ingestion_runs(source_id, started_at desc);

alter table public.signal_source_catalog enable row level security;
alter table public.signal_ingestion_runs enable row level security;
alter table public.signal_business_phone_records enable row level security;

revoke all on public.signal_source_catalog from anon, authenticated;
revoke all on public.signal_ingestion_runs from anon, authenticated;
revoke all on public.signal_business_phone_records from anon, authenticated;
insert into public.signal_source_catalog
  (source_key,display_name,source_kind,approval_status,license_name,homepage_url,countries,ingestion_mode,attribution_required,enabled,notes)
values
  ('google_libphonenumber','Google libphonenumber','numbering','approved','Apache-2.0','https://github.com/google/libphonenumber','{}','library',true,true,'Number parsing, validation and formatting only; no names.'),
  ('opencorporates','OpenCorporates','business_registry','approved','Attribution required','https://opencorporates.com','{}','api',true,false,'Business identity source. Enable only after API/bulk access is configured and terms are rechecked.'),
  ('openstreetmap','OpenStreetMap','public_map','approved','ODbL','https://www.openstreetmap.org','{}','overpass',true,false,'Public business/place phone tags only.'),
  ('itu_numbering','ITU Numbering Plans','numbering','approved','Attribution/reuse review','https://www.itu.int','{}','document',true,false,'Reference source for numbering plans; no person-name data.'),
  ('citc_regulatory_docs','Saudi regulatory numbering documents','regulatory','quarantined',null,null,array['SA'],'document',true,false,'Do not ingest until reuse rights are confirmed.'),
  ('wikipedia_numbering','Wikipedia numbering articles','knowledge','quarantined','CC-BY-SA',null,'{}','manual',true,false,'Useful as a reference only; not needed for live lookup while libphonenumber is authoritative.'),
  ('yellow_pages_private','Commercial yellow-pages datasets','commercial','rejected',null,null,'{}','none',false,false,'Do not ingest scraped or proprietary directory datasets.'),
  ('truecaller_copied_data','Copied Truecaller/Getcontact-style datasets','commercial','rejected',null,null,'{}','none',false,false,'Do not ingest copied private/proprietary caller-ID data.'),
  ('leaked_contact_lists','Leaked or breached contact lists','other','rejected',null,null,'{}','none',false,false,'Never ingest leaked, breached or unlawfully obtained contact data.')
on conflict(source_key) do update set
  display_name=excluded.display_name,
  source_kind=excluded.source_kind,
  approval_status=excluded.approval_status,
  license_name=excluded.license_name,
  homepage_url=excluded.homepage_url,
  countries=excluded.countries,
  ingestion_mode=excluded.ingestion_mode,
  attribution_required=excluded.attribution_required,
  enabled=excluded.enabled,
  notes=excluded.notes,
  updated_at=now();
create or replace function public.signal_business_matches(p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', r.business_name,
        'category', r.category,
        'countryCode', r.country_code,
        'locality', r.locality,
        'sourceKey', s.source_key,
        'sourceName', s.display_name,
        'sourceUrl', r.source_url,
        'attributionRequired', s.attribution_required
      )
      order by r.business_name, s.display_name
    ),
    '[]'::jsonb
  )
  from public.signal_business_phone_records r
  join public.signal_source_catalog s on s.id=r.source_id
  where r.phone_e164=p_phone
    and s.approval_status='approved'
    and s.enabled=true;
$$;

create or replace function public.signal_sources_public()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', source_key,
        'name', display_name,
        'kind', source_kind,
        'status', approval_status,
        'license', license_name,
        'homepage', homepage_url,
        'ingestionMode', ingestion_mode,
        'attributionRequired', attribution_required,
        'enabled', enabled
      )
      order by
        case approval_status when 'approved' then 0 when 'quarantined' then 1 else 2 end,
        display_name
    ),
    '[]'::jsonb
  )
  from public.signal_source_catalog
  where approval_status <> 'rejected';
$$;

revoke all on function public.signal_business_matches(text) from public;
revoke all on function public.signal_sources_public() from public;
grant execute on function public.signal_business_matches(text) to anon, authenticated;
grant execute on function public.signal_sources_public() to anon, authenticated;

comment on table public.signal_source_catalog is
'KNOuX Signal provenance registry. Live ingestion is restricted to approved sources.';
comment on table public.signal_business_phone_records is
'Public or licensed business phone identities with source-level provenance. Never use for leaked/private contact-book data.';
comment on table public.signal_ingestion_runs is
'Artifact-level ingestion audit with hashes and import/rejection counts.';
