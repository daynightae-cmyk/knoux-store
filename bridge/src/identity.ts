/**
 * Bridge identity — Ed25519 keypair generation, storage and fingerprinting.
 *
 * The keypair is stored in the OS-appropriate user config directory with
 * 0600 permissions (NTFS ACL on Windows). The fingerprint is the SHA-256 of
 * the raw public key, hex-encoded, used for visual confirmation during pairing.
 */

import { createHash, generateKeyPairSync, sign as cryptoSign, verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface BridgeIdentity {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

function configDir(): string {
  return join(homedir(), '.knoux', 'bridge');
}

function keyPath(): string {
  return join(configDir(), 'identity.json');
}

/** SHA-256 of the raw 32-byte public key, hex-encoded. */
export function fingerprintPublicKey(rawPublicKey: Buffer): string {
  return createHash('sha256').update(rawPublicKey).digest('hex');
}

/** Generate a new Ed25519 keypair. Returns PEM strings and the fingerprint. */
export function generateIdentity(): BridgeIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublic = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  // The raw key is the last 32 bytes of the DER SPKI structure.
  const raw = rawPublic.subarray(rawPublic.length - 32);
  return {
    publicKey: publicKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    fingerprint: fingerprintPublicKey(raw),
  };
}

/** Load the identity from disk, or generate and persist a new one. */
export function loadOrCreateIdentity(): BridgeIdentity {
  const path = keyPath();
  if (existsSync(path)) {
    try {
      const stored = JSON.parse(readFileSync(path, 'utf8')) as BridgeIdentity;
      if (stored.publicKey && stored.privateKey && stored.fingerprint) return stored;
    } catch {
      // Corrupted — regenerate.
    }
  }
  const identity = generateIdentity();
  persistIdentity(identity);
  return identity;
}

/** Persist the identity with owner-only permissions. */
export function persistIdentity(identity: BridgeIdentity): void {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = keyPath();
  writeFileSync(path, JSON.stringify(identity, null, 2), { mode: 0o600 });
  try { chmodSync(path, 0o600); } catch { /* Windows ACL is best-effort */ }
}

/** Load an existing identity, or null if none exists. */
export function loadIdentity(): BridgeIdentity | null {
  const path = keyPath();
  if (!existsSync(path)) return null;
  try {
    const stored = JSON.parse(readFileSync(path, 'utf8')) as BridgeIdentity;
    if (stored.publicKey && stored.privateKey && stored.fingerprint) return stored;
  } catch { /* fall through */ }
  return null;
}

/**
 * Sign data with the identity's private key. Returns base64url.
 *
 * Ed25519 hashes internally; a named digest is rejected by OpenSSL.
 */
export function sign(identity: BridgeIdentity, data: string): string {
  return cryptoSign(null, Buffer.from(data, 'utf8'), identity.privateKey).toString('base64url');
}

/**
 * Verify a signature against a PEM public key.
 *
 * The identity keypair is Ed25519, so the digest argument must be null — a
 * named digest makes OpenSSL reject the operation outright.
 */
export function verifySignature(publicKeyPem: string, data: string, signature: string): boolean {
  try {
    return verify(null, Buffer.from(data, 'utf8'), publicKeyPem, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}
