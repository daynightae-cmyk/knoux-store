import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { loadBridgeConfig, bridgeClient, measureBridgeStatus } from '@/lib/build/bridge-config';
import { mintTicket } from '@/lib/build/bridge-tickets';
import { GitHubIntegrationAdapter, parseGitHubRepository } from '@/lib/build/github';
import type { ProjectSnapshot } from '@/lib/build/types';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'project-import' }); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ message: 'Same-origin operator action required.' }, { status: 403 });
  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ message: 'Sign in to import into your paired machine.' }, { status: 401 });
  let body: { repository?: unknown; destination?: unknown; approved?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected a JSON import request.' }, { status: 400 }); }
  const repo = parseGitHubRepository(body.repository);
  if (!repo || typeof body.destination !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(body.destination) || body.approved !== true) return NextResponse.json({ message: 'Select a valid public repository and a new destination folder, then explicitly approve the clone.' }, { status: 400 });
  const config = await loadBridgeConfig({ ownerId });
  if (!config.keys || !config.endpoint) return NextResponse.json({ message: config.blocker }, { status: 409 });
  const token = (scopes: import('@/lib/build/bridge-protocol').BridgeScope[]) => mintTicket({ userId: ownerId, sid: `import-${Date.now()}`, bridgeId: config.endpoint!.bridgeId, scopes }, config.keys!);
  const status = await measureBridgeStatus(config, { ticketFactory: () => token(['terminal:open']) });
  if (!status.handshake?.projectImport) return NextResponse.json({ message: status.blocker ?? 'Bridge import is disabled. Set allowProjectImport=true on the trusted machine.' }, { status: 409 });
  try {
    const metadata = await new GitHubIntegrationAdapter().resolve(repo.url);
    if (metadata.private) return NextResponse.json({ message: 'Private cloning has no secure credential transport. Use a public repository.' }, { status: 409 });
    const result = await bridgeClient(config, { timeoutMs: 150000 }).request<ProjectSnapshot>({ method: 'POST', path: '/v1/project/import', body: { repository: repo.url, destination: body.destination }, token: token(['project:import']), timeoutMs: 150000 });
    if (!result.ok || !result.data) return NextResponse.json({ message: result.error ?? 'Clone failed.' }, { status: 409 });
    return NextResponse.json({ snapshot: result.data, projectRef: body.destination }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ message: 'Public repository lookup failed. No import was started.' }, { status: 409 }); }
}
