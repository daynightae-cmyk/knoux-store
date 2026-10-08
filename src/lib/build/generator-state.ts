import type { EngineeringStage } from './engineering-plan';

export type StoreStarfieldPhase = 'ambient' | 'resolving' | 'routing' | 'generating' | 'planned' | 'blocked' | 'complete';
export function stageToSkyPhase(stage: EngineeringStage): StoreStarfieldPhase {
  if (stage === 'RESOLVING') return 'resolving';
  if (stage === 'ROUTING') return 'routing';
  if (stage === 'GENERATING') return 'generating';
  if (stage === 'PLANNED' || stage === 'REVIEWING') return 'planned';
  if (stage === 'COMPLETE') return 'complete';
  if (['CONFIG_REQUIRED', 'AUTH_REQUIRED', 'PROVIDER_BLOCKED', 'AGENT_UNAVAILABLE', 'EXECUTOR_NOT_CONNECTED'].includes(stage)) return 'blocked';
  return 'ambient';
}

/** Planning has no executor events. No arbitrary update may imply execution success. */
export function canTransitionPlan(from: EngineeringStage, to: EngineeringStage) {
  if (from === to) return true;
  const transitions: Partial<Record<EngineeringStage, EngineeringStage[]>> = {
    LISTENING: ['RESOLVING'],
    RESOLVING: ['ROUTING', 'AUTH_REQUIRED', 'CONFIG_REQUIRED', 'PROVIDER_BLOCKED'],
    ROUTING: ['GENERATING', 'AUTH_REQUIRED', 'PROVIDER_BLOCKED'],
    GENERATING: ['PLANNED', 'AUTH_REQUIRED', 'PROVIDER_BLOCKED'],
    PLANNED: ['REVIEWING'], REVIEWING: ['EXECUTOR_NOT_CONNECTED'],
    EXECUTOR_NOT_CONNECTED: ['REVIEWING'],
  };
  return transitions[from]?.includes(to) ?? false;
}
