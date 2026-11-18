import 'server-only';
import { OpenAICompatibleAdapter, type OpenAICompatibleConfig } from './base';

/**
 * Vendors that speak the OpenAI chat-completions dialect.
 *
 * Each entry is a real, published endpoint — no placeholder hosts. A vendor
 * whose listing endpoint is absent still authenticates: it declares a
 * one-token probe model and a published model identity set, so "test this
 * key" answers for the credential instead of claiming the vendor is down.
 */
export class VendorAdapter extends OpenAICompatibleAdapter {
  constructor(config: OpenAICompatibleConfig) {
    super(config);
  }
}

const CONTROLS = {
  temperature: true,
  topP: true,
  maxTokens: true,
  reasoningEffort: false,
  seed: false,
  stop: true,
  toolChoice: true,
} as const;

type VendorSpec = Omit<
  OpenAICompatibleConfig,
  'authHeader' | 'supportsStreaming' | 'controls' | 'supportsTools' | 'supportsStructuredOutput' | 'supportsVision'
> & {
  vision?: boolean;
  tools?: boolean;
  structuredOutput?: boolean;
  probeCompletionModel?: string;
  staticModels?: string[];
  probeStrategy?: 'models' | 'completion';
  envMode?: 'all' | 'any';
};

function spec(input: VendorSpec): OpenAICompatibleConfig {
  return {
    authHeader: 'bearer',
    supportsStreaming: true,
    supportsTools: input.tools ?? true,
    supportsStructuredOutput: input.structuredOutput ?? true,
    supportsVision: input.vision ?? false,
    controls: CONTROLS,
    envMode: 'any',
    ...input,
  };
}

export const VENDOR_CONFIGS: OpenAICompatibleConfig[] = [
  spec({
    id: 'nvidia',
    displayName: 'NVIDIA NIM',
    transport: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiredEnv: ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY'],
    vision: true,
    // integrate.api.nvidia.com/v1/models answers 200 to any bearer token, so a
    // listing probe would call an invalid key authenticated. One token of a
    // real completion is the smallest honest test.
    probeStrategy: 'completion',
    probeCompletionModel: 'openai/gpt-oss-20b',
    // Published NVIDIA NIM model identities. Visible even when the provider is
    // unconfigured, marked catalogue-only (buildEligible: false) so the picker
    // shows them as "CONFIG REQUIRED" rather than fabricating LIVE availability.
    staticModels: [
      'google/gemma-3-12b-it',
      'google/gemma-3-4b-it',
      'google/gemma-4-31b-it',
      'meta/muse-glimmer-30b',
      'minimaxai/minimax-m3.1-flash',
      'mistralai/mistral-large-4-1t-a52b',
      'nvidia/cosmos-reason2-8b',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-bolt-e4b',
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'nvidia/nemotron-3.5-super-vl-120b-a12b',
      'openai/gpt-oss-20b',
      'stepfun-ai/step-5-preview',
      'z-ai/glm-5.3-flash',
    ],
  }),
  spec({
    id: 'xai',
    displayName: 'xAI',
    transport: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    requiredEnv: ['XAI_API_KEY'],
    vision: true,
  }),
  spec({
    id: 'together',
    displayName: 'Together AI',
    transport: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    requiredEnv: ['TOGETHER_API_KEY'],
  }),
  spec({
    id: 'fireworks',
    displayName: 'Fireworks AI',
    transport: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    requiredEnv: ['FIREWORKS_API_KEY'],
  }),
  spec({
    id: 'cerebras',
    displayName: 'Cerebras',
    transport: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiredEnv: ['CEREBRAS_API_KEY'],
  }),
  spec({
    id: 'perplexity',
    displayName: 'Perplexity',
    transport: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    requiredEnv: ['PERPLEXITY_API_KEY'],
    tools: false,
    structuredOutput: false,
    probeCompletionModel: 'sonar',
    staticModels: ['sonar', 'sonar-pro', 'sonar-reasoning'],
  }),
  spec({
    id: 'deepinfra',
    displayName: 'DeepInfra',
    transport: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    requiredEnv: ['DEEPINFRA_API_KEY'],
  }),
  spec({
    id: 'hyperbolic',
    displayName: 'Hyperbolic',
    transport: 'Hyperbolic',
    baseUrl: 'https://api.hyperbolic.xyz/v1',
    requiredEnv: ['HYPERBOLIC_API_KEY'],
  }),
  spec({
    id: 'novita',
    displayName: 'Novita AI',
    transport: 'Novita AI',
    baseUrl: 'https://api.novita.ai/v3/openai',
    requiredEnv: ['NOVITA_API_KEY'],
  }),
  spec({
    id: 'nebius',
    displayName: 'Nebius AI Studio',
    transport: 'Nebius',
    baseUrl: 'https://api.studio.nebius.com/v1',
    requiredEnv: ['NEBIUS_API_KEY'],
  }),
  spec({
    id: 'sambanova',
    displayName: 'SambaNova',
    transport: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    requiredEnv: ['SAMBANOVA_API_KEY'],
  }),
  spec({
    id: 'moonshot',
    displayName: 'Moonshot Kimi',
    transport: 'Moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    requiredEnv: ['MOONSHOT_API_KEY'],
  }),
  spec({
    id: 'zhipu',
    displayName: 'Zhipu GLM',
    transport: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requiredEnv: ['ZHIPU_API_KEY', 'ZHIPUAI_API_KEY'],
  }),
  spec({
    id: 'siliconflow',
    displayName: 'SiliconFlow',
    transport: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    requiredEnv: ['SILICONFLOW_API_KEY'],
  }),
  spec({
    id: 'upstage',
    displayName: 'Upstage',
    transport: 'Upstage',
    baseUrl: 'https://api.upstage.ai/v1',
    requiredEnv: ['UPSTAGE_API_KEY'],
  }),
  spec({
    id: 'ai21',
    displayName: 'AI21 Labs',
    transport: 'AI21',
    baseUrl: 'https://api.ai21.com/studio/v1',
    requiredEnv: ['AI21_API_KEY'],
    probeCompletionModel: 'jamba-mini-1.7',
    staticModels: ['jamba-large-1.7', 'jamba-mini-1.7'],
  }),
  spec({
    id: 'cohere',
    displayName: 'Cohere',
    transport: 'Cohere',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    requiredEnv: ['COHERE_API_KEY'],
    probeCompletionModel: 'command-a-03-2025',
    staticModels: ['command-a-03-2025', 'command-r-plus-08-2024', 'command-r-08-2024'],
  }),
  spec({
    id: 'github-models',
    displayName: 'GitHub Models',
    transport: 'GitHub Models',
    baseUrl: 'https://models.github.ai/inference',
    requiredEnv: ['GITHUB_MODELS_TOKEN', 'GITHUB_TOKEN'],
    vision: true,
    probeCompletionModel: 'openai/gpt-4.1-mini',
    staticModels: [
      'openai/gpt-4.1',
      'openai/gpt-4.1-mini',
      'meta/Llama-4-Scout-17B-16E-Instruct',
    ],
  }),
  spec({
    id: 'vercel-gateway',
    displayName: 'Vercel AI Gateway',
    transport: 'Vercel AI Gateway',
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    requiredEnv: ['AI_GATEWAY_API_KEY'],
    vision: true,
  }),
];

export function vendorAdapters(): VendorAdapter[] {
  return VENDOR_CONFIGS.map((config) => new VendorAdapter(config));
}
