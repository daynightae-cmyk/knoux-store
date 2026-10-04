/**
 * KNOuX Growth — state vocabulary.
 *
 * Every surface in the Command Center that could otherwise be tempted into
 * lying has exactly one vocabulary, defined here. The rule inherited from
 * KNOuX Repair (`05-KNOUX-Safety-and-Approval-Policy.txt`) is *truth over
 * confidence*, and from the tool contract (`06-KNOUX-Tool-Execution-Contract.txt`)
 * it is *preserve exact states ... never translate failure into success*.
 *
 * Consequently there is deliberately no generic `ERROR` and no
 * `Something went wrong`. Each state names what is actually known, and each
 * carries the remediation a human can take. Adding a state is a review event:
 * it changes what the product is allowed to assert.
 */

/* -------------------------------------------------------------- integrations */

/**
 * Lifecycle of a single platform connection (one client's Meta account, one
 * Google Ads customer, one WhatsApp Business account...).
 *
 * NOT_CONNECTED and NOT_CONFIGURED are deliberately distinct. NOT_CONNECTED
 * means the operator has not started; NOT_CONFIGURED means the product itself
 * has no credential path for that platform, so starting would be theatre.
 */
export type ConnectionState =
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'EXPIRED'
  | 'PERMISSION_REQUIRED'
  | 'ERROR'
  | 'BLOCKED'
  | 'NOT_CONFIGURED';

export const CONNECTION_STATES: readonly ConnectionState[] = [
  'NOT_CONNECTED',
  'CONNECTING',
  'CONNECTED',
  'EXPIRED',
  'PERMISSION_REQUIRED',
  'ERROR',
  'BLOCKED',
  'NOT_CONFIGURED',
];

/** Human-readable consequence of each state, shown verbatim in the UI. */
export const CONNECTION_STATE_MEANING: Readonly<Record<ConnectionState, string>> = {
  NOT_CONNECTED: 'No credentials have been supplied for this platform.',
  CONNECTING: 'An authorisation handshake is in progress.',
  CONNECTED: 'Credentials are held server-side and a live call has succeeded.',
  EXPIRED: 'Credentials were held but the grant is no longer valid. Reconnect.',
  PERMISSION_REQUIRED:
    'Authenticated, but the granted scopes do not cover this capability. Grant more scopes.',
  ERROR: 'The last live call failed. The platform response is preserved verbatim.',
  BLOCKED: 'The platform refused this account or region. Operator action required.',
  NOT_CONFIGURED:
    'KNOuX has no credential path wired for this platform yet. The adapter exists; the secret does not.',
};

/**
 * Capability readiness — how far a single named capability actually is.
 *
 * This is the vocabulary the mission requires for reporting. `LIVE_VERIFIED`
 * is only ever set by a runtime call that returned real provider data, and the
 * runtime records the evidence with it (see `evidence` in ConnectorStatus).
 */
export type CapabilityState =
  | 'UI_READY'
  | 'ADAPTER_READY'
  | 'CONFIG_REQUIRED'
  | 'AUTH_REQUIRED'
  | 'DEMO_ONLY'
  | 'LIVE_VERIFIED'
  | 'BLOCKED';

export const CAPABILITY_STATES: readonly CapabilityState[] = [
  'UI_READY',
  'ADAPTER_READY',
  'CONFIG_REQUIRED',
  'AUTH_REQUIRED',
  'DEMO_ONLY',
  'LIVE_VERIFIED',
  'BLOCKED',
];

export const CAPABILITY_STATE_MEANING: Readonly<Record<CapabilityState, string>> = {
  UI_READY: 'The screen exists and renders truthful empty states. No adapter behind it.',
  ADAPTER_READY: 'A server-side adapter is implemented and callable, but holds no credential.',
  CONFIG_REQUIRED: 'An adapter exists and needs an environment secret or client id to be set.',
  AUTH_REQUIRED: 'Configuration is complete; an operator must complete OAuth to proceed.',
  DEMO_ONLY: 'Only clearly-labelled non-production fixture data can be shown.',
  LIVE_VERIFIED: 'A real provider call returned real data and the evidence is recorded.',
  BLOCKED: 'Cannot proceed without credentials, external approval, or a destructive change.',
};

/**
 * LIVE_VERIFIED is the only state that may assert a platform fact. Guard every
 * place that would otherwise reach for it.
 */
export function mayAssertPlatformFact(state: CapabilityState): boolean {
  return state === 'LIVE_VERIFIED';
}

/* ------------------------------------------------------- capability failures */

/**
 * Failure taxonomy required by the mission. These are *outcomes of a call*,
 * distinct from the standing `CapabilityState` of the capability itself.
 */
export type CallFailure =
  | 'NOT_CONFIGURED'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'UNAVAILABLE'
  | 'PARTIAL_DATA'
  | 'INVALID_INPUT';

export const CALL_FAILURES: readonly CallFailure[] = [
  'NOT_CONFIGURED',
  'AUTH_REQUIRED',
  'PERMISSION_MISSING',
  'RATE_LIMITED',
  'API_ERROR',
  'UNAVAILABLE',
  'PARTIAL_DATA',
  'INVALID_INPUT',
];

export const CALL_FAILURE_MEANING: Readonly<Record<CallFailure, string>> = {
  NOT_CONFIGURED: 'No server-side credential is configured for this capability.',
  AUTH_REQUIRED: 'A credential is required. Complete the authorisation handshake.',
  PERMISSION_MISSING: 'The credential is valid but lacks the scope this capability needs.',
  RATE_LIMITED: 'The provider throttled the request. Retry is safe for read-only calls.',
  API_ERROR: 'The provider returned an error. Its own message is preserved, not replaced.',
  UNAVAILABLE: 'The capability cannot run here at all, by design or by platform limitation.',
  PARTIAL_DATA: 'Some requested fields were unavailable. The gaps are reported as gaps.',
  INVALID_INPUT: 'The request was rejected before dispatch because it was malformed.',
};

export function isCallFailure(value: unknown): value is CallFailure {
  return typeof value === 'string' && (CALL_FAILURES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------- risk */

/**
 * Risk levels are inherited verbatim from the KNOuX Repair safety policy
 * (RISK LEVEL 0..3). Advertising money and published brand content are at
 * least as consequential as a firewall rule, so the scale is not redefined —
 * it is reused, which is what keeps one approval model across the institution.
 */
export type RiskLevel = 0 | 1 | 2 | 3;

export const RISK_LEVEL_MEANING: Readonly<Record<RiskLevel, string>> = {
  0: 'READ ONLY. Observation and analysis. May be suggested freely.',
  1: 'LOW-RISK REVERSIBLE. Draft content, internal notes, saved lists. Ask before state changes.',
  2: 'PRIVILEGED CHANGE. Spends money, publishes publicly, or mutates a live account. Full disclosure plus explicit approval.',
  3: 'DESTRUCTIVE / HIGH IMPACT. Irreversible or broadly visible brand and budget action. Strongest confirmation and preview.',
};

/** Actions at or above this level can never execute without human approval. */
export const APPROVAL_REQUIRED_AT: RiskLevel = 2;

/* ------------------------------------------------------------- autonomy */

/**
 * Autonomy modes. COPILOT is the default and the only mode the shipped UI
 * offers as selectable; AUTOPILOT exists as an architecture slot with no
 * enabling code path, by design.
 */
export type AutonomyMode = 'ADVISOR' | 'COPILOT' | 'AUTOPILOT';

export const AUTONOMY_MODES: readonly AutonomyMode[] = ['ADVISOR', 'COPILOT', 'AUTOPILOT'];

export const DEFAULT_AUTONOMY: AutonomyMode = 'COPILOT';

export const AUTONOMY_MEANING: Readonly<Record<AutonomyMode, string>> = {
  ADVISOR: 'Analysis only. KNOuX explains and recommends; it prepares no executable action.',
  COPILOT:
    'KNOuX prepares concrete actions and holds them for a named human to approve. Default.',
  AUTOPILOT:
    'Reserved for future explicitly-scoped policies. No enabling code path exists in this build.',
};

export const SELECTABLE_AUTONOMY: readonly AutonomyMode[] = ['ADVISOR', 'COPILOT'];

/** Whether a given risk level may execute without approval under a mode. */
export function autonomyPermits(mode: AutonomyMode, risk: RiskLevel): boolean {
  if (risk < APPROVAL_REQUIRED_AT) return mode !== 'ADVISOR' || risk === 0;
  return false;
}

/* ------------------------------------------------------------ data origin */

/**
 * Whether a value came from a provider or from a fixture. This is the last line
 * of defence against a demo number being rendered as a production number.
 */
export type DataOrigin = 'LIVE' | 'FIXTURE';

export const FIXTURE_NOTICE =
  'DEMO DATA — non-production fixtures. Not a live platform value.';

export function isFixtureSourced(origin: DataOrigin): boolean {
  return origin === 'FIXTURE';
}

/**
 * Wraps a value so its provenance travels with it instead of living in a
 * comment. A metric is only ever rendered through this shape.
 */
export type Sourced<T> = {
  value: T;
  origin: DataOrigin;
  /** Set when `origin` is LIVE. Names the provider and the call that produced it. */
  evidence?: string;
};

export function live<T>(value: T, evidence: string): Sourced<T> {
  return { value, origin: 'LIVE', evidence };
}

export function fixture<T>(value: T): Sourced<T> {
  return { value, origin: 'FIXTURE' };
}

export function mapSourced<T, U>(source: Sourced<T>, fn: (value: T) => U): Sourced<U> {
  return { value: fn(source.value), origin: source.origin, evidence: source.evidence };
}

/** Reads a sourced value, returning `null` when it must not be displayed as real. */
export function readIfLive<T>(source: Sourced<T>): T | null {
  return source.origin === 'LIVE' ? source.value : null;
}