const DEFAULT_SUPABASE_URL = 'https://cnkddxxhcfceokxzaaot.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_g30GJNNenZrH58ZppGnXrQ_RH99RXKp';

export function hasSupabaseConfig(): boolean {
  if (process.env.KNOUX_TEST_DISABLE_EXTERNALS === '1') return false;
  return Boolean(getSupabaseConfig().url && getSupabaseConfig().publishableKey);
}

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}
