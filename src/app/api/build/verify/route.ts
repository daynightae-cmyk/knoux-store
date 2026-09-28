import { NextResponse } from 'next/server';
import { FsProjectAdapter } from '@/lib/build/project-adapter';
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
 * It is refused entirely unless the deployment sets KNOUX_BUILD_ALLOW_VERIFY=1.
 * That is deliberate: even an allowlisted `npm run build` is expensive, and an
 * unauthenticated endpoint that can start builds is a denial-of-service vector.
 * The adapter additionally refuses to start a second run while one is active.
 */
export async function POST(request: Request) {
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

  const adapter = new FsProjectAdapter({ root: process.cwd(), environment: 'production', label: 'verify' });

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

/** GET reports whether the runner is on, so the UI never shows a dead button. */
export async function GET() {
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
