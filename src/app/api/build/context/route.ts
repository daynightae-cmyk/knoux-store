import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, withShortCache } from '@/lib/build/api-guard';
import { readEngineeringContext } from '@/lib/build/engineering-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'engineering-context' });
  if (denied) return denied;
  const context = await withShortCache('engineering-context', () => readEngineeringContext());
  return NextResponse.json(context, { headers: { 'cache-control': 'no-store' } });
}
