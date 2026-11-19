import type { VerificationSnapshot } from '@/lib/build/types';
import type { BuildWorkspaceState } from '@/lib/build/workspace-state';

/** Unknown or different source identity can never carry a previous PASS. */
export function mergeVerificationResults(previous: VerificationSnapshot | null, incoming: VerificationSnapshot): VerificationSnapshot {
  const prior = incoming.sourceState === 'clean' && previous?.sourceState === 'clean' && incoming.headSha && previous.headSha === incoming.headSha ? previous.checks : [];
  const incomingIds = new Set(incoming.checks.map((check) => check.id));
  return { ...incoming, checks: [...prior.filter((check) => !incomingIds.has(check.id)), ...incoming.checks] };
}

export function verificationChecksAtHead(snapshot: VerificationSnapshot | null, headSha: string | null | undefined, projectRef: string | null | undefined, dirty?: boolean | null) {
  return !projectRef && dirty === false && snapshot?.sourceState === 'clean' && headSha && snapshot.headSha === headSha ? snapshot.checks : [];
}

/** A shared display boundary: availability and clean, native source identity are required. */
export function currentWorkspaceVerificationChecks(state: Pick<BuildWorkspaceState, 'verification' | 'git' | 'projectRef'>) {
  return state.git?.available ? verificationChecksAtHead(state.verification, state.git.headSha, state.projectRef, state.git.dirty) : [];
}
