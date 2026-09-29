'use client';

/**
 * KNOuX Build OS workspace shell.
 *
 * Owns exactly one reducer and fetches exactly one set of facts. Every child
 * reads from the state it is given and dispatches intent back up; no surface
 * keeps its own copy of project state, which is what stops the header and a
 * pane from disagreeing about the same fact.
 *
 * The Composer is preserved and remains the genesis layer. It is rendered
 * inside the `genesis` surface, not replaced.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  buildReducer,
  initialBuildState,
  type BuildAction,
  type BuildWorkspaceState,
} from '@/lib/build/workspace-state';
import { compileBuildIntent } from '@/lib/build/intent';
import { summariseIntent } from '@/lib/build/intent';
import { routeModel } from '@/lib/build/model-router';
import { WorkspaceModeSwitcher } from './WorkspaceModeSwitcher';
import { BuildWorkspaceHeader } from './BuildWorkspaceHeader';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { WorkspaceStatusRail } from './WorkspaceStatusRail';
import { CommandDeck } from './CommandDeck';
import { SpatialWorkspace } from '../spatial/SpatialWorkspace';
import './build-os.css';

const BuildStateContext = createContext<{
  state: BuildWorkspaceState;
  dispatch: (action: BuildAction) => void;
} | null>(null);

export function useBuildWorkspace() {
  const context = useContext(BuildStateContext);
  if (!context) throw new Error('useBuildWorkspace must be used inside KnouxBuildWorkspace.');
  return context;
}

type ProjectResponse = {
  adapter: {
    id: string;
    label: string;
    environment: BuildWorkspaceState['adapter']['environment'];
    capabilities: BuildWorkspaceState['adapter']['capabilities'];
    blockers: BuildWorkspaceState['adapter']['blockers'];
  };
  snapshot: {
    name: string;
    root: string;
    framework: string | null;
    packageManager: string | null;
    routes: { route: string; file: string }[];
    apiRoutes: { route: string; file: string }[];
    files: { path: string; language: string; bytes: number; lines: number; role: string }[];
    tests: { file: string; bytes: number }[];
    scripts: { name: string; command: string }[];
    dependencies: { name: string; version: string; dev: boolean }[];
    graph: NonNullable<BuildWorkspaceState['graph']>;
  };
};

type EnvironmentResponse = {
  environment: 'local' | 'preview' | 'production';
  signals: { name: string; present: boolean; scope: 'server-only' | 'public'; purpose: string }[];
  providers: BuildWorkspaceState['ai']['providers'];
  verificationRunner: { enabled: boolean; allowedTasks: string[]; reason: string };
};

type GitResponse = { git: NonNullable<BuildWorkspaceState['git']> };

/**
 * One fetch pass, shared by both providers below.
 *
 * These two components used to carry near-identical copies of this logic, which
 * is the same copy-paste shape that produced F-14: the copies drift, and the
 * drift is invisible until one of them lies. There is one function now.
 *
 * A 401 is not treated as a failure. It is the workspace boundary answering,
 * and it is reported as `access: 'refused'` so the interface can say what is
 * true — this deployment is real, and reading it requires an account — instead
 * of rendering an empty panel that looks like a bug.
 */
type FactResult<T> = { ok: true; value: T } | { ok: false; refused: boolean };

async function getJson<T>(url: string): Promise<FactResult<T>> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return { ok: false, refused: true };
    if (!response.ok) return { ok: false, refused: false };
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, refused: false };
  }
}

const UNREADABLE_GIT: NonNullable<BuildWorkspaceState['git']> = {
  available: false,
  branch: null,
  headSha: null,
  originMainSha: null,
  dirty: false,
  ahead: null,
  behind: null,
  files: [],
  commits: [],
  blocker: 'Git state could not be read on this deployment.',
};

export async function readWorkspaceFacts(
  dispatch: (action: BuildAction) => void,
  isCancelled: () => boolean,
): Promise<void> {
  let refused = false;

  const project = await getJson<ProjectResponse>('/api/build/project');
  if (isCancelled()) return;
  if (!project.ok) {
    refused = refused || project.refused;
    dispatch({
      type: 'status/error',
      error: project.refused
        ? 'This deployment is read behind a KNOuX account. Sign in to inspect the project, its Git state and its environment.'
        : 'The project snapshot could not be read on this deployment. Every surface below is therefore showing an unknown state rather than an assumed one.',
    });
  } else {
    dispatch({
      type: 'adapter/resolved',
      adapter: project.value.adapter.id,
      label: project.value.adapter.label,
      environment: project.value.adapter.environment,
      capabilities: project.value.adapter.capabilities,
      blockers: project.value.adapter.blockers,
    });
    dispatch({
      type: 'project/resolved',
      project: {
        id: project.value.snapshot.name,
        name: project.value.snapshot.name,
        root: project.value.snapshot.root,
        type: 'unknown',
        framework: project.value.snapshot.framework,
        packageManager: project.value.snapshot.packageManager,
        currentBranch: null,
        headSha: null,
      },
      graph: project.value.snapshot.graph,
    });
  }

  const environment = await getJson<EnvironmentResponse>('/api/build/environment');
  if (isCancelled()) return;
  if (environment.ok) {
    dispatch({ type: 'environment/resolved', signals: environment.value.signals, fetchedAt: new Date().toISOString() });
    dispatch({ type: 'providers/resolved', providers: environment.value.providers });
    dispatch({
      type: 'runtime/resolved',
      runtime: {
        // The deployed site is the only runtime that exists, and it is
        // serving. No process here is startable or stoppable.
        status: 'running',
        pid: null,
        port: null,
        url: typeof window === 'undefined' ? null : window.location.origin,
        command: null,
        startedAt: null,
        blocker: 'This deployment is itself the runtime. It cannot supervise processes.',
      },
    });
  } else {
    refused = refused || environment.refused;
    dispatch({ type: 'environment/resolved', signals: [], fetchedAt: '' });
  }

  const git = await getJson<GitResponse>('/api/build/git');
  if (isCancelled()) return;
  if (!git.ok) refused = refused || git.refused;
  dispatch({ type: 'git/resolved', git: git.ok ? git.value.git : UNREADABLE_GIT });

  dispatch({ type: 'access/set', access: refused ? 'refused' : 'granted' });
  dispatch({ type: 'status/ready' });
}

export function KnouxBuildWorkspace() {
  const [state, dispatch] = useReducer(buildReducer, initialBuildState);
  const mounted = useRef(false);

  // One fetch pass on mount. Each piece is independent, so one failure does not
  // blank the workspace: a failed provider fetch leaves providers unconfigured.
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    let cancelled = false;

    dispatch({ type: 'status/loading' });

    void readWorkspaceFacts(dispatch, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-route whenever the task class or the provider set changes, so the
  // header can never show a decision that was made against a stale list.
  useEffect(() => {
    if (state.ai.providers.length === 0) return;
    const routing = routeModel(state.ai.task, state.ai.routingMode, state.ai.providers, {
      providerId: state.ai.providerId ?? '',
      modelId: state.ai.modelId ?? '',
    });
    dispatch({ type: 'routing/resolved', routing });
  }, [state.ai.task, state.ai.routingMode, state.ai.providers, state.ai.providerId, state.ai.modelId]);

  const compile = useCallback((raw: string) => {
    dispatch({ type: 'intent/compiled', intent: compileBuildIntent(raw) });
  }, []);

  const context = useMemo(() => ({ state, dispatch }), [state]);

  const intentSummary = state.intent ? summariseIntent(state.intent) : null;

  return (
    <BuildStateContext.Provider value={context}>
      <div className="build-os">
        <BuildWorkspaceHeader intentSummary={intentSummary} />
        <div className="bo-body">
          <WorkspaceModeSwitcher />
          <div className="bo-canvas">
            {state.workspace.activeSurface === 'overview' ? (
              <SpatialWorkspace />
            ) : state.workspace.activeSurface === 'genesis' ? (
              <CommandDeck onCompile={compile} />
            ) : (
              <WorkspaceCanvas />
            )}
          </div>
        </div>
        <WorkspaceStatusRail />
      </div>
    </BuildStateContext.Provider>
  );
}

export type { BuildWorkspaceState };
export function BuildStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(buildReducer, initialBuildState);
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'status/loading' });
    void readWorkspaceFacts(dispatch, () => cancelled);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state.ai.providers.length === 0) return;
    dispatch({ type: 'routing/resolved', routing: routeModel(state.ai.task, state.ai.routingMode, state.ai.providers, { providerId: state.ai.providerId ?? '', modelId: state.ai.modelId ?? '' }) });
  }, [state.ai.task, state.ai.routingMode, state.ai.providers, state.ai.providerId, state.ai.modelId]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <BuildStateContext.Provider value={value}>{children}</BuildStateContext.Provider>;
}
