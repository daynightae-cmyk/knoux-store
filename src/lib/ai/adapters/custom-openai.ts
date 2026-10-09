import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * Custom OpenAI-compatible provider. Configured via environment:
 * KNOUX_BUILD_LLM_ENDPOINT (base URL) + KNOUX_BUILD_LLM_API_KEY (auth).
 *
 * Also supports any generic OpenAI-compatible endpoint when both are set.
 */
export class CustomOpenAIAdapter extends OpenAICompatibleAdapter {
  constructor() {
    const baseUrl = process.env.KNOUX_BUILD_LLM_ENDPOINT?.trim().replace(/\/$/, '') ?? '';
    super({
      id: 'custom-openai',
      displayName: 'Custom Endpoint',
      transport: 'OpenAI-compatible',
      baseUrl: baseUrl || 'http://localhost:8080/v1',
      authHeader: 'bearer',
      requiredEnv: ['KNOUX_BUILD_LLM_ENDPOINT', 'KNOUX_BUILD_LLM_API_KEY'],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: [],
    });
  }

  override isConfigured(env: Record<string, string | undefined>): boolean { return !!env.KNOUX_BUILD_LLM_ENDPOINT?.trim(); }
  override getApiKey(env: Record<string, string | undefined>): string { return env.KNOUX_BUILD_LLM_API_KEY?.trim() || 'knoux-custom-no-auth'; }
  protected override buildHeaders(apiKey: string): HeadersInit { return apiKey === 'knoux-custom-no-auth' ? { 'content-type': 'application/json' } : super.buildHeaders(apiKey); }

  protected parseModelList(json: unknown): import('../types').NormalizedModel[] {
    const data = json as { data?: Array<{ id: string }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.lifecycle = 'active';
      return model;
    });
  }
}
