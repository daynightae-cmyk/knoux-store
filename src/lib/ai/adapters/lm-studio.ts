import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * LM Studio adapter. Local OpenAI-compatible server.
 * Base URL configurable via LM_STUDIO_BASE_URL. Default: http://localhost:1234/v1
 * Optional auth via LM_API_TOKEN.
 *
 * Supports: text, streaming, tools (model-dependent).
 */
export class LMStudioAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'lm-studio',
      displayName: 'LM Studio',
      transport: 'LM Studio',
      baseUrl: process.env.LM_STUDIO_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:1234/v1',
      authHeader: 'bearer',
      requiredEnv: [],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: [],
    });
  }

  override isConfigured(_env: Record<string, string | undefined>): boolean {
    return true;
  }

  override getApiKey(_env: Record<string, string | undefined>): string | null {
    return process.env.LM_API_TOKEN?.trim() || 'lm-studio';
  }

  protected override buildHeaders(_apiKey: string): HeadersInit {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const realToken = process.env.LM_API_TOKEN?.trim();
    if (realToken) {
      headers['authorization'] = `Bearer ${realToken}`;
    }
    return headers;
  }

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
