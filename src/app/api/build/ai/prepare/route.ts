import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerEnvironment } from '@/lib/ai/provider-os/runtime-context';
import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { getAdapters, allProviderHealth, discoverProviderModels, updateHealth, getDiscoveryCache } from '@/lib/ai/registry';
import { buildRouterInput, routeV2 } from '@/lib/ai/router-v2';
import { publicRequestOrigin, checkRequestOrigin } from '@/lib/contact/intake-guard';
import { isGenerationProfile } from '@/lib/build/profile';
import { estimateTokens } from '@/lib/ai/contract';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Resolves the canonical runtime, without generation charges or project mutations. */
async function handlePOST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return NextResponse.json({ message: 'Cross-site planning request refused.' }, { status: 403 });
  const denied = await guardBuildApi(request, { scope: 'ai-prepare' });
  if (denied) return denied;
  let body: { prompt?: unknown; mode?: unknown; generationProfile?: unknown; manualSelection?: { providerId?: unknown; modelId?: unknown } };
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected a planning request.' }, { status: 400 }); }
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 16_000 || !['auto', 'manual'].includes(String(body.mode ?? 'auto'))) return NextResponse.json({ message: 'A prompt of 1–16000 characters and valid routing mode are required.' }, { status: 400 });
  const manual = body.mode === 'manual';
  if (body.generationProfile !== undefined && !isGenerationProfile(body.generationProfile)) return NextResponse.json({ message: 'Choose a valid generation profile.' }, { status: 400 });
  const profile = isGenerationProfile(body.generationProfile) ? body.generationProfile : 'BALANCED';
  const selection = body.manualSelection;
  if (manual && (!selection || typeof selection.providerId !== 'string' || typeof selection.modelId !== 'string' || selection.modelId.length > 200)) return NextResponse.json({ message: 'Select a provider and discovered model.' }, { status: 400 });
  const adapters = getAdapters().filter((adapter) => adapter.isConfigured(providerEnvironment()) && (!manual || adapter.id === selection?.providerId));
  await Promise.allSettled(adapters.map(async (adapter) => {
    const health = allProviderHealth(providerEnvironment()).find((item) => item.providerId === adapter.id)!;
    if (health.auth !== 'AUTHENTICATED') {
      const probe = await adapter.probe(providerEnvironment());
      updateHealth(adapter.id, { auth: probe.authenticated ? 'AUTHENTICATED' : 'FAILED', lastError: probe.error, latencyMs: probe.latencyMs });
      if (!probe.authenticated) return;
    }
    const discovery = await discoverProviderModels(adapter.id, providerEnvironment());
    updateHealth(adapter.id, { discovery: discovery.models.length && !discovery.error ? 'DISCOVERY_VERIFIED' : 'FAILED', lastError: discovery.error });
  }));
  const healthMap = new Map(allProviderHealth(providerEnvironment()).map((health) => [health.providerId, health]));
  const input = buildRouterInput('engineering-plan', manual ? 'manual' : 'auto', body.prompt, { manualSelection: manual ? selection as { providerId: string; modelId: string } : undefined, noFallback: true, toolsRequired: false, structuredOutputRequired: false, generationProfile: profile });
  input.contextRequirement = estimateTokens(body.prompt) + 1;
  const decision = routeV2(input, healthMap);
  const models = adapters.flatMap((adapter) => (getDiscoveryCache(adapter.id)?.models ?? []).map((model) => ({ providerId: adapter.id, modelId: model.modelId, displayName: model.displayName })));
  return NextResponse.json({ decision, models, agent: { name: 'KNOuX Architect', kind: 'Logical planning profile', executable: null, tools: [], permissions: ['provider:generate'], execution: 'EXECUTOR_NOT_CONNECTED' }, state: decision.selected ? 'ROUTING' : adapters.length ? 'PROVIDER_BLOCKED' : 'CONFIG_REQUIRED' }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) { return providerRequest(request, 'ai-prepare', handlePOST); }
