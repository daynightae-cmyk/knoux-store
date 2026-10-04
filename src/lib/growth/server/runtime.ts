import 'server-only';

/**
 * KNOuX Growth — server-side runtime assembly.
 *
 * Reads provider and agent configuration from the server environment and builds
 * the router. It is the single place where a credential is turned into a usable
 * provider, which is what keeps `process.env` out of the component tree.
 *
 * The router is constructed per request rather than cached at module scope so
 * that a rotated credential takes effect without a redeploy, and so a test can
 * inject an environment without mutating global state.
 */

import { KnouxIntelligenceRouter } from '../intelligence/router';
import { KnouxAgentIntelligence } from '../intelligence/adapters/knoux-agent';
import { KnouxLocalIntelligence } from '../intelligence/adapters/local';
import type { KnouxIntelligence } from '../intelligence/types';
import { DEMO_PERFORMANCE_ROWS } from '@/data/growth/workspace';
import { DEMO_COMMUNITIES } from '@/data/growth/communities';

/**
 * Builds the provider chain in preference order.
 *
 * The KNOuX Agent is first and is the intended primary. The local reasoner is
 * the documented fallback that keeps the product usable while the agent runtime
 * is blocked — which, at the time of writing, it is: the deployed endpoint and
 * its credential are both absent from this environment, so `KnouxAgentIntelligence`
 * probes as NOT_CONFIGURED and the router moves on. That is the bounded-repair
 * outcome, not a silent substitution: every fallback response carries
 * `degradedFrom: 'knoux-agent'` and is labelled provisional in the UI.
 */
export function buildRouter(env: Record<string, string | undefined> = process.env): KnouxIntelligenceRouter {
  const providers: KnouxIntelligence[] = [
    new KnouxAgentIntelligence({
      ...(env.KNOUX_AGENT_ENDPOINT ? { endpointUrl: env.KNOUX_AGENT_ENDPOINT } : {}),
      ...(env.KNOUX_AGENT_TOKEN ? { bearerToken: env.KNOUX_AGENT_TOKEN } : {}),
      ...(env.KNOUX_AGENT_RESOURCE ? { resourceName: env.KNOUX_AGENT_RESOURCE } : {}),
      ...(env.KNOUX_AGENT_TIMEOUT_MS
        ? { timeoutMs: Number(env.KNOUX_AGENT_TIMEOUT_MS) }
        : {}),
    }),
    new KnouxLocalIntelligence({
      snapshot: {
        performanceRows: [...DEMO_PERFORMANCE_ROWS],
        communities: [...DEMO_COMMUNITIES],
      },
    }),
  ];

  return new KnouxIntelligenceRouter({ providers });
}

/**
 * The workspace snapshot the local reasoner reads.
 *
 * Until a workspace is loaded from storage it is the demo fixture set. When the
 * Supabase-backed repository lands, this is the single seam that changes — the
 * reasoner itself is already a pure function of its snapshot.
 */
export function currentSnapshot() {
  return {
    performanceRows: [...DEMO_PERFORMANCE_ROWS],
    communities: [...DEMO_COMMUNITIES],
  };
}