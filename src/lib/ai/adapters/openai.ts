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
      // The listing proves identity only, not per-model context or tool support.
      const id = entry.id;
      const category=/embedding/.test(id)?'embedding':/moderation/.test(id)?'moderation':/dall-e|image/.test(id)?'image':/sora|video/.test(id)?'video':/whisper|tts|audio|transcribe|realtime/.test(id)?'audio':/^(?:gpt-|chatgpt-|o[134](?:-|$))/.test(id)?'text':'unknown';
      model.modalities={text:category==='text',imageInput:false,audioInput:category==='audio',audioOutput:false};
      model.capabilities={streaming:'UNKNOWN',tools:'UNKNOWN',structuredOutput:'UNKNOWN',reasoning:'UNKNOWN',vision:'UNKNOWN'};
      model.catalog={categories:[category],gateway:false,authorNamespace:null,supportedParameters:null,free:null,buildEligible:category==='text',metadataSource:'IDENTITY_HINT'};
      model.lifecycle = "unknown";
      return model;
    });
  }
}
