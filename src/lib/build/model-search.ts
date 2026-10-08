import type { NormalizedModel, ProviderHealth } from '../ai/types';

type Capability = keyof NormalizedModel['capabilities'];
/** Search the canonical normalized records; UNKNOWN never passes a capability facet. */
export function searchModels<T extends NormalizedModel>(models: readonly T[], query = '', providerId = '', capability?: Capability) {
  const terms = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  return models.filter((model) => {
    if (providerId && model.providerId !== providerId) return false;
    if (capability && !['SUPPORTED', 'VERIFIED'].includes(model.capabilities[capability])) return false;
    const capabilities = Object.entries(model.capabilities).filter(([, state]) => ['SUPPORTED', 'VERIFIED'].includes(state)).map(([key]) => key);
    const text = [model.providerId, model.modelId, model.displayName, ...capabilities].join(' ').toLocaleLowerCase('en');
    return terms.every((term) => text.includes(term));
  });
}

export function providerState(provider: ProviderHealth) {
  if (!provider.configured) return 'CONFIG REQUIRED';
  if (['BLOCKED', 'FAILED', 'DEGRADED', 'RATE_LIMITED'].includes(provider.generation)) return 'BLOCKED';
  if (['FAILED', 'BLOCKED'].includes(provider.auth)) return provider.lastError?.category === 'AUTHENTICATION' ? 'AUTH REQUIRED' : 'BLOCKED';
  if (provider.generation === 'GENERATION_VERIFIED' && provider.streaming === 'STREAMING_VERIFIED') return 'RUNTIME VERIFIED';
  if (provider.discovery === 'DISCOVERY_VERIFIED') return 'DISCOVERED';
  return 'AVAILABLE · UNTESTED';
}
