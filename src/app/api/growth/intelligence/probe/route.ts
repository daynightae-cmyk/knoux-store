import { NextResponse } from 'next/server';
import { buildRouter } from '@/lib/growth/server/runtime';
import { guardGrowthProviderAccess } from '@/lib/growth/server/access';

export const dynamic = 'force-dynamic';

/**
 * Provider liveness for the Intelligence screen.
 *
 * Read-only and cheap. It reports what `probe()` actually found rather than
 * whether a credential *looks* present, because the screen's job is to say
 * whether intelligence is degraded — and a screen that inferred that from the
 * environment would be able to claim a healthy agent that has never answered.
 *
 * The response deliberately omits the endpoint URL and any token detail: an
 * operator needs to know the agent is unreachable, not where it lives.
 */
export async function GET(request: Request) {
  const denied = await guardGrowthProviderAccess(request);
  if (denied) return denied;
  const router = buildRouter();
  const survey = await router.survey();
  const primary = survey.find((entry) => entry.provider.tier === 'primary');
  const fallback = survey.find((entry) => entry.provider.tier === 'fallback');

  return NextResponse.json(
    {
      reachable: primary?.probe.reachable ?? false,
      verified: primary?.probe.verified ?? false,
      failure: primary?.probe.failure ?? null,
      detail: primary?.probe.detail ?? 'No primary provider is registered.',
      families: primary?.probe.families ?? [],
      fallback: fallback
        ? {
            providerId: fallback.provider.providerId,
            reachable: fallback.probe.reachable,
            verified: fallback.probe.verified,
          }
        : null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
