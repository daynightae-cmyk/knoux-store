import "server-only";
import { OpenAICompatibleAdapter } from "./base";

/**
 * OpenAI adapter. The canonical reference implementation.
 *
 * Supports: text generation, streaming, tools, structured output, vision.
 * Model discovery via GET /v1/models.
 */
export class OpenAIAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: "openai",
      displayName: "OpenAI",
      transport: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      authHeader: "bearer",
      requiredEnv: ["OPENAI_API_KEY"],
      supportsVision: true,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: {
        temperature: true,
        topP: true,
        maxTokens: true,
        reasoningEffort: true,
        seed: true,
        stop: true,
        toolChoice: true,
      },
      rateLimitPrefixes: ["requests", "tokens"],
    });
  }

  protected parseModelList(
    json: unknown,
  ): import("../types").NormalizedModel[] {
    const data = json as { data?: Array<{ id: string; owned_by?: string }> };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      // Enrich known models with context window and capability data
      const id = entry.id;
      const longContext =
        id.includes("4.1") ||
        id.includes("gpt-4o") ||
        id.startsWith("o3") ||
        id.startsWith("o4");
      if (longContext) {
        model.contextWindow = 1_047_576;
        model.maxOutputTokens = 16_384;
      }
      if (
        id.startsWith("o3") ||
        id.startsWith("o4") ||
        id.includes("reasoner")
      ) {
        model.capabilities.reasoning = "SUPPORTED";
        model.capabilities.tools = "SUPPORTED";
      }
      if (
        id.includes("gpt-4o") ||
        id.includes("gpt-4.1") ||
        id.includes("vision")
      ) {
        model.capabilities.vision = "SUPPORTED";
        model.capabilities.structuredOutput = "SUPPORTED";
      }
      if (id.includes("mini") || id.includes("nano")) {
        model.lifecycle = "active";
        model.capabilities.tools = "SUPPORTED";
      }
      model.lifecycle = "active";
      return model;
    });
  }
}
