/**
 * Request-intake protection.
 *
 * The intake endpoint is the one POST surface on a public site, so it is the
 * one an attacker will aim at. Three defences, all of which are honest about
 * what they can and cannot do:
 *
 *   size        the body is refused above a declared ceiling and again while it
 *               streams, so an oversized payload is never fully buffered.
 *   origin      a cross-site `Origin`, or a `Sec-Fetch-Site` that says the
 *               request came from somewhere else, is refused. This is a
 *               *browser* control: a non-browser client simply omits both
 *               headers, and the policy says so rather than pretending
 *               otherwise.
 *   rate        a per-address ceiling, so a flood is bounded even when the
 *               cross-site check does not apply.
 *
 * No CAPTCHA and no third-party bot service is introduced. Both would be a new
 * external dependency, a new failure mode, and a new privacy surface, for a
 * control the honeypot and these three already cover for this endpoint's
 * exposure. If abuse is observed in practice, the extension point is a
 * documented, opt-in token check — not a silent dependency.
 */

import { clientAddress, rateLimit } from '../http/rate-limit';

/** Comfortably above the largest legitimate submission, far below a flood. */
export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_BODY_DECLARED = 64 * 1024;

/** Five submissions a minute from one address is well above real contact volume. */
export const MAX_SUBMISSIONS_PER_WINDOW = 5;
export const WINDOW_MS = 10 * 60_000;

export type IntakeRejection =
  | 'origin-not-permitted'
  | 'body-too-large'
  | 'body-unreadable'
  | 'rate-limited';

export type OriginVerdict = { ok: true } | { ok: false; reason: 'origin-not-permitted' };

/** Public request origin supplied by the platform edge; never a redirect target. */
export function publicRequestOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(request.url).origin;
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  if (!['http', 'https'].includes(proto) || /[\s/@?#,]/.test(host)) return new URL(request.url).origin;
  try { return new URL(`${proto}://${host}`).origin; } catch { return new URL(request.url).origin; }
}

/**
 * Cross-site request check.
 *
 * `Sec-Fetch-Site` is set by the browser and cannot be forged by page script,
 * so it is the stronger of the two signals. `Origin` is checked as well because
 * it is sent on more request kinds. When neither header is present the request
 * is allowed: that is a non-browser client, and a control that refused every
 * non-browser client would be refusing the very flood it was added to stop.
 */
export function checkRequestOrigin(headers: Headers, ownOrigin: string): OriginVerdict {
  const site = headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return { ok: false, reason: 'origin-not-permitted' };
  }

  const origin = headers.get('origin');
  if (origin && origin !== 'null' && origin !== ownOrigin) {
    return { ok: false, reason: 'origin-not-permitted' };
  }

  return { ok: true };
}

/** A declared length above the ceiling is refused before a byte is read. */
export function checkDeclaredLength(headers: Headers): IntakeVerdict {
  const declared = Number(headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_DECLARED) {
    return { ok: false, reason: 'body-too-large' };
  }
  return { ok: true };
}

export type IntakeVerdict = { ok: true } | { ok: false; reason: IntakeRejection; retryAfterSeconds?: number };

/**
 * Reads the body under a hard cap.
 *
 * `content-length` is a claim. The cap is therefore enforced again on the bytes
 * that actually arrive, which is the only check that holds against a client
 * that under-reports.
 */
export async function readBoundedJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<
  { ok: true; value: unknown } | { ok: false; reason: 'body-too-large' | 'body-unreadable' }
> {
  const body = request.body;
  if (!body) return { ok: true, value: {} };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: 'body-too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'body-unreadable' };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(merged)) as unknown };
  } catch {
    return { ok: false, reason: 'body-unreadable' };
  }
}

export function intakeRateLimit(request: Request, now = Date.now()): IntakeVerdict {
  const limit = rateLimit(`contact:${clientAddress(request.headers)}`, {
    max: MAX_SUBMISSIONS_PER_WINDOW,
    windowMs: WINDOW_MS,
    now,
  });
  if (limit.allowed) return { ok: true };
  return { ok: false, reason: 'rate-limited', retryAfterSeconds: limit.retryAfterSeconds };
}
