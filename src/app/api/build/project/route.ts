import { NextResponse, type NextRequest } from 'next/server';
import { requestProjectAdapter } from '@/lib/build/request-adapter';
import { guardBuildApi, withShortCache, resolveBuildOwnerId } from '@/lib/build/api-guard';
import type { BuildCapability } from '@/lib/build/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'project' });
  if (denied) return denied;

  try {
    const instance = await requestProjectAdapter(request);
    // The cache key identifies the snapshot; the root itself is already in the
    // payload, so it need not appear in a shared key.
    const snapshot = await withShortCache(
      `project:${instance.environment}:${instance.id}:${request.nextUrl.searchParams.get('project') ? await resolveBuildOwnerId() : 'checkout'}:${request.nextUrl.searchParams.get('project') ?? ''}`,
      () => instance.snapshot(),
    );
    const capabilities = instance.capabilities();
    const blockers: Partial<Record<BuildCapability, string>> = {};
    for (const capability of Object.keys(capabilities) as BuildCapability[]) {
      const blocker = instance.blockerFor(capability);
      if (blocker) blockers[capability] = blocker;
    }
    return NextResponse.json(
      {
        adapter: {
          id: instance.id,
          label: instance.label,
          environment: instance.environment,
          capabilities,
          blockers,
        },
        snapshot,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        error: 'project-introspection-failed',
        message: 'The project could not be read on this deployment.',
      },
      { status: 500 },
    );
  }
}
