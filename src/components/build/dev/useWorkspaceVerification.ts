'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import type { VerificationSnapshot } from '@/lib/build/types';
import { cueAtmosphere } from './living-atmosphere';
import { mergeVerificationResults } from './verification-results';
export function useWorkspaceVerification() {
  const { state, dispatch } = useBuildWorkspace();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const scope = `${state.projectRef ?? ''}|${state.snapshot?.root ?? ''}|${state.git?.headSha ?? ''}`;
  const latestScope = useRef(scope);
  useLayoutEffect(() => { latestScope.current = scope; }, [scope]);
  const blocker = (task: string) => state.projectRef ? 'Selected projects are inspection only. Configure a trusted bridge task profile to execute scripts.' : state.adapter.capabilities['command.allowlisted'] !== 'available' ? state.adapter.blockers['command.allowlisted'] ?? 'Verification requires a trusted host with KNOUX_BUILD_ALLOW_VERIFY=1.' : !state.snapshot?.scripts.some((s) => s.name === task) ? `This project has no ${task} script.` : running ? 'A verification request is in progress.' : null;
  useEffect(() => () => {
    // Abort the response listener, not the host task: no server cancellation is implied.
    active.current?.abort(); active.current = null; setRunning(null);
  }, [scope]);
  async function run(task: string) {
    if (active.current) return;
    const blocked = blocker(task); if (blocked) { setError(blocked); return; }
    const controller = new AbortController(); active.current = controller;
    const current = () => active.current === controller && latestScope.current === scope && !controller.signal.aborted;
    setRunning(task); setError(null); dispatch({ type: 'activity/record', message: `Verification requested: ${task}` });
    cueAtmosphere('wake');
    try {
      const response = await fetch('/api/build/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task }), signal: controller.signal });
      const result = await response.json() as { snapshot?: VerificationSnapshot; message?: string };
      if (!current()) return;
      if (!response.ok || !result.snapshot) throw new Error(result.message ?? 'Verification could not run.');
      const outcome = result.snapshot.checks.find((check) => check.id === task)?.status;
      if (outcome === 'pass') cueAtmosphere('success');
      if (outcome === 'fail' || outcome === 'blocked') cueAtmosphere('error');
      dispatch({ type: 'verification/resolved', snapshot: mergeVerificationResults(state.verification, result.snapshot) });
      dispatch({ type: 'activity/record', message: `Verification ${task}: ${outcome ?? 'unknown'}` });
    } catch (cause) {
      if (!current()) return;
      cueAtmosphere('error');
      setError(cause instanceof Error ? cause.message : 'Verification request failed.');
      dispatch({ type: 'activity/record', message: `Verification refused: ${task}` });
    } finally { if (active.current === controller) { active.current = null; setRunning(null); } }
  }
  return { run, blocker, running, error };
}
