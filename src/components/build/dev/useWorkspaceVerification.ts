'use client';
import { useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import type { VerificationSnapshot } from '@/lib/build/types';
export function useWorkspaceVerification() {
  const { state, dispatch } = useBuildWorkspace();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blocker = (task: string) => state.projectRef ? 'Selected projects are inspection only. Configure a trusted bridge task profile to execute scripts.' : state.adapter.capabilities['command.allowlisted'] !== 'available' ? state.adapter.blockers['command.allowlisted'] ?? 'Verification requires a trusted host with KNOUX_BUILD_ALLOW_VERIFY=1.' : !state.snapshot?.scripts.some((s) => s.name === task) ? `This project has no ${task} script.` : running ? 'A verification request is in progress.' : null;
  async function run(task: string) {
    const blocked = blocker(task); if (blocked) { setError(blocked); return; }
    setRunning(task); setError(null); dispatch({ type: 'activity/record', message: `Verification requested: ${task}` });
    try {
      const response = await fetch('/api/build/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task }) });
      const result = await response.json() as { snapshot?: VerificationSnapshot; message?: string };
      if (!response.ok || !result.snapshot) throw new Error(result.message ?? 'Verification could not run.');
      dispatch({ type: 'verification/resolved', snapshot: { ...result.snapshot, checks: [...(state.verification?.checks ?? []).filter((check) => check.id !== task), ...result.snapshot.checks] } });
      dispatch({ type: 'activity/record', message: `Verification ${task}: ${result.snapshot.checks[0]?.status ?? 'unknown'}` });
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Verification request failed.'; setError(message); dispatch({ type: 'activity/record', message: `Verification refused: ${task}` }); }
    finally { setRunning(null); }
  }
  return { run, blocker, running, error };
}
