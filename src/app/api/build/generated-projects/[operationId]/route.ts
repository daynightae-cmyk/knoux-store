import { type NextRequest } from 'next/server';
import { authorizeGeneratedProject, generatedProjectResponse } from '@/lib/build/generated-project-access';
import { generatedOperationId } from '@/lib/build/generated-project-contract';
import { readGeneratedReceipt, cancelGeneratedProject, cancelDeployGeneratedProject, generatedProjectsRoot } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

/** GET /api/build/generated-projects/[operationId] — get operation status. */
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

  const receipt = await readGeneratedReceipt(generatedProjectsRoot(), access.ownerId, operationId);
  if (!receipt) {
    return generatedProjectResponse(
      { error: 'not-found', message: 'Generated project operation not found.' },
      { status: 404 },
    );
  }

  return generatedProjectResponse({ receipt });
}

/** DELETE /api/build/generated-projects/[operationId] — stop the preview process. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  const { operationId: rawId } = await params;
  try {
    const receipt = await cancelGeneratedProject(generatedProjectsRoot(), access.ownerId, generatedOperationId(rawId));
    return generatedProjectResponse({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The preview could not be stopped.';
    const notFound = /not found/i.test(message);
    return generatedProjectResponse(
      { error: notFound ? 'not-found' : 'stop-failed', message: notFound ? 'Operation not found.' : 'The preview could not be stopped.' },
      { status: notFound ? 404 : 400 },
    );
  }
}

/** PATCH /api/build/generated-projects/[operationId] — cancel deployment. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  const { operationId: rawId } = await params;
  try {
    const receipt = await cancelDeployGeneratedProject(generatedProjectsRoot(), access.ownerId, generatedOperationId(rawId));
    return generatedProjectResponse({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The deployment could not be cancelled.';
    const notFound = /not found/i.test(message);
    return generatedProjectResponse(
      { error: notFound ? 'not-found' : 'cancel-failed', message: notFound ? 'Operation not found.' : 'The deployment could not be cancelled.' },
      { status: notFound ? 404 : 400 },
    );
  }
}