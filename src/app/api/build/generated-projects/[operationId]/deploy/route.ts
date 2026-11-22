import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  generatedOperationId,
  generatedDeployTarget,
  generatedDeployConfirmation,
  type GeneratedRuntimeReceipt,
  type DeployReceipt,
} from '@/lib/build/generated-project-contract';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/** In-memory operation store (shared with parent routes). */
const operationStore = new Map<string, GeneratedRuntimeReceipt>();

/** Get generated projects root. */
function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return path.resolve(envRoot);
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** Verify containment. */
async function verifyContainment(root: string, targetPath: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { realpathSync } = await import('node:fs');
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

/** POST /api/build/generated-projects/[operationId]/deploy — deploy compiled output. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to deploy generated projects.' },
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

  if (!['exported', 'ready', 'deployed'].includes(receipt.state)) {
    return NextResponse.json(
      { error: 'invalid-state', message: `Cannot deploy operation in state: ${receipt.state}` },
      { status: 400 },
    );
  }

  if (receipt.deploy?.status === 'applied') {
    return NextResponse.json(
      { error: 'already-deployed', message: 'Deployment already applied.' },
      { status: 400 },
    );
  }

  let body: { target: string; confirmation: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with target and confirmation.' },
      { status: 400 },
    );
  }

  let target: string;
  let confirmation: string;
  try {
    target = generatedDeployTarget(body.target);
    confirmation = generatedDeployConfirmation(body.confirmation);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid-params', message: err instanceof Error ? err.message : 'Invalid deploy parameters.' },
      { status: 400 },
    );
  }

  // For local deploy, copy compiled output to a deploy directory
  const root = getGeneratedProjectsRoot();
  const projectDir = path.join(root, operationId);
  const compiledDir = path.join(projectDir, 'dist');
  const deployDir = path.join(root, 'deploy', operationId);

  const containment = await verifyContainment(root, deployDir);
  if (!containment.ok) {
    return NextResponse.json(
      { error: 'path-rejected', message: containment.reason },
      { status: 403 },
    );
  }

  try {
    // Copy compiled output to deploy directory
    await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});
    await fs.cp(compiledDir, deployDir, { recursive: true });

    // Create deploy receipt
    const deployReceipt: DeployReceipt = {
      target,
      status: 'applied',
      confirmation,
      reference: `knoux-deploy-${operationId.slice(0, 16)}`,
      blocker: null,
      error: null,
      appliedAt: new Date().toISOString(),
    };

    receipt.state = 'deployed';
    receipt.deploy = deployReceipt;
    receipt.updatedAt = new Date().toISOString();

    operationStore.set(operationId, receipt);
    return NextResponse.json({ receipt });
  } catch (err) {
    const deployReceipt: DeployReceipt = {
      target,
      status: 'failed',
      confirmation,
      reference: null,
      blocker: null,
      error: err instanceof Error ? err.message : 'Deployment failed.',
      appliedAt: null,
    };

    receipt.deploy = deployReceipt;
    receipt.updatedAt = new Date().toISOString();
    operationStore.set(operationId, receipt);

    return NextResponse.json({ receipt }, { status: 500 });
  }
}