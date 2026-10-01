import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { BridgeClient } from '@/lib/build/bridge-client';
import { loadBridgeKeys } from '@/lib/build/bridge-keys';
import { BridgeStore, type SupabaseLike } from '@/lib/build/bridge-store';
import type { PairResponse } from '@/lib/build/bridge-protocol';

export const dynamic = 'force-dynamic';

/**
 * Pair with a bridge.
 *
 * POST body: { url: string, code: string }
 *
 * The BFF presents the pairing code the bridge printed at `init`, together with
 * the issuer public key. The bridge responds with its own public key, a
 * fingerprint to compare against the bridge's `doctor` output, and a measured
 * handshake. Only then is a pairing row written.
 *
 * The pairing code is single-use and short-lived. A failed attempt does not
 * record anything.
 */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'bridge-pair' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to pair a bridge.' },
      { status: 401 },
    );
  }

  const keys = loadBridgeKeys();
  if (!keys) {
    return NextResponse.json(
      { error: 'no-signing-key', message: 'No bridge signing key is configured. Set KNOUX_BRIDGE_SIGNING_KEY on the server.' },
      { status: 500 },
    );
  }

  let body: { url?: unknown; code?: unknown };
  try {
    body = await request.json() as { url?: unknown; code?: unknown };
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with url and code.' },
      { status: 400 },
    );
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  if (!url || !code) {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Both url and code are required.' },
      { status: 400 },
    );
  }

  let origin: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
    origin = parsed.origin;
  } catch {
    return NextResponse.json(
      { error: 'invalid-url', message: 'The bridge URL must be an http(s) URL.' },
      { status: 400 },
    );
  }

  // The bridge identity is unknown until it answers, so the client is built
  // with placeholder fields that pairing does not use.
  const client = new BridgeClient({
    endpoint: { url: origin, bridgeId: '', fingerprint: '' },
    signingKey: keys.privateKeyPem,
    timeoutMs: 15_000,
  });

  const result = await client.pair(code, keys.publicKeyPem);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: 'pair-failed', message: result.error ?? 'Pairing failed.' },
      { status: 403 },
    );
  }

  const paired = result.data as PairResponse;

  // Record the pairing so tickets can be audience-bound to this bridge id.
  const { createClient } = await import('@/lib/supabase/server');
  // The store declares the query-builder slice it uses rather than the full client
  // generics, which collapse without generated types. One narrowing cast here beats
  // threading an untyped client through the store.
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const store = new BridgeStore(supabase, ownerId);
  try {
    await store.createBridge({
      ownerId,
      url: origin,
      bridgeId: paired.bridgeId,
      fingerprint: paired.fingerprint,
      pairedBy: ownerId,
      pairedAt: new Date().toISOString(),
      lastSeenAt: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The pairing could not be saved.';
    return NextResponse.json(
      { error: 'pair-persist-failed', message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      bridgeId: paired.bridgeId,
      fingerprint: paired.fingerprint,
      handshake: paired.handshake,
      url: origin,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}