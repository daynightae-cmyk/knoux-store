import 'server-only';
import { OpenAICompatibleAdapter } from './base';

/**
 * OpenCode Go adapter. OpenAI-compatible endpoint.
 * Credential: OPENCODE_GO_API_KEY
 */
export class OpenCodeGoAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: 'opencode-go',
      displayName: 'OpenCode Go',
      transport: 'OpenCode Go',
      baseUrl: process.env.OPENCODE_GO_BASE_URL ?? 'https://api.opencode.dev/v1',
      authHeader: 'bearer',
      requiredEnv: ['OPENCODE_GO_API_KEY'],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: [],
    });
  }
}
