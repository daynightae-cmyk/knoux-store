import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { getUsageRecords, getUsageSummary } from '@/lib/ai/usage';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/usage — usage ledger and cost summary. */
async function handleGET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-usage' });
  if (denied) return denied;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10), 1000);
  const records = getUsageRecords(limit);
  const summary = getUsageSummary();

  return NextResponse.json({ records, summary }, { headers: { 'cache-control': 'no-store' } });
}

export async function GET(request: NextRequest) { return providerRequest(request, 'ai-usage', handleGET); }
