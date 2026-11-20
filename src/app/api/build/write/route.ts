import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  createWriteBatch,
  computeWriteDiffs,
  authorizeWriteBatch,
  executeWriteBatch,
  cancelWriteBatch,
  getWriteBatch,
  listWriteBatches,
  getWriteExecutorCapabilities,
  getWriteExecutorBlockers,
} from '@/lib/build/write-executor';
import type { ProjectIdentity } from '@/lib/build/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/build/write — create, authorize, or execute a write batch. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to use the write executor.' },
      { status: 401 },
    );
  }

  let body: { action: 'create' | 'authorize' | 'execute' | 'cancel' | 'diff'; batchId?: string; project?: ProjectIdentity; files?: { path: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body.' },
      { status: 400 },
    );
  }

  switch (body.action) {
    case 'create': {
      if (!body.project || !body.files?.length) {
        return NextResponse.json(
          { error: 'invalid-body', message: 'Project and files are required for create.' },
          { status: 400 },
        );
      }
      const batch = createWriteBatch(body.project, body.files, ownerId);
      return NextResponse.json({ batchId: batch.id, status: batch.status, operations: batch.operations.length });
    }

    case 'diff': {
      if (!body.batchId) {
        return NextResponse.json(
          { error: 'invalid-body', message: 'Batch ID is required for diff.' },
          { status: 400 },
        );
      }
      const batch = getWriteBatch(body.batchId);
      if (!batch) {
        return NextResponse.json(
          { error: 'not-found', message: 'Write batch not found.' },
          { status: 404 },
        );
      }
      if (batch.requestedBy !== ownerId) {
        return NextResponse.json(
          { error: 'forbidden', message: 'You did not create this batch.' },
          { status: 403 },
        );
      }
      const result = await computeWriteDiffs(batch);
      if ('error' in result) {
        return NextResponse.json({ error: 'diff-failed', message: result.error }, { status: 400 });
      }
      return NextResponse.json({
        diffs: result.diffs.map(d => ({
          relativePath: d.relativePath,
          isNew: d.isNew,
          currentHash: d.currentHash,
          newHash: d.newHash,
          hasChanges: d.currentHash !== d.newHash,
        })),
        totalBytes: result.totalBytes,
        estimatedFiles: result.estimatedFiles,
      });
    }

    case 'authorize': {
      if (!body.batchId) {
        return NextResponse.json(
          { error: 'invalid-body', message: 'Batch ID is required for authorize.' },
          { status: 400 },
        );
      }
      const result = authorizeWriteBatch(body.batchId, ownerId);
      if ('error' in result) {
        return NextResponse.json({ error: 'authorize-failed', message: result.error }, { status: 400 });
      }
      return NextResponse.json({ batchId: result.batch.id, status: result.batch.status, authorizedBy: result.batch.authorizedBy });
    }

    case 'execute': {
      if (!body.batchId) {
        return NextResponse.json(
          { error: 'invalid-body', message: 'Batch ID is required for execute.' },
          { status: 400 },
        );
      }
      const batch = getWriteBatch(body.batchId);
      if (!batch) {
        return NextResponse.json(
          { error: 'not-found', message: 'Write batch not found.' },
          { status: 404 },
        );
      }
      if (batch.authorizedBy !== ownerId) {
        return NextResponse.json(
          { error: 'forbidden', message: 'Only the authorizing operator can execute this batch.' },
          { status: 403 },
        );
      }
      if (batch.status !== 'authorized') {
        return NextResponse.json(
          { error: 'invalid-state', message: `Batch must be authorized (current: ${batch.status}).` },
          { status: 400 },
        );
      }

      // Get abort signal from request
      const abortSignal = request.signal;

      const result = await executeWriteBatch(body.batchId, ownerId, abortSignal);
      if ('error' in result) {
        const status = result.error.includes('cancelled') ? 499 : 400;
        return NextResponse.json({ error: 'execute-failed', message: result.error }, { status });
      }
      return NextResponse.json({ receipt: result.receipt });
    }

    case 'cancel': {
      if (!body.batchId) {
        return NextResponse.json(
          { error: 'invalid-body', message: 'Batch ID is required for cancel.' },
          { status: 400 },
        );
      }
      const batch = getWriteBatch(body.batchId);
      if (!batch) {
        return NextResponse.json(
          { error: 'not-found', message: 'Write batch not found.' },
          { status: 404 },
        );
      }
      if (batch.requestedBy !== ownerId && batch.authorizedBy !== ownerId) {
        return NextResponse.json(
          { error: 'forbidden', message: 'Only the creator or authorizer can cancel this batch.' },
          { status: 403 },
        );
      }
      const result = cancelWriteBatch(body.batchId);
      if ('error' in result) {
        return NextResponse.json({ error: 'cancel-failed', message: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json(
        { error: 'invalid-action', message: 'Action must be create, diff, authorize, execute, or cancel.' },
        { status: 400 },
      );
  }
}

/** GET /api/build/write — list batches or get batch details. */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to use the write executor.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId');
  const projectId = url.searchParams.get('projectId');
  const capabilities = url.searchParams.get('capabilities');

  if (capabilities === 'true') {
    return NextResponse.json({
      capabilities: getWriteExecutorCapabilities(),
      blockers: getWriteExecutorBlockers(),
    });
  }

  if (batchId) {
    const batch = getWriteBatch(batchId);
    if (!batch) {
      return NextResponse.json(
        { error: 'not-found', message: 'Write batch not found.' },
        { status: 404 },
      );
    }
    if (batch.requestedBy !== ownerId && batch.authorizedBy !== ownerId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have access to this batch.' },
        { status: 403 },
      );
    }
    return NextResponse.json(batch);
  }

  if (projectId) {
    const batches = listWriteBatches(projectId).filter(b => b.requestedBy === ownerId || b.authorizedBy === ownerId);
    return NextResponse.json({ batches });
  }

  return NextResponse.json(
    { error: 'invalid-query', message: 'Provide batchId or projectId.' },
    { status: 400 },
  );
}