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
/**
 * How OpenRouter names the Grok models it hosts.
 *
 * The live catalog publishes them under the `x-ai` namespace (`x-ai/grok-4.7`,
 * `x-ai/grok-4.5`, …), never as `xai/…`. Matching the wrong spelling returned
 * an empty list, and an empty list is indistinguishable from a failed
 * discovery — so the prefix is named here once and covered by a regression
 * test rather than being spelled inline in a filter.
 *
 * `xai/` is kept as an alias for the same namespace rather than deleted:
 * matching it costs nothing, and removing it would reintroduce the silent
 * zero-result failure if a proxy ever normalizes the spelling. `grok` covers an
 * id published without a namespace.
 *
 * Every prefix is the Grok family. Nothing else is admitted.
 */
const GROK_MODEL_PREFIXES = ['x-ai/', 'xai/', 'grok'] as const;

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
    const list = (data?.data ?? []).filter((m) =>
      GROK_MODEL_PREFIXES.some((prefix) => m.id.startsWith(prefix)),
    );
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
