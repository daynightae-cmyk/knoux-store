import { NextResponse } from 'next/server';
import { providerStatuses } from '@/lib/build/providers';
import type { EnvironmentSignal } from '@/lib/build/types';

export const dynamic = 'force-dynamic';

/**
 * Configuration *presence* only.
 *
 * Each entry exposes a boolean and a variable name. No value is read into the
 * response, no value is truncated-and-returned, and no entry is marked present
 * on the basis of a `NEXT_PUBLIC_` variable — a public variable is by
 * definition already in the browser bundle, so its presence tells nobody
 * anything and is labelled `public` to make that explicit.
 */
const SIGNALS: { name: string; scope: EnvironmentSignal['scope']; purpose: string }[] = [
  { name: 'OPENAI_API_KEY', scope: 'server-only', purpose: 'OpenAI provider' },
  { name: 'ANTHROPIC_API_KEY', scope: 'server-only', purpose: 'Anthropic provider' },
  { name: 'GOOGLE_GENERATIVE_AI_API_KEY', scope: 'server-only', purpose: 'Google provider' },
  { name: 'OPENROUTER_API_KEY', scope: 'server-only', purpose: 'OpenRouter provider' },
  { name: 'GROQ_API_KEY', scope: 'server-only', purpose: 'Groq provider' },
  { name: 'MISTRAL_API_KEY', scope: 'server-only', purpose: 'Mistral provider' },
  { name: 'DEEPSEEK_API_KEY', scope: 'server-only', purpose: 'DeepSeek provider' },
  { name: 'KNOUX_BUILD_LLM_ENDPOINT', scope: 'server-only', purpose: 'OpenAI-compatible endpoint' },
  { name: 'KNOUX_BUILD_LLM_API_KEY', scope: 'server-only', purpose: 'OpenAI-compatible endpoint' },
  { name: 'SUPABASE_URL', scope: 'server-only', purpose: 'Database studio' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', scope: 'server-only', purpose: 'Database studio, elevated write' },
  { name: 'DATABASE_URL', scope: 'server-only', purpose: 'Postgres adapter' },
  { name: 'CONTACT_WEBHOOK_URL', scope: 'server-only', purpose: 'Contact delivery' },
  { name: 'KNOUX_BUILD_ALLOW_VERIFY', scope: 'server-only', purpose: 'Allowlisted verification runner' },
];

export async function GET() {
  const signals: EnvironmentSignal[] = SIGNALS.map((signal) => {
    const value = process.env[signal.name];
    return {
      name: signal.name,
      present: typeof value === 'string' && value.trim().length > 0,
      scope: signal.scope,
      purpose: signal.purpose,
    };
  });

  const providers = providerStatuses(process.env);
  const allowVerify = process.env.KNOUX_BUILD_ALLOW_VERIFY === '1';

  return NextResponse.json(
    {
      environment:
        process.env.VERCEL_ENV === 'production'
          ? 'production'
          : process.env.VERCEL_ENV === 'preview'
            ? 'preview'
            : 'local',
      signals,
      providers,
      verificationRunner: {
        enabled: allowVerify,
        allowedTasks: ['lint', 'typecheck', 'test', 'build'],
        reason: allowVerify
          ? 'The allowlisted runner is enabled. Only these four package scripts can be invoked, with a fixed argument vector.'
          : 'Disabled on this deployment. Set KNOUX_BUILD_ALLOW_VERIFY=1 on a trusted host to enable it. Running arbitrary commands is never possible.',
      },
      note: 'Values are never returned. Only presence is reported.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
