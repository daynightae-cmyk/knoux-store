/**
 * KNOuX Growth — capability registry.
 *
 * This is the MCP-shaped capability bridge. The names here are the conceptual
 * capability ids from the mission (`meta.campaigns.list`,
 * `google.analytics.report`, `community.search_public`, ...). They are
 * KNOuX's own vocabulary for what KNOuX *can* ask of a platform, not a claim
 * that any remote tool with that name exists today.
 *
 * The distinction is carried by `readiness`. A capability is only ever
 * `LIVE_VERIFIED` when a runtime call returned real provider data, and that
 * transition happens in `resolveCapability`, never in this file. This file
 * declares the adapter and the honest starting position; it does not assert
 * health.
 */

import type { PlatformId } from '../types';
import type { CapabilityState } from '../states';

export type CapabilityFamily = 'META' | 'GOOGLE' | 'COMMUNITY' | 'WHATSAPP' | 'LEADS' | 'CONTENT' | 'REPORTS';

export type CapabilityRisk = 'READ_ONLY' | 'MUTATING';

export type CapabilityDefinition = {
  id: string;
  family: CapabilityFamily;
  platform?: PlatformId;
  label: string;
  /** What this capability would return, stated in terms a client can verify. */
  returns: string;
  /** The provider endpoint family this maps to, for operators. */
  providerApi: string;
  /** Whether calling it can change anything outside KNOuX. */
  risk: CapabilityRisk;
  /**
   * The honest state of this capability in a deployment with no credentials.
   * `LIVE_VERIFIED` is deliberately not assignable here: only a runtime call
   * may produce it, so the registry cannot overstate readiness at boot.
   */
  readiness: Exclude<CapabilityState, 'LIVE_VERIFIED'>;
  /** Environment variables that would be required. Names only, never values. */
  requiredEnv: string[];
  /** OAuth scopes this capability needs. Absent means not OAuth-based. */
  scopes?: string[];
  /** Set when the platform does not offer this capability at all. */
  platformLimitation?: string;
};

const META_SCOPES_PAGE = ['pages_show_list', 'pages_read_engagement'];
const META_SCOPES_ADS = ['ads_read', 'ads_management', 'read_insights'];
const META_SCOPES_LEADS = ['ads_management', 'pages_read_engagement'];

const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'];
const GBP_SCOPES = ['https://www.googleapis.com/auth/business.manage'];
const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];
const GSC_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const YT_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

/**
 * The registry.
 *
 * `readiness` is set to ADAPTER_READY where a server-side adapter exists in
 * this codebase, CONFIG_REQUIRED where one exists but needs an env secret, and
 * UNAVAILABLE-derived (BLOCKED) where the platform genuinely does not expose
 * it. Nothing here is LIVE_VERIFIED.
 */
export const CAPABILITIES: readonly CapabilityDefinition[] = [
  /* ------------------------------------------------------------------ Meta */
  {
    id: 'meta.account.list',
    family: 'META',
    platform: 'facebook',
    label: 'Meta business accounts',
    returns: 'Business accounts the authenticated user administers.',
    providerApi: 'graph.facebook.com/v21.0/me/business_accounts',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_PAGE,
  },
  {
    id: 'meta.pages.list',
    family: 'META',
    platform: 'facebook',
    label: 'Facebook Pages',
    returns: 'Pages the authenticated user manages.',
    providerApi: 'graph.facebook.com/v21.0/me/accounts',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_PAGE,
  },
  {
    id: 'meta.instagram.list',
    family: 'META',
    platform: 'instagram',
    label: 'Instagram professional accounts',
    returns: 'Professional accounts linked to managed Pages.',
    providerApi: 'graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_PAGE,
  },
  {
    id: 'meta.ads.accounts',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta ad accounts',
    returns: 'Advertising accounts available to the authenticated user.',
    providerApi: 'graph.facebook.com/v21.0/me/adaccounts',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_ADS,
  },
  {
    id: 'meta.campaigns.list',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta campaigns',
    returns: 'Campaigns in an ad account with their delivery status.',
    providerApi: 'graph.facebook.com/v21.0/{ad_account_id}/campaigns',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_ADS,
  },
  {
    id: 'meta.campaign.read',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta campaign detail',
    returns: 'One campaign with budget, schedule and objective.',
    providerApi: 'graph.facebook.com/v21.0/{campaign_id}',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_ADS,
  },
  {
    id: 'meta.insights.read',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta insights',
    returns: 'Spend, impressions, reach, clicks and actions for a level and window.',
    providerApi: 'graph.facebook.com/v21.0/{object_id}/insights',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: ['ads_read', 'read_insights'],
  },
  {
    id: 'meta.leads.read',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta lead forms',
    returns: 'Submissions the user actually submitted to an authorised lead form.',
    providerApi: 'graph.facebook.com/v21.0/{leadgen_id}/leads',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: META_SCOPES_LEADS,
  },
  {
    id: 'meta.campaign.create',
    family: 'META',
    platform: 'meta_ads',
    label: 'Meta campaign creation',
    returns: 'A created campaign. MUTATING — requires approval, and spends money once delivering.',
    providerApi: 'graph.facebook.com/v21.0/{ad_account_id}/campaigns',
    risk: 'MUTATING',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    scopes: ['ads_management'],
  },

  /* ---------------------------------------------------------------- Google */
  {
    id: 'google.ads.accounts',
    family: 'GOOGLE',
    platform: 'google_ads',
    label: 'Google Ads accounts',
    returns: 'Accessible customer accounts for the authenticated user.',
    providerApi: 'googleads.googleapis.com/v19/customers:listAccessibleCustomers',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'],
    scopes: GOOGLE_ADS_SCOPES,
  },
  {
    id: 'google.ads.campaigns',
    family: 'GOOGLE',
    platform: 'google_ads',
    label: 'Google Ads campaigns',
    returns: 'Campaigns with status, budget and network settings.',
    providerApi: 'googleads.googleapis.com/v19/customers/{id}/googleAds:searchStream',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'],
    scopes: GOOGLE_ADS_SCOPES,
  },
  {
    id: 'google.ads.performance',
    family: 'GOOGLE',
    platform: 'google_ads',
    label: 'Google Ads performance',
    returns: 'Cost, impressions, clicks, conversions and conversion value.',
    providerApi: 'googleads.googleapis.com/v19/googleAds:searchStream',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'],
    scopes: GOOGLE_ADS_SCOPES,
  },
  {
    id: 'google.business.locations',
    family: 'GOOGLE',
    platform: 'google_business',
    label: 'Business Profile locations',
    returns: 'Locations owned by the authenticated account.',
    providerApi: 'mybusinessbusinessinformation.googleapis.com/v1/accounts',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    scopes: GBP_SCOPES,
  },
  {
    id: 'google.business.performance',
    family: 'GOOGLE',
    platform: 'google_business',
    label: 'Business Profile performance',
    returns: 'Searches, calls, website clicks and direction requests.',
    providerApi: 'businessinformationperformance.googleapis.com/v1/locations:searchPerformance',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    scopes: GBP_SCOPES,
  },
  {
    id: 'google.analytics.report',
    family: 'GOOGLE',
    platform: 'ga4',
    label: 'Google Analytics 4 report',
    returns: 'Sessions, key events and revenue for a property and date range.',
    providerApi: 'analyticsdata.googleapis.com/v1beta/properties/{id}:runReport',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    scopes: GA4_SCOPES,
  },
  {
    id: 'google.searchconsole.performance',
    family: 'GOOGLE',
    platform: 'search_console',
    label: 'Search Console performance',
    returns: 'Clicks, impressions, CTR and position for a verified property.',
    providerApi: 'searchconsole.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    scopes: GSC_SCOPES,
  },
  {
    id: 'google.youtube.list',
    family: 'GOOGLE',
    platform: 'youtube',
    label: 'YouTube channels and videos',
    returns: 'Channel metadata and recent video performance.',
    providerApi: 'youtube.googleapis.com/youtube/v3/channels',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    scopes: YT_SCOPES,
  },

  /* ------------------------------------------------------------ Community */
  {
    id: 'community.search_public',
    family: 'COMMUNITY',
    label: 'Public community discovery',
    returns: 'Publicly listed communities matching operator-supplied keywords and location.',
    providerApi: 'KNOuX internal, operator-submitted or imported records',
    risk: 'READ_ONLY',
    readiness: 'UI_READY',
    requiredEnv: [],
  },
  {
    id: 'community.verify',
    family: 'COMMUNITY',
    label: 'Community metadata verification',
    returns: 'Whether a stored public URL still resolves and its public visibility.',
    providerApi: 'public HEAD/GET against a stored public URL',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: [],
  },
  {
    id: 'community.import',
    family: 'COMMUNITY',
    label: 'Community import',
    returns: 'Operator-supplied community records added to the registry.',
    providerApi: 'KNOuX internal',
    risk: 'MUTATING',
    readiness: 'UI_READY',
    requiredEnv: [],
  },
  {
    id: 'community.refresh',
    family: 'COMMUNITY',
    label: 'Community metadata refresh',
    returns: 'Updated availability, visibility and activity metadata for stored records.',
    providerApi: 'public HEAD/GET against stored public URLs',
    risk: 'MUTATING',
    readiness: 'ADAPTER_READY',
    requiredEnv: [],
  },
  {
    id: 'community.post',
    family: 'COMMUNITY',
    label: 'Automated community posting',
    returns: 'Nothing. Facebook exposes no general Groups API for arbitrary group publishing.',
    providerApi: 'not available',
    risk: 'MUTATING',
    readiness: 'BLOCKED',
    requiredEnv: [],
    platformLimitation:
      'Facebook provides no general Groups API for publishing into arbitrary groups. KNOuX uses a manual-assisted posting queue instead, which is a product capability rather than a workaround. There is no automated path and none will be added.',
  },

  /* ------------------------------------------------------------- WhatsApp */
  {
    id: 'whatsapp.account.status',
    family: 'WHATSAPP',
    platform: 'whatsapp',
    label: 'WhatsApp Business status',
    returns: 'Business account status, quality rating and messaging limits.',
    providerApi: 'graph.facebook.com/v21.0/{waba_id}/whatsapp_business_account',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET', 'WHATSAPP_PHONE_NUMBER_ID'],
    scopes: ['whatsapp_business_management'],
  },
  {
    id: 'whatsapp.templates',
    family: 'WHATSAPP',
    platform: 'whatsapp',
    label: 'WhatsApp message templates',
    returns: 'Approved and pending message templates.',
    providerApi: 'graph.facebook.com/v21.0/{waba_id}/message_templates',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET', 'WHATSAPP_PHONE_NUMBER_ID'],
    scopes: ['whatsapp_business_management'],
  },
  {
    id: 'whatsapp.leads',
    family: 'WHATSAPP',
    platform: 'whatsapp',
    label: 'WhatsApp lead events',
    returns: 'Conversation and lead events recorded by the platform.',
    providerApi: 'graph.facebook.com/v21.0/{waba_id}/conversations',
    risk: 'READ_ONLY',
    readiness: 'ADAPTER_READY',
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET', 'WHATSAPP_PHONE_NUMBER_ID'],
    scopes: ['whatsapp_business_management'],
  },
  {
    id: 'whatsapp.send',
    family: 'WHATSAPP',
    platform: 'whatsapp',
    label: 'Outbound WhatsApp message',
    returns: 'Nothing in this build. Sending requires approval and is not implemented.',
    providerApi: 'graph.facebook.com/v21.0/{phone_number_id}/messages',
    risk: 'MUTATING',
    readiness: 'BLOCKED',
    requiredEnv: [],
    platformLimitation:
      'No sending code path exists in this build. The mission forbids sending WhatsApp messages during development, so this capability is intentionally unimplemented rather than merely unconfigured.',
  },

  /* ----------------------------------------------- Leads, content, reports */
  {
    id: 'leads.normalise',
    family: 'LEADS',
    label: 'Lead normalisation',
    returns: 'Provider lead rows mapped onto the KNOuX lead model.',
    providerApi: 'KNOuX internal',
    risk: 'READ_ONLY',
    readiness: 'UI_READY',
    requiredEnv: [],
  },
  {
    id: 'content.draft',
    family: 'CONTENT',
    label: 'Content draft generation',
    returns: 'An editable draft. Never published.',
    providerApi: 'KNOuX Intelligence',
    risk: 'READ_ONLY',
    readiness: 'AUTH_REQUIRED',
    requiredEnv: ['KNOUX_AGENT_ENDPOINT', 'KNOUX_AGENT_TOKEN'],
  },
  {
    id: 'reports.generate',
    family: 'REPORTS',
    label: 'Report generation',
    returns: 'A client-facing report assembled from verified metrics.',
    providerApi: 'KNOuX internal',
    risk: 'READ_ONLY',
    readiness: 'UI_READY',
    requiredEnv: [],
  },
];

export function capabilityById(id: string): CapabilityDefinition | undefined {
  return CAPABILITIES.find((capability) => capability.id === id);
}

/** Every capability that would need credentials before it could return data. */
export function requiredEnvNames(): string[] {
  return [...new Set(CAPABILITIES.flatMap((capability) => capability.requiredEnv))].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------- resolution */

export type CapabilityStatus = CapabilityDefinition & {
  /**
   * The state this capability is actually in right now. Starts at the registry
   * declaration and is only ever advanced to LIVE_VERIFIED by a real call.
   */
  resolved: Exclude<CapabilityState, 'LIVE_VERIFIED'>;
  /** Populated when something is missing, so the UI can be specific. */
  missingEnv: string[];
  /** Populated when a capability is blocked by a platform limitation. */
  blockedReason?: string;
  /** Operator-facing next step. Never a fabricated affordance. */
  remediation: string;
};

/**
 * Resolves registry state against the environment.
 *
 * Pure, and deliberately so: it reads a supplied environment record rather than
 * `process.env` directly, which is what makes it testable and what keeps the
 * determination auditable. It never contacts a provider.
 */
export function resolveCapability(
  capability: CapabilityDefinition,
  env: Record<string, string | undefined>,
): CapabilityStatus {
  const missingEnv = capability.requiredEnv.filter((name) => !env[name]);

  if (capability.platformLimitation) {
    return {
      ...capability,
      resolved: 'BLOCKED',
      missingEnv: [],
      blockedReason: capability.platformLimitation,
      remediation: 'No action available. This is a platform limitation, not a configuration problem.',
    };
  }

  if (capability.readiness === 'UI_READY') {
    return {
      ...capability,
      resolved: 'UI_READY',
      missingEnv: [],
      remediation: 'Fully usable against workspace data. No provider credential needed.',
    };
  }

  if (missingEnv.length === capability.requiredEnv.length && capability.requiredEnv.length > 0) {
    return {
      ...capability,
      resolved: 'CONFIG_REQUIRED',
      missingEnv,
      remediation: `Set ${missingEnv.join(', ')} in the server environment, then restart.`,
    };
  }

  if (missingEnv.length > 0) {
    return {
      ...capability,
      resolved: 'CONFIG_REQUIRED',
      missingEnv,
      remediation: `Still missing ${missingEnv.join(', ')}.`,
    };
  }

  if (capability.readiness === 'AUTH_REQUIRED') {
    return {
      ...capability,
      resolved: 'AUTH_REQUIRED',
      missingEnv: [],
      remediation: 'Configuration is present. An operator must complete the authorisation handshake.',
    };
  }

  // Everything is configured but no call has been made in this process, so the
  // honest state is ADAPTER_READY — configured and callable, but unproven.
  return {
    ...capability,
    resolved: 'ADAPTER_READY',
    missingEnv: [],
    remediation: 'Configured. A live authenticated call has not yet been made in this process.',
  };
}

export function resolveAll(
  env: Record<string, string | undefined>,
  definitions: readonly CapabilityDefinition[] = CAPABILITIES,
): CapabilityStatus[] {
  return definitions.map((capability) => resolveCapability(capability, env));
}

/** Summary used by the connection health indicator. */
export function summariseCapabilities(statuses: CapabilityStatus[]): {
  total: number;
  liveVerified: number;
  blocked: number;
  needsConfiguration: number;
  needsAuth: number;
  ready: number;
} {
  return {
    total: statuses.length,
    // No capability can be LIVE_VERIFIED from a static resolve.
    liveVerified: 0,
    blocked: statuses.filter((status) => status.resolved === 'BLOCKED').length,
    needsConfiguration: statuses.filter((status) => status.resolved === 'CONFIG_REQUIRED').length,
    needsAuth: statuses.filter((status) => status.resolved === 'AUTH_REQUIRED').length,
    ready: statuses.filter((status) => status.resolved === 'ADAPTER_READY' || status.resolved === 'UI_READY').length,
  };
}

