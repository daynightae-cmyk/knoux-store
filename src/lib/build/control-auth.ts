import 'server-only';

import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as cryptoVerify,
} from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_CLOCK_SKEW_MS = 2 * 60_000;
export const MACHINE_SESSION_TTL_MS = 12 * 60 * 60_000;

export interface RegistrationPayload {
  bridgeId: string;
  fingerprint: string;
  publicKey: string;
  nonce: string;
  timestamp: string;
  hostname: string;
  platform: string;
  arch: string;
  version: string;
  capabilities: Record<string, boolean>;
  enrollmentToken?: string;
}

interface RegistrationEnvelope {
  payload: string;
  signature: string;
}

export interface MachineAuth {
  session: {
    id: string;
    machine_id: string;
    owner_id: string;
    expires_at: string;
  };
  machine: {
    id: string;
    owner_id: string;
    bridge_id: string;
    fingerprint: string;
    status: string;
  };
}

export function fingerprintPublicKeyPem(publicKeyPem: string): string | null {
  try {
    const der = createPublicKey(publicKeyPem).export({ format: 'der', type: 'spki' });
    const raw = Buffer.from(der).subarray(Buffer.byteLength(der) - 32);
    return createHash('sha256').update(raw).digest('hex');
  } catch {
    return null;
  }
}

export function verifyRegistrationEnvelope(
  value: unknown,
  now = Date.now(),
): { ok: true; payload: RegistrationPayload } | { ok: false; error: string } {
  if (typeof value !== 'object' || value === null) return { ok: false, error: 'invalid-envelope' };
  const envelope = value as Record<string, unknown>;
  if (typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string') {
    return { ok: false, error: 'invalid-envelope' };
  }
  if (envelope.payload.length > 64_000 || envelope.signature.length > 1_000) {
    return { ok: false, error: 'invalid-envelope' };
  }

  let payload: RegistrationPayload;
  try {
    payload = JSON.parse(envelope.payload) as RegistrationPayload;
  } catch {
    return { ok: false, error: 'invalid-payload' };
  }

  if (
    typeof payload.bridgeId !== 'string' ||
    typeof payload.fingerprint !== 'string' ||
    typeof payload.publicKey !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.timestamp !== 'string' ||
    typeof payload.hostname !== 'string' ||
    typeof payload.platform !== 'string' ||
    typeof payload.arch !== 'string' ||
    typeof payload.version !== 'string' ||
    typeof payload.capabilities !== 'object' ||
    payload.capabilities === null
  ) {
    return { ok: false, error: 'invalid-payload' };
  }

  if (!/^[0-9a-f]{64}$/.test(payload.fingerprint)) return { ok: false, error: 'invalid-fingerprint' };
  if (payload.bridgeId !== payload.fingerprint.slice(0, 16)) return { ok: false, error: 'bridge-id-mismatch' };
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(payload.nonce)) return { ok: false, error: 'invalid-nonce' };

  const measuredAt = Date.parse(payload.timestamp);
  if (!Number.isFinite(measuredAt) || Math.abs(now - measuredAt) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: 'stale-registration' };
  }

  const derived = fingerprintPublicKeyPem(payload.publicKey);
  if (!derived || derived !== payload.fingerprint) return { ok: false, error: 'public-key-mismatch' };

  try {
    const valid = cryptoVerify(
      null,
      Buffer.from(envelope.payload, 'utf8'),
      payload.publicKey,
      Buffer.from(envelope.signature, 'base64url'),
    );
    if (!valid) return { ok: false, error: 'invalid-signature' };
  } catch {
    return { ok: false, error: 'invalid-signature' };
  }

  return { ok: true, payload };
}


export function createEnrollmentToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashEnrollmentToken(token) };
}

export function hashEnrollmentToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createMachineSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashMachineSessionToken(token) };
}

export function hashMachineSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function authenticateMachineRequest(request: Request): Promise<MachineAuth | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(authorization);
  if (!match) return null;

  const admin = createAdminClient();
  const tokenHash = hashMachineSessionToken(match[1]);

  const { data: session, error: sessionError } = await admin
    .from('knoux_bridge_sessions')
    .select('id,machine_id,owner_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (sessionError || !session || session.revoked_at) return null;
  if (Date.parse(session.expires_at) <= Date.now()) return null;

  const { data: machine, error: machineError } = await admin
    .from('knoux_bridge_machines')
    .select('id,owner_id,bridge_id,fingerprint,status')
    .eq('id', session.machine_id)
    .maybeSingle();

  if (machineError || !machine || machine.status === 'revoked') return null;
  if (machine.owner_id !== session.owner_id) return null;

  return {
    session: {
      id: session.id,
      machine_id: session.machine_id,
      owner_id: session.owner_id,
      expires_at: session.expires_at,
    },
    machine,
  };
}

export async function recordControlEvent(input: {
  ownerId: string;
  machineId?: string | null;
  sessionId?: string | null;
  jobId?: string | null;
  event: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('knoux_bridge_events').insert({
      owner_id: input.ownerId,
      machine_id: input.machineId ?? null,
      session_id: input.sessionId ?? null,
      job_id: input.jobId ?? null,
      event: input.event,
      detail: input.detail ?? {},
    });
  } catch {
    // Audit failure must not turn a safe request into a mutation retry.
  }
}
