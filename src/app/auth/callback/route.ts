import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveRedirect, trustedOrigins } from '@/lib/auth/redirect';

/**
 * OAuth / PKCE callback.
 *
 * The destination is judged in URL terms before the code is exchanged, so an
 * off-origin target is never followed even if the exchange later succeeds. The
 * trusted-origin set is derived from the request plus the published site URL
 * rather than from the attacker-controlled `next` parameter.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const decision = resolveRedirect(request.nextUrl.searchParams.get('next'), {
    origins: trustedOrigins(request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL),
  });

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_auth_code', request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', request.url));
  }

  return NextResponse.redirect(new URL(decision.path, request.url));
}
