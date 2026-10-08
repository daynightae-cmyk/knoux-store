import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { allProviderHealth, getAdapter } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/providers — provider health snapshot. Client-safe. */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-providers' });
  if (denied) return denied;

  const health = allProviderHealth(process.env);
  return NextResponse.json({ providers: health.map((provider) => ({ ...provider, environment: (getAdapter(provider.providerId)?.requiredEnv ?? []).map((name) => ({ name, present: !!process.env[name]?.trim() })) })) }, { headers: { 'cache-control': 'no-store' } });
}
