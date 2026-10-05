/**
 * KNOuX Intelligence — the one interface.
 *
 * This file defines the only surface the KNOuX Social Command Center is allowed
 * to reason through. Nothing in `src/app/command/**` or `src/components/command`
 * imports a model SDK, names a model vendor, or knows which provider answered.
 *
 * The identity contract, from the mission and from
 * `01-KNOUX-Identity-and-Mission.txt`:
 *
 *   - The user experiences ONE intelligence, called KNOuX.
 *   - The reasoning provider underneath is replaceable infrastructure.
 *   - KNOuX is not a generic chatbot and may not invent state.
 *
 * So the request/response shapes carry *which intelligence family* was engaged
 * and *which provider served it* as metadata for operations — while the user
 * facing language is fixed to KNOuX in `provider-identity.ts`. A provider name
 * is never a product surface.
 */

import type { AutonomyMode, CallFailure, RiskLevel } from '../states';

/* ------------------------------------------------------- intelligence family */

/**
 * The intelligence families KNOuX orchestrates.
 *
 * `REPAIR` is first and is not modified by this work. The Growth families are
 * additions to the same orchestrator, exactly as the architecture requires —
 * Repair intelligence remains the existing one and is not reimplemented here.
 */
export const INTELLIGENCE_FAMILIES = [
  'REPAIR',
  'GROWTH',
  'SOCIAL',
  'ADVERTISING',
  'COMMUNITY',
  'ANALYTICS',
] as const;

export type IntelligenceFamily = (typeof INTELLIGENCE_FAMILIES)[number];

export const FAMILY_MEANING: Readonly<Record<IntelligenceFamily, string>> = {
  REPAIR:
    'The existing KNOuX Repair forensic intelligence. Not extended, duplicated, or replaced by this product.',
  GROWTH: 'Client context, campaign architecture, and budget planning under approval.',
  SOCIAL: 'Organic social craft: content, community tone, and distribution preparation.',
  ADVERTISING: 'Paid campaign construction across Meta and Google, held for approval before any spend.',
  COMMUNITY: 'Public community discovery, verification, and manual-assisted distribution.',
  ANALYTICS: 'Cross-platform normalisation and evidence-based performance explanation.',
};

/* ------------------------------------------------------------------ context */

/**
 * What KNOuX knows about the request. This is what makes KNOuX contextual
 * instead of a generic chat box: the Command Center assembles it from the
 * selected client, page, and entities in view.
 */
export type IntelligenceContext = {
  family: IntelligenceFamily;
  /** Client workspace in view, when one is. */
  clientId?: string;
  clientName?: string;
  /** The surface the operator is looking at, e.g. 'campaigns' or 'community-hub'. */
  surface?: string;
  /** Concrete subject: the campaign, community list, or report in view. */
  subjectId?: string;
  /** Operator role, so KNOuX respects the same authority the UI does. */
  actorRole?: string;
  /** The client's confirmed facts and forbidden claims. Injected into prompts. */
  brandFacts?: string[];
  forbiddenClaims?: string[];
  /** Budget ceiling for this client in minor units, when planning spend. */
  budgetCeilingMinor?: number;
  currency?: string;
  autonomy: AutonomyMode;
};

/* --------------------------------------------------------------- requests */

export type IntelligenceIntent =
  | 'EXPLAIN'
  | 'ANALYZE_PERFORMANCE'
  | 'FIND_AUDIENCES'
  | 'PLAN_CAMPAIGN'
  | 'DRAFT_CREATIVE'
  | 'DRAFT_CONTENT'
  | 'FIND_COMMUNITIES'
  | 'PLAN_DISTRIBUTION'
  | 'QUALIFY_LEADS'
  | 'GENERATE_REPORT'
  | 'RESEARCH'
  | 'BUILD_LANDING_PAGE';

export const INTELLIGENCE_INTENTS: readonly IntelligenceIntent[] = [
  'EXPLAIN',
  'ANALYZE_PERFORMANCE',
  'FIND_AUDIENCES',
  'PLAN_CAMPAIGN',
  'DRAFT_CREATIVE',
  'DRAFT_CONTENT',
  'FIND_COMMUNITIES',
  'PLAN_DISTRIBUTION',
  'QUALIFY_LEADS',
  'GENERATE_REPORT',
  'RESEARCH',
  'BUILD_LANDING_PAGE',
];

/** Command-dock actions the mission lists. Each maps onto exactly one intent. */
export type IntelligenceRequest = {
  requestId: string;
  intent: IntelligenceIntent;
  prompt: string;
  context: IntelligenceContext;
  /** Optional structured inputs, e.g. campaign fields or filter values. */
  inputs?: Record<string, unknown>;
};

/* --------------------------------------------------------------- responses */

/**
 * Evidence citation. The KNOuX evidence-first rule means every assertion the
 * intelligence makes about a client or platform carries where it came from, and
 * an unevidenced claim is a defect rather than a style issue.
 */
export type Evidence = {
  /** Capability id, dataset name, or artifact path. */
  source: string;
  /** True only when the source was a real provider call. */
  live: boolean;
  detail?: string;
};

/**
 * A proposed action. KNOuX may *propose*; execution is a separate, gated step.
 * `risk` is what the approval model reads, and at level >= 2 it can never be
 * executed without a named human's approval.
 */
export type ProposedAction = {
  actionId: string;
  family: IntelligenceFamily;
  label: string;
  /** Machine-readable intent, e.g. `campaign.create` or `community.queue_post`. */
  kind: string;
  risk: RiskLevel;
  /** Why KNOuX proposes this. Rendered verbatim next to the action. */
  rationale: string;
  /** Targets this would touch, so a human can see the blast radius. */
  targets: string[];
  /** Populated only when the action would spend or publish. */
  spendMinor?: number;
  currency?: string;
  requiresApproval: boolean;
};

export type IntelligenceSection = {
  heading: string;
  body: string;
  evidence: Evidence[];
  /** True when the section is a hypothesis rather than an established fact. */
  hypothesis?: boolean;
};

/**
 * The response contract.
 *
 * `provisional` is the field that carries the product's honesty: when the
 * intelligence could not reach a verified provider or a configured agent, it
 * says so and the UI renders the answer as unverified rather than as an answer.
 */
export type IntelligenceResponse = {
  requestId: string;
  family: IntelligenceFamily;
  /** The user-facing name. Always KNOuX. Never a provider. */
  identity: string;
  summary: string;
  sections: IntelligenceSection[];
  proposedActions: ProposedAction[];
  evidence: Evidence[];
  /** Everything KNOuX could not establish. Rendered, never hidden. */
  limitations: string[];
  /**
   * True when the response came from a provider that is not the primary KNOuX
   * agent — for example the local deterministic reasoner. The UI labels these.
   */
  provisional: boolean;
  /** Operational provenance. Never displayed as product identity. */
  servedBy: ProviderProvenance;
  citations?: { label: string; href: string }[];
};

/**
 * Which provider actually served a request.
 *
 * This is an operational fact used for the Intelligence screen and for
 * `docs/growth/KNOUX-AI-INTEGRATION.md`. It is not rendered as a product
 * identity anywhere in the Command Center.
 */
export type ProviderProvenance = {
  providerId: string;
  /** `primary` is the KNOuX Agent. Anything else is a documented fallback. */
  tier: 'primary' | 'fallback';
  /** Set when the primary was attempted and did not answer. */
  degradedFrom?: string;
  reason?: CallFailure | 'PROVIDER_UNREACHABLE' | 'NOT_CONFIGURED';
  latencyMs?: number;
};

/* ---------------------------------------------------------------- interface */

/**
 * The one contract. Every provider implements it; the router picks one; the UI
 * knows only this.
 *
 * Implementations must honour:
 *  - `identity` is always `KNOuX` in the response, whatever the provider is.
 *  - `forbiddenClaims` from context must never appear in generated copy.
 *  - `limitations` must be populated whenever something could not be verified.
 */
export interface KnouxIntelligence {
  readonly providerId: string;
  readonly tier: 'primary' | 'fallback';
  readonly userFacingName: string;

  /** Cheap liveness + identity check. Must not fabricate a pass. */
  probe(): Promise<ProviderProbe>;

  reason(request: IntelligenceRequest): Promise<IntelligenceResponse>;
}

export type ProviderProbe = {
  providerId: string;
  reachable: boolean;
  /** Set when not reachable. One of the CallFailure values. */
  failure?: CallFailure;
  detail?: string;
  /** Capabilities this provider can serve today. */
  families: IntelligenceFamily[];
  /** True when a real round trip completed. */
  verified: boolean;
  checkedAt: string;
};

export const USER_FACING_AI_NAME = 'KNOuX';

/** Names that must never appear as a product surface in the Command Center. */
export const FORBIDDEN_PROVIDER_IDENTITIES = [
  'Gemini Assistant',
  'Google AI',
  'OpenAI Assistant',
  'Claude',
] as const;

/**
 * Guard used by the UI and by tests: the user-facing identity is KNOuX and only
 * KNOuX. This exists because the requirement is a naming rule, and naming rules
 * are only real when something enforces them.
 */
export function isAcceptableIdentity(name: string): boolean {
  const normalised = name.trim().toUpperCase();
  if (normalised !== USER_FACING_AI_NAME.toUpperCase()) return false;
  return !FORBIDDEN_PROVIDER_IDENTITIES.some((forbidden) =>
    normalised.includes(forbidden.toUpperCase()),
  );
}