-- Normalize metadata for source rows created before the 2026-09-29 research pack.

update public.signal_source_catalog
set publisher='Google LLC',
    license_url='https://www.apache.org/licenses/LICENSE-2.0',
    commercial_use=true,
    redistribution=true,
    priority=1,
    contains='{"telecom_metadata":true,"phone_business":false,"phone_person":false,"phone_alias":false}'::jsonb,
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='google_libphonenumber';

update public.signal_source_catalog
set publisher='OpenStreetMap Foundation',
    license_name='ODbL-1.0',
    license_url='https://opendatacommons.org/licenses/odbl/1-0/',
    commercial_use=true,
    redistribution=true,
    priority=1,
    access_requirement='Bounded Overpass or approved extract ingestion with required attribution.',
    contains='{"phone_business":true,"phone_person":false,"phone_alias":false,"telecom_metadata":false}'::jsonb,
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='openstreetmap';

update public.signal_source_catalog
set publisher='International Telecommunication Union',
    priority=3,
    access_requirement='Reference/document extraction only until exact reuse terms are retained.',
    contains='{"telecom_metadata":true,"phone_business":false,"phone_person":false,"phone_alias":false}'::jsonb,
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='itu_numbering';

update public.signal_source_catalog
set quarantine_reason=coalesce(quarantine_reason,'Secondary/community reference; do not use as authoritative numbering source.'),
    priority=5,
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='wikipedia_numbering';

update public.signal_source_catalog
set quarantine_reason=coalesce(quarantine_reason,'Government document reuse rights require explicit verification before automated ingestion.'),
    priority=4,
    last_reviewed_at=current_date,
    updated_at=now()
where source_key='citc_regulatory_docs';

update public.signal_source_catalog
set rejection_reason=coalesce(rejection_reason,notes),
    last_reviewed_at=current_date,
    updated_at=now()
where approval_status='rejected';

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
        'publisher', publisher,
        'homepage', homepage_url,
        'licenseUrl', license_url,
        'ingestionMode', ingestion_mode,
        'attributionRequired', attribution_required,
        'enabled', enabled,
        'priority', priority,
        'accessRequirement', access_requirement,
        'contains', contains
      )
      order by
        case approval_status when 'approved' then 0 when 'quarantined' then 1 else 2 end,
        priority,
        display_name
    ),
    '[]'::jsonb
  )
  from public.signal_source_catalog
  where approval_status <> 'rejected';
$$;

revoke all on function public.signal_sources_public() from public;
grant execute on function public.signal_sources_public() to anon, authenticated;
