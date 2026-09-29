import {
  assetResponseHeaders,
  checkAssetUrl,
  isAllowedImageType,
  rejectionStatus,
  type AssetRejection,
} from '@/lib/wordpress/asset-policy';

/**
 * Official WordPress asset proxy.
 *
 * WordPress.org returns plugin icons and theme screenshots from its own asset
 * hosts (`ps.w.org`, `ts.w.org`, …). Rather than hotlinking those hosts from a
 * visitor's browser, or widening `next/image` to arbitrary third-party
 * domains, the marketplace requests them through this route.
 *
 * The route is a transport. Every decision it makes is delegated to
 * `asset-policy`, which is where the rules are stated and where they are
 * tested by execution.
 *
 * What it guarantees:
 *   - https only, and only an official WordPress asset host
 *   - no credentials embedded in the request URL
 *   - redirects followed manually, with the *destination* re-checked against
 *     the allowlist, so an allowed host cannot bounce the fetch off-origin
 *   - only a raster content type, so nothing that can execute is ever served
 *     from this origin
 *   - the byte cap is enforced while the body streams, not after it has been
 *     buffered, so an oversized response costs bounded memory
 *   - a hard timeout, and a long cache window because these assets are
 *     versioned upstream
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 3_000_000;
const CACHE_SECONDS = 60 * 60 * 24;
/** Enough hops for a CDN; few enough that a cycle still terminates. */
const MAX_REDIRECTS = 3;

export const dynamic = 'force-dynamic';

function refuse(reason: AssetRejection, message: string): Response {
  return new Response(message, {
    status: rejectionStatus(reason),
    headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
  });
}

/**
 * Resolves a hop, following redirects by hand.
 *
 * `fetch` with its default `redirect: 'follow'` would resolve the whole chain
 * before this function ever saw it, which means the allowlist would have been
 * applied to the *first* URL only. Every hop is therefore re-checked here.
 */
async function resolveAllowedTarget(start: URL): Promise<Response | AssetRejection> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const check = checkAssetUrl(current.toString());
    if (!check.ok) return check.reason;

    /**
     * The URL that is fetched is the one that was validated.
     *
     * `checkAssetUrl` parses the candidate and returns that parsed `URL`, so
     * fetching `check.value` rather than re-serialising `current` means the
     * bytes requested are the bytes that passed the scheme, userinfo and
     * host-allowlist checks. Re-serialising a separate local leaves a gap
     * between what was checked and what is sent — small, but it is exactly the
     * gap this function exists to close, and it is why the request is written
     * this way rather than the shorter one.
     */
    const target = check.value;

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: 'image/*,*/*;q=0.8' },
        next: { revalidate: 60 * 30 },
      });
    } catch {
      return 'upstream-failed';
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return response;

    const location = response.headers.get('location');
    if (!location) return 'upstream-failed';

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return 'malformed';
    }
    current = next;
  }

  return 'redirect-loop';
}

/**
 * Reads at most `MAX_BYTES`, aborting the stream the moment the cap is passed.
 *
 * The previous implementation called `arrayBuffer()` first and compared the
 * length afterwards, which bounds the response but not the memory: an upstream
 * that never stops sending is bounded by nothing at all until it does.
 */
async function readBounded(response: Response): Promise<Uint8Array<ArrayBuffer> | AssetRejection> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return 'too-large';

  const body = response.body;
  if (!body) return 'upstream-failed';

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return 'too-large';
      }
      chunks.push(value);
    }
  } catch {
    return 'upstream-failed';
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

export async function GET(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const raw = new URL(request.url).searchParams.get('u');
  if (!raw) return refuse('missing', 'Missing image reference');

  // A protocol-relative reference is resolved rather than trusted blindly; the
  // result still has to clear the same allowlist as any other candidate.
  const resolved = raw.startsWith('//') ? `https:${raw}` : raw;
  const initial = checkAssetUrl(resolved);
  if (!initial.ok) return refuse(initial.reason, 'Image reference refused by the asset policy.');

  const upstream = await resolveAllowedTarget(initial.value);
  if (typeof upstream === 'string') return refuse(upstream, 'Upstream request refused by the asset policy.');

  if (!upstream.ok) {
    return new Response('Upstream declined the request', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!isAllowedImageType(contentType)) {
    // Named explicitly so a rejected SVG is legible in a log rather than
    // looking like a generic type error.
    const kind = contentType.toLowerCase().includes('svg') ? 'svg' : contentType || 'missing';
    return refuse(
      'content-type-not-allowed',
      `Upstream content type is not a permitted raster image (${kind}).`,
    );
  }

  const bounded = await readBounded(upstream);
  if (typeof bounded === 'string') {
    return refuse(bounded, bounded === 'too-large' ? 'Upstream image is larger than permitted' : 'Upstream read failed');
  }

  return new Response(bounded, {
    status: 200,
    headers: assetResponseHeaders(contentType.split(';')[0].trim().toLowerCase(), CACHE_SECONDS),
  });
}
