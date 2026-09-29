/**
 * Post-authentication redirect targets.
 *
 * A redirect that leaves the origin turns a successful sign-in into an open
 * redirect: the attacker controls the destination, the victim carries a fresh
 * session cookie, and the phish is delivered from a URL the user believes is
 * KNOuX. The value arrives in a query string, so it is fully attacker
 * controlled.
 *
 * The rule is therefore stated in URL terms and not in string terms. A prefix
 * test is not a security control: `new URL('/\\evil.com', origin)` resolves to
 * `https://evil.com/` because the WHATWG parser treats a backslash in a special
 * scheme exactly as it treats a slash. Percent-encoded separators, embedded
 * tabs and newlines, and protocol-relative forms all defeat a naive prefix
 * check while remaining plain application paths to the string that produced it.
 *
 * So: parse against a trusted origin, then require the parsed result to still
 * be that origin. Anything unparseable, off-origin, or ambiguous falls back.
 *
 * This module is deliberately free of framework imports so the security
 * property can be tested by executing it, not by reading it.
 */

/** Where a completed sign-in lands when no safe target was supplied. */
export const DEFAULT_REDIRECT = '/account';

/** Long enough for any real in-app path, short enough to bound the work. */
const MAX_TARGET_LENGTH = 2048;

/**
 * C0 controls, DEL, and the C1 block. These are stripped or reinterpreted by
 * different URL layers, so a value containing one is ambiguous by construction.
 * Tab (\t), line feed (\n) and carriage return (\r) are the practical cases:
 * browsers discard them from a URL, so `"/\t/evil.com"` is a same-origin string
 * that navigates off-origin.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * Percent-encoded separators. `%2f` and `%5c` survive a same-origin parse but
 * are decoded by the first proxy, CDN or framework hop that inspects the path,
 * which is how `//evil.com` is reintroduced downstream. Refusing them keeps the
 * value unambiguous across every hop rather than only the first.
 */
const ENCODED_SEPARATOR = /%(?:2f|5c)/i;

export type RedirectDecision =
  | { ok: true; path: string }
  | { ok: false; path: string; reason: RedirectRejection };

export type RedirectRejection =
  | 'absent'
  | 'not-a-string'
  | 'too-long'
  | 'control-characters'
  | 'encoded-separator'
  | 'backslash'
  | 'not-root-relative'
  | 'unparseable'
  | 'off-origin';

/**
 * Resolves the origins a post-authentication redirect may address.
 *
 * The request's own origin is included so a correctly configured deployment
 * works with no environment at all. Any additional origin is opt-in through
 * `NEXT_PUBLIC_SITE_URL`, which is the value the site already publishes for
 * canonical URLs. A deployment behind a proxy that rewrites the host can list
 * its public origins there; an origin that is not in this set is refused even
 * when it matches the request.
 */
export function trustedOrigins(requestOrigin: string, configured?: string | undefined): Set<string> {
  const origins = new Set<string>();
  const add = (value: string | undefined | null) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      /* An unparseable configured origin is simply not trusted. */
    }
  };

  add(requestOrigin);
  for (const entry of (configured ?? '').split(',')) add(entry);
  return origins;
}

/**
 * Decides where a caller-supplied redirect may go.
 *
 * Returns the decision rather than only the path so a caller can log *why* a
 * value was refused without re-deriving the reasoning. The reason is a constant
 * from a closed set; the rejected value itself is never returned or logged,
 * because it is attacker-controlled input.
 */
export function resolveRedirect(
  candidate: unknown,
  options: { origins: ReadonlySet<string>; fallback?: string },
): RedirectDecision {
  const fallback = options.fallback ?? DEFAULT_REDIRECT;

  if (candidate === null || candidate === undefined) {
    return { ok: false, path: fallback, reason: 'absent' };
  }
  if (typeof candidate !== 'string') {
    return { ok: false, path: fallback, reason: 'not-a-string' };
  }
  if (candidate.length > MAX_TARGET_LENGTH) {
    return { ok: false, path: fallback, reason: 'too-long' };
  }
  if (CONTROL_CHARACTERS.test(candidate)) {
    return { ok: false, path: fallback, reason: 'control-characters' };
  }
  if (ENCODED_SEPARATOR.test(candidate)) {
    return { ok: false, path: fallback, reason: 'encoded-separator' };
  }
  // A backslash is a path separator in every scheme this application can be
  // reached on. It is never legitimate in an in-app target and is the exact
  // shape that made `/\evil.com` resolve off-origin.
  if (candidate.includes('\\')) {
    return { ok: false, path: fallback, reason: 'backslash' };
  }
  // Must be a single root-relative reference. This rejects `//evil.com`,
  // `https://evil.com` and `javascript:…` in one step.
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return { ok: false, path: fallback, reason: 'not-root-relative' };
  }

  for (const origin of options.origins) {
    let parsed: URL;
    try {
      parsed = new URL(candidate, origin);
    } catch {
      return { ok: false, path: fallback, reason: 'unparseable' };
    }
    // The authoritative check. Everything above is a cheap rejection; this is
    // the statement that the destination is genuinely on a trusted origin.
    if (parsed.origin !== origin) continue;
    // Belt and braces: a value that parsed on-origin can still present a
    // protocol-relative pathname if the origin set itself were odd.
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) continue;
    // The fragment never reaches the server and is not a security boundary, so
    // it is dropped rather than echoed.
    return { ok: true, path: `${parsed.pathname}${parsed.search}` };
  }

  return { ok: false, path: fallback, reason: 'off-origin' };
}

/**
 * Convenience wrapper for call sites that only need the destination.
 */
export function safeRedirectPath(
  candidate: unknown,
  options: { origins: ReadonlySet<string>; fallback?: string },
): string {
  return resolveRedirect(candidate, options).path;
}
