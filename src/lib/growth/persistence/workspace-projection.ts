import type { Client, CanonicalMetrics, PerformanceRow } from '../types';
import type { MetricRow } from './repository';
import { deriveMetrics } from '../metrics';
import type { WorkspaceRecords } from './workspace-data';

type Row = Record<string, unknown>;
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const rows = (value: unknown): Row[] => array(value).filter((entry): entry is Row => !!entry && typeof entry === 'object');
const camel = (value: string): string => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Explicit field lists prevent vault references and unrecognised columns reaching the browser. */
function project<T>(row: Row, fields: string, defaults: Row = {}): T {
  const result: Row = { ...defaults };
  for (const key of fields.split(' ')) if (row[key] !== null && row[key] !== undefined) result[camel(key)] = row[key];
  if ('origin' in row && row.origin !== 'LIVE' && row.origin !== 'FIXTURE') throw new Error('Invalid stored provenance.');
  return result as T;
}

function projectConnection(row: Row): WorkspaceRecords['connections'][number] {
  const connection = project<WorkspaceRecords['connections'][number]>(row, 'id client_id platform state account_label account_id granted_scopes missing_scopes last_verified_at last_error capability_state origin updated_at');
  const expiry = typeof row.token_expires_at === 'string' ? Date.parse(row.token_expires_at) : NaN;
  if (connection.state === 'CONNECTED' && Number.isFinite(expiry) && expiry <= Date.now()) {
    connection.state = 'EXPIRED';
    connection.capabilityState = 'AUTH_REQUIRED';
  }
  return connection;
}

export function projectClient(row: Row): Client {
  if (!text(row.id) || !text(row.name)) throw new Error('Invalid stored client identity.');
  return {
    ...project<Client>(row, 'id name legal_name business_category country city website phone whatsapp languages autonomy_mode origin created_at updated_at'),
    branches: rows(row.branches).map(branch => project(branch, 'id name city addressLine phone whatsapp googleLocationId')),
    connectedPlatforms: [],
    brand: {
      colors: array(row.brand_colors) as string[], fonts: array(row.brand_fonts) as string[], tone: text(row.brand_tone),
      forbiddenClaims: array(row.forbidden_claims) as string[], approvedAssets: array(row.approved_assets) as string[],
      products: array(row.products) as string[], previousWinningCreativeIds: [],
      arabicStyle: text(row.arabic_style), englishStyle: text(row.english_style),
    },
  };
}

export function projectPerformance(clientId: string, input: MetricRow[]): PerformanceRow[] {
  const groups = new Map<string, PerformanceRow>();
  const keys = new Set(['spend', 'impressions', 'reach', 'clicks', 'leads', 'qualifiedLeads', 'calls', 'whatsappStarts', 'bookings', 'sales', 'revenue']);
  // The repository orders newest reporting windows first. A ratio must never
  // pair a recent numerator with an older denominator from a different window.
  const latest = input.find(metric => keys.has(metric.metricKey) && Number.isFinite(metric.value) && metric.periodStart && metric.periodEnd);
  for (const metric of input) {
    if (!keys.has(metric.metricKey) || !Number.isFinite(metric.value)) continue;
    if (latest && (metric.periodStart !== latest.periodStart || metric.periodEnd !== latest.periodEnd)) continue;
    const key = `${metric.channel}:${metric.campaignId ?? ''}`;
    let row = groups.get(key);
    if (!row) {
      row = { key, clientId, platformLabel: metric.channel, campaignId: metric.campaignId, metrics: {}, derived: deriveMetrics({}) };
      groups.set(key, row);
    }
    const name = metric.metricKey as keyof CanonicalMetrics;
    // Do not add observations across incompatible periods or invent totals.
    if (!row.metrics[name]) row.metrics[name] = { value: metric.value, origin: metric.origin, evidence: metric.evidence };
  }
  return [...groups.values()].map(row => ({ ...row, derived: deriveMetrics(row.metrics) }));
}

export function projectWorkspace(client: Client, data: Record<string, Row[]>, metrics: MetricRow[]): WorkspaceRecords {
  const distribution = data.distribution ?? [];
  return {
    campaigns: data.campaigns.map(row => ({
      ...project<WorkspaceRecords['campaigns'][number]>(row, 'id client_id name objective budget_minor currency start_date end_date locations languages audience_notes landing_page_url conversion_target status origin created_at updated_at'),
      platforms: rows(row.knoux_growth_campaign_channels).map(channel => text(channel.platform)) as WorkspaceRecords['campaigns'][number]['platforms'],
      creativeSetIds: [], remoteCampaignIds: Object.fromEntries(rows(row.knoux_growth_campaign_channels).filter(channel => channel.provider_campaign_id).map(channel => [channel.platform, channel.provider_campaign_id])),
    })),
    communities: data.communities.map(row => project(row, 'id name platform public_url country region city category language visibility activity_estimate promotion_policy admin_approval_required public_admin_contact last_checked_at verification_status notes relevance_tags business_categories origin created_at updated_at')),
    leads: data.leads.map(row => project(row, 'id client_id source platform campaign_id ad_id ad_name name phone email occurred_at status notes assigned_to qualification booked_at sale_value_minor currency origin')),
    connections: data.connections.map(projectConnection),
    performanceRows: projectPerformance(client.id, metrics),
    activity: data.activity.map(row => ({ ...project<WorkspaceRecords['activity'][number]>(row, 'id client_id action subject_type subject_id detail'), actor: text(row.actor_label) || text(row.actor_id), at: text(row.created_at) })),
    content: data.content.map(row => project(row, 'id client_id platforms copy media_asset_ids scheduled_for status approval_id author ai_generated origin created_at updated_at', { author: '' })),
    creatives: data.creatives.map(row => project(row, 'id client_id campaign_id format concept hooks headline primary_text description cta visual_prompt video_script languages ai_generated status reviewed_by origin created_at updated_at')),
    distributionLists: data.collections.map(row => ({
      ...project<WorkspaceRecords['distributionLists'][number]>(row, 'id client_id name description created_at updated_at'),
      communityIds: rows(row.knoux_growth_collection_members).map(member => text(member.community_id)),
      entries: distribution.filter(run => run.collection_id === row.id).flatMap(run => rows(run.knoux_growth_distribution_items).map(item => ({ ...project<WorkspaceRecords['distributionLists'][number]['entries'][number]>(item, 'id community_id status posted_at posted_by skip_reason'), listId: text(row.id), contentId: text(run.content_id) || undefined }))),
    })),
    automations: data.automations.map(row => project(row, 'id client_id name trigger threshold action enabled risk created_at')),
    // Locations are stored branches, never fabricated Google performance measurements.
    locations: client.branches.map(branch => ({ id: branch.id, clientId: client.id, name: branch.name, addressLine: branch.addressLine, city: branch.city, googleLocationId: branch.googleLocationId, origin: client.origin })),
  };
}
