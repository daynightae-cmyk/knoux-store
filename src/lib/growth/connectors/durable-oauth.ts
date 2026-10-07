import 'server-only';
import { randomBytes } from 'node:crypto';
import { createOAuthState, hashState, scopesFor, metaConfigState, googleConfigState, buildMetaAuthorisationUrl, buildGoogleAuthorisationUrl, exchangeMetaCode, exchangeGoogleCode, type SecretStore, type OAuthCapability, type StoredToken } from './oauth';
import type { PlatformId } from '../types';

export type OAuthProvider = 'meta' | 'google';
export type OAuthOwner = { clientId: string; userId: string };
export type DurableState = { client_id: string; requested_scopes: string[]; return_path: string };
export type RpcClient = { rpc(name: string, params: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };

async function rpc(client: RpcClient, name: string, params: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, params);
  if (result.error) throw new Error('Growth durable storage is unavailable or refused authorization.');
  return result.data;
}

const VAULT_REF = /^vault:\/\/growth\/([0-9a-f-]{36})$/;
export class VaultSecretStore implements SecretStore {
  private readonly client: RpcClient;
  private readonly owner: OAuthOwner;
  constructor(client: RpcClient, owner: OAuthOwner) { this.client = client; this.owner = owner; }
  async put(value: string, opts: { kind: string; clientId: string; userId: string }): Promise<string> {
    if (opts.clientId !== this.owner.clientId || opts.userId !== this.owner.userId) throw new Error('Secret ownership mismatch.');
    const id = await rpc(this.client, 'knoux_growth_secret_put', { p_value: value, p_kind: opts.kind, p_client: this.owner.clientId, p_user: this.owner.userId });
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new Error('The vault returned an invalid reference.');
    return `vault://growth/${id}`;
  }
  async get(ref: string): Promise<string | null> {
    const id = VAULT_REF.exec(ref)?.[1];
    if (!id) return null;
    const value = await rpc(this.client, 'knoux_growth_secret_get', { p_id: id, p_client: this.owner.clientId, p_user: this.owner.userId });
    return typeof value === 'string' ? value : null;
  }
  async delete(ref: string): Promise<boolean> {
    const id = VAULT_REF.exec(ref)?.[1];
    if (!id) return false;
    return await rpc(this.client, 'knoux_growth_secret_delete', { p_id: id, p_client: this.owner.clientId, p_user: this.owner.userId }) === true;
  }
}

export const CAPABILITY_PROVIDER: Partial<Record<OAuthCapability, OAuthProvider>> = {
  META_PAGES: 'meta', META_INSTAGRAM: 'meta', META_ADS_READ: 'meta', META_LEADS: 'meta', META_WHATSAPP: 'meta',
  GOOGLE_ADS: 'google', GOOGLE_ANALYTICS: 'google', GOOGLE_BUSINESS: 'google', GOOGLE_SEARCH_CONSOLE: 'google', GOOGLE_YOUTUBE: 'google',
};

export async function beginDurableOAuth(params: { client: RpcClient; owner: OAuthOwner; provider: OAuthProvider; capability: OAuthCapability; env: Record<string, string | undefined>; callbackOrigin?: string }) {
  if (CAPABILITY_PROVIDER[params.capability] !== params.provider) return { ok: false as const, reason: 'Unsupported provider capability.' };
  const state = createOAuthState();
  const binding = randomBytes(32).toString('base64url');
  const config = params.provider === 'meta' ? metaConfigState(params.env) : googleConfigState(params.env);
  if (config.state !== 'CONFIGURED') return { ok: false as const, reason: 'OAuth app configuration is required.' };
  try {
    const redirect = new URL(config.config.redirectUri);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname);
    if (redirect.pathname !== `/api/growth/oauth/${params.provider}/callback` || redirect.search || redirect.hash || (redirect.protocol !== 'https:' && !(local && redirect.protocol === 'http:')) || (params.callbackOrigin && redirect.origin !== params.callbackOrigin)) {
      return { ok: false as const, reason: 'Register this deployment\'s canonical OAuth callback URL on the server and provider app.' };
    }
  } catch { return { ok: false as const, reason: 'A valid registered callback URL is required.' }; }
  const url = params.provider === 'meta'
    ? buildMetaAuthorisationUrl({ config: config.config as Required<import('./oauth').MetaConfig>, state, capabilities: [params.capability] })
    : buildGoogleAuthorisationUrl({ config: config.config as Required<import('./oauth').GoogleConfig>, state, capabilities: [params.capability] });
  if ('state' in url) return { ok: false as const, reason: url.message };
  await rpc(params.client, 'knoux_growth_oauth_begin', { p_hash: state.stateHash, p_binding: hashState(binding), p_client: params.owner.clientId, p_user: params.owner.userId, p_provider: params.provider, p_scopes: scopesFor([params.capability]) });
  return { ok: true as const, url: url.url, binding };
}

function targetPlatform(provider: OAuthProvider, scopes: string[]): PlatformId {
  if (provider === 'meta') {
    if (scopes.includes('instagram_basic')) return 'instagram';
    if (scopes.includes('ads_read') || scopes.includes('leads_retrieval')) return 'meta_ads';
    if (scopes.includes('whatsapp_business_management')) return 'whatsapp';
    return 'facebook';
  }
  if (scopes.some(scope => scope.endsWith('/adwords'))) return 'google_ads';
  if (scopes.some(scope => scope.endsWith('/business.manage'))) return 'google_business';
  if (scopes.some(scope => scope.endsWith('/analytics.readonly'))) return 'ga4';
  if (scopes.some(scope => scope.endsWith('/webmasters.readonly'))) return 'search_console';
  return 'youtube';
}

/** Verification uses bearer headers and fixed provider endpoints; tokens never enter URLs. */
export async function verifyOAuthToken(provider: OAuthProvider, platform: PlatformId, token: string, requested: string[], granted: string[], fetchImpl: typeof fetch = fetch): Promise<{ verified: boolean; scopes: string[]; missing: string[] }> {
  const endpoints: Partial<Record<PlatformId, string>> = {
    google_business: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    ga4: 'https://analyticsadmin.googleapis.com/v1beta/accounts',
    search_console: 'https://www.googleapis.com/webmasters/v3/sites',
    youtube: 'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
  };
  const endpoint = provider === 'meta' ? 'https://graph.facebook.com/v21.0/me/permissions' : endpoints[platform];
  const missing = requested.filter(scope => !granted.includes(scope));
  if (!endpoint) return { verified: false, scopes: granted, missing };
  try {
    const response = await fetchImpl(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { verified: false, scopes: granted, missing };
    if (provider === 'meta') {
      const body = await response.json() as { data?: { permission: string; status: string }[] };
      const scopes = (body.data ?? []).filter(entry => entry.status === 'granted').map(entry => entry.permission);
      const absent = requested.filter(scope => !scopes.includes(scope));
      return { verified: absent.length === 0, scopes, missing: absent };
    }
    return { verified: missing.length === 0, scopes: granted, missing };
  } catch { return { verified: false, scopes: granted, missing }; }
}

export async function completeDurableOAuth(params: { client: RpcClient; userId: string; provider: OAuthProvider; state: string; binding: string; code: string; env: Record<string, string | undefined>; fetchImpl?: typeof fetch }) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(params.state) || !/^[A-Za-z0-9_-]{43}$/.test(params.binding) || params.code.length > 4096) return { ok: false as const, reason: 'Invalid OAuth callback.' };
  const stateHash = hashState(params.state);
  const consumed = await rpc(params.client, 'knoux_growth_oauth_consume', { p_hash: stateHash, p_binding: hashState(params.binding), p_user: params.userId, p_provider: params.provider });
  const row = Array.isArray(consumed) ? consumed[0] as DurableState | undefined : undefined;
  if (!row) return { ok: false as const, reason: 'OAuth state expired, replayed, revoked, or belongs to another session.' };
  if (!params.code) return { ok: false as const, reason: 'Provider authorization was not returned. Start a new connection.' };
  const owner = { clientId: row.client_id, userId: params.userId };
  const store = new VaultSecretStore(params.client, owner);
  const createdRefs: string[] = [];
  const trackedStore: SecretStore = {
    put: async (value, opts) => { const ref = await store.put(value, opts); createdRefs.push(ref); return ref; },
    get: ref => store.get(ref), delete: ref => store.delete(ref),
  };
  let token: StoredToken | undefined;
  try {
    const config = params.provider === 'meta' ? metaConfigState(params.env) : googleConfigState(params.env);
    if (config.state !== 'CONFIGURED') return { ok: false as const, reason: 'OAuth app configuration is required.' };
    const options = { code: params.code, owner, secretStore: trackedStore, fetchImpl: params.fetchImpl };
    const exchange = params.provider === 'meta'
      ? await exchangeMetaCode({ ...options, config: config.config as Required<import('./oauth').MetaConfig> })
      : await exchangeGoogleCode({ ...options, config: config.config as Required<import('./oauth').GoogleConfig> });
    if (!exchange.ok) {
      await Promise.allSettled(createdRefs.map(ref => store.delete(ref)));
      return { ok: false as const, reason: exchange.message };
    }
    token = exchange.token;
    const value = await store.get(token.secretRef);
    if (!value) throw new Error('Stored token unavailable.');
    const platform = targetPlatform(params.provider, row.requested_scopes);
    const verification = await verifyOAuthToken(params.provider, platform, value, row.requested_scopes, exchange.grantedScopes, params.fetchImpl);
    await rpc(params.client, 'knoux_growth_oauth_finish', { p_hash: stateHash, p_user: params.userId, p_platform: platform, p_ref: token.secretRef, p_refresh_ref: token.refreshTokenSecretRef ?? null, p_scopes: verification.scopes, p_expires: token.accessTokenExpiresAt ?? null, p_verified: verification.verified, p_missing: verification.missing });
    return { ok: true as const, verified: verification.verified, returnPath: '/command/connections' };
  } catch {
    // Only newly minted references are removed if final persistence fails.
    await Promise.allSettled(createdRefs.map(ref => store.delete(ref)));
    return { ok: false as const, reason: 'OAuth storage or verification could not be completed. Start a new connection.' };
  }
}
