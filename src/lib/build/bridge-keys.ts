/**
 * Bridge signing keys — server-only.
 *
 * Loads KNOUX_BRIDGE_SIGNING_KEY (PKCS8 PEM or base64 raw seed), derives the
 * public key and fingerprint. Fails closed with a clear, secret-free error if
 * absent or invalid — capabilities stay `unconfigured`.
 *
 * Server-only. Never imported by client components.
 */

import { createHash, createPrivateKey, createPublicKey, sign, verify, randomUUID, type KeyObject } from 'node:crypto';
export interface BridgeKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

/**
 * Load the bridge signing key from the environment.
 * Returns null if not configured — the caller must fail closed.
 */
export function loadBridgeKeys(env: Record<string, string | undefined> = process.env): BridgeKeyPair | null {
  const keyMaterial = env.KNOUX_BRIDGE_SIGNING_KEY;
  if (!keyMaterial || keyMaterial.trim().length === 0) return null;

  try {
    // Try PKCS8 PEM first.
    if (keyMaterial.includes('BEGIN')) {
      const publicKey = createPublicKey(keyMaterial);
      const fingerprint = fingerprintPublicKey(publicKey);
      return {
        publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        privateKeyPem: keyMaterial,
        fingerprint,
      };
    }

    // Try base64 raw seed (32 bytes) — Ed25519 seeds are exactly 32 bytes.
    const seed = Buffer.from(keyMaterial, 'base64');
    if (seed.length !== 32) return null;

    const keyPair = deriveFromSeed(seed);
    if (!keyPair) return null;

    const publicKeyObject = createPublicKey(keyPair.privateKeyPem);
    return {
      publicKeyPem: publicKeyObject.export({ format: 'pem', type: 'spki' }).toString(),
      privateKeyPem: keyPair.privateKeyPem,
      fingerprint: fingerprintPublicKey(publicKeyObject),
    };
  } catch {
    return null;
  }
}

/**
 * Ed25519 PKCS8 DER prefix for a 32-byte seed.
 * `SEQUENCE { INTEGER 0, SEQUENCE { OID 1.3.101.112 }, OCTET STRING { OCTET STRING [32] } }`
 */
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

/** Wrap a raw 32-byte Ed25519 seed as a PKCS8 PEM private key. */
export function ed25519SeedToPkcs8Pem(seed: Buffer): string {
  if (seed.length !== 32) {
    throw new Error('An Ed25519 seed must be exactly 32 bytes.');
  }
  const der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const body = der.toString('base64').match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
}

function deriveFromSeed(seed: Buffer): { publicKeyPem: string; privateKeyPem: string } | null {
  try {
    const privateKeyPem = ed25519SeedToPkcs8Pem(seed);
    const privateKey = createPrivateKey(privateKeyPem);
    const publicKey = createPublicKey(privateKey);
    return {
      publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      privateKeyPem,
    };
  } catch {
    return null;
  }
}

/** SHA-256 of the DER SPKI public key, hex-encoded. */
export function fingerprintPublicKey(publicKey: KeyObject): string {
  const der = publicKey.export({ format: 'der', type: 'spki' });
  return createHash('sha256').update(der).digest('hex');
}

/**
 * Sign data with an Ed25519 private key. Returns base64url.
 *
 * Ed25519 is a one-shot algorithm: the message is hashed internally and no
 * external digest may be supplied. Passing one (`sign('sha256', ...)`) throws
 * ERR_OSSL_INVALID_DIGEST, so the algorithm argument must be null.
 */
export function signData(privateKeyPem: string, data: string): string {
  return sign(null, Buffer.from(data, 'utf8'), privateKeyPem).toString('base64url');
}

/**
 * Verify an Ed25519 signature produced by `signData`.
 * Returns false rather than throwing for malformed keys or signatures.
 */
export function verifyData(publicKeyPem: string, data: string, signatureBase64Url: string): boolean {
  try {
    return verify(null, Buffer.from(data, 'utf8'), publicKeyPem, Buffer.from(signatureBase64Url, 'base64url'));
  } catch {
    return false;
  }
}

/**
 * Verify a compact JWS (header.payload.signature) signed with Ed25519.
 * Used by the bridge and by tests to check BFF-minted tickets.
 */
export function verifyCompactJws(publicKeyPem: string, token: string): { header: Record<string, unknown>; claims: Record<string, unknown> } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, claimsB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${claimsB64}`;
  if (!verifyData(publicKeyPem, signingInput, signatureB64)) return null;
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as Record<string, unknown>;
    const claims = JSON.parse(Buffer.from(claimsB64, 'base64url').toString('utf8')) as Record<string, unknown>;
    return { header, claims };
  } catch {
    return null;
  }
}

/** Generate a unique jti. */
export function newJti(): string {
  return randomUUID();
}
