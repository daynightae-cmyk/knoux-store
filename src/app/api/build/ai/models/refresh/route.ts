import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { discoverProviderModels, getAdapters, updateHealth } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

/** POST /api/build/ai/models/refresh — trigger live model discovery for one or all providers. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-discovery' });
  if (denied) return denied;

  let body: { provider?: string };
  try { body = await request.json(); } catch { body = {}; }

  if (body.provider) {
    const adapter = getAdapters().find((a) => a.id === body.provider);
    if (!adapter) return NextResponse.json({ message: `Unknown provider: ${body.provider}` }, { status: 404 });

    const result = await discoverProviderModels(body.provider, process.env, true);
    updateHealth(body.provider, {
      discovery: result.source === 'LIVE' ? 'DISCOVERY_VERIFIED' : 'FAILED',
      lastError: result.error ? { category: result.error.category, safeMessage: result.error.safeMessage } : null,
    });

    return NextResponse.json({ providers: [result] }, { headers: { 'cache-control': 'no-store' } });
  }

  // Discover all configured providers
  const results = [];
  for (const adapter of getAdapters()) {
    if (!adapter.isConfigured(process.env)) continue;
    const result = await discoverProviderModels(adapter.id, process.env, true);
    updateHealth(adapter.id, {
      discovery: result.source === 'LIVE' ? 'DISCOVERY_VERIFIED' : 'FAILED',
      lastError: result.error ? { category: result.error.category, safeMessage: result.error.safeMessage } : null,
    });
    results.push(result);
  }

  return NextResponse.json({ providers: results }, { headers: { 'cache-control': 'no-store' } });
}
