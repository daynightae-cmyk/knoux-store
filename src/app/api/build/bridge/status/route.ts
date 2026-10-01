import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { loadBridgeConfig, measureBridgeStatus } from '@/lib/build/bridge-config';
import { mintTicket } from '@/lib/build/bridge-tickets';

export const dynamic = 'force-dynamic';

/**
 * Bridge status — the single source of truth for every bridge-dependent panel.
 *
 * Reachability is the bridge's own /v1/health answer to this request. Capabilities
 * come from the handshake, which requires a ticket scoped to that bridge id, so
 * they are present only when a bridge answered and accepted us.
 *
 * Nothing here is optimistic: an unconfigured, unpaired, or unreachable bridge
 * reports that fact rather than an assumed-online state.
 */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'bridge' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to read bridge status.' },
      { status: 401 },
    );
  }

  const config = await loadBridgeConfig({ ownerId });

  const status = await measureBridgeStatus(config, {
    ...(config.keys && config.endpoint
      ? {
          ticketFactory: (audience: string) => mintTicket(
              {
                userId: ownerId,
                sid: `status-${Date.now()}`,
                scopes: ['terminal:open'],
                bridgeId: audience,
              },
              config.keys!,
            ),
        }
      : {}),
  });

  return NextResponse.json(status, { headers: { 'cache-control': 'no-store' } });
}
