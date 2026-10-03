import 'server-only';
import type { ProviderAdapter } from './contract';
import { OpenAIAdapter } from './adapters/openai';
import { AnthropicAdapter } from './adapters/anthropic';
import { GeminiAdapter } from './adapters/gemini';
import { OpenRouterAdapter } from './adapters/openrouter';
import { GroqAdapter } from './adapters/groq';
import { MistralAdapter } from './adapters/mistral';
import { DeepSeekAdapter } from './adapters/deepseek';
import { QwenAdapter } from './adapters/qwen';
import { GrokAdapter } from './adapters/grok';
import { OpenCodeGoAdapter } from './adapters/opencode-go';
import { OllamaAdapter } from './adapters/ollama';
import { LMStudioAdapter } from './adapters/lm-studio';
import { CustomOpenAIAdapter } from './adapters/custom-openai';

import type {
  ProviderHealth,
  CapabilityState,
  SupportState,
  NormalizedModel,
  DiscoveryResult,
} from './types';

/**
 * Provider registry. Singleton that holds all adapter instances and
 * coordinates health tracking, discovery caching, and usage metering.
 *
 * Every method is server-only. The registry never exposes credentials.
 */

let _adapters: ProviderAdapter[] | null = null;

export function getAdapters(): ProviderAdapter[] {
  if (_adapters) return _adapters;
  _adapters = [
    new OpenAIAdapter(),
    new AnthropicAdapter(),
    new GeminiAdapter(),
    new OpenRouterAdapter(),
    new GroqAdapter(),
    new MistralAdapter(),
    new DeepSeekAdapter(),
    new QwenAdapter(),
    new GrokAdapter(),
    new OpenCodeGoAdapter(),
    new OllamaAdapter(),
    new LMStudioAdapter(),
    new CustomOpenAIAdapter(),
  ];
  return _adapters;
}

export function getAdapter(providerId: string): ProviderAdapter | null {
  return getAdapters().find((a) => a.id === providerId) ?? null;
}

// ---------------------------------------------------------------------------
// Health tracking (in-memory, per-server-instance)
// ---------------------------------------------------------------------------

type HealthRecord = {
  providerId: string;
  auth: CapabilityState;
  discovery: CapabilityState;
  generation: CapabilityState;
  streaming: CapabilityState;
  tools: SupportState;
  vision: SupportState;
  structuredOutput: SupportState;
  lastTestedAt: string | null;
  lastError: { category: string; message: string; safeMessage: string; httpStatus: number | null; providerErrorId: string | null; retryable: boolean } | null;
  latencyMs: number | null;
};

const healthRecords = new Map<string, HealthRecord>();

function initHealthRecord(providerId: string): HealthRecord {
  return {
    providerId,
    auth: 'UNCONFIGURED',
    discovery: 'UNCONFIGURED',
    generation: 'UNCONFIGURED',
    streaming: 'UNCONFIGURED',
    tools: 'UNKNOWN',
    vision: 'UNKNOWN',
    structuredOutput: 'UNKNOWN',
    lastTestedAt: null,
    lastError: null,
    latencyMs: null,
  };
}

function getHealthRecord(providerId: string): HealthRecord {
  if (!healthRecords.has(providerId)) {
    healthRecords.set(providerId, initHealthRecord(providerId));
  }
  return healthRecords.get(providerId)!;
}

export function updateHealth(providerId: string, updates: Partial<HealthRecord>): void {
  const record = getHealthRecord(providerId);
  Object.assign(record, updates, { lastTestedAt: new Date().toISOString() });
}

export function getHealth(providerId: string): HealthRecord {
  return getHealthRecord(providerId);
}

/**
 * Build a client-safe provider health snapshot. Never includes secrets,
 * full error messages, or credential values.
 */
export function buildProviderHealth(
  adapter: ProviderAdapter,
  env: Record<string, string | undefined>,
): ProviderHealth {
  const configured = adapter.isConfigured(env);
  const health = getHealth(adapter.id);

  // If not configured, everything is UNCONFIGURED
  if (!configured) {
    return {
      providerId: adapter.id,
      displayName: adapter.displayName,
      transport: adapter.transport,
      configured: false,
      auth: 'UNCONFIGURED',
      discovery: 'UNCONFIGURED',
      generation: 'UNCONFIGURED',
      streaming: 'UNCONFIGURED',
      tools: 'UNKNOWN',
      vision: 'UNKNOWN',
      structuredOutput: 'UNKNOWN',
      modelCount: 0,
      lastTestedAt: null,
      lastError: null,
      latencyMs: null,
      rateLimits: null,
    };
  }

  // Start with stored health; if configured but never tested, show CONFIGURED_UNTESTED
  const authState = health.auth === 'UNCONFIGURED' ? 'CONFIGURED_UNTESTED' : health.auth;
  const discoveryState = health.discovery === 'UNCONFIGURED' ? 'CONFIGURED_UNTESTED' : health.discovery;
  const generationState = health.generation === 'UNCONFIGURED' ? 'CONFIGURED_UNTESTED' : health.generation;
  const streamingState = health.streaming === 'UNCONFIGURED' ? 'CONFIGURED_UNTESTED' : health.streaming;

  // Capabilities from adapter declaration, refined by health records
  const caps = adapter.capabilities();

  return {
    providerId: adapter.id,
    displayName: adapter.displayName,
    transport: adapter.transport,
    configured: true,
    auth: authState,
    discovery: discoveryState,
    generation: generationState,
    streaming: streamingState,
    tools: health.tools !== 'UNKNOWN' ? health.tools : (caps.tools ? 'SUPPORTED' : 'UNSUPPORTED'),
    vision: health.vision !== 'UNKNOWN' ? health.vision : (caps.vision ? 'SUPPORTED' : 'UNSUPPORTED'),
    structuredOutput: health.structuredOutput !== 'UNKNOWN' ? health.structuredOutput : (caps.structuredOutput ? 'SUPPORTED' : 'UNSUPPORTED'),
    modelCount: getDiscoveryCache(adapter.id)?.models.length ?? 0,
    lastTestedAt: health.lastTestedAt,
    lastError: health.lastError,
    latencyMs: health.latencyMs,
    rateLimits: null, // Populated after generation calls
  };
}

export function allProviderHealth(env: Record<string, string | undefined>): ProviderHealth[] {
  return getAdapters().map((adapter) => buildProviderHealth(adapter, env));
}

// ---------------------------------------------------------------------------
// Discovery cache
// ---------------------------------------------------------------------------

const DISCOVERY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const discoveryCache = new Map<string, { models: NormalizedModel[]; discoveredAt: string; expiresAt: string; source: string }>();

export function getDiscoveryCache(providerId: string): { models: NormalizedModel[]; discoveredAt: string; expiresAt: string; source: string } | null {
  const entry = discoveryCache.get(providerId);
  if (!entry) return null;
  if (Date.now() > new Date(entry.expiresAt).getTime()) {
    discoveryCache.delete(providerId);
    return null;
  }
  return entry;
}

export function setDiscoveryCache(providerId: string, models: NormalizedModel[], source: string): void {
  const now = new Date();
  const expires = new Date(now.getTime() + DISCOVERY_TTL_MS);
  discoveryCache.set(providerId, {
    models,
    discoveredAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    source,
  });
}

export function clearDiscoveryCache(providerId?: string): void {
  if (providerId) {
    discoveryCache.delete(providerId);
  } else {
    discoveryCache.clear();
  }
}

export async function discoverProviderModels(
  providerId: string,
  env: Record<string, string | undefined>,
  forceRefresh = false,
): Promise<DiscoveryResult> {
  const adapter = getAdapter(providerId);
  if (!adapter) {
    return {
      providerId,
      models: [],
      source: 'UNKNOWN',
      discoveredAt: new Date().toISOString(),
      error: { category: 'UNKNOWN', message: 'Unknown provider', safeMessage: `No adapter for ${providerId}`, httpStatus: null, providerErrorId: null, retryable: false },
      fromCache: false,
    };
  }

  if (!forceRefresh) {
    const cached = getDiscoveryCache(providerId);
    if (cached) {
      return {
        providerId,
        models: cached.models,
        source: 'CACHED_LIVE',
        discoveredAt: cached.discoveredAt,
        error: null,
        fromCache: true,
      };
    }
  }

  if (forceRefresh) clearDiscoveryCache(providerId);

  const result = await adapter.discoverModels(env);
  if (result.models.length > 0 && result.source === 'LIVE') {
    setDiscoveryCache(providerId, result.models, result.source);
  }
  return result;
}

export async function discoverAllModels(
  env: Record<string, string | undefined>,
  forceRefresh = false,
): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = [];
  for (const adapter of getAdapters()) {
    results.push(await discoverProviderModels(adapter.id, env, forceRefresh));
  }
  return results;
}

export function getAllDiscoveredModels(): { providerId: string; models: NormalizedModel[] }[] {
  const all: { providerId: string; models: NormalizedModel[] }[] = [];
  for (const adapter of getAdapters()) {
    const cached = getDiscoveryCache(adapter.id);
    if (cached) {
      all.push({ providerId: adapter.id, models: cached.models });
    }
  }
  return all;
}
