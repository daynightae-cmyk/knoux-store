import 'server-only';
import { allProviderHealth, getAdapters, getDiscoveryCache } from '../ai/registry';
import { routeV2 } from '../ai/router-v2';
import type { ProviderStatus, RoutingDecision, RoutingMode, TaskClass } from './types';

/** Adapt the recovered registry to the existing workspace UI; never create a second catalog. */
export function runtimeProviderStatuses(env: Record<string, string | undefined>): ProviderStatus[] {
  const health = new Map(allProviderHealth(env).map(row => [row.providerId, row]));
  return getAdapters().map(adapter => {
    const configured = adapter.isConfigured(env);
    const snapshot = health.get(adapter.id)!;
    const models = getDiscoveryCache(adapter.id)?.models ?? [];
    const caps = adapter.capabilities();
    return {
      id: adapter.id, displayName: adapter.displayName, configured, requiredEnv: adapter.requiredEnv,
      capabilities: { text: true, vision: caps.vision, tools: caps.tools, structuredOutput: caps.structuredOutput, streaming: caps.streaming },
      models: models.map(model => ({
        id: model.modelId, provider: model.providerId, label: model.displayName,
        contextWindow: model.contextWindow,
        supportsVision: model.capabilities.vision === 'SUPPORTED' || model.capabilities.vision === 'VERIFIED',
        supportsTools: model.capabilities.tools === 'SUPPORTED' || model.capabilities.tools === 'VERIFIED',
        supportsStreaming: model.capabilities.streaming === 'SUPPORTED' || model.capabilities.streaming === 'VERIFIED',
        tags: [],
      })),
      status: configured && snapshot.discovery === 'DISCOVERY_VERIFIED' ? 'available' : configured ? 'unavailable' : 'unconfigured',
      reason: !configured ? 'CONFIG_REQUIRED: configure the server credential.'
        : models.length ? 'Discovered model metadata; generation and streaming verification remain separate.'
          : 'UNTESTED: discover models in the canonical provider runtime before selecting one.',
    };
  });
}

/** The workspace and AI Center use the same server-side routing decision. */
export function runtimeRouting(task: TaskClass, mode: RoutingMode, env: Record<string, string | undefined>, manual?: { providerId: string; modelId: string }): RoutingDecision {
  const decision = routeV2({
    taskClass: task, mode, contextRequirement: task === 'long-context' ? 100_000 : 0,
    visionRequired: task === 'vision', toolsRequired: task === 'refactor' || task === 'test-repair',
    structuredOutputRequired: false, ...(manual ? { manualSelection: manual } : {}),
  }, new Map(allProviderHealth(env).map(row => [row.providerId, row])));
  return { task, mode, providerId: decision.selected?.providerId ?? null, modelId: decision.selected?.modelId ?? null, reason: decision.reasons, status: decision.status, blocker: decision.blocker };
}
