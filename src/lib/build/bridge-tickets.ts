/**
 * Bridge ticket minting — server-only.
 *
 * Mints Ed25519-signed JWTs for bridge access. Tickets are 60-second,
 * single-use (jti), scope-limited. Pure helpers for claims construction are
 * testable without keys.
 *
 * Server-only. Never imported by client components.
 */

import type { BridgeScope, ShellProfile, TicketClaims } from './bridge-protocol';
import { signData, newJti } from './bridge-keys';

const MAX_TICKET_TTL_SECONDS = 60;

export interface MintTicketOptions {
  userId: string;
  sid: string;
  scopes: BridgeScope[];
  bridgeId: string;
  cwd?: string;
  profile?: ShellProfile;
  /** Override TTL for testing. Never > 60s. */
  ttlSeconds?: number;
  now?: number;
}

/**
 * Build ticket claims. Pure — testable without keys.
 * TTL is clamped to never exceed 60 seconds.
 */
export function buildTicketClaims(options: MintTicketOptions): TicketClaims {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const ttl = Math.min(options.ttlSeconds ?? MAX_TICKET_TTL_SECONDS, MAX_TICKET_TTL_SECONDS);
  return {
    iss: 'knoux-bff',
    aud: options.bridgeId,
    sub: options.userId,
    sid: options.sid,
    scope: options.scopes,
    jti: newJti(),
    iat: now,
    exp: now + ttl,
    ...(options.cwd ? { cwd: options.cwd } : {}),
    ...(options.profile ? { profile: options.profile } : {}),
  };
}

/**
 * Mint a signed ticket. Returns the compact JWT string.
 * Requires the signing key to be configured.
 */
export function mintTicket(
  options: MintTicketOptions,
  keys: { publicKeyPem: string; privateKeyPem: string; fingerprint: string },
): string {
  const claims = buildTicketClaims(options);
  const header = { alg: 'EdDSA', typ: 'KNX-TKT', kid: keys.fingerprint.slice(0, 16) };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signingInput = `${headerB64}.${claimsB64}`;
  const signature = signData(keys.privateKeyPem, signingInput);
  return `${signingInput}.${signature}`;
}

/**
 * Compute the scopes needed for a given action.
 */
export function scopesForAction(action: string): BridgeScope[] {
  switch (action) {
    case 'terminal:open':
      return ['terminal:open', 'terminal:input'];
    case 'fs:read':
      return ['fs:read'];
    case 'fs:write':
      return ['fs:read', 'fs:write'];
    case 'fs:delete':
      return ['fs:read', 'fs:write', 'fs:delete'];
    case 'git:read':
      return ['git:read'];
    case 'git:write':
      return ['git:read', 'git:write'];
    case 'exec:run':
      return ['run:allowlisted'];
    case 'proc:list':
      return ['proc:list'];
    case 'proc:manage':
      return ['proc:list', 'proc:manage'];
    case 'metrics:read':
      return ['metrics:read'];
    case 'logs:read':
      return ['logs:read'];
    default:
      return ['fs:read'];
  }
}
