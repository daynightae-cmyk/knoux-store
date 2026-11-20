import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  GENERATED_PROJECT_DEPLOY_CONFIRMATION,
  generatedOperationId,
  generatedDeployTarget,
  generatedDeployConfirmation,
  type GeneratedRuntimeReceipt,
  type DeployReceipt,
} from '@/lib/build/generated-project-contract';
import { createHash } from 'node:crypto';
import { promises as fs, realpathSync } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/** In-memory operation store (shared with parent route). */
const operationStore = new Map<string, GeneratedRuntimeReceipt>();

/** Get generated projects root. */
function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return path.resolve(envRoot);
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** Verify containment. */
function verifyContainment(root: string, targetPath: string): { ok: boolean; reason?: string } {
  try {
    const resolvedRoot = realpathSync.native(root);
    const resolvedTarget = realpathSync.native(targetPath);
    const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
    if (resolvedTarget === resolvedRoot || resolvedTarget.startsWith(prefix)) {
      return { ok: true };
    }
    return { ok: false, reason: 'Target path escapes the generated projects root.' };
  } catch {
    return { ok: false, reason: 'Path resolution failed.' };
  }
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

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

  return NextResponse.json({ receipt });
}

/** DELETE /api/build/generated-projects/[operationId] — stop preview. */
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

  if (!['ready', 'validating', 'built', 'exported'].includes(receipt.state)) {
    return NextResponse.json(
      { error: 'invalid-state', message: `Cannot stop operation in state: ${receipt.state}` },
      { status: 400 },
    );
  }

  // In a real implementation, this would stop the preview process
  // For now, just update the receipt
  receipt.state = 'stopped';
  receipt.preview = {
    url: null,
    origin: null,
    processId: null,
    httpStatus: null,
    readinessMs: null,
    expiresAt: null,
    blocker: 'Stopped by operator.',
  };
  receipt.updatedAt = new Date().toISOString();

  operationStore.set(operationId, receipt);
  return NextResponse.json({ receipt });
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

  if (!receipt.deploy || !['requested', 'not-requested'].includes(receipt.deploy.status)) {
    return NextResponse.json(
      { error: 'invalid-state', message: `Cannot cancel deployment in status: ${receipt.deploy?.status ?? 'null'}` },
      { status: 400 },
    );
  }

  receipt.deploy.status = 'cancelled';
  receipt.updatedAt = new Date().toISOString();

  operationStore.set(operationId, receipt);
  return NextResponse.json({ receipt });
}