import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { GitHubIntegrationAdapter } from '@/lib/build/github';
import { isBuildOperator } from '@/lib/build/operator';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'github' }); if (denied) return denied;
  const listing = request.nextUrl.searchParams.get('list') === '1';
  const owner = await resolveBuildOwnerId();
  // A deployment token must never serve private repositories to anonymous local/demo users.
  const operator = isBuildOperator(owner);
  if (listing && !operator) return NextResponse.json({ message: 'Sign in as an allowlisted operator. Set KNOUX_BUILD_OPERATOR_IDS server-side.' }, { status: 403 });
  const adapter = new GitHubIntegrationAdapter(operator ? process.env.KNOUX_BUILD_GITHUB_TOKEN ?? null : null);
  try {
    return NextResponse.json(listing ? { repositories: await adapter.list(), limit: 100 } : { repository: await adapter.resolve(request.nextUrl.searchParams.get('repository') ?? '') }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return NextResponse.json({ message: cause instanceof Error ? cause.message : 'Repository lookup failed.' }, { status: 400 }); }
}
