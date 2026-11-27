import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import { generatedBundlePath } from '@/lib/build/generated-project-executor';
import {
  authorizeBuildOwner,
  getGeneratedProjectsRoot,
  resolveOperationId,
} from '@/lib/build/generated-project-route';

export const dynamic = 'force-dynamic';

/** GET /api/build/generated-projects/[operationId]/bundle — download the export ZIP. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const owner = await authorizeBuildOwner(request, 'Sign in to download generated project bundles.');
  if (!owner.ok) return owner.response;

  const operationId = await resolveOperationId(params);

  let bundlePath: string;
  try {
    bundlePath = await generatedBundlePath(getGeneratedProjectsRoot(), owner.ownerId, operationId);
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
