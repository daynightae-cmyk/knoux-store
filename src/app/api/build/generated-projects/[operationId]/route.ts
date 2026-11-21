import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { generatedOperationId } from '@/lib/build/generated-project-contract';
import { readGeneratedReceipt, cancelGeneratedProject, cancelDeployGeneratedProject, generatedProjectsRoot } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

/** GET /api/build/generated-projects/[operationId] — get operation status. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to inspect generated projects.' },
      { status: 401 },
    );
  }

  const { operationId: rawId } = await params;
  let operationId: string;
  try {
    operationId = generatedOperationId(rawId);
  } catch {
    return NextResponse.json(
      { error: 'invalid-id', message: 'A valid operation UUID is required.' },
      { status: 400 },
    );
  }

  const receipt = await readGeneratedReceipt(generatedProjectsRoot(), ownerId, operationId);
  if (!receipt) {
    return NextResponse.json(
      { error: 'not-found', message: 'Generated project operation not found.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ receipt });
}

/** DELETE /api/build/generated-projects/[operationId] — stop the preview process. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to stop generated projects.' },
      { status: 401 },
    );
  }

  const { operationId: rawId } = await params;
  try {
    const receipt = await cancelGeneratedProject(generatedProjectsRoot(), ownerId, generatedOperationId(rawId));
    return NextResponse.json({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The preview could not be stopped.';
    const notFound = /not found/i.test(message);
    return NextResponse.json(
      { error: notFound ? 'not-found' : 'stop-failed', message },
      { status: notFound ? 404 : 400 },
    );
  }
}

/** PATCH /api/build/generated-projects/[operationId] — cancel deployment. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to cancel deployments.' },
      { status: 401 },
    );
  }

  const { operationId: rawId } = await params;
  try {
    const receipt = await cancelDeployGeneratedProject(generatedProjectsRoot(), ownerId, generatedOperationId(rawId));
    return NextResponse.json({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The deployment could not be cancelled.';
    const notFound = /not found/i.test(message);
    return NextResponse.json(
      { error: notFound ? 'not-found' : 'cancel-failed', message },
      { status: notFound ? 404 : 400 },
    );
  }
}