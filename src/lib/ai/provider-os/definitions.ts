import 'server-only';
import { getRegisteredAdapters } from '../registry';
import type { AgentRuntime, ProviderDefinition } from './types';
/** Provider definitions are a projection of the one canonical adapter registry and measured bridge inventory. */
export function providerDefinitions(agents: AgentRuntime[] = []): ProviderDefinition[] {
    const models = getRegisteredAdapters().map(adapter => {
        const local = ['ollama', 'lm-studio'].includes(adapter.id);
        const custom = adapter.id === 'custom-openai';
        return {
            id: adapter.id, name: adapter.displayName, class: local ? 'LOCAL' as const : custom ? 'CUSTOM' as const : 'INTELLIGENCE' as const,
            transport: adapter.transport, gateway: adapter.transport === 'OpenRouter', detectionOnly: false,
            authModes: local ? ['LOCAL_ENDPOINT' as const] : custom ? ['CUSTOM_ENDPOINT' as const] : ['API_KEY' as const, 'VAULT_SECRET' as const, 'ENV_REFERENCE' as const],
            environmentNames: adapter.requiredEnv,
            tabs: local ? ['Overview', 'Profiles & Limits', 'Endpoint', 'Models', 'Capabilities', 'Health', 'Usage', 'Diagnostics'] : custom ? ['Overview', 'Profiles & Limits', 'Credentials', 'Endpoint', 'Models', 'Capabilities', 'Routing', 'Usage', 'Diagnostics'] : ['Overview', 'Profiles & Limits', 'Credentials', 'Models', 'Capabilities', 'Routing', 'Usage', 'Diagnostics'],
        };
    });
    return [...models, ...agents.map(agent => ({ id: agent.id, name: agent.name, class: 'CODING_AGENT' as const, transport: 'Trusted local bridge', gateway: false, detectionOnly: true, authModes: ['CLI_PROFILE' as const], environmentNames: [], tabs: ['Overview', 'Profiles & Limits', 'CLI & Args', 'Environment', 'Permissions', 'MCP', 'Plugins', 'Skills', 'Usage', 'Diagnostics'] }))];
}
export function credentialVariable(definition: ProviderDefinition): string | null { return definition.environmentNames.find(name => /KEY|TOKEN/.test(name) && !/ENDPOINT|URL/.test(name)) ?? null; }
export function endpointVariable(providerId: string): string | null { return providerId === 'ollama' ? 'OLLAMA_BASE_URL' : providerId === 'lm-studio' ? 'LM_STUDIO_BASE_URL' : providerId === 'custom-openai' ? 'KNOUX_BUILD_LLM_ENDPOINT' : null; }
