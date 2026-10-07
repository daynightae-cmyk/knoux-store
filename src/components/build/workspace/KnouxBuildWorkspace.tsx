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
import type { RoutingDecision } from '@/lib/build/types';
import { parsePreferences, PREFERENCES_KEY } from '@/lib/build/preferences';
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
  refresh: () => Promise<void>;
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
  snapshot: import('@/lib/build/types').ProjectSnapshot & {
    name: string;
    root: string;
    framework: string | null;
    packageManager: string | null;
    routes: { route: string; file: string }[];
    apiRoutes: { route: string; file: string }[];
    files: { path: string; language: string; bytes: number; lines: number | null; role: string }[];
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
  projectRef: string | null = null,
): Promise<void> {
  let refused = false;

  const suffix = projectRef ? `?project=${encodeURIComponent(projectRef)}` : '';
  const [project, environment, git] = await Promise.all([
    getJson<ProjectResponse>(`/api/build/project${suffix}`),
    getJson<EnvironmentResponse>('/api/build/environment'),
    getJson<GitResponse>(`/api/build/git${suffix}`),
  ]);
  if (isCancelled()) return;
  if (!project.ok) {
    dispatch({ type: 'facts/unavailable' });
    refused = refused || project.refused;
    dispatch({
      type: 'status/error',
      error: project.refused
        ? 'This deployment is read behind a KNOuX account. Sign in to inspect the project, its Git state and its environment.'
        : 'The project snapshot could not be read on this deployment. Every surface below is therefore showing an unknown state rather than an assumed one.',
    });
  } else {
    dispatch({ type: 'snapshot/resolved', snapshot: project.value.snapshot });
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


  if (isCancelled()) return;
  if (environment.ok) {
    dispatch({ type: 'environment/resolved', signals: environment.value.signals, fetchedAt: new Date().toISOString() });
    dispatch({ type: 'providers/resolved', providers: environment.value.providers });
    dispatch({
      type: 'runtime/resolved',
      runtime: {
        // The deployed site is the only runtime that exists, and it is
        // serving. No process here is startable or stoppable.
        status: projectRef ? 'unavailable' : 'running',
        pid: null,
        port: null,
        url: projectRef || typeof window === 'undefined' ? null : window.location.origin,
        command: null,
        startedAt: null,
        blocker: 'This deployment is itself the runtime. It cannot supervise processes.',
      },
    });
  } else {
    refused = refused || environment.refused;
    dispatch({ type: 'environment/resolved', signals: [], fetchedAt: '' });
  }


  if (isCancelled()) return;
  if (!git.ok) refused = refused || git.refused;
  dispatch({ type: 'git/resolved', git: git.ok ? git.value.git : UNREADABLE_GIT });

  dispatch({ type: 'access/set', access: refused ? 'refused' : 'granted' });
  if (project.ok) {
    dispatch({ type: 'status/ready' });
    dispatch({ type: 'activity/record', message: `Project loaded: ${project.value.snapshot.name}` });
  }
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

  useRuntimeRouting(state, dispatch);

  const compile = useCallback((raw: string) => {
    dispatch({ type: 'intent/compiled', intent: compileBuildIntent(raw) });
  }, []);

  const refresh = useCallback(() => readWorkspaceFacts(dispatch, () => false), []);
  const context = useMemo(() => ({ state, dispatch, refresh }), [state, refresh]);

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
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    dispatch({ type: 'status/loading' });
    await Promise.all([
      readWorkspaceFacts(dispatch, () => current !== generation.current, state.projectRef),
      getJson<import('@/lib/build/integration-types').IntegrationSnapshot>('/api/build/integrations').then((result) => { if (current === generation.current && result.ok) dispatch({ type: 'integrations/resolved', snapshot: result.value }); }),
    ]);
  }, [state.projectRef]);
  useEffect(() => { void refresh(); const counter = generation; return () => { counter.current++; }; }, [refresh]);
  useEffect(() => {
    try { const saved = localStorage.getItem(PREFERENCES_KEY); if (saved) { const preferences = parsePreferences(JSON.parse(saved)); dispatch({ type: 'preferences/set', preferences }); const viewport = preferences.viewport === 'phone' ? { id: 'phone', label: 'MOBILE', width: 390, height: 844 } : preferences.viewport === 'tablet' ? { id: 'tablet', label: 'TABLET', width: 768, height: 1024 } : { id: 'laptop', label: 'LAPTOP', width: 1440, height: 900 }; dispatch({ type: 'preview/viewport', viewport }); } } catch { /* Browser storage is optional. */ }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dev-shell--compact', state.preferences.compact);
    document.documentElement.classList.toggle('dev-shell--less-evidence', !state.preferences.showEvidence);
    return () => { document.documentElement.classList.remove('dev-shell--compact', 'dev-shell--less-evidence'); };
  }, [state.preferences.compact, state.preferences.showEvidence]);

  useRuntimeRouting(state, dispatch);

  const value = useMemo(() => ({ state, dispatch, refresh }), [state, refresh]);
  return <BuildStateContext.Provider value={value}>{children}</BuildStateContext.Provider>;
}

/** Fetch the canonical server router; cancelled requests cannot overwrite newer intent. */
function useRuntimeRouting(state: BuildWorkspaceState, dispatch: (action: BuildAction) => void) {
  const { task, routingMode, providerId, modelId } = state.ai;
  const hasProviders = state.ai.providers.length > 0;
  useEffect(() => {
    if (!hasProviders) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ task, mode: routingMode });
    if (providerId) params.set('provider', providerId);
    if (modelId) params.set('model', modelId);
    async function load() {
      try {
        const response = await fetch(`/api/build/providers?${params}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Runtime routing unavailable.');
        const result: { routing: RoutingDecision } = await response.json();
        if (!controller.signal.aborted) dispatch({ type: 'routing/resolved', routing: result.routing });
      } catch {
        if (!controller.signal.aborted) dispatch({ type: 'routing/resolved', routing: {
          task, mode: routingMode, providerId: null, modelId: null, reason: [],
          status: 'unavailable', blocker: 'The canonical runtime router could not be read. No catalog fallback was substituted.',
        } });
      }
    }
    void load();
    return () => controller.abort();
  }, [task, routingMode, providerId, modelId, hasProviders, dispatch]);
}
