/**
 * KNOuX Build OS — canonical engineering stages.
 *
 * These are not decorative chapters. Each stage names the workspace surface it
 * opens and the adapter capability that surface actually depends on, so a stage
 * can never promise a tool the deployment does not have. When the capability is
 * missing the stage still resolves; it resolves to the truthful unavailable
 * surface, which is the point.
 *
 * Pure and deterministic. No DOM, no I/O, no entropy.
 */

import type { BuildCapability, WorkspaceSurface } from './types';

export type StageId =
  | 'intent'
  | 'architecture'
  | 'build'
  | 'runtime'
  | 'verify'
  | 'git'
  | 'release';

export type Stage = {
  id: StageId;
  /** Position in the spine. Stable. */
  index: number;
  name: string;
  /** The panel category above the title. */
  category: string;
  title: string;
  description: string;
  /** The surface this stage opens. */
  surface: WorkspaceSurface;
  /** The capability that surface needs. Null when it needs none. */
  requires: BuildCapability | null;
  /**
   * Where the evidence panel reads its facts for this stage. Naming the source
   * is what stops the panel from inventing a description.
   */
  evidenceSource: string;
};

export const STAGES: readonly Stage[] = [
  {
    id: 'intent',
    index: 0,
    name: 'INTENT',
    category: 'Project genesis',
    title: 'A sentence becomes a specification',
    description:
      'The Build Composer resolves a sentence against the real KNOuX registries. Beside it a deterministic reader extracts product kind, stack, integrations, language and deployment target. A word it cannot resolve is reported, not guessed.',
    surface: 'genesis',
    requires: null,
    evidenceSource: 'matched phrases, resolved registry records, unresolved terms',
  },
  {
    id: 'architecture',
    index: 1,
    name: 'ARCHITECTURE',
    category: 'Project cortex',
    title: 'The topology is read, not drawn',
    description:
      'Routes come from the App Router tree, dependencies from the manifest, tests from the test directory, and import edges from parsing the real module sources. Every node cites the file it came from.',
    surface: 'system',
    requires: 'project.read',
    evidenceSource: 'adapter snapshot: nodes, edges and per-node source file',
  },
  {
    id: 'build',
    index: 2,
    name: 'BUILD',
    category: 'Source',
    title: 'The real source that produced this deployment',
    description:
      'Files are read from the checkout behind the running build, with the path validated before the disk is touched. Editing is read-only here because no write path exists on the adapter.',
    surface: 'code',
    requires: 'project.files',
    evidenceSource: 'adapter file list and per-file read',
  },
  {
    id: 'runtime',
    index: 3,
    name: 'RUNTIME',
    category: 'Live preview',
    title: 'The deployment is itself the runtime',
    description:
      'Preview loads a real reachable URL at a real viewport. There is no separate dev server to start in the hosted product, and none is claimed. Process control is blocked because a web server cannot supervise processes.',
    surface: 'preview',
    requires: 'preview.live',
    evidenceSource: 'runtime status and preview viewport',
  },
  {
    id: 'verify',
    index: 4,
    name: 'VERIFY',
    category: 'Evidence',
    title: 'Only what actually ran is marked as run',
    description:
      'Lint, typecheck, tests and build report a real exit code when the allowlisted runner executes them, and NOT RUN when it does not. A health score appears only once all four gates have a measurement.',
    surface: 'tests',
    requires: 'test.run',
    evidenceSource: 'verification snapshot: command, exit code, duration',
  },
  {
    id: 'git',
    index: 5,
    name: 'GIT',
    category: 'Version state',
    title: 'Local, committed, pushed, merged and deployed stay separate',
    description:
      'Branch, HEAD, origin/main, ahead and behind come from read-only Git subcommands. A deployment without a .git directory reports that instead of showing a fabricated branch.',
    surface: 'git',
    requires: 'git.read',
    evidenceSource: 'adapter git snapshot',
  },
  {
    id: 'release',
    index: 6,
    name: 'RELEASE',
    category: 'Pipeline',
    title: 'A green local build is not a deployment',
    description:
      'Each stage of the release pipeline carries its own evidence and its own status. Commit, push, PR, merge and deploy are blocked by design: release belongs to the pipeline, not to a web page.',
    surface: 'release',
    requires: null,
    evidenceSource: 'release stage evidence table',
  },
];

export const STAGE_COUNT = STAGES.length;

export function stageById(id: StageId): Stage | null {
  return STAGES.find((stage) => stage.id === id) ?? null;
}

/**
 * Map normalised spine progress onto a stage.
 *
 * Rounding to the nearest stage is what makes the spine feel like discrete
 * engineering phases rather than a continuous slider. The caller owns the
 * eased value, so this stays pure.
 */
export function stageAtProgress(progress: number): Stage {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const index = Math.round(clamped * (STAGE_COUNT - 1));
  return STAGES[Math.max(0, Math.min(STAGE_COUNT - 1, index))];
}

/** Exact inverse of `stageAtProgress`, used when a stage is clicked directly. */
export function progressForStage(id: StageId): number {
  const stage = stageById(id);
  if (!stage) return 0;
  return stage.index / (STAGE_COUNT - 1);
}

/** Progress for an index, used by keyboard navigation. */
export function progressForIndex(index: number): number {
  const clamped = Math.max(0, Math.min(STAGE_COUNT - 1, Math.trunc(index)));
  return clamped / (STAGE_COUNT - 1);
}

export function nextStage(current: StageId, delta: number): Stage {
  const stage = stageById(current);
  const index = stage ? stage.index : 0;
  return STAGES[Math.max(0, Math.min(STAGE_COUNT - 1, index + delta))];
}

/** Every surface the spine can open, in stage order, de-duplicated. */
export function stageSurfaces(): WorkspaceSurface[] {
  const seen = new Set<WorkspaceSurface>();
  const out: WorkspaceSurface[] = [];
  for (const stage of STAGES) {
    if (seen.has(stage.surface)) continue;
    seen.add(stage.surface);
    out.push(stage.surface);
  }
  return out;
}
