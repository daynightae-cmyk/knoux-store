import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * QwenCloud / Alibaba Model Studio adapter (DashScope).
 * Uses OpenAI-compatible mode endpoint.
 * Credential: DASHSCOPE_API_KEY
 * Supports: text, streaming, tools.
 *
 * Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
 */
export class QwenAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'qwen',
      displayName: 'QwenCloud',
      transport: 'Alibaba Model Studio',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      authHeader: 'bearer',
      requiredEnv: ['DASHSCOPE_API_KEY'],
      supportsVision: true,
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
      if (entry.id.includes('vl') || entry.id.includes('vision')) {
        model.capabilities.vision = 'SUPPORTED';
      }
      model.lifecycle = 'active';
      return model;
    });
  }
}
