import "server-only";
import { providerEnabled, providerRuntimeContext, runtimeNamespace, providerRuntimeKey } from "./provider-os/runtime-context";
import type { ProviderAdapter } from "./contract";
import { OpenAIAdapter } from "./adapters/openai";
import { AnthropicAdapter } from "./adapters/anthropic";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenRouterAdapter } from "./adapters/openrouter";
import { GroqAdapter } from "./adapters/groq";
import { MistralAdapter } from "./adapters/mistral";
import { DeepSeekAdapter } from "./adapters/deepseek";
import { QwenAdapter } from "./adapters/qwen";
import { GrokAdapter } from "./adapters/grok";
import { OpenCodeGoAdapter } from "./adapters/opencode-go";
import { OllamaAdapter } from "./adapters/ollama";
import { LMStudioAdapter } from "./adapters/lm-studio";
import { CustomOpenAIAdapter } from "./adapters/custom-openai";

import type {
  ProviderHealth,
  CapabilityState,
  SupportState,
  NormalizedError,
  NormalizedModel,
  DiscoveryResult,
  DiscoveryCacheEntry,
  DiscoverySource,
  AcceptanceResult,
} from "./types";

/**
 * Provider registry. Singleton that holds all adapter instances and
 * coordinates health tracking, discovery caching, and usage metering.
 *
 * Every method is server-only. The registry never exposes credentials.
 */

let _adapters: ProviderAdapter[] | null = null;

export function getRegisteredAdapters(): ProviderAdapter[] {
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

export function getAdapters(): ProviderAdapter[] {
  return getRegisteredAdapters().filter(adapter => providerEnabled(adapter.id));
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
  lastError: NormalizedError | null;
  latencyMs: number | null;
};

const healthRecords = new Map<string, HealthRecord>();

function initHealthRecord(providerId: string): HealthRecord {
  return {
    providerId,
    auth: "UNCONFIGURED",
    discovery: "UNCONFIGURED",
    generation: "UNCONFIGURED",
    streaming: "UNCONFIGURED",
    tools: "UNKNOWN",
    vision: "UNKNOWN",
    structuredOutput: "UNKNOWN",
    lastTestedAt: null,
    lastError: null,
    latencyMs: null,
  };
}

function getHealthRecord(providerId: string): HealthRecord {
  const key = providerRuntimeKey(providerId);
  if (!healthRecords.has(key)) {
    if (healthRecords.size >= 2048) healthRecords.delete(healthRecords.keys().next().value!);
    healthRecords.set(key, { ...initHealthRecord(providerId), ...providerRuntimeContext()?.seedHealth.get(providerId) });
  }
  return healthRecords.get(key)!;
}

export function updateHealth(
  providerId: string,
  updates: Partial<HealthRecord>,
): void {
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
      auth: "UNCONFIGURED",
      discovery: "UNCONFIGURED",
      generation: "UNCONFIGURED",
      streaming: "UNCONFIGURED",
      tools: "UNKNOWN",
      vision: "UNKNOWN",
      structuredOutput: "UNKNOWN",
      modelCount: 0,
      lastTestedAt: null,
      lastError: null,
      latencyMs: null,
      rateLimits: null,
    };
  }

  // Start with stored health; if configured but never tested, show CONFIGURED_UNTESTED
  const authState =
    health.auth === "UNCONFIGURED" ? "CONFIGURED_UNTESTED" : health.auth;
  const discoveryState =
    health.discovery === "UNCONFIGURED"
      ? "CONFIGURED_UNTESTED"
      : health.discovery;
  const generationState =
    health.generation === "UNCONFIGURED"
      ? "CONFIGURED_UNTESTED"
      : health.generation;
  const streamingState =
    health.streaming === "UNCONFIGURED"
      ? "CONFIGURED_UNTESTED"
      : health.streaming;

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
    tools:
      health.tools !== "UNKNOWN"
        ? health.tools
        : caps.tools
          ? "SUPPORTED"
          : "UNSUPPORTED",
    vision:
      health.vision !== "UNKNOWN"
        ? health.vision
        : caps.vision
          ? "SUPPORTED"
          : "UNSUPPORTED",
    structuredOutput:
      health.structuredOutput !== "UNKNOWN"
        ? health.structuredOutput
        : caps.structuredOutput
          ? "SUPPORTED"
          : "UNSUPPORTED",
    modelCount: getDiscoveryCache(adapter.id)?.models.length ?? 0,
    lastTestedAt: health.lastTestedAt,
    lastError: health.lastError,
    latencyMs: health.latencyMs,
    rateLimits: null, // Populated after generation calls
  };
}

/**
 * Collapse a measured capability state into a deliverable acceptance verdict.
 *
 * The rule the runtime must never break: the presence of a credential is not
 * evidence. Only a state actually measured by a live call may report PASS, and
 * a state that has never been exercised stays UNTESTED rather than widening to
 * a success.
 */
function acceptanceOf(
  state: CapabilityState | SupportState,
  configured: boolean,
): AcceptanceResult {
  if (!configured || state === "UNCONFIGURED") return "BLOCKED";
  switch (state) {
    case "AUTHENTICATED":
    case "DISCOVERY_VERIFIED":
    case "GENERATION_VERIFIED":
    case "STREAMING_VERIFIED":
    case "TOOLS_VERIFIED":
    case "VISION_VERIFIED":
    case "STRUCTURED_OUTPUT_VERIFIED":
    case "VERIFIED":
      return "PASS";
    case "SUPPORTED":
      return "UNTESTED";
    case "FAILED":
    case "RATE_LIMITED":
    case "DEGRADED":
      return "FAIL";
    case "UNSUPPORTED":
      return "UNSUPPORTED";
    case "BLOCKED":
      return "BLOCKED";
    default:
      // CONFIGURED_UNTESTED and UNKNOWN both mean "not measured".
      return "UNTESTED";
  }
}

export function allProviderHealth(
  env: Record<string, string | undefined>,
): ProviderHealth[] {
  return getAdapters().map((adapter) => {
    const snapshot = buildProviderHealth(adapter, env);
    return {
      ...snapshot,
      acceptance: {
        auth: acceptanceOf(snapshot.auth, snapshot.configured),
        discovery: acceptanceOf(snapshot.discovery, snapshot.configured),
        generation: acceptanceOf(snapshot.generation, snapshot.configured),
        streaming: acceptanceOf(snapshot.streaming, snapshot.configured),
        tools: acceptanceOf(snapshot.tools, snapshot.configured),
        vision: acceptanceOf(snapshot.vision, snapshot.configured),
        structuredOutput: acceptanceOf(
          snapshot.structuredOutput,
          snapshot.configured,
        ),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Discovery cache
// ---------------------------------------------------------------------------

const DISCOVERY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

export function getDiscoveryCache(
  providerId: string,
): DiscoveryCacheEntry | null {
  const key = providerRuntimeKey(providerId);
  const seed = providerRuntimeContext()?.seedModels.get(providerId);
  const seeded = seed ? { providerId, models: seed.models.filter(model=>model.modalities.text&&model.catalog?.buildEligible!==false), catalogModels:seed.models, source: "LIVE" as const, discoveredAt: seed.discoveredAt, expiresAt: new Date(Date.parse(seed.discoveredAt) + DISCOVERY_TTL_MS).toISOString() } : null;
  const entry = discoveryCache.get(key) ?? seeded;
  if (!entry) return null;
  if (Date.now() > new Date(entry.expiresAt).getTime()) {
    discoveryCache.delete(key);
    return null;
  }
  return entry;
}

export function setDiscoveryCache(
  providerId: string,
  models: NormalizedModel[],
  source: DiscoverySource,
  catalogModels?: NormalizedModel[],
): void {
  const now = new Date();
  const expires = new Date(now.getTime() + DISCOVERY_TTL_MS);
  if (discoveryCache.size >= 2048) discoveryCache.delete(discoveryCache.keys().next().value!);
  discoveryCache.set(providerRuntimeKey(providerId), {
    providerId,
    models,
    catalogModels:catalogModels??models,
    discoveredAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    source,
  });
}

export function clearDiscoveryCache(providerId?: string): void {
  if (providerId) {
    discoveryCache.delete(providerRuntimeKey(providerId));
    providerRuntimeContext()?.seedModels.delete(providerId);
  } else {
    for (const key of discoveryCache.keys()) if (key.startsWith(`${runtimeNamespace()}:`)) discoveryCache.delete(key);
    providerRuntimeContext()?.seedModels.clear();
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
      source: "UNKNOWN",
      discoveredAt: new Date().toISOString(),
      error: {
        category: "UNKNOWN",
        message: "Unknown provider",
        safeMessage: `No adapter for ${providerId}`,
        httpStatus: null,
        providerErrorId: null,
        retryable: false,
      },
      fromCache: false,
    };
  }

  if (!forceRefresh) {
    const cached = getDiscoveryCache(providerId);
    if (cached) {
      return {
        providerId,
        models: cached.models,
        catalogModels:cached.catalogModels,
        source: "CACHED_LIVE",
        discoveredAt: cached.discoveredAt,
        error: null,
        fromCache: true,
      };
    }
  }

  if (forceRefresh) clearDiscoveryCache(providerId);

  const result = await adapter.discoverModels(env);
  if (result.models.length > 0 && result.source === "LIVE") {
    setDiscoveryCache(providerId, result.models.filter(model=>model.modalities.text&&model.catalog?.buildEligible!==false), result.source,result.catalogModels??result.models);
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

export function getAllDiscoveredModels(): {
  providerId: string;
  models: NormalizedModel[];
}[] {
  const all: { providerId: string; models: NormalizedModel[] }[] = [];
  for (const adapter of getAdapters()) {
    const cached = getDiscoveryCache(adapter.id);
    if (cached) {
      all.push({ providerId: adapter.id, models: cached.models });
    }
  }
  return all;
}
