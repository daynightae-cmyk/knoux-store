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

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return (await response.json()) as T;
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

    void (async () => {
      try {
        const project = await getJson<ProjectResponse>('/api/build/project');
        if (cancelled) return;
        dispatch({
          type: 'adapter/resolved',
          adapter: project.adapter.id,
          label: project.adapter.label,
          environment: project.adapter.environment,
          capabilities: project.adapter.capabilities,
          blockers: project.adapter.blockers,
        });
        dispatch({
          type: 'project/resolved',
          project: {
            id: project.snapshot.name,
            name: project.snapshot.name,
            root: project.snapshot.root,
            type: 'unknown',
            framework: project.snapshot.framework,
            packageManager: project.snapshot.packageManager,
            currentBranch: null,
            headSha: null,
          },
          graph: project.snapshot.graph,
        });
      } catch {
        if (!cancelled) {
          dispatch({
            type: 'status/error',
            error: 'The project snapshot could not be read on this deployment. Every surface below is therefore showing an unknown state rather than an assumed one.',
          });
        }
      }

      try {
        const environment = await getJson<EnvironmentResponse>('/api/build/environment');
        if (cancelled) return;
        dispatch({
          type: 'environment/resolved',
          signals: environment.signals,
          fetchedAt: new Date().toISOString(),
        });
        dispatch({ type: 'providers/resolved', providers: environment.providers });
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
      } catch {
        if (!cancelled) {
          dispatch({ type: 'environment/resolved', signals: [], fetchedAt: '' });
        }
      }

      try {
        const git = await getJson<GitResponse>('/api/build/git');
        if (!cancelled) dispatch({ type: 'git/resolved', git: git.git });
      } catch {
        if (!cancelled) {
          dispatch({
            type: 'git/resolved',
            git: {
              available: false, branch: null, headSha: null, originMainSha: null, dirty: false,
              ahead: null, behind: null, files: [], commits: [],
              blocker: 'Git state could not be read on this deployment.',
            },
          });
        }
      }

      if (!cancelled) dispatch({ type: 'status/ready' });
    })();

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
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <BuildStateContext.Provider value={value}>{children}</BuildStateContext.Provider>;
}
