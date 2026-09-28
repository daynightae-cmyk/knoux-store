import { NextResponse } from 'next/server';
import { FsProjectAdapter } from '@/lib/build/project-adapter';
import type { BuildCapability, EnvironmentName } from '@/lib/build/types';

export const dynamic = 'force-dynamic';

const ADAPTER_ID = 'knoux-fs-readonly';

/**
 * Environment is derived from the deployment, never from a request parameter.
 * A caller must not be able to ask "is this local mode?" and get an answer that
 * changes what the API will do.
 */
function environment(): EnvironmentName {
  if (process.env.VERCEL_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'preview') return 'preview';
  return 'local';
}

function adapter() {
  return new FsProjectAdapter({
    root: process.cwd(),
    environment: environment(),
    label:
      environment() === 'production'
        ? 'Read-only production checkout'
        : environment() === 'preview'
          ? 'Read-only preview checkout'
          : 'Read-only local checkout',
  });
}

export async function GET() {
  try {
    const instance = adapter();
    const snapshot = await instance.snapshot();
    const capabilities = instance.capabilities();
    const blockers: Partial<Record<BuildCapability, string>> = {};
    for (const capability of Object.keys(capabilities) as BuildCapability[]) {
      const blocker = instance.blockerFor(capability);
      if (blocker) blockers[capability] = blocker;
    }
    return NextResponse.json(
      {
        adapter: { id: ADAPTER_ID, label: instance.label, environment: instance.environment, capabilities, blockers },
        snapshot,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'project-introspection-failed',
        message: 'The project could not be read on this deployment.',
      },
      { status: 500 },
    );
  }
}
