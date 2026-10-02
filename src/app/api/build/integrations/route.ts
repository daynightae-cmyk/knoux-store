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
    let trustedUrl = false;
    try { const url = new URL(process.env.KNOUX_BRIDGE_URL ?? ''); trustedUrl = ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; } catch { /* unconfigured */ }
    snapshot.bridgePairAllowed = !!config.keys && !!config.store && trustedUrl;
    snapshot.bridgePairBlocker = snapshot.bridgePairAllowed ? 'One-time pairing code from the trusted machine is required.' : config.blocker ?? 'Configure the signing key, loopback bridge URL and owner-scoped store.';
    const status = await measureBridgeStatus(config, config.endpoint && config.keys ? { ticketFactory: () => mintTicket({ userId: ownerId, sid: `integrations-${Date.now()}`, bridgeId: config.endpoint!.bridgeId, scopes: ['terminal:open'] }, config.keys!) } : {});
    snapshot.toolsAvailable = !!status.handshake && status.reachable;
    snapshot.toolsBlocker = status.blocker ?? (snapshot.toolsAvailable ? 'Tools have not been measured. Run detection explicitly.' : 'A paired bridge is required.');
  }
  return NextResponse.json(snapshot, { headers: { 'cache-control': 'no-store' } });
}
