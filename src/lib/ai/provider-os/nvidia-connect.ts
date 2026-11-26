import 'server-only';

/**
 * NVIDIA NIM credential resolution for the EXISTING nvidia adapter.
 *
 * Two sources, in priority order:
 *   1. Vercel Connect (deployments): the connector already installed on the
 *      knoux-store project. The SDK authenticates with the deployment's OIDC
 *      token and caches issuance in-process; nothing here touches process.env.
 *   2. Server environment (local development): NVIDIA_API_KEY or
 *      NVIDIA_NIM_API_KEY, read per request from the provider runtime context.
 *
 * The resolved value is placed into the request-scoped provider environment
 * under the adapter's existing variable names — never into global process.env,
 * never into a client bundle, never logged. A missing Connect grant degrades
 * to the environment source; a missing both leaves the adapter honestly
 * unconfigured.
 */

export const NVIDIA_CONNECT_UID = 'integrate.api.nvidia.com/nvidia-nim-api-key-connector';
export const NVIDIA_ENV_NAMES = ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY'] as const;

/** Read the local development credential from a request environment snapshot. */
export function localNvidiaCredential(env: Record<string, string | undefined>): string | null {
  for (const name of NVIDIA_ENV_NAMES) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Resolve the NVIDIA credential for one authorized request.
 *
 * Returns null when no source can provide one; callers must then treat the
 * provider as unconfigured rather than fabricating availability. Errors from
 * Connect are categorized, never echoed with token material.
 */
export async function resolveNvidiaCredential(
  env: Record<string, string | undefined> = process.env,
): Promise<{ credential: string; source: 'vercel-connect' | 'environment' } | null> {
  if (env.VERCEL) {
    try {
      // Imported lazily: the OIDC runtime only exists on Vercel deployments,
      // and a local `next build` must never require or invoke it.
      const { getToken } = await import('@vercel/connect');
      const token = await getToken(NVIDIA_CONNECT_UID, { subject: { type: 'app' } });
      if (token?.trim()) return { credential: token.trim(), source: 'vercel-connect' };
    } catch {
      // Connect unavailable/misconfigured on this deployment: fall through to
      // the environment source. The adapter's own probe reports the real
      // authentication outcome; nothing here claims success.
    }
  }
  const local = localNvidiaCredential(env);
  return local ? { credential: local, source: 'environment' } : null;
}

/**
 * Prepare the request-scoped environment for the nvidia adapter.
 *
 * Called inside the authorized provider request boundary. When the scoped
 * runtime already supplied a credential (vault profile or operator ENV
 * reference) it is preserved untouched. Otherwise Connect/env resolution
 * fills the adapter's declared variable for THIS request only.
 */
export async function hydrateNvidiaEnvironment(
  contextEnv: Record<string, string | undefined>,
  serverEnv: Record<string, string | undefined> = process.env,
): Promise<'preserved' | 'vercel-connect' | 'environment' | 'unavailable'> {
  if (localNvidiaCredential(contextEnv)) return 'preserved';
  const resolved = await resolveNvidiaCredential(serverEnv);
  if (!resolved) return 'unavailable';
  contextEnv.NVIDIA_API_KEY = resolved.credential;
  return resolved.source;
}
