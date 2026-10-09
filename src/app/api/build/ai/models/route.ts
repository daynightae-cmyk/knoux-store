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
        return {
          providerId: adapter.id,
          models: [],
          source: "UNKNOWN" as const,
          discoveredAt: null,
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
