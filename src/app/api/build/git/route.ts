import { NextResponse, type NextRequest } from 'next/server';
import { createProjectAdapter } from '@/lib/build/adapter-factory';
import { guardBuildApi } from '@/lib/build/api-guard';

export const dynamic = 'force-dynamic';

/**
 * Read-only Git state.
 *
 * There is no POST handler on this route and no branch in this file that can
 * reach `git push`. Mutation requires a build service that holds credentials,
 * which is a separate system by design.
 */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'git' });
  if (denied) return denied;

  const adapter = createProjectAdapter();
  const git = await adapter.gitSnapshot();
  return NextResponse.json(
    { git, writeCapability: adapter.capabilities()['git.write'], blocker: adapter.blockerFor('git.write') },
    { headers: { 'cache-control': 'no-store' } },
  );
}
