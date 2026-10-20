import { NextResponse } from 'next/server';

/**
 * Deployment health, briefly and without secrets.
 *
 * Answers one question per integration: is the configuration present? It does
 * not call the integrations, does not read their credentials, and never
 * includes a value from the environment — a boolean and a count are all a
 * caller can branch on, so there is nothing here to leak or to fake.
 *
 * `force-dynamic` because a statically optimised handler would answer with
 * whatever the environment was at build time.
 */
export const dynamic = 'force-dynamic';

const PROVIDER_KEYS = [
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
];

export function GET() {
  const env = process.env;
  const configured = (key: string) => Boolean(env[key]?.trim());
  const services = {
    supabase: configured('NEXT_PUBLIC_SUPABASE_URL')
      && (configured('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || configured('SUPABASE_SERVICE_ROLE_KEY')),
    bridge: configured('KNOUX_CONTROL_PLANE_URL'),
    contact: configured('RESEND_API_KEY') || configured('CONTACT_WEBHOOK_URL'),
    providers: PROVIDER_KEYS.filter(configured).length,
  };
  return NextResponse.json({
    status: 'ok',
    environment: env.VERCEL_ENV ?? 'local',
    services,
  });
}
