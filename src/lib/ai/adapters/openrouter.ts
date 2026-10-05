import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * OpenRouter adapter. Routes to many providers through a single API.
 * Supports: text, streaming, tools, vision, structured output.
 */
export class OpenRouterAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'openrouter',
      displayName: 'OpenRouter',
      transport: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      authHeader: 'bearer',
      requiredEnv: ['OPENROUTER_API_KEY'],
      extraHeaders: { 'X-Title': 'KNOuX DEV' },
      supportsVision: true,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: ['requests', 'tokens'],
    });
  }

  protected parseModelList(json: unknown): import('../types').NormalizedModel[] {
    const data = json as { data?: Array<{ id: string; name?: string; context_length?: number; architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] }; pricing?: { prompt?: string; completion?: string }; top_provider?: { max_completion_tokens?: number } }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const inputMods = entry.architecture?.input_modalities ?? [];
      const supportsVision = inputMods.includes('image');
      const supportsTools = true; // OpenRouter passes through tool support
      const model = this.normalizeModel(entry.id);
      model.displayName = entry.name ?? entry.id;
      model.contextWindow = entry.context_length ?? null;
      model.maxOutputTokens = entry.top_provider?.max_completion_tokens ?? null;
      model.modalities = { text: true, imageInput: supportsVision, audioInput: inputMods.includes('audio'), audioOutput: (entry.architecture?.output_modalities ?? []).includes('audio') };
      model.capabilities.vision = supportsVision ? 'SUPPORTED' : 'UNSUPPORTED';
      model.capabilities.tools = supportsTools ? 'SUPPORTED' : 'UNSUPPORTED';
      model.pricing = {
        inputPerMillion: entry.pricing?.prompt ? parseFloat(entry.pricing.prompt) * 1_000_000 : null,
        outputPerMillion: entry.pricing?.completion ? parseFloat(entry.pricing.completion) * 1_000_000 : null,
        cachedInputPerMillion: null,
        currency: 'USD',
      };
      model.lifecycle = 'active';
      return model;
    });
  }
}
