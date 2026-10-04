import { NextResponse } from 'next/server';
import {
  MACHINE_SESSION_TTL_MS,
  createMachineSessionToken,
  hashEnrollmentToken,
  recordControlEvent,
  verifyRegistrationEnvelope,
} from '@/lib/build/control-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadBridgeKeys } from '@/lib/build/bridge-keys';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid-body' }, { status: 400 }); }

  const verified = verifyRegistrationEnvelope(body);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 401 });

  const payload = verified.payload;
  const keys = loadBridgeKeys();
  if (!keys) {
    return NextResponse.json(
      { error: 'bridge-signing-key-unconfigured' },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing, error: lookupError } = await admin
    .from('knoux_bridge_machines')
    .select('id,owner_id,bridge_id,fingerprint,public_key,status')
    .eq('bridge_id', payload.bridgeId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: 'machine-lookup-failed' }, { status: 503 });
  }

  let machine: { id: string; owner_id: string; bridge_id: string };

  if (existing) {
    if (
      existing.fingerprint !== payload.fingerprint ||
      existing.public_key !== payload.publicKey ||
      existing.status === 'revoked'
    ) {
      return NextResponse.json({ error: 'machine-identity-rejected' }, { status: 403 });
    }

    machine = {
      id: existing.id,
      owner_id: existing.owner_id,
      bridge_id: existing.bridge_id,
    };
  } else {
    const enrollmentToken = typeof payload.enrollmentToken === 'string'
      ? payload.enrollmentToken.trim()
      : '';

    if (!/^[A-Za-z0-9_-]{20,128}$/.test(enrollmentToken)) {
      return NextResponse.json({ error: 'enrollment-required' }, { status: 403 });
    }

    const { data: enrolled, error: enrollmentError } = await admin.rpc(
      'knoux_bridge_enroll_machine',
      {
        p_token_hash: hashEnrollmentToken(enrollmentToken),
        p_bridge_id: payload.bridgeId,
        p_fingerprint: payload.fingerprint,
        p_public_key: payload.publicKey,
        p_hostname: payload.hostname.slice(0, 255),
        p_platform: payload.platform.slice(0, 64),
        p_arch: payload.arch.slice(0, 64),
        p_bridge_version: payload.version.slice(0, 64),
        p_capabilities: payload.capabilities,
      },
    );

    const enrolledMachine = Array.isArray(enrolled) ? enrolled[0] : null;
    if (enrollmentError || !enrolledMachine) {
      return NextResponse.json({ error: 'enrollment-invalid-or-expired' }, { status: 403 });
    }

    machine = {
      id: enrolledMachine.id,
      owner_id: enrolledMachine.owner_id,
      bridge_id: enrolledMachine.bridge_id,
    };
  }

  const { error: nonceError } = await admin
    .from('knoux_bridge_registration_nonces')
    .insert({
      nonce: payload.nonce,
      machine_id: machine.id,
      expires_at: new Date(now.getTime() + 10 * 60_000).toISOString(),
    });

  if (nonceError) {
    return NextResponse.json({ error: 'registration-replay' }, { status: 409 });
  }

  if (existing) {
    const { error: updateError } = await admin
      .from('knoux_bridge_machines')
      .update({
        hostname: payload.hostname.slice(0, 255),
        platform: payload.platform.slice(0, 64),
        arch: payload.arch.slice(0, 64),
        bridge_version: payload.version.slice(0, 64),
        capabilities: payload.capabilities,
        status: 'online',
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', machine.id);

    if (updateError) {
      return NextResponse.json({ error: 'machine-refresh-failed' }, { status: 503 });
    }
  }

  await admin
    .from('knoux_bridge_sessions')
    .update({ revoked_at: nowIso })
    .eq('machine_id', machine.id)
    .is('revoked_at', null);

  const { token, tokenHash } = createMachineSessionToken();
  const expiresAt = new Date(now.getTime() + MACHINE_SESSION_TTL_MS).toISOString();

  const { data: session, error: sessionError } = await admin
    .from('knoux_bridge_sessions')
    .insert({
      machine_id: machine.id,
      owner_id: machine.owner_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      last_seen_at: nowIso,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'session-create-failed' }, { status: 503 });
  }

  await recordControlEvent({
    ownerId: machine.owner_id,
    machineId: machine.id,
    sessionId: session.id,
    event: existing ? 'machine.reconnected' : 'machine.enrolled',
    detail: {
      bridgeId: payload.bridgeId,
      hostname: payload.hostname,
      platform: payload.platform,
      version: payload.version,
    },
  });

  return NextResponse.json({
    ok: true,
    machineId: machine.id,
    sessionId: session.id,
    sessionToken: token,
    expiresAt,
    heartbeatIntervalMs: 30000,
    idlePollMs: 10000,
    issuerPublicKey: keys.publicKeyPem,
    issuerFingerprint: keys.fingerprint,
  }, { headers: { 'cache-control': 'no-store' } });
}
