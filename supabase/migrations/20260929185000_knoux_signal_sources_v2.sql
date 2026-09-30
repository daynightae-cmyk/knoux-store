-- KNOuX Signal source governance v2.
-- Extends the catalog using the new research pack while keeping uncertain licensing/access disabled.

alter table public.signal_source_catalog
  add column if not exists publisher text,
  add column if not exists license_url text,
  add column if not exists commercial_use boolean,
  add column if not exists redistribution boolean,
  add column if not exists priority smallint not null default 99,
  add column if not exists access_requirement text,
  add column if not exists contains jsonb not null default '{}'::jsonb,
  add column if not exists quarantine_reason text,
  add column if not exists rejection_reason text,
  add column if not exists last_reviewed_at date;

alter table public.signal_ingestion_runs
  add column if not exists source_url text,
  add column if not exists direct_download_url text,
  add column if not exists file_size_bytes bigint,
  add column if not exists http_status integer,
  add column if not exists content_type text,
  add column if not exists license_url text,
  add column if not exists country_coverage text[] not null default '{}',
  add column if not exists error_message text;

create table if not exists public.signal_network_codes (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.signal_source_catalog(id) on delete restrict,
  country_code text not null,
  mcc text not null,
  mnc text not null,
  operator_name text,
  brand text,
  network_type text,
  source_record_id text not null,
  fetched_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  unique(source_id, source_record_id)
);

create table if not exists public.signal_numbering_prefixes (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.signal_source_catalog(id) on delete restrict,
  country_code text not null,
  prefix text not null,
  carrier text,
  line_type text,
  source_record_id text not null,
  fetched_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  unique(source_id, source_record_id)
);

create index if not exists signal_network_codes_country_idx
  on public.signal_network_codes(country_code, mcc, mnc);
create index if not exists signal_numbering_prefix_idx
  on public.signal_numbering_prefixes(country_code, prefix);

alter table public.signal_network_codes enable row level security;
alter table public.signal_numbering_prefixes enable row level security;
revoke all on public.signal_network_codes from anon, authenticated;
revoke all on public.signal_numbering_prefixes from anon, authenticated;

-- Reclassify OpenCorporates conservatively until commercial reuse terms are explicitly confirmed.
update public.signal_source_catalog
set approval_status='quarantined',
    enabled=false,
    license_name='Terms require explicit commercial-use review',
    quarantine_reason='Do not ingest until commercial reuse/API terms are confirmed for KNOuX Signal.',
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='opencorporates';

insert into public.signal_source_catalog (
  source_key, display_name, source_kind, approval_status, license_name, homepage_url,
  countries, ingestion_mode, attribution_required, enabled, notes,
  publisher, license_url, commercial_use, redistribution, priority,
  access_requirement, contains, quarantine_reason, rejection_reason, last_reviewed_at
) values
  (
    'wikidata_phones','Wikidata official phone numbers (P1329)','knowledge','approved',
    'CC0-1.0','https://www.wikidata.org',
    array['EG','AE','SA','KW','QA','BH','OM'],'api',false,false,
    'Official/public entity phone statements only. No claim of comprehensive person coverage.',
    'Wikimedia Foundation','https://creativecommons.org/publicdomain/zero/1.0/',true,true,1,
    'SPARQL endpoint; rate limits apply.',
    '{"phone_business":true,"phone_person":true,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    null,null,current_date
  ),
  (
    'mcc_mnc_org','MCC/MNC global network codes','other','quarantined',
    'License/reuse terms require verification','https://mcc-mnc.org',
    array['EG','AE','SA','KW','QA','BH','OM'],'bulk',true,false,
    'Useful operator/network metadata, but keep disabled until current reuse terms are verified.',
    'mcc-mnc.org','https://mcc-mnc.org',null,null,3,
    'Direct CSV if licensing is confirmed.',
    '{"phone_business":false,"phone_person":false,"phone_alias":false,"telecom_metadata":true}'::jsonb,
    'Research pack calls this open; production ingestion remains disabled until license evidence is retained.',
    null,current_date
  ),
  (
    'dubai_pulse_ded_commerce','Dubai Pulse DED commerce dataset','business_registry','approved',
    'Government open-data grant/terms','https://www.dubaipulse.gov.ae',
    array['AE'],'bulk',true,false,
    'Official Dubai business licensing data. Access requires account/grant before ingestion.',
    'Dubai Pulse / Dubai DED',null,true,null,1,
    'Account and dataset grant required.',
    '{"phone_business":true,"phone_person":false,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    null,null,current_date
  ),
  (
    'wathq_commercial_register','Wathq commercial register','business_registry','approved',
    'API access terms apply','https://wathq.sa',
    array['SA'],'api',true,false,
    'Saudi commercial-register verification source. Not a bulk public phone directory.',
    'Wathq / Saudi Ministry of Commerce',null,true,false,1,
    'Authenticated API/token required.',
    '{"phone_business":true,"phone_person":false,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    null,null,current_date
  ),
  (
    'oman_business_platform','Oman Business Platform','business_registry','approved',
    'Government portal terms apply','https://business.gov.om',
    array['OM'],'manual',true,false,
    'Official business verification source; automated access not assumed.',
    'Oman MoCIIP',null,true,false,2,
    'Manual/public verification unless an authorized API is obtained.',
    '{"phone_business":true,"phone_person":false,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    null,null,current_date
  )
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
  publisher=excluded.publisher,
  license_url=excluded.license_url,
  commercial_use=excluded.commercial_use,
  redistribution=excluded.redistribution,
  priority=excluded.priority,
  access_requirement=excluded.access_requirement,
  contains=excluded.contains,
  quarantine_reason=excluded.quarantine_reason,
  rejection_reason=excluded.rejection_reason,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();

insert into public.signal_source_catalog (
  source_key, display_name, source_kind, approval_status, license_name, homepage_url,
  countries, ingestion_mode, attribution_required, enabled, notes,
  publisher, license_url, commercial_use, redistribution, priority,
  access_requirement, contains, quarantine_reason, rejection_reason, last_reviewed_at
) values
  (
    'hlr_validation_commercial','HLR / number validation provider','commercial','quarantined',
    'Commercial contract required',null,
    array['EG','AE','SA','KW','QA','BH','OM'],'api',false,false,
    'Potential live status/carrier/MNP enrichment. Provider must be selected and contracted first.',
    null,null,true,false,2,
    'Paid API contract and data-processing review.',
    '{"phone_business":false,"phone_person":false,"phone_alias":false,"telecom_metadata":true}'::jsonb,
    'No provider is enabled until contractual, privacy and regional transfer terms are approved.',
    null,current_date
  ),
  (
    'gsma_camara_open_gateway','GSMA CAMARA / Open Gateway network APIs','commercial','quarantined',
    'Partner/operator terms','https://camaraproject.org',
    array['EG','AE','SA','KW','QA','BH','OM'],'api',false,false,
    'Strategic network API path; availability varies by operator/country and must not be implied.',
    'CAMARA / participating operators',null,true,false,3,
    'Operator or approved aggregator partnership required.',
    '{"phone_business":false,"phone_person":false,"phone_alias":false,"telecom_metadata":true}'::jsonb,
    'No public universal endpoint confirmed for the target markets.',
    null,current_date
  ),
  (
    'tellows_reputation','Tellows reputation data','commercial','quarantined',
    'Proprietary','https://www.tellows.com',
    array['EG','AE','SA','KW','QA','BH','OM'],'api',true,false,
    'Potential spam/reputation enrichment only via licensed access.',
    'Tellows',null,null,false,4,
    'Commercial/API agreement required.',
    '{"phone_business":false,"phone_person":false,"phone_alias":false,"telecom_metadata":false,"reputation":true}'::jsonb,
    'Do not scrape. Use only with explicit licensed API/data agreement.',
    null,current_date
  ),
  (
    'spamcalls_reputation','SpamCalls community reputation','commercial','quarantined',
    'Terms require review',null,
    array['EG','AE','SA','KW','QA','BH','OM'],'api',true,false,
    'Potential reputation signal only; no scraping.',
    null,null,null,false,4,
    'Licensed/API access required if available.',
    '{"phone_business":false,"phone_person":false,"phone_alias":false,"telecom_metadata":false,"reputation":true}'::jsonb,
    'Do not ingest without verified terms and API rights.',
    null,current_date
  ),
  (
    'infobelpro_egypt','InfobelPRO Egypt company data','business_registry','quarantined',
    'Commercial license','https://www.infobelpro.com',
    array['EG'],'api',true,false,
    'Potential high-value company-phone source after contract.',
    'InfobelPRO',null,true,false,2,
    'Paid commercial contract required.',
    '{"phone_business":true,"phone_person":false,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    'Commercial data: no ingestion until a KNOuX license is executed.',
    null,current_date
  ),
  (
    'signzy_kyc_uae','Signzy KYC/KYB APIs','commercial','quarantined',
    'Commercial contract','https://www.signzy.com',
    array['AE'],'api',false,false,
    'Identity verification is for consented verification flows, not a public reverse-lookup directory.',
    'Signzy',null,true,false,4,
    'Contract, permitted purpose, consent and privacy review required.',
    '{"phone_business":true,"phone_person":true,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    'May only be used for permitted verification workflows after contracting.',
    null,current_date
  ),
  (
    'kyc_chain_egypt','Egypt KYC provider integration','commercial','quarantined',
    'Commercial contract',null,
    array['EG'],'api',false,false,
    'Potential consented identity verification only.',
    null,null,true,false,4,
    'Provider/authority relationship and permitted scope must be verified before integration.',
    '{"phone_business":false,"phone_person":true,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    'Research claims require independent provider/legal verification.',
    null,current_date
  ),
  (
    'dubizzle_listings','Dubizzle public listings','commercial','quarantined',
    'Platform terms apply','https://www.dubizzle.com',
    array['AE'],'none',false,false,
    'Public listing data is not automatically reusable for reverse lookup.',
    'Dubizzle',null,null,false,5,
    'No automated ingestion without explicit platform permission.',
    '{"phone_business":true,"phone_person":true,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    'Public visibility does not itself grant bulk reuse rights.',
    null,current_date
  ),
  (
    'opensooq_listings','OpenSooq public listings','commercial','quarantined',
    'Platform terms apply','https://www.opensooq.com',
    array['AE','SA','KW','QA','BH','OM','EG'],'none',false,false,
    'Public listing data is not automatically reusable for reverse lookup.',
    'OpenSooq',null,null,false,5,
    'No automated ingestion without explicit platform permission.',
    '{"phone_business":true,"phone_person":true,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    'Public visibility does not itself grant bulk reuse rights.',
    null,current_date
  )
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
  publisher=excluded.publisher,
  license_url=excluded.license_url,
  commercial_use=excluded.commercial_use,
  redistribution=excluded.redistribution,
  priority=excluded.priority,
  access_requirement=excluded.access_requirement,
  contains=excluded.contains,
  quarantine_reason=excluded.quarantine_reason,
  rejection_reason=excluded.rejection_reason,
  last_reviewed_at=excluded.last_reviewed_at,
  updated_at=now();
