/**
 * Deployment switch for the Phase 2 Growth auth boundary.
 *
 * Keep this false until the Growth schema exists and the first OWNER has been
 * bootstrapped. The public fixture Command Center remains reviewable while the
 * persistence layer is staged; turning this on activates the real Supabase
 * principal and tenant boundary without another code change.
 */
export type GrowthAuthEnvironment = Record<string, string | undefined> & {
  KNOUX_GROWTH_AUTH_ENFORCED?: string;
};

export function growthAuthEnforced(
  env: GrowthAuthEnvironment = process.env,
): boolean {
  // Selecting durable client data always enables auth; an explicit false cannot bypass it.
  if (env.KNOUX_GROWTH_DATA_SOURCE?.trim().toLowerCase() === 'supabase') return true;
  return env.KNOUX_GROWTH_AUTH_ENFORCED?.trim().toLowerCase() === 'true';
}
