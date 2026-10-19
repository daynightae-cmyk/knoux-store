/**
 * Deployment switch for the Phase 2 Growth auth boundary.
 *
 * Enforcement is opt-in while the persistence layer is being provisioned, but
 * only outside production: once `VERCEL_ENV=production` the boundary is on
 * regardless of the flag, so a forgotten `KNOUX_GROWTH_AUTH_ENFORCED=false`
 * cannot open the tenant boundary to a public deployment. An explicit `false`
 * can still be honoured in preview and local environments, where the public
 * fixture Command Center remains reviewable without a real principal.
 */
export type GrowthAuthEnvironment = Record<string, string | undefined> & {
  KNOUX_GROWTH_AUTH_ENFORCED?: string;
};

export function growthAuthEnforced(
  env: GrowthAuthEnvironment = process.env,
): boolean {
  // Production fails closed: the deployment cannot opt out of the boundary.
  if (env.VERCEL_ENV === 'production') return true;
  // Selecting durable client data always enables auth; an explicit false cannot bypass it.
  if (env.KNOUX_GROWTH_DATA_SOURCE?.trim().toLowerCase() === 'supabase') return true;
  return env.KNOUX_GROWTH_AUTH_ENFORCED?.trim().toLowerCase() === 'true';
}
