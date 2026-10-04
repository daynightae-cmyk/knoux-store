import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * QwenCloud / Alibaba Model Studio adapter (DashScope).
 * Uses OpenAI-compatible mode endpoint.
 * Credential: DASHSCOPE_API_KEY
 * Supports: text, streaming, tools.
 *
 * Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1 by default,
 * overridable with DASHSCOPE_BASE_URL.
 *
 * The region is not cosmetic. Model Studio issues credentials per region: a
 * China-region key is refused by the international host with 401
 * `invalid_api_key`, and an international key is refused by the China host the
 * same way. Both hosts speak the same OpenAI-compatible contract, so the only
 * difference that matters here is which one the credential belongs to. The
 * default stays the China host this adapter has always documented, and
 * DASHSCOPE_BASE_URL selects the other — the same escape hatch ollama,
 * lm-studio and opencode-go already provide for their endpoints.
 */
export class QwenAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'qwen',
      displayName: 'QwenCloud',
      transport: 'Alibaba Model Studio',
      baseUrl: process.env.DASHSCOPE_BASE_URL?.replace(/\/$/, '') ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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
