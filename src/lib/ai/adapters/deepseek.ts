import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * DeepSeek adapter. OpenAI-compatible API.
 * Supports: text, streaming, tools, reasoning models.
 */
export class DeepSeekAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'deepseek',
      displayName: 'DeepSeek',
      transport: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      authHeader: 'bearer',
      requiredEnv: ['DEEPSEEK_API_KEY'],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: [],
    });
  }

  protected parseModelList(json: unknown): import('../types').NormalizedModel[] {
    const data = json as { data?: Array<{ id: string }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.capabilities.tools = 'SUPPORTED';
      model.capabilities.structuredOutput = 'SUPPORTED';
      if (entry.id.includes('reasoner')) {
        model.capabilities.reasoning = 'SUPPORTED';
      }
      model.lifecycle = 'active';
      return model;
    });
  }
}
