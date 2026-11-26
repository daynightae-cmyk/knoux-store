import { NextResponse, type NextRequest } from 'next/server';
import path from 'node:path';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  generatedOperationId,
} from '@/lib/build/generated-project-contract';
import {
  cancelGeneratedProject,
  cancelDeployGeneratedProject,
  readGeneratedReceipt,
} from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return envRoot;
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** GET /api/build/generated-projects/[operationId] — get operation status. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
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
  const operationId = generatedOperationId(rawId);

  const receipt = await readGeneratedReceipt(getGeneratedProjectsRoot(), ownerId, operationId);
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

  return NextResponse.json({ receipt });
}

/** DELETE /api/build/generated-projects/[operationId] — stop preview. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
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
  const operationId = generatedOperationId(rawId);

  const receipt = await cancelGeneratedProject(getGeneratedProjectsRoot(), ownerId, operationId);
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

  return NextResponse.json({ receipt });
}

/** PATCH /api/build/generated-projects/[operationId] — cancel deployment. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
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
  const operationId = generatedOperationId(rawId);

  try {
    const receipt = await cancelDeployGeneratedProject(getGeneratedProjectsRoot(), ownerId, operationId);
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
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      { error: 'cancel-failed', message: err instanceof Error ? err.message : 'Deployment cancellation failed.' },
      { status: 400 },
    );
  }
}
