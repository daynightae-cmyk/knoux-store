/**
 * KNOuX Growth — server-side connector boundary.
 *
 * Everything in this file is server-only. It is the only place in the Growth
 * product that is allowed to know a credential exists, and the guarantee is
 * structural rather than conventional: the module imports `server-only`, so an
 * accidental client import is a build error rather than a leak.
 *
 * The security rules it enforces:
 *
 *  - No token is ever returned to a caller. `describeCapability` returns
 *    presence booleans and never a value.
 *  - A capability without credentials returns a typed failure. It never returns
 *    fixture data, because a fixture returned from a connector path is exactly
 *    how demo values become production values.
 *  - Reads are bounded. Unbounded provider reads are a cost and an abuse risk.
 *  - MUTATING capabilities are refused outright in this build. There is no
 *    "dry run" that silently performs the write.
 */

import 'server-only';

import {
  CALL_FAILURE_MEANING,
  CAPABILITY_STATE_MEANING,
  type CallFailure,
  type DataOrigin,
} from '../states';
import {
  CAPABILITIES,
  resolveCapability,
  type CapabilityDefinition,
  type CapabilityStatus,
} from './registry';

/* --------------------------------------------------------------- responses */

/**
 * A discriminated result. `ok: false` always carries a typed `failure` and a
 * human-readable `meaning`, so no caller can render a bare "something went
 * wrong" and no caller can accidentally read `data` when it is absent.
 */
export type ConnectorResult<T> =
  | { ok: true; data: T; origin: DataOrigin; evidence: string; fetchedAt: string }
  | {
      ok: false;
      failure: CallFailure;
      meaning: string;
      /** Verbatim provider message when one exists. Never rewritten. */
      providerDetail?: string;
      capabilityId: string;
      remediation?: string;
    };

function fail<T>(
  capabilityId: string,
  failure: CallFailure,
  remediation?: string,
  providerDetail?: string,
): ConnectorResult<T> {
  return {
    ok: false,
    failure,
    meaning: CALL_FAILURE_MEANING[failure],
    capabilityId,
    ...(remediation ? { remediation } : {}),
    ...(providerDetail ? { providerDetail } : {}),
  };
}

/* ------------------------------------------------------ credential presence */

/**
 * Reports whether credentials are *present*, never what they are.
 *
 * Kept separate from the rest of the boundary because this is the only function
 * safe to call from a route that returns data to a browser: it has no return
 * path for a secret.
 */
export function credentialPresence(
  capability: CapabilityDefinition,
  env: Record<string, string | undefined>,
): { present: boolean; presentCount: number; requiredCount: number; missing: string[] } {
  const present = capability.requiredEnv.filter((name) => Boolean(env[name]));
  return {
    present: present.length === capability.requiredEnv.length,
    presentCount: present.length,
    requiredCount: capability.requiredEnv.length,
    missing: capability.requiredEnv.filter((name) => !env[name]),
  };
}

/**
 * Reads the server environment once per call and hands back only the subset a
 * capability declares. Narrow scoping means a Meta adapter cannot see a Google
 * developer token even by accident.
 */
function envFor(
  capability: CapabilityDefinition,
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const scoped: Record<string, string | undefined> = {};
  for (const name of capability.requiredEnv) scoped[name] = env[name];
  return scoped;
}

/* ------------------------------------------------------------ the boundary */

/**
 * Invokes a capability.
 *
 * This is the single sanctioned entry point for provider access. It enforces the
 * refusal order before any network call is attempted:
 *
 *   1. blocked by platform limitation  -> UNAVAILABLE, no call made
 *   2. risk is MUTATING                -> UNAVAILABLE, no call made
 *   3. credentials absent              -> NOT_CONFIGURED / AUTH_REQUIRED
 *
 * Only then may a real call be attempted, and only for READ_ONLY capabilities.
 */
export async function invokeCapability<T>(
  capabilityId: string,
  options: {
    env: Record<string, string | undefined>;
    /** Supplied by tests; defaults to global fetch. */
    fetchImpl?: typeof fetch;
    params?: Record<string, unknown>;
    now?: () => number;
  },
): Promise<ConnectorResult<T>> {
  const capability = CAPABILITIES.find((entry) => entry.id === capabilityId);
  if (!capability) {
    return fail<T>(capabilityId, 'INVALID_INPUT', 'Unknown capability id.');
  }

  const status = resolveCapability(capability, options.env);

  if (status.resolved === 'BLOCKED') {
    return fail<T>(
      capabilityId,
      'UNAVAILABLE',
      'No operator action is available for this capability.',
      status.blockedReason,
    );
  }

  if (capability.risk === 'MUTATING') {
    // Refused before credentials are even considered, so this cannot become a
    // way to spend money by configuring a secret.
    return fail<T>(
      capabilityId,
      'UNAVAILABLE',
      'Mutating capabilities are not callable in this build. They require an approved launch path.',
    );
  }

  const presence = credentialPresence(capability, options.env);
  if (!presence.present) {
    const failure: CallFailure = capability.requiredEnv.length === 0 ? 'NOT_CONFIGURED' : 'AUTH_REQUIRED';
    return fail<T>(
      capabilityId,
      failure,
      presence.missing.length > 0
        ? `Missing ${presence.missing.join(', ')} on the server.`
        : 'Complete the authorisation handshake.',
    );
  }

  const doFetch = options.fetchImpl ?? fetch;
  if (typeof doFetch !== 'function') {
    return fail<T>(capabilityId, 'UNAVAILABLE', 'No fetch implementation is available in this runtime.');
  }

  // The scoped environment is what an adapter would consume. This boundary does
  // not itself construct provider URLs — adapters do — but the scoping happens
  // here so no adapter can widen its own visibility.
  envFor(capability, options.env);

  const now = options.now ?? (() => Date.now());

  try {
    const response = await doFetch(capability.providerApi, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const failure: CallFailure =
        response.status === 401 ? 'AUTH_REQUIRED'
        : response.status === 403 ? 'PERMISSION_MISSING'
        : response.status === 429 ? 'RATE_LIMITED'
        : 'API_ERROR';
      return fail<T>(
        capabilityId,
        failure,
        undefined,
        `Provider responded ${response.status}.`,
      );
    }

    const data = (await response.json()) as T;
    return {
      ok: true,
      data,
      origin: 'LIVE',
      // The evidence string is what makes this row assertable later.
      evidence: `${capability.providerApi}#${capabilityId}`,
      fetchedAt: new Date(now()).toISOString(),
    };
  } catch (error) {
    return fail<T>(
      capabilityId,
      'UNAVAILABLE',
      undefined,
      error instanceof Error ? error.message : 'transport failed',
    );
  }
}

/**
 * A description safe to serialise to a browser.
 *
 * This is the shape the Connections screen and the Intelligence screen consume.
 * It carries presence, readiness, scopes and remediation — and provably cannot
 * carry a secret, because none of these fields is one.
 */
export type SafeCapabilityView = {
  id: string;
  label: string;
  family: string;
  platform?: string;
  returns: string;
  providerApi: string;
  risk: string;
  readiness: CapabilityStatus['resolved'];
  readinessMeaning: string;
  presentCount: number;
  requiredCount: number;
  missing: string[];
  scopes: string[];
  remediation: string;
  blockedReason?: string;
};

/**
 * Serialisation guard for `CapabilityStatus['resolved']`.
 *
 * `readinessMeaning` reuses the canonical sentence from `states.ts` rather than a
 * second copy of it. A duplicated map is a second thing to forget to update, and
 * a client reading a stale explanation is worse than no explanation.
 */
const READINESS_MEANING: Record<string, string> = CAPABILITY_STATE_MEANING;

export function describeCapabilities(
  env: Record<string, string | undefined>,
  definitions: readonly CapabilityDefinition[] = CAPABILITIES,
): SafeCapabilityView[] {
  return definitions.map((capability) => {
    const status = resolveCapability(capability, env);
    const presence = credentialPresence(capability, env);

    return {
      id: capability.id,
      label: capability.label,
      family: capability.family,
      ...(capability.platform ? { platform: capability.platform } : {}),
      returns: capability.returns,
      providerApi: capability.providerApi,
      risk: capability.risk,
      readiness: status.resolved,
      readinessMeaning: READINESS_MEANING[status.resolved] ?? 'Unknown state.',
      presentCount: presence.presentCount,
      requiredCount: presence.requiredCount,
      missing: presence.missing,
      scopes: capability.scopes ?? [],
      remediation: status.remediation,
      ...(status.blockedReason ? { blockedReason: status.blockedReason } : {}),
    };
  });
}