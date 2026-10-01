/**
 * Ticket verification — the security heart of the bridge.
 *
 * Tickets are Ed25519-signed JWTs minted by the Next.js BFF. The bridge
 * verifies them in a strict order: size limit → parse → alg/typ allowlist →
 * signature → aud → exp/iat (±5s skew) → jti unseen (LRU + TTL) → scope
 * contains required → origin allowlist. Any failure returns a generic 403
 * with no oracle detail; the reason goes to the local audit log only.
 *
 * Pure and testable — no I/O, no framework.
 */

import { createHash, createPublicKey, verify, randomUUID, type KeyObject } from 'node:crypto';
import type { BridgeScope, TicketClaims } from './protocol.js';

const MAX_TICKET_BYTES = 4096;
const CLOCK_SKEW_SECONDS = 5;
/** Longest lifetime the bridge will accept. Matches the BFF's minting ceiling. */
const MAX_TICKET_TTL_SECONDS = 60;
const JTI_TTL_MS = 120_000;
const JTI_CACHE_SIZE = 1024;

/** LRU cache for seen jti values. */
const seenJtis = new Map<string, number>();

function isJtiSeen(jti: string): boolean {
  return seenJtis.has(jti);
}

function markJtiSeen(jti: string, now: number): void {
  seenJtis.set(jti, now);
  // Evict expired entries.
  for (const [key, ts] of seenJtis) {
    if (now - ts > JTI_TTL_MS) seenJtis.delete(key);
  }
  // Enforce size bound — evict oldest.
  while (seenJtis.size > JTI_CACHE_SIZE) {
    const oldest = seenJtis.keys().next().value;
    if (oldest === undefined) break;
    seenJtis.delete(oldest);
  }
}

export type TicketVerifyResult =
  | { ok: true; claims: TicketClaims }
  | { ok: false; error: string; reason: string };

function reject(reason: string): TicketVerifyResult {
  // The client gets a generic code; `reason` exists for the local audit log.
  return { ok: false, error: 'invalid-ticket', reason };
}

function base64UrlDecode(input: string): Buffer | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

/**
 * Fingerprint of an issuer public key — SHA-256 of its DER SPKI form.
 * Matches the BFF's `fingerprintPublicKey`, so `kid` values agree on both sides.
 *
 * Accepts a PEM string or an already-parsed KeyObject: the trust store holds
 * PEM, but callers may hold either.
 */
export function issuerFingerprint(publicKey: string | KeyObject): string {
  const key = typeof publicKey === 'string' ? createPublicKey(publicKey) : publicKey;
  return createHash('sha256')
    .update(key.export({ format: 'der', type: 'spki' }))
    .digest('hex');
}

/**
 * Verify a signed ticket. Pure — takes the raw token string, the trusted
 * issuer public keys, the expected bridge ID, and the required scope.
 */
export function verifyTicket(
  token: string,
  trustedIssuers: string[],
  expectedBridgeId: string,
  requiredScope: BridgeScope,
  now: number = Math.floor(Date.now() / 1000),
): TicketVerifyResult {
  // 1. Size limit
  if (token.length > MAX_TICKET_BYTES) {
    return reject('Ticket exceeds size limit');
  }

  // 2. Parse
  const parts = token.split('.');
  if (parts.length !== 3) {
    return reject('Ticket must have three segments');
  }
  const [headerB64, claimsB64, signatureB64] = parts;

  const headerJson = base64UrlDecode(headerB64);
  const claimsJson = base64UrlDecode(claimsB64);
  const signature = base64UrlDecode(signatureB64);
  if (!headerJson || !claimsJson || !signature) {
    return reject('Ticket segments are not valid base64url');
  }

  let header: Record<string, unknown>;
  let claims: TicketClaims;
  try {
    header = JSON.parse(headerJson.toString('utf8')) as Record<string, unknown>;
    claims = JSON.parse(claimsJson.toString('utf8')) as TicketClaims;
  } catch {
    return reject('Ticket segments are not valid JSON');
  }

  // 3. alg/typ allowlist. `none` and HMAC algorithms are rejected outright —
  // this bridge only ever accepts Ed25519.
  if (header.alg !== 'EdDSA' || header.typ !== 'KNX-TKT') {
    return reject('Ticket alg/typ not allowed');
  }

  // 3b. `kid`, when present, must identify one of the trusted issuers. The
  // BFF sets kid to the first 16 hex chars of the issuer fingerprint, so this
  // skips trying every key on a mismatched ticket.
  if (typeof header.kid === 'string') {
    if (!trustedIssuers.some((k) => issuerFingerprint(k).startsWith(header.kid as string))) {
      return reject('Ticket kid is not a trusted issuer');
    }
  }

  // 4. Signature — try each trusted issuer.
  // Ed25519 hashes internally, so the digest argument must be null. Supplying
  // one (e.g. createVerify('sha256')) fails with ERR_CRYPTO_UNSUPPORTED_OPERATION
  // and would silently reject every valid ticket.
  const signingInput = Buffer.from(`${headerB64}.${claimsB64}`, 'utf8');
  let signatureValid = false;
  for (const issuerKey of trustedIssuers) {
    try {
      if (verify(null, signingInput, issuerKey, signature)) {
        signatureValid = true;
        break;
      }
    } catch { /* try next issuer */ }
  }
  if (!signatureValid) {
    return reject('Signature verification failed');
  }

  // 5. iss must be a non-empty issuer id
  if (typeof claims.iss !== 'string' || claims.iss.length === 0) {
    return reject('Missing issuer');
  }

  // 6. aud
  if (claims.aud !== expectedBridgeId) {
    return reject('Audience mismatch');
  }

  // 7. exp/iat with clock skew.
  //
  // `exp` in the future is the normal case: a short-lived ticket is minted with
  // exp = now + 60. What must be bounded is how far ahead it may reach, since an
  // unbounded exp would let a captured ticket stay valid indefinitely. Rejecting
  // any exp greater than `now` would reject every correctly minted ticket.
  // iat is checked first: a ticket from the future is caught by the smaller,
  // more specific check rather than by the lifetime ceiling.
  if (claims.iat > now + CLOCK_SKEW_SECONDS) {
    return reject('Ticket iat is in the future');
  }
  if (claims.exp < now - CLOCK_SKEW_SECONDS) {
    return reject('Ticket expired');
  }
  if (claims.exp > now + MAX_TICKET_TTL_SECONDS + CLOCK_SKEW_SECONDS) {
    return reject(`Ticket lifetime exceeds ${MAX_TICKET_TTL_SECONDS}s`);
  }
  if (claims.iat > claims.exp) {
    return reject('Ticket iat is after exp');
  }

  // 7. jti unseen
  if (isJtiSeen(claims.jti)) {
    return reject('Ticket jti has been replayed');
  }
  markJtiSeen(claims.jti, Date.now());

  // 8. Scope
  if (!claims.scope.includes(requiredScope)) {
    return reject(`Ticket lacks required scope: ${requiredScope}`);
  }

  return { ok: true, claims };
}

/** Reset the jti cache — for tests only. */
export function resetJtiCache(): void {
  seenJtis.clear();
}

/** Compute the SHA-256 hash of content, hex-encoded. */
export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Generate a unique jti. */
export function newJti(): string {
  return randomUUID();
}
