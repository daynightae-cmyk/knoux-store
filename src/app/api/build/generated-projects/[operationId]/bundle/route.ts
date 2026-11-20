import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { generatedOperationId, type GeneratedRuntimeReceipt } from '@/lib/build/generated-project-contract';
import { promises as fs } from 'node:fs';

export const dynamic = 'force-dynamic';

/** In-memory operation store (shared with parent routes). */
const operationStore = new Map<string, GeneratedRuntimeReceipt>();

/** GET /api/build/generated-projects/[operationId]/bundle — download the export ZIP. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
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

  const receipt = operationStore.get(operationId);
  if (!receipt) {
    return NextResponse.json(
      { error: 'not-found', message: 'Generated project operation not found.' },
      { status: 404 },
    );
  }

  if (receipt.ownerId !== ownerId) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not own this operation.' },
      { status: 403 },
    );
  }

  if (!receipt.export?.path) {
    return NextResponse.json(
      { error: 'no-bundle', message: 'No export bundle available for this operation.' },
      { status: 404 },
    );
  }

  try {
    const bundlePath = receipt.export.path;
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
  } catch (err) {
    return NextResponse.json(
      { error: 'bundle-unavailable', message: 'The bundle could not be read.' },
      { status: 500 },
    );
  }
}