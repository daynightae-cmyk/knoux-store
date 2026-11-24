import { type NextRequest } from 'next/server';
import { authorizeGeneratedProject, generatedProjectResponse } from '@/lib/build/generated-project-access';
import { generatedOperationId } from '@/lib/build/generated-project-contract';
import { generatedBundlePath, generatedProjectsRoot } from '@/lib/build/generated-project-executor';
import { promises as fs } from 'node:fs';

export const dynamic = 'force-dynamic';

/** GET /api/build/generated-projects/[operationId]/bundle — download the export ZIP. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  const { operationId: rawId } = await params;
  let operationId: string;
  try {
    operationId = generatedOperationId(rawId);
  } catch {
    return generatedProjectResponse(
      { error: 'invalid-id', message: 'A valid operation UUID is required.' },
      { status: 400 },
    );
  }

  // The executor resolves the bundle from the durable receipt, re-verifies
  // containment and refuses links; the route never builds a path from input.
  let bundlePath: string;
  try {
    bundlePath = await generatedBundlePath(generatedProjectsRoot(), access.ownerId, operationId);
  } catch {
    return generatedProjectResponse(
      { error: 'no-bundle', message: 'No export bundle is available for this operation.' },
      { status: 404 },
    );
  }

  try {
    const fileHandle = await fs.open(bundlePath, 'r');
    try {
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
      await fileHandle.close();
      throw err;
    }
  } catch {
    return generatedProjectResponse(
      { error: 'bundle-unavailable', message: 'The bundle could not be read.' },
      { status: 500 },
    );
  }
}