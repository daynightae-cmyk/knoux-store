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
      data?: Array<{ id: string; max_context_length?: number; archived?:boolean;capabilities?:{completion_chat?:boolean;function_calling?:boolean;vision?:boolean;classification?:boolean;embedding?:boolean;audio?:boolean} }>;
    };
    const list = data?.data ?? [];
    return list.map((entry) => {
      const model = this.normalizeModel(entry.id);
      model.contextWindow = entry.max_context_length ?? null;
      const capabilities=entry.capabilities;
      const text=capabilities?.completion_chat===true;
      model.modalities={text,imageInput:capabilities?.vision===true,audioInput:capabilities?.audio===true,audioOutput:false};
      const support=(value:boolean|undefined)=>value===undefined?'UNKNOWN' as const:value?'SUPPORTED' as const:'UNSUPPORTED' as const;
      model.capabilities.tools=support(capabilities?.function_calling);model.capabilities.vision=support(capabilities?.vision);model.capabilities.structuredOutput='UNKNOWN';model.capabilities.streaming=text?'SUPPORTED':'UNKNOWN';
      model.catalog={categories:[text?'text':capabilities?.embedding?'embedding':capabilities?.classification?'classification':'unknown'],gateway:false,authorNamespace:null,supportedParameters:null,free:null,buildEligible:text,metadataSource:'API_METADATA'};
      model.lifecycle = entry.archived?'deprecated':'active';
      return model;
    });
  }
}
