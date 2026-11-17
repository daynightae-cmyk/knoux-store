import 'server-only';
import { getRegisteredAdapters } from '../registry';
import type { AgentRuntime, ProviderDefinition } from './types';
/** Provider definitions are a projection of the one canonical adapter registry and measured bridge inventory. */
const DOCS_URLS: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://makersuite.google.com/app/apikey',
  openrouter: 'https://openrouter.ai/keys',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
  qwen: 'https://dashscope.aliyun.com/',
  grok: 'https://console.x.ai/',
  'opencode-go': 'https://opencode.ai/',
  'opencode-console-v2': 'https://opencode.ai/console',
  nvidia: 'https://integrate.api.nvidia.com/',
  xai: 'https://console.x.ai/',
  together: 'https://api.together.xyz/settings/api-keys',
  fireworks: 'https://fireworks.ai/account/api-keys',
  cerebras: 'https://cloud.cerebras.ai/',
  perplexity: 'https://www.perplexity.ai/settings/api',
  deepinfra: 'https://deepinfra.com/dash/api_keys',
  hyperbolic: 'https://app.hyperbolic.xyz/settings',
  novita: 'https://novita.ai/account/api-keys',
  nebius: 'https://studio.nebius.com/',
  sambanova: 'https://cloud.sambanova.ai/',
  moonshot: 'https://platform.moonshot.ai/',
  zhipu: 'https://open.bigmodel.cn/',
  siliconflow: 'https://cloud.siliconflow.cn/',
  upstage: 'https://console.upstage.ai/',
  ai21: 'https://studio.ai21.com/',
  cohere: 'https://dashboard.cohere.ai/api-keys',
  'github-models': 'https://github.com/settings/tokens',
  'vercel-gateway': 'https://vercel.com/account/tokens',
  ollama: 'https://ollama.com/',
  'lm-studio': 'https://lmstudio.ai/',
};
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
            docsUrl: DOCS_URLS[adapter.id],
        };
    });
    return [...models, ...agents.map(agent => ({ id: agent.id, name: agent.name, class: 'CODING_AGENT' as const, transport: 'Trusted local bridge', gateway: false, detectionOnly: true, authModes: ['CLI_PROFILE' as const], environmentNames: [], tabs: ['Overview', 'Profiles & Limits', 'CLI & Args', 'Environment', 'Permissions', 'MCP', 'Plugins', 'Skills', 'Usage', 'Diagnostics'], docsUrl: undefined }))];
}
export function credentialVariable(definition: ProviderDefinition): string | null { return definition.environmentNames.find(name => /KEY|TOKEN/.test(name) && !/ENDPOINT|URL/.test(name)) ?? null; }
export function endpointVariable(providerId: string): string | null { return providerId === 'ollama' ? 'OLLAMA_BASE_URL' : providerId === 'lm-studio' ? 'LM_STUDIO_BASE_URL' : providerId === 'custom-openai' ? 'KNOUX_BUILD_LLM_ENDPOINT' : null; }
