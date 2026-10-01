import { NextResponse, type NextRequest } from 'next/server';
import { createProjectAdapter } from '@/lib/build/adapter-factory';
import { guardBuildApi } from '@/lib/build/api-guard';
import { parseEslint, parseTestRunner, parseTypeScript } from '@/lib/build/diagnostics';
import type { VerificationCheck } from '@/lib/build/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TASKS = new Set(['lint', 'typecheck', 'test', 'build']);

/**
 * Allowlisted verification runner.
 *
 * This route cannot execute anything a caller writes. The request body selects
 * one of four names; each name maps to a package script inside the adapter, and
 * the adapter builds the argument vector itself. There is no path from this
 * handler to `spawn` with caller-controlled arguments.
 *
 * Three independent conditions must all hold before anything runs:
 *
 *   1. a verified session, from the workspace boundary;
 *   2. `KNOUX_BUILD_ALLOW_VERIFY=1` on the deployment;
 *   3. the task name is on the four-item allowlist.
 *
 * Condition 1 is the security boundary. Condition 2 is an operator decision.
 * Condition 3 bounds what a permitted caller can ask for. The adapter
 * additionally refuses to start a second run while one is active, so a
 * permitted caller still cannot fan the host out with concurrent builds.
 */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'verify' });
  if (denied) return denied;

  if (process.env.KNOUX_BUILD_ALLOW_VERIFY !== '1') {
    return NextResponse.json(
      {
        error: 'verification-disabled',
        message:
          'Verification execution is disabled on this deployment. Set KNOUX_BUILD_ALLOW_VERIFY=1 on a trusted host to enable the allowlisted runner.',
      },
      { status: 403 },
    );
  }

  let task = '';
  try {
    const body = (await request.json()) as { task?: unknown };
    task = typeof body.task === 'string' ? body.task : '';
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with a task name.' },
      { status: 400 },
    );
  }

  if (!TASKS.has(task)) {
    return NextResponse.json(
      { error: 'task-not-allowlisted', message: `Task must be one of ${[...TASKS].join(', ')}.` },
      { status: 400 },
    );
  }

  const adapter = createProjectAdapter({ label: 'Verification runner' });

  // runVerification is optional on the adapter type; the FsProjectAdapter
  // provides it. Without it there is nothing to run.
  if (typeof adapter.runVerification !== 'function') {
    return NextResponse.json(
      { error: 'verification-unavailable', message: 'This deployment has no verification runner.' },
      { status: 409 },
    );
  }

  try {
    const snapshot = await adapter.runVerification(task);
    const check = snapshot.checks[0];
    const diagnostics = [
      ...(task === 'typecheck' ? parseTypeScript(check.evidence) : []),
      ...(task === 'lint' ? parseEslint(check.evidence) : []),
      ...(task === 'test' ? parseTestRunner(check.evidence, check.exitCode ?? 1) : []),
    ];
    return NextResponse.json({ snapshot, diagnostics }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification could not be started.';
    return NextResponse.json({ error: 'verification-unavailable', message }, { status: 409 });
  }
}

/**
 * GET reports whether the runner is on, so the UI never shows a dead button.
 *
 * It is behind the same boundary as the runner itself: whether a host can start
 * an `npm run build` is not public information.
 */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'verify' });
  if (denied) return denied;

  const enabled = process.env.KNOUX_BUILD_ALLOW_VERIFY === '1';
  const status: VerificationCheck = {
    id: 'runner', label: 'Verification runner', command: null, exitCode: null,
    status: enabled ? 'not-run' : 'blocked', ranAt: null, durationMs: null,
    evidence: enabled
      ? 'Enabled. POST a task name from the allowlist to run it.'
      : 'Disabled on this deployment. Only allowlisted package scripts can ever run, and only when KNOUX_BUILD_ALLOW_VERIFY=1.',
  };
  return NextResponse.json(
    { enabled, allowedTasks: [...TASKS], status },
    { headers: { 'cache-control': 'no-store' } },
  );
}
