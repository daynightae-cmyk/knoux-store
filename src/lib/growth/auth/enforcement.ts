/**
 * Deployment switches for the Growth boundaries.
 *
 * `growthAuthEnforced` is the tenant boundary: it selects which workspace the
 * Command Center serves for this request and which principal-scoped API calls
 * may run. Enforcement is opt-in while the persistence layer is being
 * provisioned, because the public fixture Command Center is designed to stay
 * reviewable without a real principal. Selecting a durable data source always
 * enables it — an explicit `false` cannot bypass that.
 *
 * Production carries a second, non-negotiable boundary: where a configured
 * agent exists in a `VERCEL_ENV=production` deployment,
 * `growthAgentBoundaryRequired` returns true regardless of the flag. A
 * forgotten `KNOUX_GROWTH_AUTH_ENFORCED=false` therefore cannot make
 * agent-backed calls publicly callable there, which is what would spend the
 * deployment's real agent budget. The labelled demo workspace itself stays
 * reviewable in production, because a deployment with no live provider to
 * protect has nothing for the boundary to guard.
 */
export type GrowthAuthEnvironment = Record<string, string | undefined> & {
  KNOUX_GROWTH_AUTH_ENFORCED?: string;
  KNOUX_GROWTH_DATA_SOURCE?: string;
  VERCEL_ENV?: string;
  KNOUX_AGENT_ENDPOINT?: string;
  KNOUX_AGENT_TOKEN?: string;
};

function agentCallable(env: GrowthAuthEnvironment): boolean {
  return Boolean(env.KNOUX_AGENT_ENDPOINT?.trim() || env.KNOUX_AGENT_TOKEN?.trim());
}

export function growthAuthEnforced(
  env: GrowthAuthEnvironment = process.env,
): boolean {
  // Selecting durable client data always enables auth; an explicit false cannot bypass it.
  if (env.KNOUX_GROWTH_DATA_SOURCE?.trim().toLowerCase() === 'supabase') return true;
  return env.KNOUX_GROWTH_AUTH_ENFORCED?.trim().toLowerCase() === 'true';
}

export function growthAgentBoundaryRequired(
  env: GrowthAuthEnvironment = process.env,
): boolean {
  if (growthAuthEnforced(env)) return true;
  // Outside production the flag is honoured exactly as documented.
  if (env.VERCEL_ENV !== 'production') return false;
  // Production fails closed once an agent is configured: anonymous calls would
  // spend real credits, so the boundary cannot be switched off there.
  return agentCallable(env);
}
