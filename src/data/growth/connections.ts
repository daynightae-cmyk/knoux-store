/**
 * KNOuX Growth — connections and activity fixtures.
 *
 * DEMO DATA, and the most safety-relevant fixture in the product.
 *
 * Every connection below is recorded as NOT_CONNECTED, CONFIG_REQUIRED or
 * EXPIRED. There is deliberately not one `CONNECTED` fixture, because a demo
 * connection that reads as connected is precisely the failure the mission
 * forbids — it teaches a reviewer that the Connections screen can show green
 * without a credential behind it. The UI's connected appearance is therefore
 * reachable only through a real authenticated call.
 *
 * One record is EXPIRED on purpose: a screen that has never rendered an expiry
 * has not been tested.
 */

import type { AuditEntry, Connection } from '@/lib/growth/types';

const T = '2026-10-04T00:00:00.000Z';

export const DEMO_CONNECTIONS: readonly Connection[] = [
  {
    id: 'cn_swim_meta',
    clientId: 'cl_swimfit',
    platform: 'meta_ads',
    state: 'NOT_CONFIGURED',
    capabilityState: 'CONFIG_REQUIRED',
    lastError: 'META_APP_ID and META_APP_SECRET are not set on the server.',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_swim_ig',
    clientId: 'cl_swimfit',
    platform: 'instagram',
    state: 'NOT_CONFIGURED',
    capabilityState: 'CONFIG_REQUIRED',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_nb_ga4',
    clientId: 'cl_northbay',
    platform: 'ga4',
    state: 'EXPIRED',
    accountLabel: 'Demo property reference',
    grantedScopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    lastVerifiedAt: '2026-07-14T00:00:00.000Z',
    lastError: 'Google returned 401 on the last analyticsdata request. The refresh token is no longer valid.',
    capabilityState: 'AUTH_REQUIRED',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_nb_gbp',
    clientId: 'cl_northbay',
    platform: 'google_business',
    state: 'NOT_CONFIGURED',
    capabilityState: 'CONFIG_REQUIRED',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_nb_googleads',
    clientId: 'cl_northbay',
    platform: 'google_ads',
    state: 'NOT_CONFIGURED',
    capabilityState: 'CONFIG_REQUIRED',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_sands_ig',
    clientId: 'cl_sands',
    platform: 'instagram',
    state: 'NOT_CONNECTED',
    capabilityState: 'ADAPTER_READY',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_nile_fb',
    clientId: 'cl_nile',
    platform: 'facebook',
    state: 'NOT_CONNECTED',
    capabilityState: 'ADAPTER_READY',
    origin: 'FIXTURE',
    updatedAt: T,
  },
  {
    id: 'cn_nile_whatsapp',
    clientId: 'cl_nile',
    platform: 'whatsapp',
    state: 'BLOCKED',
    lastError:
      'Sending is intentionally unimplemented in this build. No outbound message path exists.',
    capabilityState: 'BLOCKED',
    origin: 'FIXTURE',
    updatedAt: T,
  },
];

export function connectionsFor(clientId: string): Connection[] {
  return DEMO_CONNECTIONS.filter((connection) => connection.clientId === clientId);
}

/** Every platform the Connections screen shows, including future-facing ones. */
export const CONNECTION_CATALOGUE = [
  { platform: 'facebook', label: 'Facebook Pages', group: 'Meta', scopesHint: 'Pages the operator manages' },
  { platform: 'instagram', label: 'Instagram', group: 'Meta', scopesHint: 'Professional accounts' },
  { platform: 'meta_ads', label: 'Meta Ads', group: 'Meta', scopesHint: 'Ad accounts, campaigns, insights' },
  { platform: 'google_ads', label: 'Google Ads', group: 'Google', scopesHint: 'Campaigns and performance' },
  { platform: 'google_business', label: 'Google Business Profile', group: 'Google', scopesHint: 'Locations and performance' },
  { platform: 'ga4', label: 'Google Analytics 4', group: 'Google', scopesHint: 'Sessions, key events, revenue' },
  { platform: 'search_console', label: 'Search Console', group: 'Google', scopesHint: 'Search performance' },
  { platform: 'youtube', label: 'YouTube', group: 'Google', scopesHint: 'Channels and videos' },
  { platform: 'whatsapp', label: 'WhatsApp Business', group: 'WhatsApp', scopesHint: 'Status and templates' },
  { platform: 'tiktok', label: 'TikTok', group: 'Future', scopesHint: 'Not wired' },
  { platform: 'linkedin', label: 'LinkedIn', group: 'Future', scopesHint: 'Not wired' },
  { platform: 'snapchat', label: 'Snapchat', group: 'Future', scopesHint: 'Not wired' },
] as const;

/* --------------------------------------------------------------- activity */

export const DEMO_ACTIVITY: readonly AuditEntry[] = [
  {
    id: 'au_1',
    clientId: 'cl_swimfit',
    action: 'CAMPAIGN_SUBMITTED',
    actor: 'ads.specialist@knoux.store',
    subjectType: 'CAMPAIGN',
    subjectId: 'cmp_swim_intro',
    at: '2026-10-03T09:12:00.000Z',
    detail: 'Budget AED 750.00 over 8 days, target Abu Dhabi, objective Leads. Submitted for approval.',
  },
  {
    id: 'au_2',
    clientId: 'cl_northbay',
    action: 'CAMPAIGN_APPROVED',
    actor: 'manager@knoux.store',
    subjectType: 'CAMPAIGN',
    subjectId: 'cmp_nb_search',
    at: '2026-10-02T15:40:00.000Z',
    detail: 'Approved a frozen snapshot of AED 1,200.00 over 32 days. No spend has occurred.',
  },
  {
    id: 'au_3',
    clientId: 'cl_swimfit',
    action: 'AI_RECOMMENDATION_ACCEPTED',
    actor: 'ads.specialist@knoux.store',
    subjectType: 'CAMPAIGN',
    subjectId: 'cmp_swim_intro',
    at: '2026-10-02T11:05:00.000Z',
    detail: 'Accepted a suggestion to narrow the radius to 8km. Applied to the draft.',
  },
  {
    id: 'au_4',
    clientId: 'cl_northbay',
    action: 'CONNECTION_REMOVED',
    actor: 'owner@knoux.store',
    subjectType: 'CONNECTION',
    subjectId: 'cn_nb_ga4',
    at: '2026-10-01T08:00:00.000Z',
    detail: 'Google Analytics 4 refresh token rejected; the connection was removed rather than retried.',
  },
  {
    id: 'au_5',
    clientId: 'cl_swimfit',
    action: 'COMMUNITY_POST_DISTRIBUTED',
    actor: 'operator@knoux.store',
    subjectType: 'DISTRIBUTION_ENTRY',
    subjectId: 'de_2',
    at: '2026-09-30T17:22:00.000Z',
    detail: 'Operator marked the post as posted in Khalifa City Community after posting manually.',
  },
  {
    id: 'au_6',
    clientId: 'cl_sands',
    action: 'BUDGET_CHANGED',
    actor: 'manager@knoux.store',
    subjectType: 'CAMPAIGN',
    subjectId: 'cmp_sands_awareness',
    at: '2026-09-29T13:00:00.000Z',
    detail: 'Budget reduced from AED 2,500.00 to AED 2,000.00 after changes were requested.',
  },
];

export function activityFor(clientId: string): AuditEntry[] {
  return DEMO_ACTIVITY.filter((entry) => entry.clientId === clientId).sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}