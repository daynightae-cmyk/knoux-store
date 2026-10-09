import { AGENT_PERMISSIONS, type AgentRuntime, type InventoryBinding } from './types';
const text = (value: unknown, max = 160): value is string => typeof value === 'string' && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
/** Project only the contract fields. Bridge configuration may contain secrets outside this contract. */
export function inventoryProjection(value: unknown): {
    agents: AgentRuntime[];
    inventory: InventoryBinding[];
} | null {
    if (!value || typeof value !== 'object')
        return null;
    const input = value as Record<string, unknown>;
    if (!Array.isArray(input.agents) || !Array.isArray(input.inventory))
        return null;
    const agents: AgentRuntime[] = [], inventory: InventoryBinding[] = [];
    for (const raw of input.agents.slice(0, 100)) {
        if (!raw || typeof raw !== 'object')
            continue;
        const item = raw as Record<string, unknown>;
        if (!text(item.id) || !/^agent:[a-z0-9-]+$/.test(item.id) || !text(item.name) || !text(item.measuredAt) || !Number.isFinite(Date.parse(item.measuredAt)))
            continue;
        const source = ['PATH', 'BUNDLED', 'CUSTOM'].includes(String(item.source)) ? item.source as AgentRuntime['source'] : null;
        agents.push({ id: item.id, name: item.name, binary: text(item.binary, 1000) ? item.binary : null, source, version: text(item.version, 80) && /^\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?$/.test(item.version) ? item.version : null, detected: item.detected === true, authenticated: 'UNTESTED', executable: false, state: item.detected === true ? 'EXECUTOR_NOT_CONNECTED' : 'CLI_NOT_FOUND', measuredAt: item.measuredAt, capabilities: AGENT_PERMISSIONS.map(id => ({ id, supported: 'UNKNOWN', allowed: 'DENY', currentlyAvailable: false, reason: 'No coding-agent executor has measured this capability.' })) });
    }
    for (const raw of input.inventory.slice(0, 300)) {
        if (!raw || typeof raw !== 'object')
            continue;
        const item = raw as Record<string, unknown>;
        if (!text(item.id, 240) || !text(item.name) || !text(item.source) || !text(item.measuredAt) || !Number.isFinite(Date.parse(item.measuredAt)) || !['MCP', 'PLUGIN', 'SKILL'].includes(String(item.kind)))
            continue;
        const state = ['AVAILABLE', 'DISABLED', 'AUTH_REQUIRED', 'BLOCKED', 'UNAVAILABLE', 'UNTESTED'].includes(String(item.state)) ? item.state as InventoryBinding['state'] : 'UNTESTED';
        inventory.push({ id: item.id, name: item.name, kind: item.kind as InventoryBinding['kind'], source: item.source, state, measuredAt: item.measuredAt, environmentNames: Array.isArray(item.environmentNames) ? item.environmentNames.filter((name): name is string => text(name, 128) && /^[A-Z_][A-Z0-9_]*$/i.test(name)).slice(0, 100) : [] });
    }
    return { agents, inventory };
}
