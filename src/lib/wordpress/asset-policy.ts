/**
 * What the WordPress image proxy is permitted to return.
 *
 * Split out from the route so the policy can be executed in a test rather than
 * read in one. The route's job is transport; this file's job is the decision.
 *
 * Why raster only. The proxy exists so a visitor's browser never loads an asset
 * from a third-party host. Serving an *active* content type from this origin
 * undoes that: an SVG opened top-level runs script on `knoux.store`, and no
 * amount of allowlisting the upstream host changes that the file's origin is
 * now ours.
 *
 * Rejecting SVG costs the product nothing, and that is a measured claim rather
 * than an assumption. The official directory serves plugin icons as GIF
 * (`ps.w.org/<slug>/assets/icon-256x256.gif`) and theme screenshots as JPEG on
 * `ts.w.org`. Neither the icon nor the screenshot path in
 * `ExternalItemCard` requires SVG. The download host is allowlisted for
 * completeness, but archives are not images and are refused by the type
 * allowlist like anything else.
 */

import { isOfficialAssetHost } from './external.ts';

/**
 * Formats that cannot execute.
 *
 * Deliberately an allowlist rather than a blocklist of the dangerous types: a
 * blocklist has to be updated every time a format learns to carry script, and
 * this one is the set the product is known to need.
 */
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
];

export type AssetRejection =
  | 'missing'
  | 'malformed'
  | 'not-https'
  | 'credentials'
  | 'host-not-allowed'
  | 'content-type-not-allowed'
  | 'redirect-loop'
  | 'redirect-not-allowed'
  | 'too-large'
  | 'upstream-failed';

export type AssetCheck<T> = { ok: true; value: T } | { ok: false; reason: AssetRejection; status: number };

/** HTTP status for each refusal. A 4xx where the caller is at fault, 5xx where we are. */
const REJECTION_STATUS: Record<AssetRejection, number> = {
  missing: 400,
  malformed: 400,
  'not-https': 400,
  credentials: 400,
  'host-not-allowed': 403,
  'content-type-not-allowed': 415,
  'redirect-loop': 502,
  'redirect-not-allowed': 502,
  'too-large': 413,
  'upstream-failed': 502,
};

export function rejectionStatus(reason: AssetRejection): number {
  return REJECTION_STATUS[reason];
}

/**
 * Validates one hop of the fetch.
 *
 * Applied to the *initial* URL and again to every redirect target. A redirect
 * from an allowed host to any other host is a hole in an allowlist that is
 * checked once, and it is exactly the shape an attacker needs: control a path
 * on an official host, or rely on an upstream being coerced into one.
 */
export function checkAssetUrl(
  candidate: string,
): AssetCheck<URL> {
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: 'malformed', status: 400 };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'not-https', status: 400 };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials', status: 400 };
  }
  if (!isOfficialAssetHost(parsed.hostname)) {
    return { ok: false, reason: 'host-not-allowed', status: 403 };
  }
  return { ok: true, value: parsed };
}

/**
 * The response content type, normalised.
 *
 * A declared type is a claim, not a fact, so this strips parameters and
 * compares the media type exactly. `image/svg+xml; charset=utf-8` and
 * `IMAGE/SVG+XML` both have to be caught, and neither `image/png;evil=1` nor a
 * vendor prefix may slip past.
 */
export function normaliseContentType(header: string | null): string {
  if (!header) return '';
  return header.split(';')[0].trim().toLowerCase();
}

export function isAllowedImageType(header: string | null): boolean {
  return ALLOWED_IMAGE_TYPES.includes(normaliseContentType(header));
}

/** Response headers every proxied byte leaves under. */
export function assetResponseHeaders(contentType: string, maxAgeSeconds: number): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': `public, max-age=${maxAgeSeconds}, immutable`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    // Defence in depth for the day a raster format grows an escape hatch, and
    // for a browser that ignores the type allowlist. `sandbox` with no allow
    // list means even a successfully-served document has no script, no origin
    // and no same-origin privileges.
    'Content-Security-Policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}
