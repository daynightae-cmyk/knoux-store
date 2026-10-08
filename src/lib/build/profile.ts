import type { GenerationControls, NormalizedModel } from '../ai/types';

export const GENERATION_PROFILES = ['FAST', 'BALANCED', 'DEEP', 'MAX'] as const;
export type GenerationProfile = (typeof GENERATION_PROFILES)[number];
export type EffortSupport = 'SUPPORTED' | 'MODEL_MANAGED' | 'FIXED_BY_PROVIDER';
const SETTINGS = {
  FAST: { maxOutputTokens: 2048, temperature: 0.2 },
  BALANCED: { maxOutputTokens: 4096, temperature: 0.4 },
  DEEP: { maxOutputTokens: 16384, temperature: 0.3 },
  MAX: { maxOutputTokens: 32768, temperature: 0.1 },
} satisfies Record<GenerationProfile, GenerationControls>;

export function isGenerationProfile(value: unknown): value is GenerationProfile {
  return GENERATION_PROFILES.some((profile) => profile === value);
}

/** These adapters never send a directly adjustable hidden-reasoning field. */
export function effortSupport(model: NormalizedModel | null): EffortSupport {
  return model && ['gemini', 'anthropic'].includes(model.providerId) &&
    ['SUPPORTED', 'VERIFIED'].includes(model.capabilities.reasoning)
    ? 'MODEL_MANAGED' : 'FIXED_BY_PROVIDER';
}

/** Known limits cap the request. Unknown limits keep the existing 4096 ceiling. */
export function profileToControls(profile: GenerationProfile, model?: NormalizedModel | null, inputTokens = 0) {
  const requested = { ...SETTINGS[profile] };
  const constraints: string[] = [];
  let output = requested.maxOutputTokens;
  if (!model || model.maxOutputTokens === null) {
    output = Math.min(output, 4096);
    constraints.push('Output limit UNKNOWN; conservative ceiling 4096.');
  } else output = Math.min(output, Math.max(1, model.maxOutputTokens));
  if (model?.contextWindow != null && model.providerId !== 'gemini') {
    output = Math.min(output, Math.max(1, model.contextWindow - Math.max(0, inputTokens)));
    constraints.push('Known context window reserves space for the estimated input.');
  }
  const controls: GenerationControls = {};
  if (!model || model.controls.maxTokens) controls.maxOutputTokens = output;
  else constraints.push('Output budget is fixed by the provider.');
  if (!model || model.controls.temperature) controls.temperature = requested.temperature;
  else constraints.push('Temperature is fixed by the provider.');
  if (output < requested.maxOutputTokens) constraints.push(`Requested ${requested.maxOutputTokens}; capped at ${output} output tokens.`);
  return { requested, controls, constraints, effort: effortSupport(model ?? null) };
}
