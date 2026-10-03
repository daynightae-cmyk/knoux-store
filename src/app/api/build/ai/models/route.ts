import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { discoverAllModels, getAdapters, getDiscoveryCache } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/models — all discovered models (from cache or fresh). */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-models' });
  if (denied) return denied;

  const adapters = getAdapters();
  const results = adapters.map((adapter) => {
    const cached = getDiscoveryCache(adapter.id);
    if (cached) {
      return {
        providerId: adapter.id,
        models: cached.models,
        source: 'CACHED_LIVE' as const,
        discoveredAt: cached.discoveredAt,
        fromCache: true,
      };
    }
    return {
      providerId: adapter.id,
      models: [],
      source: 'UNKNOWN' as const,
      discoveredAt: null,
      fromCache: false,
    };
  });

  return NextResponse.json({ providers: results }, { headers: { 'cache-control': 'no-store' } });
}
