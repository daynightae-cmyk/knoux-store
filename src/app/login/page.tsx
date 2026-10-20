import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { authRouteMetadata } from '@/data/auth';
import { getAuthCapabilities } from '@/lib/auth/capabilities';
import { resolveRedirect, trustedOrigins } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = authRouteMetadata('/login', 'Sign In', 'Access your KNOuX account.');

/**
 * Sign in, then return to wherever the visitor was sent from.
 *
 * Panels that need an authenticated session — the DEV terminal and PowerShell
 * among them — link here with `?next=` carrying the page they were on, so an
 * unauthenticated visitor is not stranded at /account after signing in. The
 * value is attacker controlled, so it is resolved through the shared resolver
 * against an origin set derived from the request headers rather than from the
 * parameter itself, and an off-origin or unparseable target collapses to the
 * default `/account`.
 *
 * Only the already-validated path is rendered into the form. The sign-in server
 * action re-resolves it again, so a value forged past this page still cannot
 * redirect off-origin.
 */
async function requestedDestination(candidate: string | undefined): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto =
    requestHeaders.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : 'https://knoux.store';

  return resolveRedirect(candidate, {
    origins: trustedOrigins(origin, process.env.NEXT_PUBLIC_SITE_URL),
  }).path;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = await requestedDestination(rawNext);

  const supabase = await createClient();
  const [{ data }, capabilities] = await Promise.all([
    supabase.auth.getUser(),
    getAuthCapabilities(),
  ]);
  // An already-authenticated visitor asked to see a specific page; honour that
  // rather than the default, so re-opening the link does not lose the target.
  if (data.user) redirect(next);

  return (
    <AuthShell route="/login" labelledBy="login-heading">
      <LoginForm capabilities={capabilities} next={next} />
    </AuthShell>
  );
}
