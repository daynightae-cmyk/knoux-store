import { NextResponse, type NextRequest } from 'next/server';
import path from 'node:path';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  generatedOperationId,
} from '@/lib/build/generated-project-contract';
import { generatedBundlePath } from '@/lib/build/generated-project-executor';
import { promises as fs } from 'node:fs';

export const dynamic = 'force-dynamic';

function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return envRoot;
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** GET /api/build/generated-projects/[operationId]/bundle — download the export ZIP. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to download generated project bundles.' },
      { status: 401 },
    );
  }

  const { operationId: rawId } = await params;
  const operationId = generatedOperationId(rawId);

  let bundlePath: string;
  try {
    bundlePath = await generatedBundlePath(getGeneratedProjectsRoot(), ownerId, operationId);
  } catch {
    // A missing or unreadable operation is reported as "not available" without
    // exposing why: the caller learns nothing about the store's layout.
    return NextResponse.json(
      { error: 'not-found', message: 'Generated project bundle is not available for this operation.' },
      { status: 404 },
    );
  }

  try {
    const fileHandle = await fs.open(bundlePath, 'r');
    const stat = await fileHandle.stat();
    const stream = fileHandle.createReadStream();

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'content-type': 'application/zip',
        'content-length': stat.size.toString(),
        'content-disposition': `attachment; filename="knoux-generated-${operationId.slice(0, 8)}.zip"`,
        'cache-control': 'no-store',
      },
    });
  } catch {
    // A bundle that cannot be opened is reported as unavailable; the underlying
    // error is deliberately not surfaced to the caller.
    return NextResponse.json(
      { error: 'bundle-unavailable', message: 'The bundle could not be read.' },
      { status: 500 },
    );
  }
}
