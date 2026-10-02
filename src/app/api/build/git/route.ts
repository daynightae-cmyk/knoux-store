import { NextResponse, type NextRequest } from 'next/server';
import { requestProjectAdapter } from '@/lib/build/request-adapter';
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

  let adapter;
  try { adapter = await requestProjectAdapter(request); } catch { return NextResponse.json({ message: 'Selected project is unavailable. Sign in and pair its bridge.' }, { status: 409 }); }
  let git;
  try { git = await adapter.gitSnapshot(); } catch { return NextResponse.json({ message: 'Git state could not be read from the selected adapter.' }, { status: 409 }); }
  return NextResponse.json(
    { git, writeCapability: adapter.capabilities()['git.write'], blocker: adapter.blockerFor('git.write') },
    { headers: { 'cache-control': 'no-store' } },
  );
}
