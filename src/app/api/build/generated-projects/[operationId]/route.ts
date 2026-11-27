import { NextResponse, type NextRequest } from 'next/server';
import {
  authorizeBuildOwner,
  getGeneratedProjectsRoot,
  operationForbidden,
  operationNotFound,
  resolveOperationId,
} from '@/lib/build/generated-project-route';
import {
  cancelGeneratedProject,
  cancelDeployGeneratedProject,
  readGeneratedReceipt,
} from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

/** GET /api/build/generated-projects/[operationId] — get operation status. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const owner = await authorizeBuildOwner(request, 'Sign in to inspect generated projects.');
  if (!owner.ok) return owner.response;

  const operationId = await resolveOperationId(params);
  const receipt = await readGeneratedReceipt(getGeneratedProjectsRoot(), owner.ownerId, operationId);
  if (!receipt) return operationNotFound();
  if (receipt.ownerId !== owner.ownerId) return operationForbidden();
  return NextResponse.json({ receipt });
}

/** DELETE /api/build/generated-projects/[operationId] — stop preview. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const owner = await authorizeBuildOwner(request, 'Sign in to stop generated projects.');
  if (!owner.ok) return owner.response;

  const operationId = await resolveOperationId(params);
  const receipt = await cancelGeneratedProject(getGeneratedProjectsRoot(), owner.ownerId, operationId);
  if (!receipt) return operationNotFound();
  if (receipt.ownerId !== owner.ownerId) return operationForbidden();
  return NextResponse.json({ receipt });
}

/** PATCH /api/build/generated-projects/[operationId] — cancel deployment. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const owner = await authorizeBuildOwner(request, 'Sign in to cancel deployments.');
  if (!owner.ok) return owner.response;

  const operationId = await resolveOperationId(params);

  try {
    const receipt = await cancelDeployGeneratedProject(
      getGeneratedProjectsRoot(),
      owner.ownerId,
      operationId,
    );
    if (!receipt) return operationNotFound();
    if (receipt.ownerId !== owner.ownerId) return operationForbidden();
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      { error: 'cancel-failed', message: err instanceof Error ? err.message : 'Deployment cancellation failed.' },
      { status: 400 },
    );
  }
}
