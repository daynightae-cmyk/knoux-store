/**
 * What this deployment is, and who may read it.
 *
 * Two facts, one module, and no imports — which is the point. Both were
 * previously spread across five route files, and they drifted:
 *
 *   - the environment. `project` derived it from `VERCEL_ENV` while `file`,
 *     `git`, `providers` and `verify` hard-coded `production`. The same adapter
 *     then reported a different environment depending on which route asked, and
 *     the interface could show a checkout as production on one panel and local
 *     on the next. A hard-coded value is not a derived one.
 *
 *   - who may read the workspace. It was nobody's business but the route
 *     handler's, so it was nobody's decision.
 *
 * The environment is derived exactly once, and never from a request body, a
 * query parameter or a header. A caller must not be able to ask "is this local
 * mode?" and get an answer that changes what the adapter will do.
 *
 * Zero imports, deliberately. A policy that cannot be loaded without a
 * framework, a bundler alias or a request context in scope cannot be tested by
 * running it — and the previous redirect guard is exactly the failure that
 * assumption produces.
 */

/* ------------------------------------------------------------- environment */

export type EnvironmentName = 'local' | 'preview' | 'production';

const ENVIRONMENTS: readonly EnvironmentName[] = ['local', 'preview', 'production'];

/** Human-readable names, chosen once so no route invents its own wording. */
export const ENVIRONMENT_LABELS: Record<EnvironmentName, string> = {
  local: 'Read-only local checkout',
  preview: 'Read-only preview checkout',
  production: 'Read-only production checkout',
};

export function isEnvironmentName(value: unknown): value is EnvironmentName {
  return typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
}

/**
 * Precedence is explicit and ordered rather than a chain of ternaries spread
 * across five route files:
 *
 *   1. `KNOUX_BUILD_ENVIRONMENT` — an operator override for a host whose
 *      platform variable is absent or misleading (a container, a preview box).
 *      Validated against the closed set, so a typo degrades to the next source
 *      instead of inventing a fourth environment.
 *   2. `VERCEL_ENV` — what the platform reports.
 *   3. `NODE_ENV` — the runtime's own judgement, `production` for a production
 *      build and `development` for a dev server.
 *   4. `local`, the honest answer when nothing is declared.
 */
export function resolveDeploymentEnvironment(
  env: Record<string, string | undefined> = process.env,
): EnvironmentName {
  const override = env.KNOUX_BUILD_ENVIRONMENT;
  if (isEnvironmentName(override)) return override;

  const vercel = env.VERCEL_ENV;
  if (vercel === 'production' || vercel === 'preview') return vercel;

  if (env.NODE_ENV === 'production') return 'production';

  return 'local';
}

export function environmentLabel(environment: EnvironmentName): string {
  return ENVIRONMENT_LABELS[environment];
}

/* ------------------------------------------------------------ access policy */

export const BUILD_API_DENIED = 'build-workspace-authentication-required';

/** One wording for the boundary, so no handler phrases it differently. */
export const DENIAL_MESSAGE =
  'The KNOuX DEV workspace reads this deployment. Sign in to inspect it. This endpoint is not a public API.';

/**
 * The workspace reads the deployment's own checkout: a file inventory, Git
 * metadata, and the presence of server-side environment variables. None of that
 * is a secret in the cryptographic sense — the repository is public — but the
 * inventory of a running deployment is not a public document. It describes the
 * machine, and it cost real CPU and I/O to produce: one `/project` request
 * walks thousands of files and `/git` spawns a process.
 *
 * So:
 *
 *   - `local`      a developer on their own machine, reading their own checkout.
 *                  Anonymous by design; there is no attacker to defend against,
 *                  and requiring a sign-in would break local work for nothing.
 *   - `preview` /
 *     `production` reachable over the internet. Requires a verified Supabase
 *                  session, server-side. Hiding the controls in the browser is
 *                  not a control: the route answers a bare `curl` regardless of
 *                  what the interface renders.
 *
 * A preview URL is treated as public on purpose. Preview deployments are
 * reachable by anyone holding the link, and "only a few people have it" is a
 * property of distribution, not of access control.
 *
 * `KNOUX_BUILD_PUBLIC=1` is the single documented opt-out, for a deployment
 * that is deliberately an anonymous demo. It is opt-in and exact; a near-miss
 * spelling does not count.
 */
export type BuildAccess =
  | { allowed: true; reason: 'local-checkout' | 'explicitly-public' | 'authenticated'; userId?: string }
  | { allowed: false; status: 401; code: typeof BUILD_API_DENIED; message: string };

export function evaluateBuildAccess(
  env: Record<string, string | undefined> = process.env,
): BuildAccess {
  if (env.KNOUX_BUILD_PUBLIC === '1') {
    return { allowed: true, reason: 'explicitly-public' };
  }
  const environment: EnvironmentName = resolveDeploymentEnvironment(env);
  if (environment === 'local') {
    return { allowed: true, reason: 'local-checkout' };
  }
  return {
    allowed: false,
    status: 401,
    code: BUILD_API_DENIED,
    message: DENIAL_MESSAGE,
  };
}

/** True when this deployment demands a verified session. */
export function requiresSession(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return !evaluateBuildAccess(env).allowed;
}
