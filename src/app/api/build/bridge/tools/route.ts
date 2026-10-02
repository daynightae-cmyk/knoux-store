import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { loadBridgeConfig, bridgeClient } from '@/lib/build/bridge-config';
import { mintTicket } from '@/lib/build/bridge-tickets';
import type { DeveloperTool } from '@/lib/build/integration-types';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'bridge-tools' }); if (denied) return denied;
  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ message: 'Sign in and pair your bridge before detecting local tools.' }, { status: 401 });
  const config = await loadBridgeConfig({ ownerId });
  if (!config.keys || !config.endpoint) return NextResponse.json({ message: config.blocker }, { status: 409 });
  const result = await bridgeClient(config, { timeoutMs: 30000 }).request<{ tools: DeveloperTool[] }>({ method: 'GET', path: '/v1/tools', token: mintTicket({ userId: ownerId, sid: `tools-${Date.now()}`, bridgeId: config.endpoint.bridgeId, scopes: ['tools:read'] }, config.keys) });
  return NextResponse.json(result.ok ? result.data : { message: result.error }, { status: result.ok ? 200 : 409, headers: { 'cache-control': 'no-store' } });
}
