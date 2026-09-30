-- KNOuX Signal dataset/staging layer.
-- Adds only ingestion-governance tables. It intentionally does NOT create
-- duplicate alias/reputation/profile tables.

create table if not exists public.signal_datasets (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null unique,
  source_id uuid not null references public.signal_source_catalog(id) on delete restrict,
  title text not null,
  legal_status text not null check (legal_status in ('approved','quarantined','rejected')),
  ingestion_status text not null default 'not_started' check (
    ingestion_status in (
      'not_started','downloading','downloaded','inspecting','normalizing',
      'staging','staged','promoting','promoted','rejected','failed'
    )
  ),
  source_url text,
  direct_download_url text,
  license_url text,
  artifact_name text,
  artifact_sha256 text,
  file_size_bytes bigint,
  countries text[] not null default '{}',
  measured_rows bigint,
  valid_phone_records bigint,
  unique_phone_records bigint,
  quality jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signal_datasets_source_idx
  on public.signal_datasets(source_id, legal_status, ingestion_status);

create table if not exists public.signal_source_records_staging (
  id bigint generated always as identity primary key,
  dataset_id uuid not null references public.signal_datasets(id) on delete cascade,
  source_record_fingerprint text not null,
  record_kind text not null check (record_kind in ('business_phone','network_code','numbering_prefix')),
  raw_phone text,
  phone_e164 text,
  country_code text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'staged' check (status in ('staged','promoted','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  unique(dataset_id, source_record_fingerprint)
);

create index if not exists signal_source_records_staging_dataset_idx
  on public.signal_source_records_staging(dataset_id, status, record_kind);
create index if not exists signal_source_records_staging_phone_idx
  on public.signal_source_records_staging(phone_e164)
  where phone_e164 is not null;

create table if not exists public.signal_ingestion_errors (
  id bigint generated always as identity primary key,
  run_id bigint references public.signal_ingestion_runs(id) on delete set null,
  dataset_id uuid references public.signal_datasets(id) on delete set null,
  source_record_id text,
  stage text not null,
  error_code text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signal_ingestion_errors_dataset_idx
  on public.signal_ingestion_errors(dataset_id, created_at desc);
alter table public.signal_datasets enable row level security;
alter table public.signal_source_records_staging enable row level security;
alter table public.signal_ingestion_errors enable row level security;

revoke all on public.signal_datasets from anon, authenticated;
revoke all on public.signal_source_records_staging from anon, authenticated;
revoke all on public.signal_ingestion_errors from anon, authenticated;

create or replace function public.signal_promote_business_staging(p_dataset_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dataset_row public.signal_datasets;
  source_row public.signal_source_catalog;
  promoted_count integer := 0;
begin
  select * into dataset_row
  from public.signal_datasets
  where dataset_key = p_dataset_key
  for update;

  if dataset_row.id is null then
    raise exception 'dataset_not_found';
  end if;
  if dataset_row.legal_status <> 'approved' then
    raise exception 'dataset_not_approved';
  end if;

  select * into source_row
  from public.signal_source_catalog
  where id = dataset_row.source_id;

  if source_row.id is null
     or source_row.approval_status <> 'approved'
     or not source_row.enabled then
    raise exception 'source_not_approved_and_enabled';
  end if;

  update public.signal_datasets
  set ingestion_status='promoting', updated_at=now()
  where id=dataset_row.id;

  insert into public.signal_business_phone_records (
    source_id,
    source_record_id,
    phone_e164,
    country_code,
    business_name,
    category,
    locality,
    source_url,
    fetched_at,
    provenance
  )
  select
    dataset_row.source_id,
    coalesce(nullif(s.payload->>'source_record_id',''), s.source_record_fingerprint),
    s.phone_e164,
    s.country_code,
    left(s.payload->>'business_name', 300),
    nullif(s.payload->>'category',''),
    nullif(s.payload->>'locality',''),
    nullif(s.payload->>'source_url',''),
    now(),
    jsonb_build_object(
      'pipeline','signal_promote_business_staging',
      'dataset_key',dataset_row.dataset_key,
      'dataset_id',dataset_row.id,
      'source_record_fingerprint',s.source_record_fingerprint
    )
  from public.signal_source_records_staging s
  where s.dataset_id=dataset_row.id
    and s.status='staged'
    and s.record_kind='business_phone'
    and s.phone_e164 ~ '^\+[1-9][0-9]{6,14}$'
    and nullif(trim(s.payload->>'business_name'),'') is not null
  on conflict(source_id, source_record_id, phone_e164) do update set
    country_code=excluded.country_code,
    business_name=excluded.business_name,
    category=excluded.category,
    locality=excluded.locality,
    source_url=excluded.source_url,
    fetched_at=excluded.fetched_at,
    provenance=excluded.provenance;

  get diagnostics promoted_count = row_count;

  update public.signal_source_records_staging
  set status='promoted', promoted_at=now()
  where dataset_id=dataset_row.id
    and status='staged'
    and record_kind='business_phone'
    and phone_e164 ~ '^\+[1-9][0-9]{6,14}$'
    and nullif(trim(payload->>'business_name'),'') is not null;

  update public.signal_datasets
  set ingestion_status='promoted', updated_at=now()
  where id=dataset_row.id;

  return jsonb_build_object(
    'datasetKey', dataset_row.dataset_key,
    'promotedRows', promoted_count,
    'sourceKey', source_row.source_key
  );
end
$$;

revoke all on function public.signal_promote_business_staging(text) from public, anon, authenticated;
grant execute on function public.signal_promote_business_staging(text) to service_role;
