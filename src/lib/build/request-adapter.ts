import { createProjectAdapter } from './adapter-factory';
import { resolveBuildOwnerId } from './api-guard';
import { loadBridgeConfig, bridgeClient, measureBridgeStatus } from './bridge-config';
import { mintTicket } from './bridge-tickets';
import { BridgeProjectAdapter } from './bridge-adapter';
import type { BridgeScope } from './bridge-protocol';
import type { ProjectAdapter } from './types';

/** Selected projects belong to the authenticated owner's paired root. */
export async function requestProjectAdapter(request: Request): Promise<ProjectAdapter> {
  const selected = new URL(request.url).searchParams.get('project');
  if (!selected) return createProjectAdapter();
  if (selected.length > 240 || selected.startsWith('/') || selected.includes('..') || /[:\\\0]/.test(selected)) throw new Error('Project selection rejected.');
  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) throw new Error('Sign in to inspect a paired local project.');
  const config = await loadBridgeConfig({ ownerId });
  if (!config.endpoint || !config.keys) throw new Error(config.blocker ?? 'No paired bridge.');
  const ticket = (scopes: BridgeScope[]) => mintTicket({ userId: ownerId, sid: `project-${Date.now()}`, scopes, bridgeId: config.endpoint!.bridgeId }, config.keys!);
  const status = await measureBridgeStatus(config, { ticketFactory: () => ticket(['terminal:open']) });
  if (!status.handshake || status.blocker) throw new Error(status.blocker ?? 'Bridge handshake unavailable.');
  return new BridgeProjectAdapter({ root: status.handshake.root, environment: 'local', label: 'PAIRED LOCAL MACHINE · inspection only', handshake: status.handshake, handshakeMeasuredAt: Date.now(), bridgeReachable: status.reachable, bridgeError: status.blocker, client: bridgeClient(config), ticket, projectRef: selected });
}
