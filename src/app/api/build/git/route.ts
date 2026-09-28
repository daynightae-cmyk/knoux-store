import { NextResponse } from 'next/server';
import { FsProjectAdapter } from '@/lib/build/project-adapter';

export const dynamic = 'force-dynamic';

/**
 * Read-only Git state.
 *
 * There is no POST handler on this route and no branch in this file that can
 * reach `git push`. Mutation requires a build service that holds credentials,
 * which is a separate system by design.
 */
export async function GET() {
  const adapter = new FsProjectAdapter({ root: process.cwd(), environment: 'production', label: 'read-only' });
  const git = await adapter.gitSnapshot();
  return NextResponse.json(
    { git, writeCapability: adapter.capabilities()['git.write'], blocker: adapter.blockerFor('git.write') },
    { headers: { 'cache-control': 'no-store' } },
  );
}
