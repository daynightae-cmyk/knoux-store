import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { getUsageRecords, getUsageSummary } from '@/lib/ai/usage';
import { providerRuntimeContext } from '@/lib/ai/provider-os/runtime-context';

export const dynamic = 'force-dynamic';

/** GET /api/build/ai/usage — usage ledger and cost summary. */
async function handleGET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-usage' });
  if (denied) return denied;

  const parsed = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  const limit = Number.isSafeInteger(parsed) ? Math.max(1, Math.min(parsed, 1000)) : 100;
  const repository = providerRuntimeContext()?.repository;
  const records = repository ? await repository.usage(limit, request.nextUrl.searchParams.get('profileId') ?? undefined, request.nextUrl.searchParams.get('modelId') ?? undefined) : getUsageRecords(limit);
  const summary = getUsageSummary(records);

  return NextResponse.json({ records, summary, persistence: repository ? 'DURABLE' : 'INSTANCE_ONLY', summaryScope: 'returned records' }, { headers: { 'cache-control': 'no-store' } });
}

export async function GET(request: NextRequest) { return providerRequest(request, 'ai-usage', handleGET); }
