import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { integrationSnapshot } from '@/lib/build/integrations';
import { isBuildOperator } from '@/lib/build/operator';
import { loadBridgeConfig, measureBridgeStatus } from '@/lib/build/bridge-config';
import { mintTicket } from '@/lib/build/bridge-tickets';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'integrations' }); if (denied) return denied;
  const snapshot = integrationSnapshot();
  const ownerId = await resolveBuildOwnerId();
  snapshot.providerProbeAllowed = isBuildOperator(ownerId);
  const github = snapshot.platforms.find((p) => p.id === 'github')?.facts.find((f) => f.name.startsWith('Private'));
  if (github?.state === 'configured' && !isBuildOperator(ownerId)) { github.state = 'blocked'; github.detail = 'A deployment token exists, but access requires an authenticated account in KNOUX_BUILD_OPERATOR_IDS.'; }
  if (ownerId) {
    const config = await loadBridgeConfig({ ownerId });
    const status = await measureBridgeStatus(config, config.endpoint && config.keys ? { ticketFactory: () => mintTicket({ userId: ownerId, sid: `integrations-${Date.now()}`, bridgeId: config.endpoint!.bridgeId, scopes: ['terminal:open'] }, config.keys!) } : {});
    snapshot.toolsAvailable = !!status.handshake && status.reachable;
    snapshot.toolsBlocker = status.blocker ?? (snapshot.toolsAvailable ? 'Tools have not been measured. Run detection explicitly.' : 'A paired bridge is required.');
  }
  return NextResponse.json(snapshot, { headers: { 'cache-control': 'no-store' } });
}
