/**
 * AI provider contract and catalogue.
 *
 * Two rules govern this file.
 *
 * 1. A provider with no credential is `unconfigured`, never "online" and never
 *    "offline". Those words describe a service that was contacted. This one
 *    was not, because there is nothing to contact.
 * 2. Model metadata is declared, not discovered. No entry claims a context
 *    window, a vision capability or a tool capability that is not written
 *    here, so the router can never route on a property it made up.
 *
 * `execute` is intentionally absent from every adapter. Wiring a real call
 * requires a server-side key, and shipping an unused network call to a
 * provider with no credential would be decoration. The seam is here so the
 * first configured provider has somewhere correct to go.
 */

import type {
  AIModelDefinition,
  AIProviderAdapter,
  ProviderCapabilitySet,
  ProviderStatus,
} from './types';

type ProviderDefinition = Omit<AIProviderAdapter, 'isConfigured' | 'execute'>;

function models(
  provider: string,
  entries: [string, string, number | null, boolean, boolean, boolean, string[]][],
): AIModelDefinition[] {
  return entries.map(([id, label, contextWindow, supportsVision, supportsTools, supportsStreaming, tags]) => ({
    id, provider, label, contextWindow, supportsVision, supportsTools, supportsStreaming, tags,
  }));
}

const TEXT_ONLY: ProviderCapabilitySet = {
  text: true, vision: false, tools: true, structuredOutput: true, streaming: true,
};
const WITH_VISION: ProviderCapabilitySet = {
  text: true, vision: true, tools: true, structuredOutput: true, streaming: true,
};

const DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'openai',
    displayName: 'OpenAI',
    requiredEnv: ['OPENAI_API_KEY'],
    capabilities: WITH_VISION,
    models: models('openai', [
      ['gpt-4.1', 'GPT-4.1', 1_047_576, true, true, true, ['flagship', 'long-context', 'tools']],
      ['gpt-4.1-mini', 'GPT-4.1 mini', 1_047_576, true, true, true, ['fast', 'cheap', 'tools']],
      ['o4-mini', 'o4-mini', 200_000, true, true, true, ['reasoning', 'debugging']],
    ]),
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    requiredEnv: ['ANTHROPIC_API_KEY'],
    capabilities: WITH_VISION,
    models: models('anthropic', [
      ['claude-sonnet-4', 'Claude Sonnet 4', 200_000, true, true, true, ['flagship', 'long-context', 'tools']],
      ['claude-opus-4', 'Claude Opus 4', 200_000, true, true, true, ['deep-reasoning', 'architecture']],
      ['claude-haiku-4', 'Claude Haiku 4', 200_000, true, true, true, ['fast', 'cheap']],
    ]),
  },
  {
    id: 'google',
    displayName: 'Google',
    requiredEnv: ['GOOGLE_GENERATIVE_AI_API_KEY'],
    capabilities: WITH_VISION,
    models: models('google', [
      ['gemini-2.5-pro', 'Gemini 2.5 Pro', 1_048_576, true, true, true, ['long-context', 'vision']],
      ['gemini-2.5-flash', 'Gemini 2.5 Flash', 1_048_576, true, true, true, ['fast', 'long-context']],
    ]),
  },
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    requiredEnv: ['OPENROUTER_API_KEY'],
    capabilities: WITH_VISION,
    models: models('openrouter', [
      ['openrouter/auto', 'Auto router', null, true, true, true, ['aggregate']],
    ]),
  },
  {
    id: 'groq',
    displayName: 'Groq',
    requiredEnv: ['GROQ_API_KEY'],
    capabilities: { ...TEXT_ONLY, vision: false },
    models: models('groq', [
      ['groq/llama-3.3-70b', 'Llama 3.3 70B', 131_072, false, true, true, ['fast', 'cheap']],
    ]),
  },
  {
    id: 'mistral',
    displayName: 'Mistral',
    requiredEnv: ['MISTRAL_API_KEY'],
    capabilities: TEXT_ONLY,
    models: models('mistral', [
      ['mistral-large-latest', 'Mistral Large', 131_072, false, true, true, ['flagship', 'tools']],
    ]),
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    requiredEnv: ['DEEPSEEK_API_KEY'],
    capabilities: TEXT_ONLY,
    models: models('deepseek', [
      ['deepseek-chat', 'DeepSeek Chat', 65_536, false, true, true, ['cheap', 'code']],
      ['deepseek-reasoner', 'DeepSeek Reasoner', 65_536, false, true, true, ['reasoning', 'debugging']],
    ]),
  },
  {
    id: 'local',
    displayName: 'OpenAI-compatible endpoint',
    requiredEnv: ['KNOUX_BUILD_LLM_ENDPOINT', 'KNOUX_BUILD_LLM_API_KEY'],
    capabilities: TEXT_ONLY,
    models: models('local', [
      ['local/default', 'Configured endpoint', null, false, true, true, ['self-hosted']],
    ]),
  },
];

export const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = DEFINITIONS;

/** Configuration is decided by the presence of a server-side variable only. */
export function isProviderConfigured(
  definition: ProviderDefinition,
  env: Record<string, string | undefined>,
): boolean {
  return definition.requiredEnv.every((name) => {
    const value = env[name];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function configuredProviders(env: Record<string, string | undefined>): ProviderDefinition[] {
  return DEFINITIONS.filter((definition) => isProviderConfigured(definition, env));
}

/**
 * Client-safe projection. Environment variable *names* are included because a
 * developer needs to know what to set; values are never read here and never
 * leave the server.
 */
export function providerStatuses(
  env: Record<string, string | undefined>,
): ProviderStatus[] {
  return DEFINITIONS.map((definition) => {
    const configured = isProviderConfigured(definition, env);
    return {
      id: definition.id,
      displayName: definition.displayName,
      configured,
      requiredEnv: definition.requiredEnv,
      capabilities: definition.capabilities,
      models: definition.models,
      status: configured ? 'available' : 'unconfigured',
      reason: configured
        ? 'A server-side credential is present. Execution is permitted.'
        : `No server configuration. Set ${definition.requiredEnv.join(' and ')} on the server to enable this provider. Values are never sent to the browser.`,
    };
  });
}
