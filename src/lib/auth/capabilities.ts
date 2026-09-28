import 'server-only';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

export type AuthProviderName = 'google' | 'github';

export type AuthCapabilities = {
  configured: boolean;
  email: boolean;
  google: boolean;
  github: boolean;
};

const FALLBACK: AuthCapabilities = {
  configured: true,
  email: true,
  google: false,
  github: false,
};

export async function getAuthCapabilities(): Promise<AuthCapabilities> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store',
    });
    if (!response.ok) return { ...FALLBACK, configured: false };

    const settings = (await response.json()) as {
      external?: Partial<Record<AuthProviderName | 'email', boolean>>;
    };
    return {
      configured: true,
      email: settings.external?.email === true,
      google: settings.external?.google === true,
      github: settings.external?.github === true,
    };
  } catch {
    return { ...FALLBACK, configured: false };
  }
}
