import { NextResponse, type NextRequest } from 'next/server';
import { providerStatuses } from '@/lib/build/providers';
import { resolveDeploymentEnvironment } from '@/lib/build/adapter-factory';
import { guardBuildApi } from '@/lib/build/api-guard';
import type { EnvironmentSignal } from '@/lib/build/types';

export const dynamic = 'force-dynamic';

/**
 * Configuration *presence*, for a signed-in operator.
 *
 * This route is behind the workspace boundary, so the operator has already
 * proved they are allowed to see how this deployment is configured. What is
 * still never done here is returning a value: no entry carries a secret, no
 * entry is truncated-and-returned, and no entry is marked present on the basis
 * of a `NEXT_PUBLIC_` variable — a public variable is by definition already in
 * the browser bundle, so its presence tells nobody anything and is labelled
 * `public` to make that explicit.
 *
 * `sensitive` marks the entries whose existence is itself a disclosure. The
 * operator may enable them; an anonymous caller learns nothing, because the
 * anonymous caller never reaches this handler.
 */
const SIGNALS: {
  name: string;
  scope: EnvironmentSignal['scope'];
  purpose: string;
  sensitive: boolean;
}[] = [
  { name: 'OPENAI_API_KEY', scope: 'server-only', purpose: 'OpenAI provider', sensitive: true },
  { name: 'ANTHROPIC_API_KEY', scope: 'server-only', purpose: 'Anthropic provider', sensitive: true },
  { name: 'GOOGLE_GENERATIVE_AI_API_KEY', scope: 'server-only', purpose: 'Google provider', sensitive: true },
  { name: 'OPENROUTER_API_KEY', scope: 'server-only', purpose: 'OpenRouter provider', sensitive: true },
  { name: 'GROQ_API_KEY', scope: 'server-only', purpose: 'Groq provider', sensitive: true },
  { name: 'MISTRAL_API_KEY', scope: 'server-only', purpose: 'Mistral provider', sensitive: true },
  { name: 'DEEPSEEK_API_KEY', scope: 'server-only', purpose: 'DeepSeek provider', sensitive: true },
  { name: 'KNOUX_BUILD_LLM_ENDPOINT', scope: 'server-only', purpose: 'OpenAI-compatible endpoint', sensitive: false },
  { name: 'KNOUX_BUILD_LLM_API_KEY', scope: 'server-only', purpose: 'OpenAI-compatible endpoint', sensitive: true },
  { name: 'SUPABASE_URL', scope: 'server-only', purpose: 'Database studio', sensitive: false },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', scope: 'server-only', purpose: 'Database studio, elevated write', sensitive: true },
  { name: 'DATABASE_URL', scope: 'server-only', purpose: 'Postgres adapter', sensitive: true },
  { name: 'CONTACT_WEBHOOK_URL', scope: 'server-only', purpose: 'Contact delivery', sensitive: true },
  { name: 'KNOUX_BUILD_ALLOW_VERIFY', scope: 'server-only', purpose: 'Allowlisted verification runner', sensitive: false },
];

export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'environment' });
  if (denied) return denied;

  const signals: EnvironmentSignal[] = SIGNALS.map((signal) => {
    const value = process.env[signal.name];
    return {
      name: signal.name,
      present: typeof value === 'string' && value.trim().length > 0,
      scope: signal.scope,
      purpose: signal.purpose,
      ...(signal.sensitive ? { sensitive: true } : {}),
    } as EnvironmentSignal;
  });

  const providers = providerStatuses(process.env);
  const allowVerify = process.env.KNOUX_BUILD_ALLOW_VERIFY === '1';

  return NextResponse.json(
    {
      environment: resolveDeploymentEnvironment(),
      signals,
      providers,
      verificationRunner: {
        enabled: allowVerify,
        allowedTasks: ['lint', 'typecheck', 'test', 'build'],
        reason: allowVerify
          ? 'The allowlisted runner is enabled. Only these four package scripts can be invoked, with a fixed argument vector.'
          : 'Disabled on this deployment. Set KNOUX_BUILD_ALLOW_VERIFY=1 on a trusted host to enable it. Running arbitrary commands is never possible.',
      },
      note: 'Values are never returned. Only presence is reported, and only to a signed-in operator.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
