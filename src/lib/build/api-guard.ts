/**
 * The workspace guard — transport only.
 *
 * The decision itself lives in `access-policy.ts`, which has no imports and is
 * therefore executable in a test. This file does the part that needs a
 * framework: it turns a decision into an HTTP response, and it verifies a
 * Supabase session.
 *
 * Every `/api/build/*` handler calls `guardBuildApi` before it constructs an
 * adapter. The guard returns either `null` — proceed — or a finished
 * `Response` to return verbatim. Handing back a finished response is
 * deliberate: a handler cannot accidentally proceed past a denial by forgetting
 * to branch on a boolean.
 *
 * Server-only.
 */

import { NextResponse } from 'next/server';
import { BUILD_API_DENIED, DENIAL_MESSAGE, evaluateBuildAccess } from './deployment';
import { clientAddress, rateLimit } from '../http/rate-limit';

type SessionLookup = () => Promise<{ id: string } | null>;

async function defaultSessionLookup(): Promise<{ id: string } | null> {
  // Imported lazily so the policy in `access-policy` can be exercised without
  // pulling in the Supabase client and its `cookies()` requirement.
  const { createClient } = await import('../supabase/server');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

export async function guardBuildApi(
  request: Request,
  options: {
    scope: string;
    session?: SessionLookup;
    env?: Record<string, string | undefined>;
  } = { scope: 'build' },
): Promise<Response | null> {
  const env = options.env ?? process.env;
  const access = evaluateBuildAccess(env);

  if (!access.allowed) {
    return NextResponse.json(
      { error: access.code, message: access.message, scope: options.scope },
      { status: access.status, headers: { 'cache-control': 'no-store' } },
    );
  }

  if (access.reason === 'local-checkout' || access.reason === 'explicitly-public') {
    return null;
  }

  const lookup = options.session ?? defaultSessionLookup;
  let user: { id: string } | null = null;
  try {
    user = await lookup();
  } catch {
    // An identity provider that cannot be reached is not an authenticated
    // visitor. Failing closed here is the whole point of the check.
    user = null;
  }

  if (!user) {
    return NextResponse.json(
      { error: BUILD_API_DENIED, message: DENIAL_MESSAGE, scope: options.scope, authenticated: false },
      { status: 401, headers: { 'cache-control': 'no-store' } },
    );
  }

  const limit = rateLimit(`${options.scope}:${user.id}:${clientAddress(request.headers)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'build-workspace-rate-limited',
        message: 'Too many workspace reads. Wait a moment and try again.',
        scope: options.scope,
      },
      {
        status: 429,
        headers: { 'cache-control': 'no-store', 'retry-after': String(limit.retryAfterSeconds) },
      },
    );
  }

  return null;
}

/* ------------------------------------------------------------------- caching */

type CacheEntry = { expiresAt: number; value: unknown };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;
const CACHE_MAX = 64;

/**
 * A very short response cache.
 *
 * The expensive reads are read-only and identical for every caller, so
 * answering the tenth request in the same fifteen seconds from memory instead
 * of re-walking the tree is a correctness-preserving saving. The window is
 * deliberately short: a developer pressing refresh must see their own edit.
 */
export async function withShortCache<T>(
  key: string,
  produce: () => Promise<T>,
  now = Date.now(),
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await produce();
  if (cache.size >= CACHE_MAX) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, value });
  return value;
}

export function resetCache(): void {
  cache.clear();
}
