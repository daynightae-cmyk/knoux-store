export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  'https://cnkddxxhcfceokxzaaot.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  'sb_publishable_g30GJNNenZrH58ZppGnXrQ_RH99RXKp';

export const SUPABASE_PROJECT_REF = 'cnkddxxhcfceokxzaaot';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
