import "server-only";
import { OpenAICompatibleAdapter } from "./base";
import { openaiCompatibleControls } from "../contract";

/**
 * Mistral adapter. OpenAI-compatible API.
 * Supports: text, streaming, tools, structured output.
 */
export class MistralAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: "mistral",
      displayName: "Mistral",
      transport: "Mistral",
      baseUrl: "https://api.mistral.ai/v1",
      authHeader: "bearer",
      requiredEnv: ["MISTRAL_API_KEY"],
      supportsVision: false,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: openaiCompatibleControls(),
      rateLimitPrefixes: [],
    });
  }

  protected parseModelList(
    json: unknown,
  ): import("../types").NormalizedModel[] {
    const data = json as {
      data?: Array<{ id: string; max_context_length?: number }>;
    };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.contextWindow = entry.max_context_length ?? null;
      model.capabilities.tools = "SUPPORTED";
      model.capabilities.structuredOutput = "SUPPORTED";
      model.lifecycle = "active";
      return model;
    });
  }
}
