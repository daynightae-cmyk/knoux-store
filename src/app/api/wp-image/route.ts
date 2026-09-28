import { isOfficialAssetHost } from '@/lib/wordpress/external';

/**
 * Official WordPress asset proxy.
 *
 * WordPress.org returns plugin icons and theme screenshots from its own asset
 * hosts (`ps.w.org`, `ts.w.org`, …). Rather than hotlinking those hosts from a
 * visitor's browser, or widening `next/image` to arbitrary third-party
 * domains, the marketplace requests them through this route.
 *
 * Guarantees:
 *   - https only, and only an official WordPress asset host
 *   - no credentials embedded in the request URL
 *   - hard timeout
 *   - bounded response size
 *   - the source content type is passed through unchanged, so a plugin's
 *     official SVG icon stays an SVG and is never rasterised or recoloured
 *   - a long cache window, because these assets are versioned upstream
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 3_000_000;
const CACHE_SECONDS = 60 * 60 * 24;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  let target: URL;
  try {
    const raw = new URL(request.url).searchParams.get('u');
    if (!raw) return new Response('Missing image reference', { status: 400 });
    const resolved = raw.startsWith('//') ? `https:${raw}` : raw;
    target = new URL(resolved);
  } catch {
    return new Response('Invalid image reference', { status: 400 });
  }

  if (target.protocol !== 'https:') {
    return new Response('Unsupported protocol', { status: 400 });
  }
  if (target.username || target.password) {
    return new Response('Credentials are not permitted in an image reference', { status: 400 });
  }
  if (!isOfficialAssetHost(target.hostname)) {
    return new Response('Host is not an official WordPress asset host', { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'image/*,*/*;q=0.8' },
      next: { revalidate: 60 * 30 },
    });
  } catch {
    return new Response('Upstream unavailable', { status: 504 });
  }

  if (!upstream.ok) {
    return new Response('Upstream declined the request', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    // Never proxy arbitrary documents through an image route.
    return new Response('Upstream did not return an image', { status: 415 });
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return new Response('Upstream image is larger than permitted', { status: 413 });
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
