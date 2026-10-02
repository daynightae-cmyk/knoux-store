/**
 * Bridge configuration and pairing, server-only.
 *
 * Two layers:
 *   - the issuer signing key (from KNOUX_BRIDGE_SIGNING_KEY), used to mint tickets
 *   - the paired-bridge record (from Supabase), used to know which bridge id and
 *     workspace root a ticket should be scoped to
 *
 * Every function fails closed. A missing key or an unpaired bridge produces an
 * explicit unconfigured result, never a permissive default.
 *
 * Server-only. Never imported by a client component.
 */

import type { BridgeClient, BridgeEndpoint } from './bridge-client';
import { BridgeClient as Client } from './bridge-client';
import { validateHandshake } from './bridge-protocol';
import { loadBridgeKeys, type BridgeKeyPair } from './bridge-keys';
import { BridgeStore, type BridgeRecord } from './bridge-store';

export interface BridgeConfig {
  /** Resolved bridge endpoint, or null when nothing is paired. */
  endpoint: BridgeEndpoint | null;
  keys: BridgeKeyPair | null;
  store: BridgeStore | null;
  /** Why the bridge is unavailable. Null when fully configured. */
  blocker: string | null;
}

export const BRIDGE_URL_ENV = 'KNOUX_BRIDGE_URL';

function readBridgeUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env[BRIDGE_URL_ENV];
  if (!raw || raw.trim().length === 0) return null;
  try {
    const parsed = new URL(raw.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Assemble bridge configuration for an owner.
 *
 * @param ownerId The authenticated owner. Their store decides which bridge.
 * @param storeFactory Builds a Supabase-backed store; may return null when
 *                    Supabase is not configured.
 */
export async function loadBridgeConfig(options: {
  ownerId: string;
  env?: Record<string, string | undefined>;
  storeFactory?: (ownerId: string) => BridgeStore | null;
}): Promise<BridgeConfig> {
  const env = options.env ?? process.env;

  const keys = loadBridgeKeys(env);
  if (!keys) {
    return {
      endpoint: null,
      keys: null,
      store: options.storeFactory?.(options.ownerId) ?? null,
      blocker: 'No bridge signing key is configured. Set KNOUX_BRIDGE_SIGNING_KEY on the server.',
    };
  }

  let store = options.storeFactory?.(options.ownerId) ?? null;
  if (!options.storeFactory) {
    try {
      const { createClient } = await import('../supabase/server');
      store = new BridgeStore(await createClient() as unknown as import('./bridge-store').SupabaseLike, options.ownerId);
    } catch { /* Configuration remains closed when the session store is unavailable. */ }
  }
  const url = readBridgeUrl(env);
  if (!url) {
    return {
      endpoint: null,
      keys,
      store,
      blocker: 'No bridge URL is configured. Set KNOUX_BRIDGE_URL or pair a bridge from settings.',
    };
  }

  // The paired record supplies the bridge id that tickets must target. Without
  // it a ticket could not be audience-bound, so pairing is required.
  let record: BridgeRecord | null = null;
  if (store) {
    try {
      const bridges = await store.listBridges();
      record = bridges.find((b) => b.url === url) ?? null;
    } catch {
      record = null;
    }
  }

  if (!record) {
    return {
      endpoint: null,
      keys,
      store,
      blocker: 'This deployment has no paired bridge. Pair one from settings before using bridge features.',
    };
  }

  return {
    endpoint: { url, bridgeId: record.bridgeId, fingerprint: record.fingerprint },
    keys,
    store,
    blocker: null,
  };
}

/** Build a client for the configured bridge. Throws when unconfigured. */
export function bridgeClient(config: BridgeConfig, options: { timeoutMs?: number } = {}): BridgeClient {
  if (!config.endpoint || !config.keys) {
    throw new Error(config.blocker ?? 'The bridge is not configured.');
  }
  return new Client({
    endpoint: config.endpoint,
    signingKey: config.keys.privateKeyPem,
    timeoutMs: options.timeoutMs ?? 10_000,
  });
}

export interface BridgeStatus {
  configured: boolean;
  paired: boolean;
  /** True only when the bridge answered /v1/health in this request. */
  reachable: boolean;
  bridgeId: string | null;
  fingerprint: string | null;
  /** Set when reachable: the measured capabilities from the handshake. */
  capabilities: import('./bridge-protocol').BridgeCapabilities | null;
  handshake: import('./bridge-protocol').Handshake | null;
  blocker: string | null;
}

/**
 * Measure bridge status.
 *
 * Reachability is the health probe. Capabilities come from the handshake, which
 * needs a ticket — so a reachable-but-unpaired bridge reports capabilities: null
 * rather than an optimistic guess.
 */
export async function measureBridgeStatus(
  config: BridgeConfig,
  options: { fetchImpl?: typeof fetch; ticketFactory?: (audience: string) => string } = {},
): Promise<BridgeStatus> {
  const base: BridgeStatus = {
    configured: false,
    paired: false,
    reachable: false,
    bridgeId: null,
    fingerprint: null,
    capabilities: null,
    handshake: null,
    blocker: null,
  };

  if (!config.endpoint || !config.keys) {
    return { ...base, blocker: config.blocker ?? 'The bridge is not configured.' };
  }

  const client = new Client({
    endpoint: config.endpoint,
    signingKey: config.keys.privateKeyPem,
    timeoutMs: 5000,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  const health = await client.health();
  if (!health.ok || !health.data || health.data.status !== 'ok') {
    return {
      ...base,
      configured: true,
      paired: true,
      bridgeId: config.endpoint.bridgeId,
      fingerprint: config.endpoint.fingerprint,
      blocker: health.error ?? 'The bridge is not responding.',
    };
  }

  // The handshake needs a ticket minted for this bridge's id. Without the
  // factory (e.g. a unit test) we report reachability and stop there.
  if (!options.ticketFactory) {
    return {
      ...base,
      configured: true,
      paired: true,
      reachable: true,
      bridgeId: health.data.bridgeId ?? config.endpoint.bridgeId,
      fingerprint: config.endpoint.fingerprint,
    };
  }

  const token = options.ticketFactory(config.endpoint.bridgeId);
  const handshake = await client.handshake(token);
  // The ticket proves who answered, not that the body kept its shape. A
  // handshake that fails validation is treated like a refused one: reachable,
  // but with no capabilities to report.
  const valid = handshake.ok && handshake.data ? validateHandshake(handshake.data) : null;
  if (!valid) {
    return {
      ...base,
      configured: true,
      paired: true,
      reachable: true,
      bridgeId: health.data.bridgeId ?? config.endpoint.bridgeId,
      fingerprint: config.endpoint.fingerprint,
      blocker: handshake.error ?? 'The bridge returned a handshake that failed validation.',
    };
  }

  return {
    configured: true,
    paired: true,
    reachable: true,
    bridgeId: valid.bridgeId,
    fingerprint: config.endpoint.fingerprint,
    capabilities: valid.capabilities,
    handshake: valid,
    blocker: null,
  };
}
