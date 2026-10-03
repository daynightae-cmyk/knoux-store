import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * Grok via OpenRouter adapter.
 *
 * Grok is accessed through OpenRouter using a dedicated credential
 * (GROK_OPENROUTER_API_KEY). This is NOT direct xAI access.
 *
 * Display truthfully as: "Grok, Transport: OpenRouter"
 * Credential: GROK_OPENROUTER_API_KEY (not XAI_API_KEY)
 */
export class GrokAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'grok',
      displayName: 'Grok',
      transport: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      authHeader: 'bearer',
      requiredEnv: ['GROK_OPENROUTER_API_KEY'],
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
    const data = json as { data?: Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }> };
    const list = (data?.data ?? []).filter((m) => m.id.startsWith('xai/') || m.id.startsWith('grok'));
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.displayName = entry.name ?? entry.id;
      model.contextWindow = entry.context_length ?? null;
      model.capabilities.vision = entry.id.includes('vision') ? 'SUPPORTED' : 'UNKNOWN';
      model.capabilities.tools = 'SUPPORTED';
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
