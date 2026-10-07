-- Growth browser roles are read-only for operational data until audited server
-- mutation transactions enforce role, approval and related-row tenant boundaries.
-- Membership-only FOR ALL policies from v1/v2 are insufficient for write access.
-- Preserve those read predicates and all data; remove the browser write grants.
-- No service-role write is exposed by this migration. Apply only after review
-- and verification on a development Supabase database.
begin;

revoke all on table public.knoux_growth_clients from public, anon;
revoke all on table public.knoux_growth_memberships from public, anon;
revoke all on table public.knoux_growth_connections from public, anon;
revoke all on table public.knoux_growth_oauth_states from public, anon;
revoke all on table public.knoux_growth_campaigns from public, anon;
revoke all on table public.knoux_growth_campaign_channels from public, anon;
revoke all on table public.knoux_growth_campaign_approvals from public, anon;
revoke all on table public.knoux_growth_creatives from public, anon;
revoke all on table public.knoux_growth_content from public, anon;
revoke all on table public.knoux_growth_communities from public, anon;
revoke all on table public.knoux_growth_community_collections from public, anon;
revoke all on table public.knoux_growth_collection_members from public, anon;
revoke all on table public.knoux_growth_distribution_runs from public, anon;
revoke all on table public.knoux_growth_distribution_items from public, anon;
revoke all on table public.knoux_growth_leads from public, anon;
revoke all on table public.knoux_growth_metrics from public, anon;
revoke all on table public.knoux_growth_reports from public, anon;
revoke all on table public.knoux_growth_automation_rules from public, anon;
revoke all on table public.knoux_growth_audit_log from public, anon;
revoke all on table public.knoux_growth_ai_threads from public, anon;

revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_connections from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_oauth_states from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_campaigns from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_campaign_channels from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_campaign_approvals from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_creatives from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_content from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_communities from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_community_collections from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_collection_members from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_distribution_runs from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_distribution_items from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_leads from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_metrics from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_reports from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_automation_rules from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.knoux_growth_audit_log from authenticated;

-- Owner-only membership management remains subject to v1 owner RLS.
revoke all on function public.knoux_growth_is_client_owner(text) from public, anon;
grant execute on function public.knoux_growth_is_client_owner(text) to authenticated;

-- Creative-only roles cannot inspect budgets through a direct PostgREST read.
-- A campaign row contains its budget, so its read requires budget visibility.
create or replace function public.knoux_growth_may_read_budget(p_client text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.knoux_growth_memberships m where m.client_id = p_client
    and m.user_id = auth.uid() and m.role in ('OWNER', 'MANAGER', 'ADS_SPECIALIST', 'CLIENT', 'VIEWER'));
$$;
revoke all on function public.knoux_growth_may_read_budget(text) from public, anon;
grant execute on function public.knoux_growth_may_read_budget(text) to authenticated;
drop policy if exists knoux_growth_campaigns_member on public.knoux_growth_campaigns;
create policy knoux_growth_campaigns_budget_read on public.knoux_growth_campaigns for select to authenticated
  using (public.knoux_growth_may_read_budget(client_id));
drop policy if exists knoux_growth_metrics_member on public.knoux_growth_metrics;
create policy knoux_growth_metrics_scoped_read on public.knoux_growth_metrics for select to authenticated
  using (exists (select 1 from public.knoux_growth_memberships m where m.client_id = knoux_growth_metrics.client_id and m.user_id = auth.uid())
    and (metric_key not in ('spend', 'revenue') or public.knoux_growth_may_read_budget(client_id)));

commit;
