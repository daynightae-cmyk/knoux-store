import "server-only";
import { OpenAICompatibleAdapter } from "./base";

/**
 * Ollama adapter. Local model server.
 * No API key required by default. Base URL configurable via OLLAMA_BASE_URL.
 * Default: http://localhost:11434/v1 (OpenAI-compatible mode)
 *
 * Supports: text, streaming, tools (model-dependent), no vision by default.
 */
export class OllamaAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: "ollama",
      displayName: "Ollama",
      transport: "Ollama",
      baseUrl:
        process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ??
        "http://localhost:11434/v1",
      authHeader: "bearer",
      requiredEnv: [],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: {
        temperature: true,
        topP: true,
        maxTokens: true,
        reasoningEffort: false,
        seed: false,
        stop: true,
        toolChoice: true,
      },
      rateLimitPrefixes: [],
    });
  }

  override isConfigured(_env: Record<string, string | undefined>): boolean {
    // Ollama doesn't require a key; it's "configured" if the base URL is set
    // or we accept the default. The real test is whether the endpoint is reachable.
    return true;
  }

  override getApiKey(env: Record<string, string | undefined>): string | null {
    // Ollama typically doesn't need auth, but if OLLAMA_API_KEY is set, use it
    return env.OLLAMA_API_KEY?.trim() || "ollama";
  }

  protected override buildHeaders(apiKey: string): HeadersInit {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    // `getApiKey` returns the sentinel 'ollama' when no credential exists.
    // Sending that as a bearer token would be a bogus Authorization header,
    // so only a real key is forwarded.
    if (apiKey && apiKey !== "ollama") {
      headers["authorization"] = `Bearer ${apiKey}`;
    }
    return headers;
  }

  protected parseModelList(
    json: unknown,
  ): import("../types").NormalizedModel[] {
    const data = json as { data?: Array<{ id: string }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.lifecycle = "active";
      return model;
    });
  }
}
