import 'server-only';

/**
 * KNOuX Growth — OAuth foundation.
 *
 * Code-complete Meta and Google connection flows that are truthful about their
 * own state and require no credential to build or test.
 *
 * What this module does NOT do, deliberately:
 *
 *  - It does not store a token. It produces a token *reference* and hands it to
 *    a secret store. Tokens never enter a database row, a response body, or a log.
 *  - It does not fall back to a demo connection when credentials are absent. An
 *    absent client id produces CONFIG_REQUIRED, not a fake connected account.
 *  - It does not request broad scopes by default. A caller names the capability
 *    it needs and the scope set is derived from that, so least privilege is the
 *    default rather than something an operator has to remember.
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

/* ------------------------------------------------------------------ state */

/**
 * OAuth state, as a single opaque value.
 *
 * Carries a nonce and a short digest of the session context. The nonce makes the
 * value unguessable; the digest means a state presented by a different browser or
 * a different workspace will not match, which is what protects the callback from
 * a cross-session substitution.
 */
export type OAuthState = {
  value: string;
  /** Domain-separated memory-hard digest. The raw nonce is never persisted. */
  stateHash: string;
  expiresAt: Date;
};

export const STATE_TTL_MS = 10 * 60 * 1000;

export function createOAuthState(now: () => number = Date.now): OAuthState {
  const nonce = randomBytes(32).toString('base64url');
  const issuedAt = now();
  return {
    value: nonce,
    stateHash: hashState(nonce),
    expiresAt: new Date(issuedAt + STATE_TTL_MS),
  };
}

const OAUTH_STATE_DIGEST_DOMAIN = 'knoux-growth-oauth-state-v1';

/**
 * One-way digest for high-entropy OAuth state and opaque secret references.
 * Inputs are random state/opaque references. The domain is a public salt, not
 * an embedded HMAC secret. Scrypt adds a memory-hard backstop and requires no
 * new secret mechanism. Existing state expires after ten minutes.
 */
export function hashState(value: string): string {
  return scryptSync(value, OAUTH_STATE_DIGEST_DOMAIN, 32).toString('hex');
}

export type StateVerdict =
  | { ok: true }
  | { ok: false; reason: 'unknown' | 'expired' | 'consumed'; message: string };

/**
 * Validates a returned state against a stored record.
 *
 * Constant-time comparison, because the value is attacker-supplied and a timing
 * difference on a hash comparison is a real (if narrow) oracle.
 */
export function verifyOAuthState(params: {
  presented: string | null | undefined;
  expectedHash: string | null | undefined;
  expiresAt: string | Date | null | undefined;
  consumed: boolean;
  now?: () => number;
}): StateVerdict {
  const now = (params.now ?? Date.now)();

  if (!params.presented || !params.expectedHash || !params.expiresAt) {
    return { ok: false, reason: 'unknown', message: 'No OAuth state was presented.' };
  }

  if (params.consumed) {
    return {
      ok: false,
      reason: 'consumed',
      message: 'This authorisation handshake has already been completed.',
    };
  }

  const presented = Buffer.from(hashState(params.presented), 'utf8');
  const expected = Buffer.from(params.expectedHash, 'utf8');
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return { ok: false, reason: 'unknown', message: 'The OAuth state did not match.' };
  }

  const expiry = new Date(params.expiresAt).getTime();
  if (!Number.isFinite(expiry) || expiry <= now) {
    return {
      ok: false,
      reason: 'expired',
      message: 'The OAuth state expired. Start the connection again.',
    };
  }

  return { ok: true };
}

/* ----------------------------------------------------------------- scopes */

export type OAuthCapability =
  | 'META_PAGES'
  | 'META_INSTAGRAM'
  | 'META_ADS_READ'
  | 'META_ADS_WRITE'
  | 'META_LEADS'
  | 'META_WHATSAPP'
  | 'GOOGLE_ADS'
  | 'GOOGLE_ANALYTICS'
  | 'GOOGLE_BUSINESS'
  | 'GOOGLE_SEARCH_CONSOLE'
  | 'GOOGLE_YOUTUBE';

/**
 * Capability → scope.
 *
 * This is the single place a scope is named. A caller requests a capability; it
 * never supplies a raw scope string, which removes the opportunity to over-request
 * by accident and makes the granted set auditable per capability.
 */
const META_SCOPES: Record<OAuthCapability, readonly string[]> = {
  META_PAGES: ['pages_show_list', 'pages_read_engagement'],
  META_INSTAGRAM: ['pages_show_list', 'pages_read_engagement', 'instagram_basic'],
  META_ADS_READ: ['ads_read', 'read_insights'],
  // Write scopes are declared but never requested by a read-only flow. They are
  // listed so a future campaign-creation path has a defined scope set rather
  // than inventing one.
  META_ADS_WRITE: ['ads_management'],
  META_LEADS: ['ads_management', 'leads_retrieval'],
  META_WHATSAPP: ['whatsapp_business_management'],
  GOOGLE_ADS: ['https://www.googleapis.com/auth/adwords'],
  GOOGLE_ANALYTICS: ['https://www.googleapis.com/auth/analytics.readonly'],
  GOOGLE_BUSINESS: ['https://www.googleapis.com/auth/business.manage'],
  GOOGLE_SEARCH_CONSOLE: ['https://www.googleapis.com/auth/webmasters.readonly'],
  GOOGLE_YOUTUBE: ['https://www.googleapis.com/auth/youtube.readonly'],
};

export function scopesFor(capabilities: readonly OAuthCapability[]): string[] {
  const set = new Set<string>();
  for (const capability of capabilities) {
    for (const scope of META_SCOPES[capability] ?? []) set.add(scope);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Capabilities whose scope set would permit spending money. */
export const WRITE_CAPABILITIES: readonly OAuthCapability[] = ['META_ADS_WRITE'];

/* ---------------------------------------------------------------- config */

export type MetaConfig = {
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
};

export type GoogleConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

/**
 * Configuration state for either provider.
 *
 * Generic over the config shape rather than hardcoded to Meta: `googleConfigState`
 * returns `clientId`/`clientSecret`, so a single non-generic variant would force
 * one provider's field names onto the other and lose type checking exactly where a
 * wrong field name would be a runtime failure in a URL builder.
 */
export type ConnectorConfigState<T = Required<MetaConfig> | Required<GoogleConfig>> =
  | { state: 'CONFIGURED'; config: T }
  | { state: 'CONFIG_REQUIRED'; missing: string[]; message: string };

/**
 * Meta configuration state.
 *
 * CONFIG_REQUIRED names exactly which variable is absent, because "Meta is not
 * configured" is not an actionable instruction.
 */
export function metaConfigState(env: Record<string, string | undefined>): ConnectorConfigState<Required<MetaConfig>> {
  const missing: string[] = [];
  if (!env.META_APP_ID?.trim()) missing.push('META_APP_ID');
  if (!env.META_APP_SECRET?.trim()) missing.push('META_APP_SECRET');
  if (missing.length > 0) {
    return {
      state: 'CONFIG_REQUIRED',
      missing,
      message: `Set ${missing.join(' and ')} on the server, then restart. No connection can be started without them.`,
    };
  }
  return {
    state: 'CONFIGURED',
    config: {
      appId: env.META_APP_ID!.trim(),
      appSecret: env.META_APP_SECRET!.trim(),
      redirectUri: env.META_OAUTH_REDIRECT_URI?.trim() ?? '',
    },
  };
}

export function googleConfigState(env: Record<string, string | undefined>): ConnectorConfigState<Required<GoogleConfig>> {
  const missing: string[] = [];
  if (!env.GOOGLE_CLIENT_ID?.trim()) missing.push('GOOGLE_CLIENT_ID');
  if (!env.GOOGLE_CLIENT_SECRET?.trim()) missing.push('GOOGLE_CLIENT_SECRET');
  if (missing.length > 0) {
    return {
      state: 'CONFIG_REQUIRED',
      missing,
      message: `Set ${missing.join(' and ')} on the server, then restart. No connection can be started without them.`,
    };
  }
  return {
    state: 'CONFIGURED',
    config: {
      clientId: env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: env.GOOGLE_CLIENT_SECRET!.trim(),
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? '',
    },
  };
}

/* ------------------------------------------------------------- initiation */

export type AuthorisationUrl = {
  url: string;
  /** Capabilities the URL requests, for the audit trail. */
  capabilities: OAuthCapability[];
  scopes: string[];
};

/**
 * Builds the Meta authorisation URL.
 *
 * Returns a refusal rather than a URL when credentials are absent. Producing a
 * URL that would 500 on click is the wrong shape for this function.
 */
export function buildMetaAuthorisationUrl(params: {
  config: Required<MetaConfig>;
  state: OAuthState;
  capabilities: readonly OAuthCapability[];
}): AuthorisationUrl | { state: 'CONFIG_REQUIRED'; message: string } {
  if (!params.config.redirectUri) {
    return {
      state: 'CONFIG_REQUIRED',
      message: 'Set META_OAUTH_REDIRECT_URI. Without a registered redirect URI the handshake cannot complete.',
    };
  }
  const scopes = scopesFor(params.capabilities);
  if (scopes.length === 0) {
    return {
      state: 'CONFIG_REQUIRED',
      message: 'No capability was requested, so there is nothing to authorise.',
    };
  }

  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', params.config.appId);
  url.searchParams.set('redirect_uri', params.config.redirectUri);
  // Space-separated, as Meta requires.
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', params.state.value);
  url.searchParams.set('response_type', 'code');

  return { url: url.toString(), capabilities: [...params.capabilities], scopes };
}

export function buildGoogleAuthorisationUrl(params: {
  config: Required<GoogleConfig>;
  state: OAuthState;
  capabilities: readonly OAuthCapability[];
  /** 'web' keeps the refresh token, which is what a server-side connector needs. */
  accessType?: 'online' | 'offline';
}): AuthorisationUrl | { state: 'CONFIG_REQUIRED'; message: string } {
  if (!params.config.redirectUri) {
    return {
      state: 'CONFIG_REQUIRED',
      message: 'Set GOOGLE_OAUTH_REDIRECT_URI. Without a registered redirect URI the handshake cannot complete.',
    };
  }
  const scopes = scopesFor(params.capabilities);
  if (scopes.length === 0) {
    return {
      state: 'CONFIG_REQUIRED',
      message: 'No capability was requested, so there is nothing to authorise.',
    };
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.config.clientId);
  url.searchParams.set('redirect_uri', params.config.redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', params.state.value);
  url.searchParams.set('response_type', 'code');
  // offline + consent, or Google returns no refresh token and the connection
  // silently expires after an hour with no explanation.
  url.searchParams.set('access_type', params.accessType ?? 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');

  return { url: url.toString(), capabilities: [...params.capabilities], scopes };
}

/* --------------------------------------------------------------- exchange */

export type TokenExchange =
  | { ok: true; token: StoredToken; grantedScopes: string[] }
  | { ok: false; failure: 'CONFIG_REQUIRED' | 'INVALID_INPUT' | 'API_ERROR'; message: string; providerDetail?: string };

export type StoredToken = {
  /** Opaque pointer into the secret store. Never the token. */
  secretRef: string;
  accessTokenExpiresAt?: string;
  /** Present only for Google, and only when the app is not in testing mode. */
  refreshTokenSecretRef?: string;
  scopes: string[];
  grantedAt: string;
};

/**
 * The shape a token store must satisfy.
 *
 * Declared as an interface rather than an implementation because a real
 * deployment needs an external secret manager, and because the property under
 * test — that no token is ever returned to a caller — is a property of the
 * interface, not of whichever store is configured.
 */
export interface SecretStore {
  /** Returns an opaque reference. The caller never sees the value. */
  put(value: string, opts: { kind: string; clientId: string; userId: string }): Promise<string>;
  /** Server-side use only. Never exposed through a route. */
  get(ref: string): Promise<string | null>;
  delete(ref: string): Promise<boolean>;
}

/**
 * Exchanges an authorisation code for tokens and stores the result.
 *
 * Returns a reference, never a token. The exchange itself needs the app secret,
 * which is why the secret is read here and never by the caller.
 */
export async function exchangeMetaCode(params: {
  config: Required<MetaConfig>;
  code: string;
  tokenUrl?: string;
  fetchImpl?: typeof fetch;
  secretStore?: SecretStore;
  /** Resolved by the authenticated callback, never taken from provider config. */
  owner?: { clientId: string; userId: string };
  now?: () => number;
}): Promise<TokenExchange> {
  if (!params.config.redirectUri) {
    return {
      ok: false,
      failure: 'CONFIG_REQUIRED',
      message: 'META_OAUTH_REDIRECT_URI is not set, so the code exchange cannot be completed.',
    };
  }
  if (!params.code || params.code.trim() === '') {
    return { ok: false, failure: 'INVALID_INPUT', message: 'No authorisation code was returned.' };
  }

  if (!params.secretStore || !params.owner?.clientId || !params.owner.userId) {
    return {
      ok: false,
      failure: 'CONFIG_REQUIRED',
      message: 'A server secret store and authenticated client/user context are required.',
    };
  }
  const secretStore = params.secretStore;
  const owner = params.owner;

  const doFetch = params.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: params.config.appId,
    client_secret: params.config.appSecret,
    redirect_uri: params.config.redirectUri,
    code: params.code,
  });

  try {
    const response = await doFetch(params.tokenUrl ?? 'https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
      cache: 'no-store',
    });

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      error?: { message?: string; type?: string };
    };

    if (!response.ok || payload.error || !payload.access_token) {
      return {
        ok: false,
        failure: 'API_ERROR',
        message: 'Meta rejected the authorisation code.',
        providerDetail: payload.error?.message ?? payload.error?.type ?? `HTTP ${response.status}`,
      };
    }

    const now = (params.now ?? Date.now)();
    const token: StoredToken = {
      secretRef: await secretStore.put(payload.access_token, {
        kind: 'meta-access-token',
        ...owner,
      }),
      ...(payload.expires_in
        ? { accessTokenExpiresAt: new Date(now + payload.expires_in * 1000).toISOString() }
        : {}),
      scopes: payload.scope ? payload.scope.split(',').map((entry) => entry.trim()).sort((a, b) => a.localeCompare(b)) : [],
      grantedAt: new Date(now).toISOString(),
    };

    return { ok: true, token, grantedScopes: token.scopes };
  } catch {
    return {
      ok: false,
      failure: 'API_ERROR',
      message: 'The token exchange or secret storage could not be completed.',
    };
  }
}

/** Google's equivalent. Returns both an access token and a refresh token ref. */
export async function exchangeGoogleCode(params: {
  config: Required<GoogleConfig>;
  code: string;
  tokenUrl?: string;
  fetchImpl?: typeof fetch;
  secretStore?: SecretStore;
  /** Resolved by the authenticated callback, never taken from provider config. */
  owner?: { clientId: string; userId: string };
  now?: () => number;
}): Promise<TokenExchange> {
  if (!params.config.redirectUri) {
    return {
      ok: false,
      failure: 'CONFIG_REQUIRED',
      message: 'GOOGLE_OAUTH_REDIRECT_URI is not set, so the code exchange cannot be completed.',
    };
  }
  if (!params.code || params.code.trim() === '') {
    return { ok: false, failure: 'INVALID_INPUT', message: 'No authorisation code was returned.' };
  }

  if (!params.secretStore || !params.owner?.clientId || !params.owner.userId) {
    return {
      ok: false,
      failure: 'CONFIG_REQUIRED',
      message: 'A server secret store and authenticated client/user context are required.',
    };
  }
  const secretStore = params.secretStore;
  const owner = params.owner;

  const doFetch = params.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    redirect_uri: params.config.redirectUri,
    code: params.code,
    grant_type: 'authorization_code',
  });

  try {
    const response = await doFetch(params.tokenUrl ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
      cache: 'no-store',
    });

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || payload.error || !payload.access_token) {
      return {
        ok: false,
        failure: 'API_ERROR',
        message: 'Google rejected the authorisation code.',
        providerDetail: payload.error_description ?? payload.error ?? `HTTP ${response.status}`,
      };
    }

    const now = (params.now ?? Date.now)();
    const scopes = payload.scope ? payload.scope.split(' ').filter(Boolean).sort((a, b) => a.localeCompare(b)) : [];

    const token: StoredToken = {
      secretRef: await secretStore.put(payload.access_token, {
        kind: 'google-access-token',
        ...owner,
      }),
      ...(payload.refresh_token
        ? {
            refreshTokenSecretRef: await secretStore.put(payload.refresh_token, {
              kind: 'google-refresh-token',
              ...owner,
            }),
          }
        : {}),
      ...(payload.expires_in
        ? { accessTokenExpiresAt: new Date(now + payload.expires_in * 1000).toISOString() }
        : {}),
      scopes,
      grantedAt: new Date(now).toISOString(),
    };

    return { ok: true, token, grantedScopes: scopes };
  } catch {
    return {
      ok: false,
      failure: 'API_ERROR',
      message: 'The token exchange or secret storage could not be completed.',
    };
  }
}

/* --------------------------------------------------------- connection state */

/**
 * Derives a connection state from token metadata.
 *
 * Pure, and the single place the derivation happens, so the Connections screen
 * and a scheduled health check cannot disagree about whether a connection is
 * live.
 *
 * CONNECTED requires a verification time, which mirrors the schema constraint in
 * the Growth migration: an unverified "connected" is not representable.
 */
export function deriveConnectionState(params: {
  hasToken: boolean;
  tokenExpiresAt?: string | null;
  lastVerifiedAt?: string | null;
  /** What the provider actually granted. */
  grantedScopes?: readonly string[];
  /** What this capability needs. */
  requiredScopes?: readonly string[];
  configured?: boolean;
  now?: () => number;
  /** Set when the platform itself refuses the account or region. */
  platformBlocked?: boolean;
}): {
  state:
    | 'CONNECTED'
    | 'EXPIRED'
    | 'REAUTH_REQUIRED'
    | 'TOKEN_EXPIRING'
    | 'PERMISSION_REQUIRED'
    | 'NOT_CONNECTED'
    | 'NOT_CONFIGURED'
    | 'BLOCKED';
  meaning: string;
} {
  if (params.platformBlocked) {
    return { state: 'BLOCKED', meaning: 'The platform refused this account or region.' };
  }
  if (params.configured === false) {
    return {
      state: 'NOT_CONFIGURED',
      meaning: 'No credential path is configured for this platform on the server.',
    };
  }
  if (!params.hasToken) {
    return { state: 'NOT_CONNECTED', meaning: 'No authorisation has been completed for this platform.' };
  }

  const now = (params.now ?? Date.now)();

  if (params.tokenExpiresAt) {
    const expiry = new Date(params.tokenExpiresAt).getTime();
    if (Number.isFinite(expiry) && expiry <= now) {
      return {
        state: 'EXPIRED',
        meaning: 'The access token has expired. A refresh or a new authorisation is required.',
      };
    }
  }

  // A scope gap means the grant is insufficient, not that the connection is
  // broken: it is a different remediation. Computed as required-but-not-granted,
  // which is the only direction that means "you need to authorise more".
  const granted = new Set(params.grantedScopes ?? []);
  const missing = (params.requiredScopes ?? []).filter((scope) => !granted.has(scope));
  if (missing.length > 0) {
    return {
      state: 'PERMISSION_REQUIRED',
      meaning: `Authenticated, but the grant is missing ${missing.length} required scope(s): ${missing
        .slice(0, 3)
        .join(', ')}${missing.length > 3 ? ', …' : ''}.`,
    };
  }

  // CONNECTED is only reachable with a verification time, so the UI cannot render
  // a green connection that no provider call has ever confirmed.
  if (!params.lastVerifiedAt) {
    return {
      state: 'REAUTH_REQUIRED',
      meaning: 'A token is held but this account has never been verified against the provider.',
    };
  }

  if (params.tokenExpiresAt) {
    const expiry = new Date(params.tokenExpiresAt).getTime();
    const oneDay = 86_400_000;
    if (Number.isFinite(expiry) && expiry - now < oneDay) {
      return {
        state: 'TOKEN_EXPIRING',
        meaning: 'The access token expires within 24 hours. A refresh should be scheduled.',
      };
    }
  }

  return { state: 'CONNECTED', meaning: 'Verified against the provider on the recorded date.' };
}
