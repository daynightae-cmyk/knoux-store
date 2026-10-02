'use client';

import { useEffect, useState } from 'react';
import { VERIFICATION_CHECKS } from '@/lib/build/verification';
import type { VerificationCheck } from '@/lib/build/types';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';
import { useWorkspaceVerification } from './useWorkspaceVerification';

const stages = ['Source', 'Dependencies', 'Build', 'Tests', 'Package', 'Deploy'];
const checks = ['lint', 'typecheck', 'build', 'test'];

type RunnerState = { enabled: boolean; status: VerificationCheck };

/**
 * The runner read must not assume a shape it was not given.
 *
 * `GET /api/build/verify` answers 200 with a runner state or 401 with the
 * workspace boundary's refusal, which carries a `message` and no `status`. Storing
 * the refusal as runner state and then reading `runner.status.evidence` threw on
 * every production deployment, so the pipeline route rendered Next's error
 * boundary instead of this page — a crash caused by the security boundary working
 * correctly. The refusal is a fact to show, not a shape to assume.
 */
function readRunnerState(payload: unknown): RunnerState | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const candidate = payload as { enabled?: unknown; status?: unknown };
  if (typeof candidate.enabled !== 'boolean' || typeof candidate.status !== 'object' || candidate.status === null) {
    return null;
  }
  return candidate as RunnerState;
}

export function BuildPipelinePage() {
  const { state } = useBuildWorkspace();
  const verification = useWorkspaceVerification();
  const [runner, setRunner] = useState<RunnerState | null>(null);
  const { running, run } = verification;
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/build/verify', { cache: 'no-store' })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (cancelled) return;
        const parsed = readRunnerState(payload);
        if (parsed) {
          setRunner(parsed);
          return;
        }
        // The boundary refused, or the host said something this page does not
        // understand. Either way the runner is not available, and the reason the
        // server gave is the reason shown.
        const message =
          typeof (payload as { message?: unknown })?.message === 'string'
            ? (payload as { message: string }).message
            : 'The verification runner is not available on this deployment.';
        setError(ok ? message : `${message} The runner is unavailable.`);
      })
      .catch(() => {
        if (!cancelled) setError('Runner state could not be read.');
      });
    return () => { cancelled = true; };
  }, []);
  const byId = new Map(state.verification?.checks.map((check) => [check.id, check]));
  return <div className="dev-route"><DevPageHeading eyebrow="BUILD / PIPELINE" title="Build pipeline" description="Source evidence and allowlisted verification for this checkout. Every stage reports only what this session has measured." detail={state.git?.headSha ? `HEAD ${state.git.headSha.slice(0, 12)}` : 'HEAD UNAVAILABLE'} />
    <div className="dev-pipeline-flow">{stages.map((stage, index) => <div key={stage}><span>0{index + 1}</span><strong>{stage}</strong><small>{stage === 'Source' ? (state.graph ? 'INSPECTABLE' : 'UNKNOWN') : stage === 'Dependencies' ? (state.project?.packageManager ?? 'UNKNOWN') : stage === 'Build' || stage === 'Tests' ? (byId.get(stage === 'Build' ? 'build' : 'test')?.status.toUpperCase() ?? 'NOT RUN') : 'UNCONNECTED'}</small></div>)}</div>
    <div className="dev-route__grid"><DevPanel title="Verification checks"><div className="dev-list">{checks.map((id) => { const check = byId.get(id); const label = VERIFICATION_CHECKS.find((item) => item.id === id)?.label ?? id; return <div key={id}><span><strong>{label}</strong><small>{check?.command ?? `npm run ${id}`}</small></span><span className="dev-list__actions"><span className={`dev-tag ${check?.status === 'pass' ? 'dev-tag--ok' : ''}`}>{check?.status.toUpperCase() ?? 'NOT RUN'}</span><button type="button" disabled={!runner?.enabled || !!verification.blocker(id)} title={verification.blocker(id) ?? runner?.status.evidence ?? 'Verification runner unavailable'} onClick={() => void run(id)}>{running === id ? 'RUNNING' : 'RUN'}</button></span></div>; })}</div>{error || verification.error ? <p role="alert" className="dev-error">{error ?? verification.error}</p> : null}<p className="dev-note">{runner?.status.evidence ?? 'Reading runner configuration…'}</p></DevPanel>
      <DevPanel title="Build console"><div className="dev-console">{state.verification?.checks.length ? state.verification.checks.map((check) => <div key={check.id}><span>$ {check.command ?? check.id}</span><span>{check.status.toUpperCase()} · exit {check.exitCode ?? 'N/A'}</span><pre>{check.evidence}</pre></div>) : <DevEmpty title="NO BUILD OUTPUT" body="No verification has run in this workspace session." />}</div></DevPanel>
      <DevPanel title="Source & environment"><dl className="dev-kv"><dt>Repository</dt><dd>{state.project?.name ?? 'UNAVAILABLE'}</dd><dt>Branch</dt><dd>{state.git?.branch ?? 'UNAVAILABLE'}</dd><dt>Framework</dt><dd>{state.project?.framework ?? 'UNAVAILABLE'}</dd><dt>Package manager</dt><dd>{state.project?.packageManager ?? 'UNAVAILABLE'}</dd><dt>Runtime</dt><dd>{state.runtime.url ?? 'UNAVAILABLE'}</dd></dl></DevPanel>
      <DevPanel title="Release controls"><DevEmpty title="PACKAGE & DEPLOY UNCONNECTED" body="There is no package or deployment adapter in this workspace. No release will be queued or implied." /></DevPanel>
    </div></div>;
}
