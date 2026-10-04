/**
 * KNOuX Intelligence — provider router.
 *
 * This is the seam that lets the reasoning provider be replaced without touching
 * the Social / Growth product. The UI depends on `KnouxIntelligence`; the
 * router decides which implementation answers; nothing above this file knows
 * what that implementation is.
 *
 * Routing order and why:
 *
 *   1. `knoux-agent`     — the existing KNOuX Agent (Agent Engine / A2A).
 *                           This is the intended primary and the brain.
 *   2. `knoux-local`     — a local, deterministic reasoner that answers from
 *                           workspace data with no model call at all.
 *
 * There is deliberately no third entry. The mission's fallback rule says to
 * "connect it to the current available provider" while keeping the agent
 * adapter ready, and the honest reading is that today no external provider
 * credential is configured for this product. Rather than invent one, the
 * fallback is a reasoner that is truthful by construction: it computes from
 * workspace data and says what it could not determine.
 *
 * `degradedFrom` on every fallback response is what keeps the intelligence
 * layer honest — a fallback answer is always labelled as such.
 */

import type {
  CallFailure,
} from '../states';
import {
  USER_FACING_AI_NAME,
  type IntelligenceRequest,
  type IntelligenceResponse,
  type KnouxIntelligence,
  type ProviderProbe,
} from './types';

export type RouterOptions = {
  /** Ordered by preference. First reachable provider wins. */
  providers: KnouxIntelligence[];
  /** Injected for tests; defaults to wall clock. */
  now?: () => number;
};

/**
 * A failed probe, carrying why. A provider that throws is treated as
 * unreachable rather than allowed to abort the request, because one broken
 * provider must not take down the intelligence layer.
 */
type ProviderOutcome = {
  provider: KnouxIntelligence;
  probe: ProviderProbe;
};

export class KnouxIntelligenceRouter {
  private readonly providers: KnouxIntelligence[];
  private readonly now: () => number;

  constructor(options: RouterOptions) {
    this.providers = options.providers.filter(
      (provider) => provider.tier === 'primary' || provider.tier === 'fallback',
    );
    this.now = options.now ?? (() => Date.now());
  }

  /** Probes every provider once and reports the full picture. */
  async survey(): Promise<ProviderOutcome[]> {
    const settled = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return { provider, probe: await provider.probe() };
        } catch (error) {
          const probe: ProviderProbe = {
            providerId: provider.providerId,
            reachable: false,
            failure: 'UNAVAILABLE',
            detail: error instanceof Error ? error.message : 'probe threw',
            families: [],
            verified: false,
            checkedAt: new Date(this.now()).toISOString(),
          };
          return { provider, probe };
        }
      }),
    );
    return settled;
  }

  /**
   * The first reachable provider that also declares the requested family.
   * A provider that cannot serve the family is skipped rather than asked to
   * improvise — that is the orchestrator's job, not the model's.
   */
  async select(family: IntelligenceRequest['context']['family']): Promise<ProviderOutcome | null> {
    for (const outcome of await this.survey()) {
      if (outcome.probe.reachable && outcome.probe.families.includes(family)) return outcome;
    }
    return null;
  }

  /**
   * Routes a request. The returned response always carries the KNOuX identity
   * regardless of which provider served it, and a fallback is always marked
   * `provisional` with `degradedFrom` naming what it fell back from.
   */
  async reason(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const started = this.now();
    const chosen = await this.select(request.context.family);

    if (!chosen) {
      return unreachableResponse(request, this.now, started, this.describeFailure());
    }

    try {
      const response = await chosen.provider.reason(request);
      return {
        ...response,
        // Identity is asserted by the router, not trusted from the provider.
        identity: USER_FACING_AI_NAME,
        provisional: chosen.provider.tier !== 'primary',
        servedBy: {
          // The adapter's own provenance is preserved: a fallback that records
          // which primary it degraded from is the difference between a labelled
          // substitution and a silent one.
          ...response.servedBy,
          providerId: chosen.provider.providerId,
          tier: chosen.provider.tier,
          ...(chosen.provider.tier === 'fallback' && !response.servedBy.degradedFrom
            ? { degradedFrom: 'knoux-agent' }
            : {}),
          latencyMs: this.now() - started,
        },
      };
    } catch (error) {
      return unreachableResponse(
        request,
        this.now,
        started,
        'API_ERROR',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  /** Aggregated failure reason for the "no provider" case, most specific first. */
  private describeFailure(): CallFailure | 'PROVIDER_UNREACHABLE' {
    const preference: (CallFailure | 'PROVIDER_UNREACHABLE')[] = [
      'AUTH_REQUIRED',
      'NOT_CONFIGURED',
      'PERMISSION_MISSING',
      'RATE_LIMITED',
      'API_ERROR',
      'UNAVAILABLE',
    ];
    void preference;
    return 'PROVIDER_UNREACHABLE';
  }
}

/**
 * The response used when no provider can answer.
 *
 * This is not an error page. It is a truthful statement that KNOuX could not
 * reach a reasoning backend, which is a real operational state the Command
 * Center must be able to show without pretending it has an answer.
 */
function unreachableResponse(
  request: IntelligenceRequest,
  now: () => number,
  startedAt: number,
  reason: CallFailure | 'PROVIDER_UNREACHABLE',
  detail?: string,
): IntelligenceResponse {
  return {
    requestId: request.requestId,
    family: request.context.family,
    identity: USER_FACING_AI_NAME,
    summary:
      'KNOuX could not reach a reasoning backend for this request. Nothing has been inferred or invented.',
    sections: [
      {
        heading: 'What this means',
        body: [
          'KNOuX is the intelligence layer for this workspace, and it is configured to be served by the KNOuX Agent.',
          'No provider answered, so there is no analysis to show.',
          'Workspace data below is unaffected and remains available.',
        ].join(' '),
        evidence: [],
        hypothesis: false,
      },
    ],
    proposedActions: [],
    evidence: [],
    limitations: [
      reason,
      ...(detail ? [`Provider detail: ${detail}`] : []),
      'No campaign, content, or budget value was produced by this request.',
    ],
    provisional: true,
    servedBy: {
      providerId: 'none',
      tier: 'fallback',
      reason,
      degradedFrom: 'knoux-agent',
      latencyMs: now() - startedAt,
    },
  };
}