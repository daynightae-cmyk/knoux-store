import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerEnvironment } from '@/lib/ai/provider-os/runtime-context';
import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import {
  discoverProviderModels,
  getAdapters,
  getDiscoveryCache,
} from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

/** GET /api/build/ai/models — all discovered models (from cache or fresh). */
async function handleGET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-models" });
  if (denied) return denied;

  const adapters = getAdapters();

  // A provider with no cache entry is discovered on demand, so a cold server
  // returns real models instead of an empty list that the UI would render as
  // "no models exist". Unconfigured providers resolve to an empty list
  // without a network call.
  const settled = await Promise.all(
    adapters.map(async (adapter) => {
      const cached = getDiscoveryCache(adapter.id);
      if (cached) {
        return {
          providerId: adapter.id,
          models: cached.catalogModels??cached.models,
          source: "CACHED_LIVE" as const,
          discoveredAt: cached.discoveredAt,
          fromCache: true,
        };
      }
      if (!adapter.isConfigured(providerEnvironment())) {
        // Unconfigured providers with a published static catalogue still show
        // their model identities, marked catalogue-only (CONFIG REQUIRED) so
        // the picker is never empty and never fabricates LIVE availability.
        const staticIds = adapter.staticModels();
        return {
          providerId: adapter.id,
          models: staticIds.map((modelId) => ({
            providerId: adapter.id,
            modelId,
            displayName: modelId,
            discoveredAt: new Date().toISOString(),
            contextWindow: null,
            maxOutputTokens: null,
            modalities: { text: true, imageInput: false, audioInput: false, audioOutput: false },
            capabilities: { streaming: 'UNKNOWN', tools: 'UNKNOWN', structuredOutput: 'UNKNOWN', reasoning: 'UNKNOWN', vision: 'UNKNOWN' },
            controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: true },
            pricing: { inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: 'USD' },
            lifecycle: 'unknown' as const,
            source: 'STATIC' as const,
            catalog: { categories: [], gateway: false, authorNamespace: null, supportedParameters: null, free: null, buildEligible: false, metadataSource: 'IDENTITY_HINT' as const },
          })),
          source: "STATIC" as const,
          discoveredAt: new Date().toISOString(),
          fromCache: false,
        };
      }
      const result = await discoverProviderModels(
        adapter.id,
        providerEnvironment(),
        false,
      );
      return {
        providerId: adapter.id,
        models: result.catalogModels??result.models,
        source: result.source,
        discoveredAt: result.discoveredAt,
        fromCache: result.fromCache,
      };
    }),
  );

  return NextResponse.json(
    { providers: settled },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function GET(request: NextRequest) { return providerRequest(request, 'ai-models', handleGET); }
