import 'server-only';
import { OpenAICompatibleAdapter, type OpenAICompatibleConfig } from './base';

/**
 * OpenRouter adapter. Routes to many providers through a single API.
 * Supports: text, streaming, tools, vision, structured output.
 */
export class OpenRouterAdapter extends OpenAICompatibleAdapter {
  /** The public model catalog is not an authentication proof. */
  protected override get probePath():string{return '/key';}
  constructor(overrides:Partial<OpenAICompatibleConfig>={}) {
    super({
      id: 'openrouter',
      displayName: 'OpenRouter',
      transport: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      authHeader: 'bearer',
      requiredEnv: ['OPENROUTER_API_KEY'],
      extraHeaders: { 'X-Title': 'KNOuX DEV' },
      supportsVision: true,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
      rateLimitPrefixes: ['requests', 'tokens'],
      ...overrides,
    });
  }

  protected parseModelList(json: unknown): import('../types').NormalizedModel[] {
    const data = json as { data?: Array<{ id: string; name?: string; context_length?: number; supported_parameters?: string[]; architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] }; pricing?: { prompt?: string; completion?: string }; top_provider?: { max_completion_tokens?: number } }> };
    const list = data?.data ?? [];
    return list.filter(entry=>typeof entry.id==='string'&&entry.id.length>0).map((entry) => {
      const inputMods = entry.architecture?.input_modalities ?? [];
      const supportsVision = inputMods.includes('image');
      const parameters=Array.isArray(entry.supported_parameters)?entry.supported_parameters:null;
      const outputs=entry.architecture?.output_modalities;
      const text=outputs?.includes('text')??false;
      const support=(parameter:string)=>parameters?(parameters.includes(parameter)?'SUPPORTED' as const:'UNSUPPORTED' as const):'UNKNOWN' as const;
      const model = this.normalizeModel(entry.id);
      model.displayName = entry.name ?? entry.id;
      model.contextWindow = entry.context_length ?? null;
      model.maxOutputTokens = entry.top_provider?.max_completion_tokens ?? null;
      model.modalities = { text, imageInput: supportsVision, audioInput: inputMods.includes('audio'), audioOutput: (outputs ?? []).includes('audio') };
      model.capabilities.vision = entry.architecture?.input_modalities?(supportsVision?'SUPPORTED':'UNSUPPORTED'):'UNKNOWN';
      model.capabilities.tools = support('tools');
      model.capabilities.structuredOutput = parameters ? (parameters.some(value=>['response_format','structured_outputs'].includes(value))?'SUPPORTED':'UNSUPPORTED') : 'UNKNOWN';
      model.capabilities.reasoning=parameters?(parameters.some(value=>['reasoning','reasoning_effort'].includes(value))?'SUPPORTED':'UNSUPPORTED'):'UNKNOWN';
      const price=(value:unknown)=>{if(typeof value!=='string'||!value.trim())return null;const number=Number(value);return Number.isFinite(number)&&number>=0?number*1_000_000:null;};
      model.pricing = {
        inputPerMillion: price(entry.pricing?.prompt),
        outputPerMillion: price(entry.pricing?.completion),
        cachedInputPerMillion: null,
        currency: 'USD',
      };
      model.lifecycle = 'active';
      model.catalog={categories:[...(outputs??[]),...(inputMods.includes('image')?['vision']:[])],gateway:true,authorNamespace:entry.id.includes('/')?entry.id.split('/')[0]:null,supportedParameters:parameters,free:model.pricing.inputPerMillion===null||model.pricing.outputPerMillion===null?null:model.pricing.inputPerMillion===0&&model.pricing.outputPerMillion===0,buildEligible:text};
      return model;
    });
  }
}
