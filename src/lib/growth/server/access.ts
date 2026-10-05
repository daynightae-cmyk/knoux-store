import { NextResponse } from 'next/server';
import { resolveBuildOwnerId } from '@/lib/build/api-guard';
import { isBuildOperator } from '@/lib/build/operator';
import { checkRequestOrigin } from '@/lib/contact/intake-guard';

/** Demo reasoning stays public; deployment credentials require an operator. */
export async function guardGrowthProviderAccess(request: Request): Promise<Response | null> {
  if (!checkRequestOrigin(request.headers, new URL(request.url).origin).ok) {
    return NextResponse.json({ reason: 'Cross-site intelligence requests are not permitted.' }, { status: 403 });
  }
  if (process.env.KNOUX_AGENT_ENDPOINT && !isBuildOperator(await resolveBuildOwnerId())) {
    return NextResponse.json({ reason: 'An authenticated operator is required to use the configured agent.', failure: 'AUTH_REQUIRED' }, { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  return null;
}
