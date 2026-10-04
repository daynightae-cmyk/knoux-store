/**
 * KNOuX Growth — domain model.
 *
 * Real interfaces, not shapes for a mockup. Two constraints run through all
 * of them:
 *
 *  1. Anything a provider supplies is `Sourced`, so its provenance travels with
 *     it and a fixture can never be rendered as a platform fact.
 *  2. Anything that could spend money or publish publicly carries a lifecycle
 *     that terminates in human approval, never in an automatic transition.
 */

import type {
  AutonomyMode,
  CapabilityState,
  ConnectionState,
  DataOrigin,
  RiskLevel,
  Sourced,
} from './states';

/* ------------------------------------------------------------------ client */

export type PlatformId =
  | 'facebook'
  | 'instagram'
  | 'meta_ads'
  | 'google_ads'
  | 'google_business'
  | 'ga4'
  | 'search_console'
  | 'youtube'
  | 'whatsapp'
  | 'tiktok'
  | 'linkedin'
  | 'snapchat';

export const PLATFORM_IDS: readonly PlatformId[] = [
  'facebook',
  'instagram',
  'meta_ads',
  'google_ads',
  'google_business',
  'ga4',
  'search_console',
  'youtube',
  'whatsapp',
  'tiktok',
  'linkedin',
  'snapchat',
];

/** Platforms the mission marks as future-facing rather than shipped. */
export const FUTURE_PLATFORM_IDS: readonly PlatformId[] = ['tiktok', 'linkedin', 'snapchat'];

export type CountryCode = 'AE' | 'EG';
export type LanguageCode = 'ar' | 'en';

/** A physical branch. Google Business Profile is location-scoped, so this is real. */
export type Branch = {
  id: string;
  name: string;
  city: string;
  addressLine: string;
  phone?: string;
  whatsapp?: string;
  /** Set only once a Google Business Profile location has actually been linked. */
  googleLocationId?: string;
};

export type BrandProfile = {
  logoAsset?: string;
  /** Hex values only. Platform brand colours are not brand colours. */
  colors: string[];
  fonts: string[];
  tone: string;
  /** Register guidance for AI copy. */
  arabicStyle?: string;
  englishStyle?: string;
  /** Claims KNOuX must never generate for this client. Enforced in prompts. */
  forbiddenClaims: string[];
  approvedAssets: string[];
  /** Creatives that historically performed, referenced by id. */
  previousWinningCreativeIds: string[];
  products: string[];
};

/**
 * The AI memory a client workspace carries. It is assembled into the KNOuX
 * Intelligence context for every request scoped to this client, which is what
 * makes KNOuX contextual rather than a generic chat box.
 */
export type AiMemory = {
  /** Short statements the operator has confirmed. */
  confirmedFacts: string[];
  /** Things KNOuX must not assume about this client. */
  openQuestions: string[];
  /** What the operator is trying to achieve this quarter. */
  objectives: string[];
  updatedAt: string;
};

export type Client = {
  id: string;
  name: string;
  legalName?: string;
  logoAsset?: string;
  brand: BrandProfile;
  businessCategory: string;
  country: CountryCode;
  city: string;
  branches: Branch[];
  website?: string;
  phone?: string;
  whatsapp?: string;
  languages: LanguageCode[];
  brandNotes?: string;
  /** Platform ids with a *stored credential*. Never a claim of health. */
  connectedPlatforms: PlatformId[];
  autonomyMode: AutonomyMode;
  origin: DataOrigin;
  createdAt: string;
  updatedAt: string;
};

/* ---------------------------------------------------------------- campaign */

export type CampaignObjective =
  | 'WHATSAPP'
  | 'LEADS'
  | 'CALLS'
  | 'WEBSITE'
  | 'AWARENESS'
  | 'BOOKINGS'
  | 'SALES';

export const CAMPAIGN_OBJECTIVES: readonly CampaignObjective[] = [
  'WHATSAPP',
  'LEADS',
  'CALLS',
  'WEBSITE',
  'AWARENESS',
  'BOOKINGS',
  'SALES',
];

export type CampaignPlatform =
  | 'facebook'
  | 'instagram'
  | 'google_search'
  | 'google_maps'
  | 'youtube';

export const CAMPAIGN_PLATFORMS: readonly CampaignPlatform[] = [
  'facebook',
  'instagram',
  'google_search',
  'google_maps',
  'youtube',
];

export type CurrencyCode = 'AED' | 'EGP' | 'USD';

/**
 * Campaign lifecycle. Note that no transition reaches `LIVE` by itself — the
 * only edge into `LIVE` is `LAUNCH_PENDING` -> `LIVE`, and entering
 * `LAUNCH_PENDING` requires an approval record. See `campaigns.ts`.
 */
export type CampaignStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'LAUNCH_PENDING'
  | 'LIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED';

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'LAUNCH_PENDING',
  'LIVE',
  'PAUSED',
  'COMPLETED',
  'FAILED',
];

export const CAMPAIGN_STATUS_MEANING: Readonly<Record<CampaignStatus, string>> = {
  DRAFT: 'Being written. Not visible to a client approver.',
  READY_FOR_REVIEW: 'Submitted. Waiting on a named approver.',
  CHANGES_REQUESTED: 'An approver asked for changes. Back with the author.',
  APPROVED: 'A human approved this plan. No money has moved.',
  LAUNCH_PENDING: 'Approved and queued for a connector call. Not yet live.',
  LIVE: 'A connector call reported the campaign as serving.',
  PAUSED: 'Serving was stopped. Historical spend is preserved.',
  COMPLETED: 'Ended on its own end date.',
  FAILED: 'A connector call failed. The provider response is preserved.',
};

export type Campaign = {
  id: string;
  clientId: string;
  name: string;
  objective: CampaignObjective;
  platforms: CampaignPlatform[];
  /** Minor units (fils / piastres) to keep money off floating point. */
  budgetMinor: number;
  currency: CurrencyCode;
  startDate: string;
  endDate: string;
  locations: string[];
  languages: LanguageCode[];
  audienceNotes?: string;
  creativeSetIds: string[];
  landingPageUrl?: string;
  conversionTarget?: string;
  status: CampaignStatus;
  /**
   * Provider-side campaign id. Present only after a real connector call, which
   * is also the only way `status` can become `LIVE`.
   */
  remoteCampaignIds: Partial<Record<CampaignPlatform, string>>;
  origin: DataOrigin;
  createdAt: string;
  updatedAt: string;
};

/* ---------------------------------------------------------------- approval */

export type ApprovalDecision = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | 'WITHDRAW';

export type Approval = {
  id: string;
  /** What is being approved. Campaigns and content items both flow through here. */
  subjectType: 'CAMPAIGN' | 'CONTENT' | 'CREATIVE';
  subjectId: string;
  clientId: string;
  requestedBy: string;
  requestedAt: string;
  decision?: ApprovalDecision;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  /** The exact budget snapshot the approver saw. Approval is of a version. */
  budgetSnapshot?: { budgetMinor: number; currency: CurrencyCode; days: number; target: string };
};

/* -------------------------------------------------------------- community */

export type CommunityPlatform = 'facebook' | 'discord' | 'telegram' | 'whatsapp' | 'reddit' | 'directory';

/**
 * Verification of the *public metadata only*. This never asserts that posting
 * will be permitted, nor that the group is receptive — promotion policy is a
 * separate field for exactly that reason.
 */
export type CommunityVerification =
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'UNAVAILABLE'
  | 'BROKEN_LINK'
  | 'PRIVATE'
  | 'UNKNOWN';

export const COMMUNITY_VERIFICATIONS: readonly CommunityVerification[] = [
  'VERIFIED',
  'NEEDS_REVIEW',
  'UNAVAILABLE',
  'BROKEN_LINK',
  'PRIVATE',
  'UNKNOWN',
];

export type CommunityVisibility = 'PUBLIC' | 'PRIVATE' | 'UNKNOWN';

export type PromotionPolicy = 'ALLOWED' | 'ASK_ADMIN' | 'RESTRICTED' | 'UNKNOWN';

export type ActivityEstimate = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type Community = {
  id: string;
  name: string;
  platform: CommunityPlatform;
  /** Public entry point only. KNOuX never stores a member list or a private URL. */
  publicUrl?: string;
  country: CountryCode;
  region: string;
  city: string;
  category: string;
  language: LanguageCode;
  visibility: CommunityVisibility;
  activityEstimate: ActivityEstimate;
  promotionPolicy: PromotionPolicy;
  adminApprovalRequired: boolean;
  /**
   * An admin address the operator published in public for sponsorship or
   * partnership enquiries. Never scraped, never inferred, never a personal one.
   */
  publicAdminContact?: string;
  lastCheckedAt?: string;
  verificationStatus: CommunityVerification;
  notes?: string;
  relevanceTags: string[];
  businessCategories: string[];
  origin: DataOrigin;
  createdAt: string;
  updatedAt: string;
};

export type RelevanceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export type DistributionEntryStatus =
  | 'QUEUED'
  | 'NEEDS_APPROVAL'
  | 'POSTED'
  | 'SKIPPED'
  | 'BLOCKED';

export type DistributionEntry = {
  id: string;
  listId: string;
  communityId: string;
  contentId?: string;
  status: DistributionEntryStatus;
  postedAt?: string;
  postedBy?: string;
  skipReason?: string;
};

/**
 * A saved collection of destinations plus its manual-assisted posting queue.
 *
 * Facebook does not expose a general Groups API for arbitrary group
 * publishing, so this is deliberately a *human-in-the-loop* queue: KNOuX
 * prepares the post and the destination, the operator opens the group and
 * marks it posted. That is a product capability, not a workaround.
 */
export type DistributionList = {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  communityIds: string[];
  /** The prepared post that the queue distributes. */
  contentId?: string;
  entries: DistributionEntry[];
  createdAt: string;
  updatedAt: string;
};

export type CommunityFilter = {
  keywords?: string[];
  country?: CountryCode;
  region?: string;
  city?: string;
  language?: LanguageCode;
  platform?: CommunityPlatform;
  businessCategory?: string;
  verificationStatus?: CommunityVerification;
};

/* ------------------------------------------------------------------- leads */

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'BOOKED' | 'WON' | 'LOST';

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'BOOKED',
  'WON',
  'LOST',
];

export type LeadQualification = 'UNQUALIFIED' | 'QUALIFIED' | 'HOT';

/**
 * A normalised lead. Contact fields are present only where the source legally
 * and legitimately collected them — there is no enrichment step and no
 * fabricated contact detail anywhere in this product.
 */
export type Lead = {
  id: string;
  clientId: string;
  source: string;
  platform?: PlatformId;
  campaignId?: string;
  adId?: string;
  adName?: string;
  /** Provided by the platform because the user submitted the form. */
  name?: string;
  phone?: string;
  email?: string;
  occurredAt: string;
  status: LeadStatus;
  notes?: string;
  assignedTo?: string;
  qualification: LeadQualification;
  bookedAt?: string;
  /** Minor units, as with campaign budgets. */
  saleValueMinor?: number;
  currency?: CurrencyCode;
  origin: DataOrigin;
};

/* ---------------------------------------------------------------- creative */

export type CreativeFormat = 'IMAGE' | 'CAROUSEL' | 'SHORT_VIDEO' | 'REEL' | 'STORY' | 'RESPONSIVE_SEARCH';

export type CreativeDraft = {
  id: string;
  clientId: string;
  campaignId?: string;
  format: CreativeFormat;
  concept: string;
  hooks: string[];
  headline?: string;
  primaryText?: string;
  description?: string;
  cta?: string;
  visualPrompt?: string;
  videoScript?: string[];
  languages: LanguageCode[];
  /** A generated draft is never final until a human edits or accepts it. */
  aiGenerated: boolean;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  origin: DataOrigin;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------------------------------------------- content */

export type ContentStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'APPROVAL_REQUIRED';

/**
 * Content is never published by this build. `PUBLISHED` can only be set by a
 * connector call that a human approved, so during development it is unreachable
 * in practice — which is the correct posture.
 */
export type ContentItem = {
  id: string;
  clientId: string;
  campaignId?: string;
  platforms: PlatformId[];
  copy: string;
  mediaAssetIds: string[];
  /** ISO date. Scheduling is a record of intent, not a publish trigger here. */
  scheduledFor?: string;
  status: ContentStatus;
  approvalId?: string;
  author: string;
  aiGenerated: boolean;
  origin: DataOrigin;
  createdAt: string;
  updatedAt: string;
};

/* --------------------------------------------------------------- analytics */

/**
 * Canonical cross-platform metrics.
 *
 * Every field is optional-by-construction and sourced, because providers do not
 * agree: Meta reports `reach` and does not report `revenue`; Google Ads reports
 * `revenue` and does not report `reach` for Search. A missing metric stays
 * missing. It is never zero, and never derived from an unrelated one.
 */
export type CanonicalMetrics = {
  spend?: Sourced<number>;
  impressions?: Sourced<number>;
  reach?: Sourced<number>;
  clicks?: Sourced<number>;
  leads?: Sourced<number>;
  qualifiedLeads?: Sourced<number>;
  calls?: Sourced<number>;
  whatsappStarts?: Sourced<number>;
  bookings?: Sourced<number>;
  sales?: Sourced<number>;
  revenue?: Sourced<number>;
};

/** Metrics computed from canonical ones. Null when an input is unavailable. */
export type DerivedMetrics = {
  ctr: Sourced<number> | null;
  cpc: Sourced<number> | null;
  cpm: Sourced<number> | null;
  roas: Sourced<number> | null;
  costPerLead: Sourced<number> | null;
  costPerQualifiedLead: Sourced<number> | null;
  costPerBooking: Sourced<number> | null;
};

/** One row of the cross-platform performance table. */
export type PerformanceRow = {
  key: string;
  clientId: string;
  campaignId?: string;
  platformLabel: string;
  metrics: CanonicalMetrics;
  derived: DerivedMetrics;
};

/* -------------------------------------------------------- google presence */

export type GooglePresenceMetric = {
  key: string;
  label: string;
  value?: Sourced<number>;
  /** Explains a gap rather than hiding it. */
  unavailableReason?: string;
};

export type GoogleLocation = {
  id: string;
  clientId: string;
  name: string;
  addressLine: string;
  city: string;
  /** Set only by a live Business Profile API read. */
  googleLocationId?: string;
  category?: string;
  rating?: Sourced<number>;
  reviewCount?: Sourced<number>;
  websiteClicks?: Sourced<number>;
  directionRequests?: Sourced<number>;
  calls?: Sourced<number>;
  origin: DataOrigin;
};

/* ------------------------------------------------------------- connections */

export type Connection = {
  id: string;
  clientId: string;
  platform: PlatformId;
  state: ConnectionState;
  /** Never the token. A display handle is safe; a secret is not. */
  accountLabel?: string;
  /** Never the token. */
  accountId?: string;
  grantedScopes?: string[];
  missingScopes?: string[];
  lastVerifiedAt?: string;
  /** Verbatim provider message on failure. Preserved, never rewritten. */
  lastError?: string;
  capabilityState: CapabilityState;
  origin: DataOrigin;
  updatedAt: string;
};

/* ------------------------------------------------------------- automation */

export type AutomationTrigger =
  | 'CAMPAIGN_CPL_ABOVE'
  | 'CAMPAIGN_SPEND_ABOVE'
  | 'LEAD_RECEIVED'
  | 'CONTENT_NEEDS_APPROVAL'
  | 'COMMUNITY_URL_UNAVAILABLE'
  | 'CONNECTION_EXPIRED'
  | 'REVIEW_RECEIVED';

export type AutomationActionKind =
  | 'FLAG_FOR_REVIEW'
  | 'CREATE_APPROVAL_TASK'
  | 'ROUTE_TO_PIPELINE'
  | 'RAISE_ALERT'
  | 'MARK_NEEDS_REVIEW';

/**
 * A rule is deliberately incapable of spending. Every action kind is either an
 * annotation, an alert, a task, or a routing change. There is deliberately no
 * action kind that pauses, adjusts, or launches a campaign — an unbounded
 * ad-spend path is what the mission forbids, and the type system is where that
 * is enforced rather than a comment.
 */
export type AutomationRule = {
  id: string;
  clientId: string;
  name: string;
  trigger: AutomationTrigger;
  threshold?: number;
  action: AutomationActionKind;
  enabled: boolean;
  /** Every rule is capped at advisory risk; the type forbids otherwise. */
  risk: RiskLevel;
  createdAt: string;
};

/* ------------------------------------------------------------------- audit */

export type AuditAction =
  | 'CONNECTION_CREATED'
  | 'CONNECTION_REMOVED'
  | 'CAMPAIGN_SUBMITTED'
  | 'CAMPAIGN_APPROVED'
  | 'CAMPAIGN_CHANGED'
  | 'CAMPAIGN_LAUNCH_REQUESTED'
  | 'BUDGET_CHANGED'
  | 'CONTENT_APPROVED'
  | 'COMMUNITY_POST_DISTRIBUTED'
  | 'AI_RECOMMENDATION_ACCEPTED';

export type AuditEntry = {
  id: string;
  clientId: string;
  action: AuditAction;
  actor: string;
  subjectType: string;
  subjectId: string;
  at: string;
  /** What changed, in facts. No secrets are ever recorded. */
  detail?: string;
};