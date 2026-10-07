-- KNOuX Growth v2: content, communities, leads, metrics, audit, automations.
--
-- Continues the additive, RLS-enforced tenancy model from
-- 20261005090000_knoux_growth_v1.sql. Nothing is dropped or altered in place.
--
-- Three properties specific to this file:
--
--   1. Community rows cannot hold member data. There is no column for a member
--      list, a member count, or a scraped contact, so no code path can write one
--      and no future query can select one. This is the schema-level expression
--      of the rule in docs/growth/COMMUNITY-HUB.md, and it is enforced by
--      absence rather than by a constraint.
--
--   2. Metrics carry their provenance. A normalised metric row states whether it
--      came from a provider call or a fixture, and names the call. A measurement
--      without a source is not storable here, which is the same rule Phase 1
--      enforced in the type layer.
--
--   3. The audit log is append-only for the application role. There is no update
--      or delete policy, so a compromised or careless writer cannot rewrite what
--      an operator is about to review.

-- ---------------------------------------------------------------------------
-- Creatives and content
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_creatives (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  campaign_id uuid references public.knoux_growth_campaigns(id) on delete set null,
  format text not null default 'IMAGE',
  concept text not null default '',
  hooks text[] not null default '{}',
  headline text,
  primary_text text,
  description text,
  cta text,
  visual_prompt text,
  video_script text[] not null default '{}',
  languages text[] not null default '{en}',
  -- A generated draft is never final until a human edits or accepts it. The
  -- default is false so a human-authored row is never mistaken for generated.
  ai_generated boolean not null default false,
  status text not null default 'DRAFT',
  reviewed_by uuid references auth.users(id) on delete set null,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_creatives_format check (
    format in ('IMAGE', 'CAROUSEL', 'SHORT_VIDEO', 'REEL', 'STORY', 'RESPONSIVE_SEARCH')
  ),
  constraint knoux_growth_creatives_status check (
    status in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')
  ),
  constraint knoux_growth_creatives_origin check (origin in ('FIXTURE', 'LIVE')),
  -- An approved creative must record who approved it. Approval with no reviewer
  -- is a status write, not an approval.
  constraint knoux_growth_creatives_approved_has_reviewer check (
    status <> 'APPROVED' or reviewed_by is not null
  )
);

create index if not exists knoux_growth_creatives_client_idx
  on public.knoux_growth_creatives(client_id, updated_at desc);

create table if not exists public.knoux_growth_content (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  campaign_id uuid references public.knoux_growth_campaigns(id) on delete set null,
  platforms text[] not null default '{}',
  copy text not null default '',
  media_asset_ids text[] not null default '{}',
  -- Scheduling is a record of intent. Nothing in this schema publishes content.
  scheduled_for timestamptz,
  status text not null default 'DRAFT',
  approval_id uuid,
  author uuid references auth.users(id) on delete set null,
  ai_generated boolean not null default false,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Declared here rather than by a later ADD COLUMN: the
  -- knoux_growth_content_published_requires_provider check below names it, and a
  -- CHECK in CREATE TABLE cannot reference a column that does not exist yet.
  provider_post_id text,
  constraint knoux_growth_content_status check (
    status in ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'APPROVAL_REQUIRED')
  ),
  -- PUBLISHED is only reachable from an approved connector call, so it requires
  -- the provider's own identifier as evidence.
  constraint knoux_growth_content_published_requires_provider check (
    status <> 'PUBLISHED' or provider_post_id is not null
  )
);

-- Idempotent no-op on a fresh apply; the column comes from the CREATE TABLE above.
alter table public.knoux_growth_content
  add column if not exists provider_post_id text;

create index if not exists knoux_growth_content_client_idx
  on public.knoux_growth_content(client_id, scheduled_for desc);

create index if not exists knoux_growth_content_scheduled_idx
  on public.knoux_growth_content(client_id, scheduled_for)
  where status = 'SCHEDULED';

comment on column public.knoux_growth_content.scheduled_for is
  'Intent only. This schema never publishes content; PUBLISHED requires provider_post_id.';

-- ---------------------------------------------------------------------------
-- Communities
-- ---------------------------------------------------------------------------
--
-- Note what is absent: member_list, member_count, scraped_contact, hidden_email.
-- There is no column to write a harvested record into. `public_admin_contact`
-- holds an address the operator already published for partnership enquiries.

create table if not exists public.knoux_growth_communities (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  name text not null,
  platform text not null,
  -- A public entry point only. The application rejects a private or closed URL.
  public_url text,
  country text not null default 'AE',
  region text not null default '',
  city text not null default '',
  category text not null default '',
  language text not null default 'en',
  visibility text not null default 'UNKNOWN',
  activity_estimate text not null default 'UNKNOWN',
  promotion_policy text not null default 'UNKNOWN',
  admin_approval_required boolean not null default true,
  public_admin_contact text,
  -- Provenance of the record. Every imported row states where it came from, so a
  -- record with no source is distinguishable from one that was checked.
  source text not null default 'manual',
  source_url text,
  discovered_at timestamptz,
  verified_at timestamptz,
  -- Operator judgement, not a platform metric.
  confidence text,
  verification_status text not null default 'UNKNOWN',
  notes text,
  relevance_tags text[] not null default '{}',
  business_categories text[] not null default '{}',
  last_checked_at timestamptz,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_communities_platform check (
    platform in ('facebook', 'discord', 'telegram', 'whatsapp', 'reddit', 'directory')
  ),
  constraint knoux_growth_communities_visibility check (
    visibility in ('PUBLIC', 'PRIVATE', 'UNKNOWN')
  ),
  constraint knoux_growth_communities_activity check (
    activity_estimate in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')
  ),
  constraint knoux_growth_communities_promotion check (
    promotion_policy in ('ALLOWED', 'ASK_ADMIN', 'RESTRICTED', 'UNKNOWN')
  ),
  constraint knoux_growth_communities_verification check (
    verification_status in ('VERIFIED', 'NEEDS_REVIEW', 'UNAVAILABLE', 'BROKEN_LINK', 'PRIVATE', 'UNKNOWN')
  ),
  constraint knoux_growth_communities_source check (
    source in ('manual', 'import', 'public_search', 'directory', 'platform_api', 'operator_url')
  ),
  constraint knoux_growth_communities_language check (language in ('ar', 'en')),
  constraint knoux_growth_communities_country check (country in ('AE', 'EG')),
  -- A VERIFIED record must say when it was verified. Verification with no
  -- timestamp is an assertion with no evidence behind it.
  constraint knoux_growth_communities_verified_has_time check (
    verification_status <> 'VERIFIED' or verified_at is not null
  ),
  -- A private group is never stored as a distribution destination, so the two
  -- facts cannot contradict each other.
  constraint knoux_growth_communities_not_private_destination check (
    visibility <> 'PRIVATE'
  )
);

create index if not exists knoux_growth_communities_client_idx
  on public.knoux_growth_communities(client_id, city, category);

create index if not exists knoux_growth_communities_relevance_idx
  on public.knoux_growth_communities(client_id, verification_status);

comment on table public.knoux_growth_communities is
  'Public community destinations. No member data is storable: there is no column for it. Sync means public metadata only.';

create table if not exists public.knoux_growth_community_collections (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists knoux_growth_community_collections_client_name_key
  on public.knoux_growth_community_collections(client_id, name);

create table if not exists public.knoux_growth_collection_members (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.knoux_growth_community_collections(id) on delete cascade,
  community_id uuid not null references public.knoux_growth_communities(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null
);

create unique index if not exists knoux_growth_collection_members_pair_key
  on public.knoux_growth_collection_members(collection_id, community_id);

-- A distribution run is one prepared post going out to many destinations. It is
-- manual-assisted by design: KNOuX prepares it and an operator performs it.
create table if not exists public.knoux_growth_distribution_runs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  collection_id uuid references public.knoux_growth_community_collections(id) on delete set null,
  content_id uuid references public.knoux_growth_content(id) on delete set null,
  campaign_id uuid references public.knoux_growth_campaigns(id) on delete set null,
  status text not null default 'PREPARED',
  -- Always true. There is no automated posting path, and this column is the
  -- record of that fact rather than a setting.
  manual_only boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_distribution_runs_status check (
    status in ('PREPARED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED')
  ),
  constraint knoux_growth_distribution_runs_manual check (manual_only)
);

create table if not exists public.knoux_growth_distribution_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.knoux_growth_distribution_runs(id) on delete cascade,
  community_id uuid not null references public.knoux_growth_communities(id) on delete cascade,
  status text not null default 'QUEUED',
  -- An operator who actually posted it. A POSTED row with no posted_by would be
  -- KNOuX claiming it posted, which it cannot do.
  posted_at timestamptz,
  posted_by uuid references auth.users(id) on delete set null,
  skip_reason text,
  constraint knoux_growth_distribution_items_status check (
    status in ('QUEUED', 'NEEDS_APPROVAL', 'POSTED', 'SKIPPED', 'BLOCKED')
  ),
  constraint knoux_growth_distribution_items_posted_has_actor check (
    status <> 'POSTED' or (posted_at is not null and posted_by is not null)
  )
);

create index if not exists knoux_growth_distribution_items_run_idx
  on public.knoux_growth_distribution_items(run_id, status);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
--
-- Contact fields exist only because a form collected them. There is no enrichment
-- step in this schema and no column for a value that was inferred.

create table if not exists public.knoux_growth_leads (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  campaign_id uuid references public.knoux_growth_campaigns(id) on delete set null,
  source text not null default '',
  platform text,
  ad_id text,
  ad_name text,
  name text,
  phone text,
  email text,
  occurred_at timestamptz not null default now(),
  status text not null default 'NEW',
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  qualification text not null default 'UNQUALIFIED',
  booked_at timestamptz,
  sale_value_minor bigint,
  currency text,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_leads_status check (
    status in ('NEW', 'CONTACTED', 'QUALIFIED', 'BOOKED', 'WON', 'LOST')
  ),
  constraint knoux_growth_leads_qualification check (
    qualification in ('UNQUALIFIED', 'QUALIFIED', 'HOT')
  ),
  constraint knoux_growth_leads_sale_value check (sale_value_minor is null or sale_value_minor >= 0)
);

create index if not exists knoux_growth_leads_client_status_idx
  on public.knoux_growth_leads(client_id, status, occurred_at desc);

create index if not exists knoux_growth_leads_client_source_idx
  on public.knoux_growth_leads(client_id, source);

comment on table public.knoux_growth_leads is
  'Lead pipeline. Contact fields only exist where the source legitimately collected them; there is no enrichment path.';

-- ---------------------------------------------------------------------------
-- Metrics
-- ---------------------------------------------------------------------------
--
-- One normalised measurement. Absence is a missing key or null rather than a
-- zero, so "the provider did not report this" stays distinguishable from
-- "the provider reported zero".

create table if not exists public.knoux_growth_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  campaign_id uuid references public.knoux_growth_campaigns(id) on delete cascade,
  channel text not null,
  -- Canonical metric key: spend | impressions | reach | clicks | leads |
  -- qualified_leads | calls | whatsapp_starts | bookings | sales | revenue
  metric_key text not null,
  -- Minor units for money, raw counts otherwise.
  value numeric not null,
  currency text,
  period_start date not null,
  period_end date not null,
  -- 'LIVE' | 'FIXTURE'. A row is only ever LIVE when a provider call produced
  -- it, and the call is named in evidence.
  origin text not null default 'LIVE',
  evidence text,
  created_at timestamptz not null default now(),
  constraint knoux_growth_metrics_origin check (origin in ('FIXTURE', 'LIVE')),
  constraint knoux_growth_metrics_period check (period_end >= period_start),
  -- A LIVE measurement with no evidence string is a number with no source, which
  -- is precisely what this schema exists to prevent.
  constraint knoux_growth_metrics_live_has_evidence check (
    origin <> 'LIVE' or (evidence is not null and evidence <> '')
  )
);

create unique index if not exists knoux_growth_metrics_dedup_key
  on public.knoux_growth_metrics(
    client_id, coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel, metric_key, period_start, period_end
  );

create index if not exists knoux_growth_metrics_client_period_idx
  on public.knoux_growth_metrics(client_id, period_end desc, metric_key);

comment on table public.knoux_growth_metrics is
  'Normalised cross-platform metrics. origin=LIVE requires the provider call that produced the value.';

create table if not exists public.knoux_growth_reports (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  title text not null,
  period_start date not null,
  period_end date not null,
  -- 'PENDING' | 'READY' | 'FAILED'
  status text not null default 'PENDING',
  -- Rendered body, in Markdown, assembled from metrics at generation time. A
  -- stored report is a snapshot, so it cannot silently change under a reader.
  body_markdown text,
  language text not null default 'en',
  origin text not null default 'LIVE',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint knoux_growth_reports_status check (status in ('PENDING', 'READY', 'FAILED')),
  constraint knoux_growth_reports_language check (language in ('ar', 'en')),
  constraint knoux_growth_reports_period check (period_end >= period_start)
);

create index if not exists knoux_growth_reports_client_idx
  on public.knoux_growth_reports(client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Automations
-- ---------------------------------------------------------------------------
--
-- Every action kind is advisory. There is deliberately no action that pauses a
-- campaign, moves a budget, or launches anything: the check constraint is the
-- same boundary the Phase 1 TypeScript union drew, and having both means adding
-- a spend path requires changing both.

create table if not exists public.knoux_growth_automation_rules (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  name text not null,
  trigger text not null,
  threshold numeric,
  action text not null,
  enabled boolean not null default false,
  risk smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_automation_rules_trigger check (
    trigger in (
      'CAMPAIGN_CPL_ABOVE', 'CAMPAIGN_SPEND_ABOVE', 'LEAD_RECEIVED',
      'CONTENT_NEEDS_APPROVAL', 'COMMUNITY_URL_UNAVAILABLE',
      'CONNECTION_EXPIRED', 'REVIEW_RECEIVED'
    )
  ),
  -- The closed set of advisory actions. A spend action has no representation
  -- here, so the schema cannot be edited into one by an application bug.
  constraint knoux_growth_automation_rules_action check (
    action in ('FLAG_FOR_REVIEW', 'CREATE_APPROVAL_TASK', 'ROUTE_TO_PIPELINE', 'RAISE_ALERT', 'MARK_NEEDS_REVIEW')
  ),
  constraint knoux_growth_automation_rules_risk check (risk <= 1),
  -- A comparing trigger without a threshold would fire on every event, training
  -- operators to ignore automation.
  constraint knoux_growth_automation_rules_threshold check (
    trigger not in ('CAMPAIGN_CPL_ABOVE', 'CAMPAIGN_SPEND_ABOVE') or (threshold is not null and threshold > 0)
  )
);

create index if not exists knoux_growth_automation_rules_client_idx
  on public.knoux_growth_automation_rules(client_id, enabled);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
--
-- Append-only. `for insert` only: there is no update or delete policy, so the
-- application role cannot rewrite history even by accident. Retention and
-- archival are an operator decision made outside the application role.

create table if not exists public.knoux_growth_audit_log (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  -- A display handle, kept because auth.users rows can disappear and the trail
  -- must still name who acted.
  actor_label text not null default '',
  action text not null,
  subject_type text not null,
  subject_id text not null default '',
  -- Facts about the change. Never a token, a password, a secret key, or an
  -- authorization header; the repository redacts before it gets here.
  detail text,
  created_at timestamptz not null default now(),
  constraint knoux_growth_audit_log_action check (
    action in (
      'LOGIN_TO_GROWTH', 'CONNECTION_STARTED', 'CONNECTION_COMPLETED', 'CONNECTION_FAILED',
      'CAMPAIGN_CREATED', 'CAMPAIGN_CHANGED', 'CAMPAIGN_SUBMITTED', 'CAMPAIGN_APPROVED',
      'APPROVAL_INVALIDATED', 'LAUNCH_REQUESTED', 'CONTENT_APPROVED',
      'COMMUNITY_IMPORTED', 'COMMUNITY_MARKED_POSTED', 'AI_RECOMMENDATION_ACCEPTED',
      'LEAD_STATUS_CHANGED', 'RULE_CHANGED'
    )
  )
);

create index if not exists knoux_growth_audit_log_client_idx
  on public.knoux_growth_audit_log(client_id, created_at desc);

create index if not exists knoux_growth_audit_log_subject_idx
  on public.knoux_growth_audit_log(subject_type, subject_id);

comment on table public.knoux_growth_audit_log is
  'Append-only operational trail. No update or delete policy exists for the application role.';

-- AI conversation threads. Stored so a thread is auditable and re-readable; the
-- prompt content is what KNOuX actually received, not a reconstruction.
create table if not exists public.knoux_growth_ai_threads (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  family text not null,
  intent text not null,
  prompt text not null default '',
  response_summary text,
  -- Which provider actually served it. Operational provenance, never a product
  -- identity: the user-facing name is always KNOuX.
  provider_id text,
  provider_tier text,
  provisional boolean not null default true,
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint knoux_growth_ai_threads_family check (
    family in ('REPAIR', 'GROWTH', 'SOCIAL', 'ADVERTISING', 'COMMUNITY', 'ANALYTICS')
  ),
  -- Fallback answers must stay marked. A provisional flag defaulting to true
  -- means an unmarked row is a deliberate claim rather than an omission.
  constraint knoux_growth_ai_threads_provisional check (provisional)
);

create index if not exists knoux_growth_ai_threads_client_idx
  on public.knoux_growth_ai_threads(client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security, continuing the tenancy model
-- ---------------------------------------------------------------------------

alter table public.knoux_growth_creatives enable row level security;
alter table public.knoux_growth_content enable row level security;
alter table public.knoux_growth_communities enable row level security;
alter table public.knoux_growth_community_collections enable row level security;
alter table public.knoux_growth_collection_members enable row level security;
alter table public.knoux_growth_distribution_runs enable row level security;
alter table public.knoux_growth_distribution_items enable row level security;
alter table public.knoux_growth_leads enable row level security;
alter table public.knoux_growth_metrics enable row level security;
alter table public.knoux_growth_reports enable row level security;
alter table public.knoux_growth_automation_rules enable row level security;
alter table public.knoux_growth_audit_log enable row level security;
alter table public.knoux_growth_ai_threads enable row level security;

-- Membership-scoped access, same predicate as v1.
drop policy if exists knoux_growth_creatives_member on public.knoux_growth_creatives;
create policy knoux_growth_creatives_member on public.knoux_growth_creatives
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_creatives.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_creatives.client_id and m.user_id = auth.uid()));

drop policy if exists knoux_growth_content_member on public.knoux_growth_content;
create policy knoux_growth_content_member on public.knoux_growth_content
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_content.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_content.client_id and m.user_id = auth.uid()));

-- Community records are shared reference data within a workspace, so membership
-- is the boundary rather than authorship.
drop policy if exists knoux_growth_communities_member on public.knoux_growth_communities;
create policy knoux_growth_communities_member on public.knoux_growth_communities
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_communities.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_communities.client_id and m.user_id = auth.uid()));

drop policy if exists knoux_growth_community_collections_member on public.knoux_growth_community_collections;
create policy knoux_growth_community_collections_member on public.knoux_growth_community_collections
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_community_collections.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_community_collections.client_id and m.user_id = auth.uid()));

-- Membership of the parent collection. The join is explicit rather than
-- denormalised because a collection member row is small and the alternative is a
-- client_id that can drift from its parent.
drop policy if exists knoux_growth_collection_members_member on public.knoux_growth_collection_members;
create policy knoux_growth_collection_members_member on public.knoux_growth_collection_members
  for all to authenticated
  using (exists (
    select 1 from public.knoux_growth_community_collections c
    join public.knoux_growth_memberships m on m.client_id = c.client_id
    where c.id = knoux_growth_collection_members.collection_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.knoux_growth_community_collections c
    join public.knoux_growth_memberships m on m.client_id = c.client_id
    where c.id = knoux_growth_collection_members.collection_id and m.user_id = auth.uid()
  ));

drop policy if exists knoux_growth_distribution_runs_member on public.knoux_growth_distribution_runs;
create policy knoux_growth_distribution_runs_member on public.knoux_growth_distribution_runs
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_distribution_runs.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_distribution_runs.client_id and m.user_id = auth.uid()));

-- An item is visible through its run.
drop policy if exists knoux_growth_distribution_items_member on public.knoux_growth_distribution_items;
create policy knoux_growth_distribution_items_member on public.knoux_growth_distribution_items
  for all to authenticated
  using (exists (
    select 1 from public.knoux_growth_distribution_runs r
    join public.knoux_growth_memberships m on m.client_id = r.client_id
    where r.id = knoux_growth_distribution_items.run_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.knoux_growth_distribution_runs r
    join public.knoux_growth_memberships m on m.client_id = r.client_id
    where r.id = knoux_growth_distribution_items.run_id and m.user_id = auth.uid()
  ));

drop policy if exists knoux_growth_leads_member on public.knoux_growth_leads;
create policy knoux_growth_leads_member on public.knoux_growth_leads
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_leads.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_leads.client_id and m.user_id = auth.uid()));

drop policy if exists knoux_growth_metrics_member on public.knoux_growth_metrics;
create policy knoux_growth_metrics_member on public.knoux_growth_metrics
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_metrics.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_metrics.client_id and m.user_id = auth.uid()));

drop policy if exists knoux_growth_reports_member on public.knoux_growth_reports;
create policy knoux_growth_reports_member on public.knoux_growth_reports
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_reports.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_reports.client_id and m.user_id = auth.uid()));

drop policy if exists knoux_growth_automation_rules_member on public.knoux_growth_automation_rules;
create policy knoux_growth_automation_rules_member on public.knoux_growth_automation_rules
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_automation_rules.client_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_automation_rules.client_id and m.user_id = auth.uid()));

-- Read-only for members. An audit entry is evidence; letting a member edit one
-- would make the trail worthless, so there is no insert, update or delete policy
-- for the authenticated role. Writes come from the service role, which bypasses
-- RLS and is server-side only.
drop policy if exists knoux_growth_audit_log_read on public.knoux_growth_audit_log;
create policy knoux_growth_audit_log_read on public.knoux_growth_audit_log
  for select to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_audit_log.client_id and m.user_id = auth.uid()));

-- Threads are private to their author within the workspace. A member can see
-- what they asked; they cannot read a colleague's thread, because a prompt may
-- contain client detail the colleague is not cleared for.
drop policy if exists knoux_growth_ai_threads_own on public.knoux_growth_ai_threads;
create policy knoux_growth_ai_threads_own on public.knoux_growth_ai_threads
  for all to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m
                 where m.client_id = knoux_growth_ai_threads.client_id
                   and m.user_id = auth.uid()
                   and knoux_growth_ai_threads.user_id = auth.uid()))
  with check (exists (select 1 from public.knoux_growth_memberships m
                      where m.client_id = knoux_growth_ai_threads.client_id
                        and m.user_id = auth.uid()
                        and knoux_growth_ai_threads.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.knoux_growth_creatives from anon;
revoke all on table public.knoux_growth_content from anon;
revoke all on table public.knoux_growth_communities from anon;
revoke all on table public.knoux_growth_community_collections from anon;
revoke all on table public.knoux_growth_collection_members from anon;
revoke all on table public.knoux_growth_distribution_runs from anon;
revoke all on table public.knoux_growth_distribution_items from anon;
revoke all on table public.knoux_growth_leads from anon;
revoke all on table public.knoux_growth_metrics from anon;
revoke all on table public.knoux_growth_reports from anon;
revoke all on table public.knoux_growth_automation_rules from anon;
revoke all on table public.knoux_growth_audit_log from anon;
revoke all on table public.knoux_growth_ai_threads from anon;

grant select, insert, update, delete on table public.knoux_growth_creatives to authenticated;
grant select, insert, update, delete on table public.knoux_growth_content to authenticated;
grant select, insert, update, delete on table public.knoux_growth_communities to authenticated;
grant select, insert, update, delete on table public.knoux_growth_community_collections to authenticated;
grant select, insert, update, delete on table public.knoux_growth_collection_members to authenticated;
grant select, insert, update, delete on table public.knoux_growth_distribution_runs to authenticated;
grant select, insert, update, delete on table public.knoux_growth_distribution_items to authenticated;
grant select, insert, update, delete on table public.knoux_growth_leads to authenticated;
grant select, insert, update, delete on table public.knoux_growth_metrics to authenticated;
grant select, insert, update, delete on table public.knoux_growth_reports to authenticated;
grant select, insert, update, delete on table public.knoux_growth_automation_rules to authenticated;

-- Audit: read only. No insert grant, because writes come from the service role.
grant select on table public.knoux_growth_audit_log to authenticated;
grant select, insert on table public.knoux_growth_ai_threads to authenticated;