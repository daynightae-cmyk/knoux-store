export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  'https://cnkddxxhcfceokxzaaot.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  'sb_publishable_g30GJNNenZrH58ZppGnXrQ_RH99RXKp';

export const SUPABASE_PROJECT_REF = 'cnkddxxhcfceokxzaaot';

/**
 * Where the effective project URL came from.
 *
 * The deployment can supply its own project, or fall back to the built-in one.
 * A health report that only looked at the environment would call a deployment
 * that is using the built-in project "not configured" while the application
 * read and wrote that project throughout, so the source is stated explicitly
 * and the fallback is configuration too.
 */
export const SUPABASE_URL_SOURCE: 'environment' | 'fallback' =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? 'environment' : 'fallback';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
