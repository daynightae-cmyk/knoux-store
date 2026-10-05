import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { resolvePrincipal } from '@/lib/growth/auth/session';

/**
 * Request boundary.
 *
 * Two jobs, in order: refresh the Supabase session so downstream reads see a
 * current one, and refuse unauthenticated access to the operational console.
 *
 * Why this file exists now. `updateSession` was written for exactly this purpose
 * and nothing ever called it: there was no middleware, so the helper was dead
 * code and every route relied on each page deciding for itself. The Command
 * Center is the first surface where that is not acceptable, because it is an
 * operational console rather than a public page.
 *
 * What this gate does and does not do. It refuses anonymous access at the edge,
 * which is cheap and leaves no unauthorised request reaching a data path. It is
 * *not* the only check: `/api/intelligence` and `/api/growth/**` each re-check
 * server-side, because an API route can be reached by a path that does not pass
 * through a matcher, and because edge-level presence-of-session is not the same
 * question as workspace authorisation. The authoritative check is
 * `guardGrowth`, which resolves membership and the client boundary.
 */

/** Console routes that require an authenticated, provisioned principal. */
const COMMAND_PREFIX = '/command';

/** API routes that carry Growth data or reasoning, and must be gated too. */
const GATED_API_PREFIXES = ['/api/intelligence', '/api/growth'] as const;

/** Where an anonymous visitor is sent, and where they land afterwards. */
const LOGIN_PATH = '/login';
const SIGNED_IN_LANDING = '/command';

function isGated(pathname: string): boolean {
  if (pathname === COMMAND_PREFIX || pathname.startsWith(`${COMMAND_PREFIX}/`)) return true;
  return GATED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Login redirect, carrying the intended destination.
 *
 * The value is our own pathname, so it needs no untrusted-input defence: it is
 * built from `request.nextUrl.pathname` of a request this server is handling.
 * The existing `resolveRedirect` still runs on it, so if this is ever widened to
 * a caller-supplied target the open-redirect protection is already in place.
 */
function loginRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = '';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Signed in but not allowed.
 *
 * `/account` exists, is indexable, and is the existing post-auth landing, so an
 * authenticated person who is not provisioned lands somewhere real rather than
 * on a redirect loop back to the console.
 */
function deniedRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/account';
  url.search = '';
  url.searchParams.set('notice', 'growth-not-authorised');
  return NextResponse.redirect(url);
}

/**
 * API routes get a status code and a typed body, never a redirect: a redirect
 * would turn an unauthorised API call into a 200 carrying an HTML login page.
 */
function apiDenial(status: 401 | 403 | 503, code: string, message: string): NextResponse {
  return NextResponse.json(
    { ok: false, code, message },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

export async function middleware(request: NextRequest) {
  // Session refresh runs for every matched request, including the gated ones, so
  // an expired access token is renewed rather than read as "signed out".
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!isGated(pathname)) return response;

  const resolution = await resolvePrincipal();

  const isApi = GATED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (resolution.state === 'ANONYMOUS') {
    return isApi
      ? apiDenial(401, 'ANONYMOUS', resolution.reason)
      : loginRedirect(request);
  }

  if (resolution.state === 'NOT_PROVISIONED') {
    return isApi
      ? apiDenial(403, 'NOT_PROVISIONED', resolution.reason)
      : deniedRedirect(request);
  }

  if (resolution.state === 'MEMBERSHIP_UNAVAILABLE') {
    // Not a denial of access. The permission system could not answer, so saying
    // "forbidden" would be a lie about the cause and would send an operator
    // chasing a missing membership row that does not exist.
    return isApi
      ? apiDenial(503, 'MEMBERSHIP_UNAVAILABLE', resolution.reason)
      : deniedRedirect(request);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Only the paths this boundary actually governs.
     *
     * Deliberately narrow: a matcher over `/command` and `/api/(intelligence|growth)`
     * only. Applying it site-wide would put a Supabase round trip in front of
     * every marketing page, and those pages are public by design.
     *
     * `_next/static`, `_next/image` and favicon are excluded because a matcher
     * that included them would run this on asset requests, where neither a
     * session nor a decision is meaningful.
     */
    '/command',
    '/command/:path*',
    '/api/intelligence',
    '/api/intelligence/:path*',
    '/api/growth/:path*',
  ],
};

export { SIGNED_IN_LANDING };