import { NextResponse } from 'next/server';
import {
  buildVerificationReport,
  readinessBlockers,
  resolveServiceConfiguration,
  type VerificationReport,
} from '@/lib/ops/health';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/**
 * Deployment health, briefly and without secrets.
 *
 * Two questions, kept apart and named:
 *
 *   configured  what this deployment holds, including the application-level
 *               fallbacks it actually uses. Booleans, a transport name and a
 *               count — never a value.
 *   verified    what was observed. One bounded, cached reachability probe of
 *               the Supabase project, which costs nothing and sends nothing.
 *               Everything else reports `ok: null` with the reason it was not
 *               observed, because guessing is worse than saying so.
 *
 * `ready` is the customer-facing answer: a deployment that cannot receive an
 * enquiry is not ready, however healthy the rest of it is. The endpoint still
 * answers 200 — the process is alive — and states the blocker in `blockers`.
 *
 * `force-dynamic` because a statically optimised handler would answer with
 * whatever the environment was at build time.
 */
export const dynamic = 'force-dynamic';

const VERIFY_CACHE_MS = 60_000;

let cachedVerification: { at: number; report: VerificationReport } | null = null;

async function verificationReport(force: boolean): Promise<VerificationReport> {
  if (!force && cachedVerification && Date.now() - cachedVerification.at < VERIFY_CACHE_MS) {
    return cachedVerification.report;
  }
  const configuration = resolveServiceConfiguration(process.env, {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_PUBLISHABLE_KEY,
  });
  const report = await buildVerificationReport(configuration, {
    supabase: { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY },
  });
  cachedVerification = { at: Date.now(), report };
  return report;
}

export async function GET(request: Request) {
  const configuration = resolveServiceConfiguration(process.env, {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_PUBLISHABLE_KEY,
  });
  const force = new URL(request.url).searchParams.get('verify') === '1';
  const verified = await verificationReport(force);
  const blockers = readinessBlockers(configuration);

  return NextResponse.json(
    {
      status: 'ok',
      ready: blockers.length === 0,
      environment: process.env.VERCEL_ENV ?? 'local',
      checked: 'configuration-and-reachability',
      services: {
        supabase: configuration.supabase.configured,
        bridge: configuration.bridge.configured,
        contact: configuration.contact.configured,
        providers: configuration.providers.configured,
      },
      sources: {
        supabase: configuration.supabase.source,
        contact: configuration.contact.transport,
        providers: configuration.providers.source,
      },
      verified,
      blockers,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
