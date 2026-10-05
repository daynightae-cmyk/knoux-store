import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * Groq adapter. Ultra-fast inference for open models.
 * OpenAI-compatible API. Supports tools and streaming.
 */
export class GroqAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'groq',
      displayName: 'Groq',
      transport: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      authHeader: 'bearer',
      requiredEnv: ['GROQ_API_KEY'],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: ['requests', 'tokens'],
    });
  }

  protected parseModelList(json: unknown): import('../types').NormalizedModel[] {
    const data = json as { data?: Array<{ id: string; context_window?: number; max_completion_tokens?: number }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.contextWindow = entry.context_window ?? null;
      model.maxOutputTokens = entry.max_completion_tokens ?? null;
      model.capabilities.tools = 'SUPPORTED';
      model.capabilities.structuredOutput = 'SUPPORTED';
      model.lifecycle = 'active';
      return model;
    });
  }
}
