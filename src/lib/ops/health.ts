/**
 * Deployment health: what was actually checked, and what the answer means.
 *
 * The previous endpoint answered one question per integration — "is the
 * configuration present?" — and published the answer under names that read as
 * operational status (`services.supabase: false`). Two things were wrong with
 * that, and both were visible from production:
 *
 *   1. Presence is not reachability. `false` said nothing about whether the
 *      service was up; `true` would have said nothing either. A deployment can
 *      hold a valid key and still be unable to use it.
 *   2. Presence was measured against the environment only, while the
 *      application itself falls back to a built-in Supabase project
 *      (`src/lib/supabase/config.ts`). The endpoint therefore reported
 *      `supabase: false` on a deployment that was reading and writing that
 *      project — a false statement about a live system.
 *
 * So the two questions are now separated and named:
 *
 *   configured  what the deployment has: environment values, and the
 *               application-level fallbacks that count as configuration too.
 *               A boolean, a transport name and a count. No values, ever.
 *   verified    what was actually observed: a bounded, cached reachability
 *               probe of the one service that can be probed without spending
 *               money or sending anything to a customer. Services that cannot
 *               be probed say so instead of guessing.
 *
 * Nothing here is a secret: the response contains booleans, a count, a
 * transport name, a latency and a reason. A credential value never appears in
 * the payload, in a log line, or in a failure reason.
 */

/** Where a service's configuration came from. */
export type ServiceSource = 'environment' | 'fallback' | 'none';

/** How a customer enquiry would leave the deployment, when one can. */
export type ContactTransport = 'email' | 'webhook' | 'none';

export type ServiceConfiguration = {
  supabase: { configured: boolean; source: ServiceSource };
  bridge: { configured: boolean; source: ServiceSource };
  contact: { configured: boolean; transport: ContactTransport; source: ServiceSource };
  providers: { configured: number; source: ServiceSource };
};

/** The outcome of one bounded observation. `ok: null` means "not observed". */
export type Verification = {
  ok: boolean | null;
  latencyMs?: number;
  checkedAt?: string;
  reason?: string;
};

export type VerificationReport = {
  supabase: Verification;
  bridge: Verification;
  contact: Verification;
  providers: Verification;
};

/**
 * Provider credentials the deployment can hold.
 *
 * Names only, and only as a count in the response. The list itself is the
 * inventory of what the site can talk to; the values stay in the environment.
 */
export const PROVIDER_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'MISTRAL_API_KEY',
  'DEEPSEEK_API_KEY',
  'DASHSCOPE_API_KEY',
  'GROK_OPENROUTER_API_KEY',
  'OPENCODE_GO_API_KEY',
  'OLLAMA_API_KEY',
  'LM_API_TOKEN',
  'KNOUX_BUILD_LLM_API_KEY',
] as const;

export type EnvironmentLike = Record<string, string | undefined>;

export type FallbackConfiguration = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

function present(env: EnvironmentLike, key: string): boolean {
  return Boolean(env[key]?.trim());
}

/**
 * Resolves the effective configuration of a deployment.
 *
 * The Supabase fallback is passed in rather than imported, so the rule can be
 * exercised without touching the process environment: the application decides
 * what its fallback is, and this function decides what that means for the
 * health report.
 */
export function resolveServiceConfiguration(
  env: EnvironmentLike,
  fallback: FallbackConfiguration = {},
): ServiceConfiguration {
  const environmentUrl = present(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const environmentKey =
    present(env, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    present(env, 'SUPABASE_SERVICE_ROLE_KEY');

  const fallbackUrl = Boolean(fallback.supabaseUrl?.trim());
  const fallbackKey = Boolean(fallback.supabaseKey?.trim());

  const supabaseConfigured = (environmentUrl || fallbackUrl) && (environmentKey || fallbackKey);
  const supabaseSource: ServiceSource = !supabaseConfigured
    ? 'none'
    : environmentUrl && environmentKey
      ? 'environment'
      : 'fallback';

  const bridgeConfigured = present(env, 'KNOUX_CONTROL_PLANE_URL');

  const emailConfigured = present(env, 'RESEND_API_KEY');
  const webhookConfigured = present(env, 'CONTACT_WEBHOOK_URL');
  const contactTransport: ContactTransport = emailConfigured
    ? 'email'
    : webhookConfigured
      ? 'webhook'
      : 'none';

  const providerCount = PROVIDER_KEYS.filter((key) => present(env, key)).length;

  return {
    supabase: { configured: supabaseConfigured, source: supabaseSource },
    bridge: { configured: bridgeConfigured, source: bridgeConfigured ? 'environment' : 'none' },
    contact: {
      configured: contactTransport !== 'none',
      transport: contactTransport,
      source: contactTransport === 'none' ? 'none' : 'environment',
    },
    providers: {
      configured: providerCount,
      source: providerCount > 0 ? 'environment' : 'none',
    },
  };
}

/**
 * The reason a customer enquiry cannot be delivered right now.
 *
 * A site with no delivery transport is not able to receive a customer, however
 * well the rest of it renders. This is the one configuration gap that makes a
 * deployment not ready to serve, so it is the one that is reported.
 */
export function readinessBlockers(configuration: ServiceConfiguration): string[] {
  const blockers: string[] = [];
  if (!configuration.contact.configured) blockers.push('contact_transport_missing');
  return blockers;
}

export type SupabaseProbeOptions = {
  url?: string;
  key?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * A bounded reachability probe of the Supabase project.
 *
 * `GET {url}/auth/v1/health` is the cheapest endpoint the project exposes: a
 * short JSON body, no data, no writes, no cost. A response of any status
 * proves the project answered; a 401 or 403 additionally proves the key was
 * refused, which is a different fact and is reported as one.
 *
 * The probe never raises: a deployment that cannot be reached is reported as
 * unreachable, not as a failed request.
 */
export async function probeSupabase(options: SupabaseProbeOptions = {}): Promise<Verification> {
  const { url, key, fetchImpl = fetch, timeoutMs = 3000, now = () => new Date() } = options;
  const target = url?.trim();
  const credential = key?.trim();

  if (!target || !credential) {
    return { ok: false, reason: 'not_configured', checkedAt: now().toISOString() };
  }

  const started = now().getTime();
  try {
    const response = await fetchImpl(`${target.replace(/\/+$/, '')}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: credential },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const latencyMs = Math.max(0, now().getTime() - started);
    if (response.ok) {
      return { ok: true, latencyMs, checkedAt: now().toISOString() };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        latencyMs,
        checkedAt: now().toISOString(),
        reason: 'the project answered but refused the configured key',
      };
    }
    return {
      ok: false,
      latencyMs,
      checkedAt: now().toISOString(),
      reason: `the project answered with status ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      latencyMs: Math.max(0, now().getTime() - started),
      checkedAt: now().toISOString(),
      reason: 'the project could not be reached',
    };
  }
}

/**
 * The verification report for a deployment.
 *
 * Only Supabase is probed. The other services cannot be observed without
 * either spending money, sending a message to a customer, or asking a local
 * machine that is not there — so they report `ok: null` with the reason, which
 * is the honest answer rather than a guess.
 */
export async function buildVerificationReport(
  configuration: ServiceConfiguration,
  options: { supabase?: SupabaseProbeOptions; supabaseConfigured?: boolean } = {},
): Promise<VerificationReport> {
  const supabase = configuration.supabase.configured
    ? await probeSupabase(options.supabase ?? {})
    : { ok: false, reason: 'not_configured' };

  return {
    supabase,
    bridge: configuration.bridge.configured
      ? {
          ok: null,
          reason:
            'the control plane is a separately deployed machine; reachability is reported by the bridge, not from here',
        }
      : { ok: null, reason: 'not_configured' },
    contact: configuration.contact.configured
      ? {
          ok: null,
          reason:
            'delivery is verified by the enquiry itself; probing it would send a message to a customer',
        }
      : { ok: null, reason: 'not_configured' },
    providers: {
      ok: null,
      reason: 'provider calls are billable; presence is reported, calls are not made to find out',
    },
  };
}
