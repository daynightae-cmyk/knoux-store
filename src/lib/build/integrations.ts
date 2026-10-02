import 'server-only';
import type { IntegrationSnapshot } from './integration-types';
import { EnvironmentSecretStore } from './secret-store';

const presence = (env: Record<string, string | undefined>, key: string) => Boolean(env[key]?.trim());
export function integrationSnapshot(env: Record<string, string | undefined> = process.env): IntegrationSnapshot {
  const github = presence(env, 'KNOUX_BUILD_GITHUB_TOKEN');
  const vercel = presence(env, 'VERCEL_ENV');
  const supabase = presence(env, 'NEXT_PUBLIC_SUPABASE_URL') && (presence(env, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || presence(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  const safe = (value: string | undefined, pattern: RegExp) => value && pattern.test(value) ? value : null;
  return {
    measuredAt: new Date().toISOString(), tools: [], toolsAvailable: false, providerProbeAllowed: false, toolsBlocker: 'Pair a trusted local bridge and explicitly detect tools. Hosted deployments cannot probe your machine.',
    secrets: new EnvironmentSecretStore(env).status(),
    deployment: { source: vercel ? 'vercel-environment' : 'unavailable', environment: vercel ? env.VERCEL_ENV! : null, url: safe(env.VERCEL_URL, /^[a-zA-Z0-9.-]+$/) ? `https://${env.VERCEL_URL}` : null, sha: safe(env.VERCEL_GIT_COMMIT_SHA, /^[a-f0-9]{40}$/), branch: env.VERCEL_GIT_COMMIT_REF ?? null, deploymentId: safe(env.VERCEL_DEPLOYMENT_ID, /^[a-zA-Z0-9_-]+$/) },
    platforms: [
      { id: 'github', label: 'GitHub', requirements: ['KNOUX_BUILD_GITHUB_TOKEN (server only, repository metadata read scope). OAuth user connection is not installed.'], facts: [{ name: 'Public repository metadata', state: 'available', detail: 'GitHub REST API, subject to its rate limits; separate from local Git.' }, { name: 'Private / organization repositories', state: github ? 'configured' : 'unconfigured', detail: github ? 'Server token present. Access is measured only by an explicit repository request.' : 'REQUIRES AUTHENTICATION' }, { name: 'Clone', state: 'blocked', detail: 'Requires paired bridge with project import enabled and an unused destination inside its configured root. Public repositories only.' }] },
      { id: 'vercel', label: 'Vercel', requirements: ['History requires VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID and a history adapter.'], facts: [{ name: 'Current deployment facts', state: vercel ? 'available' : 'unconfigured', detail: vercel ? 'Vercel runtime environment metadata. Does not prove deployment history or health.' : 'This runtime provides no Vercel deployment metadata.' }, { name: 'Deployment history', state: 'blocked', detail: 'REQUIRES CREDENTIALS and history adapter. No history request has been made.' }] },
      { id: 'supabase', label: 'Supabase', requirements: ['Public URL and publishable key; user session and RLS for data operations.'], facts: [{ name: 'Public client', state: supabase ? 'configured' : 'unconfigured', detail: 'Configuration presence only. No values are exposed here.' }, ...['Database read', 'Storage', 'Auth', 'Realtime'].map((name) => ({ name, state: 'unmeasured' as const, detail: 'This integration center has not probed this capability.' })), { name: 'Admin write', state: 'blocked', detail: 'No elevated integration write path. A service credential never grants browser privileges.' }] },
    ],
  };
}
