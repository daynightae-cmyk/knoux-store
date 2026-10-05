import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { getUsageRecords, getUsageSummary } from '@/lib/ai/usage';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/usage — usage ledger and cost summary. */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-usage' });
  if (denied) return denied;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10), 1000);
  const records = getUsageRecords(limit);
  const summary = getUsageSummary();

  return NextResponse.json({ records, summary }, { headers: { 'cache-control': 'no-store' } });
}
