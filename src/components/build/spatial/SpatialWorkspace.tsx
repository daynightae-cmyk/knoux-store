'use client';

/**
 * The spatial engineering workspace.
 *
 * The default OVERVIEW composition: a context bar, a live HUD, the Living
 * Project Core, the Execution Spine, an evidence panel, a surface rail and the
 * ambient stage typography behind it all.
 *
 * The negative space is intentional. The centre breathes, the type is
 * atmospheric, and the only cards in the composition are the evidence facts.
 * When a functional surface is selected the spatial chrome gives way to the
 * real tool, because the cinematic overview is an interface to the engineering
 * system and never a replacement for it.
 */

import { useCallback, useMemo, useState } from 'react';
import { STAGES, progressForStage, stageAtProgress, type StageId } from '@/lib/build/stages';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { WorkspaceCanvas } from '../workspace/WorkspaceCanvas';
import { ProjectCore } from './ProjectCore';
import { ExecutionSpine } from './ExecutionSpine';
import { EvidencePanel, ProjectHud } from './ProjectHud';
import type { ProjectNodeDomain, WorkspaceSurface } from '@/lib/build/types';
import './spatial.css';

const SURFACE_RAIL: { id: WorkspaceSurface; label: string }[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'genesis', label: 'COMPOSER' },
  { id: 'code', label: 'CODE' },
  { id: 'preview', label: 'PREVIEW' },
  { id: 'terminal', label: 'TERMINAL' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'data', label: 'DATA' },
  { id: 'tests', label: 'TESTS' },
  { id: 'git', label: 'GIT' },
  { id: 'release', label: 'RELEASE' },
  { id: 'genesis', label: 'SENSHIAL' },
];

export function SpatialWorkspace() {
  const { state, dispatch } = useBuildWorkspace();
  const [selectedDomain, setSelectedDomain] = useState<ProjectNodeDomain | null>(null);
  const [revision, setRevision] = useState(0);

  const { workspace, graph, runtime, adapter } = state;
  const isOverview = workspace.activeSurface === 'overview';
  const stage = stageAtProgress(workspace.stageProgress);

  const counts = useMemo(() => {
    const out: Partial<Record<ProjectNodeDomain, number>> = {};
    for (const node of graph?.nodes ?? []) out[node.domain] = (out[node.domain] ?? 0) + 1;
    return out;
  }, [graph]);

  const stageAvailable = useCallback(
    (id: StageId) => {
      const target = STAGES.find((entry) => entry.id === id);
      if (!target || target.requires === null) return true;
      return adapter.capabilities[target.requires] === 'available';
    },
    [adapter.capabilities],
  );

  const onProgress = useCallback(
    (progress: number) => {
      dispatch({ type: 'stage/progress', progress });
      const next = stageAtProgress(progress);
      if (next.id !== workspace.stageId) {
        dispatch({ type: 'stage/select', stageId: next.id, progress });
        setRevision((value) => value + 1);
      }
    },
    [dispatch, workspace.stageId],
  );

  const onSelectStage = useCallback(
    (id: StageId) => {
      const progress = progressForStage(id);
      dispatch({ type: 'stage/select', stageId: id, progress });
      setRevision((value) => value + 1);
    },
    [dispatch],
  );

  // Selecting a stage on the spine navigates to the surface it governs. This
  // is the "direct navigation to the associated workspace state" requirement,
  // and it is why a blocked stage still resolves: it opens the surface, which
  // then states the blocker.
  const onStageOpenSurface = useCallback(() => {
    dispatch({ type: 'surface/active', surface: stage.surface });
  }, [dispatch, stage.surface]);

  const onRail = useCallback(
    (surface: WorkspaceSurface) => {
      dispatch({ type: 'surface/active', surface });
    },
    [dispatch],
  );

  // A functional surface is open: the real tool owns the canvas.
  if (!isOverview) {
    return <WorkspaceCanvas />;
  }

  return (
    <div className="sp-stage" data-stage={stage.id}>
      <span className="sp-ghost" aria-hidden="true">
        {stage.name}
      </span>

      <header className="sp-topbar">
        <span className="sp-topbar__mark">KNOuX BUILD OS</span>
        <span className="sp-topbar__sep" aria-hidden="true" />
        <span className="sp-topbar__fact">{state.adapter.environment.toUpperCase()}</span>
        <span className="sp-topbar__fact">
          {state.project?.name ?? 'NOT CONNECTED'}
        </span>
        <span className="sp-topbar__fact">{state.git?.branch ?? 'NOT CONNECTED'}</span>
        <span className="sp-topbar__fact">
          {state.ai.routing?.status === 'resolved'
            ? `${state.ai.routing.providerId}/${state.ai.routing.modelId}`
            : 'MODEL UNCONFIGURED'}
        </span>
      </header>

      <div className="sp-centre">
        <ProjectCore
          graph={graph}
          runtimeRunning={runtime.status === 'running'}
          verification={verificationStatus(state)}
          stageIndex={stage.index}
          stageCount={STAGES.length}
          selectedDomain={selectedDomain}
          revision={revision}
        />
      </div>

      <div className="sp-overlay">
        <ProjectHud state={state} stage={stage} />

        <EvidencePanel state={state} stage={stage} />

        <ExecutionSpine
          progress={workspace.stageProgress}
          activeStage={stage.id}
          stageAvailable={stageAvailable}
          onProgress={onProgress}
          onSelect={onSelectStage}
        />
      </div>

      <nav className="sp-rail" aria-label="Workspace surfaces">
        {SURFACE_RAIL.map((entry, index) => (
          <button
            key={`${entry.id}-${index}`}
            type="button"
            className="sp-rail__btn"
            aria-current={workspace.activeSurface === entry.id}
            onClick={() => onRail(entry.id)}
          >
            {entry.label}
          </button>
        ))}
        <button type="button" className="sp-rail__open" onClick={onStageOpenSurface}>
          OPEN {stage.name}
        </button>
      </nav>

      <div className="sp-domains" role="group" aria-label="Subsystem focus">
        {(['ui', 'routes', 'api', 'data', 'tests'] as ProjectNodeDomain[]).map((domain) => (
          <button
            key={domain}
            type="button"
            className="sp-domains__btn"
            aria-pressed={selectedDomain === domain}
            disabled={(counts[domain] ?? 0) === 0}
            onClick={() => setSelectedDomain((current) => (current === domain ? null : domain))}
          >
            {domain.toUpperCase()} {counts[domain] ?? 0}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Map the ledger onto a single posture value the core can draw. */
function verificationStatus(state: ReturnType<typeof useBuildWorkspace>['state']) {
  const checks = state.verification?.checks ?? [];
  if (checks.length === 0) return 'not-run' as const;
  if (checks.some((check) => check.status === 'fail')) return 'fail' as const;
  if (checks.some((check) => check.status === 'blocked')) return 'blocked' as const;
  if (checks.some((check) => check.status === 'unconfigured')) return 'unconfigured' as const;
  if (checks.every((check) => check.status === 'pass')) return 'pass' as const;
  return 'not-run' as const;
}
