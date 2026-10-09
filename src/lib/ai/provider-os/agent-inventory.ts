import 'server-only';
import { loadBridgeConfig, bridgeClient } from '../../build/bridge-config';
import { mintTicket } from '../../build/bridge-tickets';
import type { AgentRuntime, InventoryBinding } from './types';
import { inventoryProjection } from './inventory-projection';
export async function agentInventory(ownerId: string): Promise<{
    agents: AgentRuntime[];
    inventory: InventoryBinding[];
    blocker: string | null;
}> {
    const config = await loadBridgeConfig({ ownerId });
    if (!config.keys || !config.endpoint)
        return { agents: [], inventory: [], blocker: 'EXECUTOR_NOT_CONNECTED — pair a trusted local bridge to inspect coding-agent installations.' };
    const result = await bridgeClient(config, { timeoutMs: 30000 }).request<{
        agents: AgentRuntime[];
        inventory: InventoryBinding[];
    }>({ method: 'GET', path: '/v1/provider-inventory', token: mintTicket({ userId: ownerId, sid: `provider-inventory-${Date.now()}`, bridgeId: config.endpoint.bridgeId, scopes: ['tools:read'] }, config.keys) });
    if (!result.ok || !result.data)
        return { agents: [], inventory: [], blocker: 'EXECUTOR_NOT_CONNECTED — the paired bridge cannot provide a verified agent inventory.' };
    const projection = inventoryProjection(result.data);
    return projection ? { ...projection, blocker: null } : { agents: [], inventory: [], blocker: 'Trusted bridge inventory did not match the safe metadata contract.' };
}
