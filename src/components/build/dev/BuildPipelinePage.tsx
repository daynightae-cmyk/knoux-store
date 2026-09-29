'use client';

import { useEffect, useState } from 'react';
import { VERIFICATION_CHECKS } from '@/lib/build/verification';
import type { VerificationCheck, VerificationSnapshot } from '@/lib/build/types';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';

const stages = ['Source', 'Dependencies', 'Build', 'Tests', 'Package', 'Deploy'];
const checks = ['lint', 'typecheck', 'build', 'test'];

export function BuildPipelinePage() {
  const { state, dispatch } = useBuildWorkspace();
  const [runner, setRunner] = useState<{ enabled: boolean; status: VerificationCheck } | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void fetch('/api/build/verify', { cache: 'no-store' }).then((response) => response.json()).then(setRunner).catch(() => setError('Runner state could not be read.')); }, []);
  async function run(task: string) {
    if (!runner?.enabled || running) return;
    setRunning(task); setError(null);
    try {
      const response = await fetch('/api/build/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task }) });
      const result = await response.json() as { snapshot?: VerificationSnapshot; message?: string };
      if (!response.ok || !result.snapshot) { setError(result.message ?? 'Verification could not run.'); return; }
      const previous = state.verification?.checks ?? [];
      const merged = [...previous.filter((check) => check.id !== task), ...result.snapshot.checks];
      dispatch({ type: 'verification/resolved', snapshot: { ...result.snapshot, checks: merged } });
    } catch { setError('Verification request failed.'); }
    finally { setRunning(null); }
  }
  const byId = new Map(state.verification?.checks.map((check) => [check.id, check]));
  return <div className="dev-route"><DevPageHeading eyebrow="BUILD / PIPELINE" title="Build pipeline" description="Source evidence and allowlisted verification for this checkout. Every stage reports only what this session has measured." detail={state.git?.headSha ? `HEAD ${state.git.headSha.slice(0, 12)}` : 'HEAD UNAVAILABLE'} />
    <div className="dev-pipeline-flow">{stages.map((stage, index) => <div key={stage}><span>0{index + 1}</span><strong>{stage}</strong><small>{stage === 'Source' ? (state.graph ? 'INSPECTABLE' : 'UNKNOWN') : stage === 'Dependencies' ? (state.project?.packageManager ?? 'UNKNOWN') : stage === 'Build' || stage === 'Tests' ? (byId.get(stage === 'Build' ? 'build' : 'test')?.status.toUpperCase() ?? 'NOT RUN') : 'UNCONNECTED'}</small></div>)}</div>
    <div className="dev-route__grid"><DevPanel title="Verification checks"><div className="dev-list">{checks.map((id) => { const check = byId.get(id); const label = VERIFICATION_CHECKS.find((item) => item.id === id)?.label ?? id; return <div key={id}><span><strong>{label}</strong><small>{check?.command ?? `npm run ${id}`}</small></span><span className="dev-list__actions"><span className={`dev-tag ${check?.status === 'pass' ? 'dev-tag--ok' : ''}`}>{check?.status.toUpperCase() ?? 'NOT RUN'}</span><button type="button" disabled={!runner?.enabled || !!running} onClick={() => run(id)}>{running === id ? 'RUNNING' : 'RUN'}</button></span></div>; })}</div>{error ? <p role="alert" className="dev-error">{error}</p> : null}<p className="dev-note">{runner?.status.evidence ?? 'Reading runner configuration…'}</p></DevPanel>
      <DevPanel title="Build console"><div className="dev-console">{state.verification?.checks.length ? state.verification.checks.map((check) => <div key={check.id}><span>$ {check.command ?? check.id}</span><span>{check.status.toUpperCase()} · exit {check.exitCode ?? 'N/A'}</span><pre>{check.evidence}</pre></div>) : <DevEmpty title="NO BUILD OUTPUT" body="No verification has run in this workspace session." />}</div></DevPanel>
      <DevPanel title="Source & environment"><dl className="dev-kv"><dt>Repository</dt><dd>{state.project?.name ?? 'UNAVAILABLE'}</dd><dt>Branch</dt><dd>{state.git?.branch ?? 'UNAVAILABLE'}</dd><dt>Framework</dt><dd>{state.project?.framework ?? 'UNAVAILABLE'}</dd><dt>Package manager</dt><dd>{state.project?.packageManager ?? 'UNAVAILABLE'}</dd><dt>Runtime</dt><dd>{state.runtime.url ?? 'UNAVAILABLE'}</dd></dl></DevPanel>
      <DevPanel title="Release controls"><DevEmpty title="PACKAGE & DEPLOY UNCONNECTED" body="There is no package or deployment adapter in this workspace. No release will be queued or implied." /></DevPanel>
    </div></div>;
}
