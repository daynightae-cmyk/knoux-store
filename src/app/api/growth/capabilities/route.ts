import { NextResponse } from 'next/server';
import { describeCapabilities } from '@/lib/growth/connectors/boundary';
import { resolveAll, summariseCapabilities, requiredEnvNames } from '@/lib/growth/connectors/registry';

export const dynamic = 'force-dynamic';

/**
 * Capability registry, as a client-safe projection.
 *
 * The Connections screen and the Intelligence screen read the same resolution
 * the server would use, rather than reimplementing it in the browser — a browser
 * copy of this logic would eventually disagree with the server about whether a
 * credential exists.
 *
 * `describeCapabilities` has no return path for a secret, which is what makes
 * this endpoint safe to expose. Only presence counts and env var names leave.
 */
export async function GET() {
  const capabilities = describeCapabilities(process.env);
  const summary = summariseCapabilities(resolveAll(process.env));

  return NextResponse.json(
    {
      summary,
      capabilities,
      // Names only. This is how an operator learns what to configure.
      requiredEnv: requiredEnvNames(),
      notice:
        'No capability below is LIVE_VERIFIED. That state requires a real authenticated provider call in this process, and none has occurred.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}