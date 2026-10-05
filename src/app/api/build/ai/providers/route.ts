import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { allProviderHealth } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/providers — provider health snapshot. Client-safe. */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-providers' });
  if (denied) return denied;

  const health = allProviderHealth(process.env);
  return NextResponse.json({ providers: health }, { headers: { 'cache-control': 'no-store' } });
}
