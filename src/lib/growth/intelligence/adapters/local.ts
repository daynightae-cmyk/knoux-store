/**
 * KNOuX Intelligence — local deterministic reasoner (fallback).
 *
 * This exists because the mission says the Growth product must not depend on
 * finishing a proprietary or externally-hosted model, and because a UI whose
 * assistant is dead when a cloud endpoint is down is not an operating system.
 *
 * It is not a chatbot and it does not pretend to be a language model. It reads
 * the workspace facts it is given and performs real arithmetic and real
 * ranking, then states what it could not determine. Its answers are computed,
 * never generated, which is why it can be trusted for the things it says while
 * still being visibly limited on the things it cannot do.
 *
 * Its responses are always marked `provisional` by the router, because it is a
 * fallback tier — the Command Center labels them accordingly.
 */

import { formatMetric } from '../../metrics';
import type { CanonicalMetrics, Community, PerformanceRow } from '../../types';
import type {
  Evidence,
  IntelligenceFamily,
  IntelligenceRequest,
  IntelligenceResponse,
  KnouxIntelligence,
  ProviderProbe,
} from '../types';
import { USER_FACING_AI_NAME } from '../types';

/**
 * The workspace snapshot the reasoner reasons over. It is passed in rather than
 * imported so the reasoner stays a pure function of its inputs and is testable
 * without a database.
 */
export type LocalWorkspaceSnapshot = {
  performanceRows: PerformanceRow[];
  communities: Community[];
  /** Headline spend per currency, as canonical metrics already normalised. */
  totals?: CanonicalMetrics;
};

export type LocalReasonerConfig = {
  snapshot: LocalWorkspaceSnapshot;
  now?: () => number;
};

export class KnouxLocalIntelligence implements KnouxIntelligence {
  readonly providerId = 'knoux-local';
  readonly tier = 'fallback' as const;
  readonly userFacingName = USER_FACING_AI_NAME;

  private readonly snapshot: LocalWorkspaceSnapshot;
  private readonly now: () => number;

  constructor(config: LocalReasonerConfig) {
    this.snapshot = config.snapshot;
    this.now = config.now ?? (() => Date.now());
  }

  async probe(): Promise<ProviderProbe> {
    // Always reachable: it is local computation with no network dependency.
    return {
      providerId: this.providerId,
      reachable: true,
      families: ['GROWTH', 'SOCIAL', 'ADVERTISING', 'COMMUNITY', 'ANALYTICS'],
      verified: true,
      detail: 'Local deterministic reasoner. Computes from workspace data; does not call a model.',
      checkedAt: new Date(this.now()).toISOString(),
    };
  }

  async reason(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const { context, intent } = request;

    switch (intent) {
      case 'ANALYZE_PERFORMANCE':
        return this.analysePerformance(request);
      case 'FIND_COMMUNITIES':
        return this.findCommunities(request);
      case 'PLAN_DISTRIBUTION':
        return this.planDistribution(request);
      case 'PLAN_CAMPAIGN':
        return this.planCampaign(request);
      default:
        return this.explainCapability(request);
    }
  }

  /* ------------------------------------------------------- analytics family */

  private analysePerformance(request: IntelligenceRequest): IntelligenceResponse {
    const rows = this.snapshot.performanceRows;
    const evidence: Evidence[] = rows.map((row) => ({
      source: row.platformLabel,
      live: row.metrics.spend?.origin === 'LIVE',
      detail: row.campaignId ? `campaign ${row.campaignId}` : 'account level',
    }));

    if (rows.length === 0) {
      return this.base(request, 'No provider data is available to analyse.', [], [
        'No campaign performance rows are present for this workspace.',
      ]);
    }

    // Ranking is over computed cost-per-lead. Rows without a lead count are
    // excluded rather than treated as best, which would invert the answer.
    const ranked = rows
      .map((row) => ({ row, cpl: row.derived.costPerLead }))
      .filter((entry): entry is { row: PerformanceRow; cpl: NonNullable<PerformanceRow['derived']['costPerLead']> } =>
        entry.cpl !== null,
      )
      .sort((a, b) => a.cpl.value - b.cpl.value);

    const comparable = ranked.filter((entry) => entry.cpl.origin === 'LIVE');
    const best = comparable[0];
    const worst = comparable[comparable.length - 1];

    const sections = [
      {
        heading: 'What the data supports',
        body: best
          ? `Across ${comparable.length} platform row(s) reporting a cost per lead, ${best.row.platformLabel} is currently the lowest at ${formatMetric(best.cpl, { kind: 'currency' }).text}.` +
            (worst && worst !== best
              ? ` ${worst.row.platformLabel} is the highest at ${formatMetric(worst.cpl, { kind: 'currency' }).text}.`
              : '')
          : 'No platform row reported a cost per lead, so no platform can be ranked on it.',
        evidence,
        hypothesis: false,
      },
      {
        heading: 'What cannot be concluded',
        body:
          'Platforms that do not report a comparable denominator are absent from the ranking rather than estimated. A row missing spend, leads, or revenue is not evidence of good or poor performance.',
        evidence: [],
        hypothesis: false,
      },
    ];

    const limitations = [
      'This is a deterministic summary of workspace data, not a model analysis.',
      'Revenue and ROAS are shown only where a provider actually reported revenue.',
    ];

    if (comparable.length === 0) {
      limitations.push('No LIVE-sourced cost-per-lead was available, so the comparison is fixture-only.');
    }

    return this.base(
      request,
      best
        ? `${best.row.platformLabel} currently has the lowest reported cost per lead.`
        : 'There is not enough verified data to rank platforms.',
      sections,
      limitations,
      evidence,
    );
  }

  /* ------------------------------------------------------ community family */

  private findCommunities(request: IntelligenceRequest): IntelligenceResponse {
    const terms = (request.inputs?.keywords as string[] | undefined) ?? [];
    const city = request.inputs?.city as string | undefined;

    const scored = this.snapshot.communities
      .map((community) => ({ community, score: scoreCommunity(community, terms, city) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const bands = {
      high: scored.filter((entry) => entry.score >= 60),
      medium: scored.filter((entry) => entry.score >= 30 && entry.score < 60),
      low: scored.filter((entry) => entry.score < 30),
    };

    const body = [
      bands.high.length > 0
        ? `High relevance: ${bands.high.map((e) => e.community.name).join(', ')}.`
        : 'High relevance: none matched.',
      bands.medium.length > 0
        ? `Medium relevance: ${bands.medium.map((e) => e.community.name).join(', ')}.`
        : 'Medium relevance: none matched.',
      bands.low.length > 0
        ? `Low relevance: ${bands.low.map((e) => e.community.name).join(', ')}.`
        : 'Low relevance: none matched.',
    ].join(' ');

    return this.base(
      request,
      scored.length === 0
        ? 'No community in the workspace matched these terms.'
        : `${scored.length} community record(s) matched, ranked by relevance.`,
      [
        {
          heading: 'Discovery result',
          body,
          evidence: [
            {
              source: 'community registry',
              live: false,
              detail: 'Ranked from stored community records, not from a live scrape.',
            },
          ],
        },
        {
          heading: 'How these will be used',
          body:
            'Ranked communities become a manual-assisted posting queue. KNOuX prepares the post and the destination; a person opens the group and marks it posted. No member list is read and no message is sent automatically.',
          evidence: [],
        },
      ],
      [
        'Community metadata here is stored state, not a live verification of the group today.',
        'Promotion policy and admin approval requirements differ per community and must be checked before posting.',
        'A match is a relevance score over stored fields, not a judgement that the group will accept promotion.',
      ],
    );
  }

  private planDistribution(request: IntelligenceRequest): IntelligenceResponse {
    const listId = (request.inputs?.distributionListId as string | undefined) ?? 'unknown';
    return this.base(
      request,
      `A distribution run for list ${listId} is prepared, not executed.`,
      [
        {
          heading: 'Distribution plan',
          body:
            'Each destination in the list becomes one queue entry with its own promotion policy and approval requirement. Entries whose community requires admin approval are held as NEEDS_APPROVAL rather than queued.',
          evidence: [],
        },
      ],
      [
        'KNOuX cannot post into these groups automatically; no general Groups API exists for it.',
        'Nothing has been posted, queued at a provider, or marked as distributed.',
      ],
    );
  }

  /* ---------------------------------------------------------- growth family */

  private planCampaign(request: IntelligenceRequest): IntelligenceResponse {
    const ceiling = request.context.budgetCeilingMinor;
    const currency = request.context.currency ?? 'AED';

    return this.base(
      request,
      'A campaign plan requires a connected ad account before it can be costed.',
      [
        {
          heading: 'Planning constraints',
          body: [
            ceiling !== undefined
              ? `The client budget ceiling is ${currency} ${(ceiling / 100).toFixed(2)}. Any plan above that requires an explicit override with a reason.`
              : 'No budget ceiling is recorded for this client, so a plan cannot be checked against one.',
            'A plan is a draft. It reaches APPROVED only through a named human, and reaches LIVE only through an approved connector call.',
          ].join(' '),
          evidence: [],
        },
      ],
      [
        'No spend, campaign, or bid was created by this request.',
        'Live campaign costs cannot be produced without a connected Meta or Google Ads account.',
      ],
    );
  }

  /* ------------------------------------------------------------- fallback */

  private explainCapability(request: IntelligenceRequest): IntelligenceResponse {
    return this.base(
      request,
      'The local reasoner handles measurement, discovery and planning. It does not generate copy.',
      [
        {
          heading: 'What this answer can and cannot do',
          body:
            'It ranks stored community records, computes canonical metrics and compares platforms. Generating creative copy, content drafts, or a written report needs a language-model provider, which is currently the KNOuX Agent.',
          evidence: [],
        },
      ],
      [
        'No provider-generated text is available for this intent on the fallback tier.',
        'The KNOuX Agent is the intended provider for generation intents and is recorded as unavailable in the Intelligence view.',
      ],
    );
  }

  private base(
    request: IntelligenceRequest,
    summary: string,
    sections: IntelligenceResponse['sections'],
    limitations: string[],
    evidence: Evidence[] = [],
  ): IntelligenceResponse {
    return {
      requestId: request.requestId,
      family: request.context.family,
      identity: USER_FACING_AI_NAME,
      summary,
      sections,
      proposedActions: [],
      evidence,
      limitations,
      provisional: true,
      servedBy: { providerId: this.providerId, tier: 'fallback', degradedFrom: 'knoux-agent' },
    };
  }
}

/**
 * Relevance scoring over stored community fields.
 *
 * Deliberately shallow and explainable: it counts tag and category overlap and
 * a city match. It does not attempt semantic similarity, because a score that
 * cannot be explained to an operator is a score they will not act on.
 */
export function scoreCommunity(community: Community, terms: string[], city?: string): number {
  let score = 0;
  const haystack = [
    community.name,
    community.category,
    community.region,
    community.city,
    ...community.relevanceTags,
    ...community.businessCategories,
  ]
    .join(' ')
    .toLowerCase();

  for (const term of terms) {
    const needle = term.trim().toLowerCase();
    if (!needle) continue;
    if (community.name.toLowerCase().includes(needle)) score += 40;
    else if (community.relevanceTags.some((tag) => tag.toLowerCase().includes(needle))) score += 25;
    else if (haystack.includes(needle)) score += 15;
  }

  if (city && community.city.toLowerCase() === city.trim().toLowerCase()) score += 20;

  // Promotion-relevant facts move a community up: an open group a business can
  // actually post in is more useful than a busy private one.
  if (community.visibility === 'PUBLIC') score += 10;
  if (community.promotionPolicy === 'ALLOWED') score += 10;
  if (community.promotionPolicy === 'RESTRICTED') score -= 15;
  if (!community.adminApprovalRequired) score += 5;

  return Math.max(0, score);
}

export const FAMILY_SUPPORTED_BY_LOCAL: readonly IntelligenceFamily[] = [
  'GROWTH',
  'SOCIAL',
  'ADVERTISING',
  'COMMUNITY',
  'ANALYTICS',
];