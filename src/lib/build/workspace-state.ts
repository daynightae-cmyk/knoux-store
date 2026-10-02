/**
 * KNOuX Build OS workspace state.
 *
 * One reducer holds the whole workspace. Components read from it and dispatch
 * intent; they do not own their own copy of project state. That is the only
 * way a status shown in the header cannot disagree with a status shown in a
 * surface.
 *
 * State is split by lifetime rather than by component:
 *   - `project`, `git`, `environment` and `verification` are facts about the
 *     machine. They are replaced wholesale when the server reports them.
 *   - `workspace` is navigation. Cheap to change, never persisted.
 *   - `ai`, `terminal` and `executions` are session history. They grow.
 *
 * No secret ever enters this state. There is no field for one, and the provider
 * projection the state carries contains environment variable *names* only.
 */

import { clamp01 } from './spatial';
import { DEFAULT_PREFERENCES, type WorkspacePreferences } from './preferences';
import type { IntegrationSnapshot } from './integration-types';
import type {
  BuildCapability,
  BuildIntent,
  CapabilityResolution,
  CapabilityStatus,
  EnvironmentName,
  EnvironmentSignal,
  ExecutionStatus,
  FailureRecord,
  GitSnapshot,
  ProjectAdapter,
  ProjectGraph,
  ProjectIdentity,
  ProposedAction,
  RoutingMode,
  SenshialExecution,
  SenshialMode,
  SourceFileEntry,
  SplitMode,
  TaskClass,
  TerminalSession,
  VerificationSnapshot,
  WorkspaceSurface,
  PreviewState,
  RuntimeProcess,
  DatabaseStatus,
  ProviderStatus,
  RoutingDecision,
} from './types';
import type { Diagnostic } from './types';

export type OpenFile = SourceFileEntry & {
  content: string;
  /** Unsaved editor buffer, when the user has typed. Null means clean. */
  draft: string | null;
  readOnly: boolean;
  cursorLine: number;
  cursorColumn: number;
};

export type BuildWorkspaceState = {
  snapshot: import('./types').ProjectSnapshot | null;
  projectRef: string | null;
  recentProjects: { name: string; path: string }[];
  integrations: IntegrationSnapshot | null;
  preferences: WorkspacePreferences;
  activity: { id: string; at: string; message: string }[];
  adapter: {
    id: string;
    label: string;
    environment: EnvironmentName;
    capabilities: Record<BuildCapability, CapabilityStatus>;
    blockers: Partial<Record<BuildCapability, string>>;
  };
  project: ProjectIdentity | null;
  graph: ProjectGraph | null;
  workspace: {
    activeSurface: WorkspaceSurface;
    secondarySurface: WorkspaceSurface | null;
    splitMode: SplitMode;
    selectedFilePath: string | null;
    openFiles: OpenFile[];
    selectedRoute: string | null;
    selectedEntityId: string | null;
    selectedDiagnosticId: string | null;
    /**
     * Normalised spatial stage progress, 0..1, owned by the workspace.
     *
     * This is bounded and deliberately independent of document scroll. The
     * reference prototype drove its timeline from a 6000vh scroll length; that
     * is a gimmick and is rejected. Here the spine owns the value and the page
     * scroll is never hijacked.
     */
    stageProgress: number;
    stageId: string;
  };
  intent: BuildIntent | null;
  runtime: RuntimeProcess;
  terminal: { sessions: TerminalSession[]; activeSessionId: string | null };
  preview: PreviewState;
  ai: {
    mode: SenshialMode;
    routingMode: RoutingMode;
    task: TaskClass;
    providerId: string | null;
    modelId: string | null;
    routing: RoutingDecision | null;
    providers: ProviderStatus[];
  };
  permissions: {
    pending: ProposedAction | null;
    decisions: { actionId: string; approved: boolean; reason: string; at: string }[];
  };
  git: GitSnapshot | null;
  environment: { signals: EnvironmentSignal[]; fetchedAt: string | null };
  database: DatabaseStatus | null;
  diagnostics: Diagnostic[];
  verification: VerificationSnapshot | null;
  executions: SenshialExecution[];
  failures: FailureRecord[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /**
   * Whether this deployment let this visitor read the workspace.
   *
   * `refused` is a real state, not an error to swallow. On a public deployment
   * an anonymous visitor sees the KNOuX DEV identity and the product machine,
   * while the project inventory, the Git metadata and the environment presence
   * sit behind a sign-in. Saying so plainly is the honest rendering; an empty
   * panel that merely looks broken is not.
   */
  access: 'unknown' | 'granted' | 'refused';
};

/**
 * Every capability, in declaration order, so the status rail is populated
 * before the adapter resolves rather than showing an empty region. `unknown` is
 * a real status here: it is what "not yet detected" means, and it is distinct
 * from `available`.
 */
export const ALL_BUILD_CAPABILITIES: readonly BuildCapability[] = [
  'project.read',
  'project.files',
  'project.write',
  'project.delete',
  'command.allowlisted',
  'command.arbitrary',
  'terminal.interactive',
  'terminal.powershell',
  'runtime.manage',
  'git.read',
  'git.write',
  'preview.live',
  'preview.inspect',
  'database.read',
  'database.write',
  'provider.execute',
  'provider.probe',
  'diagnostics.read',
  'test.run',
  'deploy.trigger',
  'deploy.history',
  'metrics.read',
  'fs.watch',
];

function undetectedCapabilities(): Record<BuildCapability, CapabilityStatus> {
  return ALL_BUILD_CAPABILITIES.reduce(
    (map, capability) => {
      map[capability] = 'unknown';
      return map;
    },
    {} as Record<BuildCapability, CapabilityStatus>,
  );
}

export const DEFAULT_PREVIEW_VIEWPORT = { id: 'laptop', label: 'LAPTOP', width: 1440, height: 900 };

export const initialBuildState: BuildWorkspaceState = {
  snapshot: null, projectRef: null, recentProjects: [], integrations: null,
  preferences: DEFAULT_PREFERENCES, activity: [],
  adapter: {
    id: 'pending',
    label: 'Detecting environment',
    environment: 'production',
    capabilities: undetectedCapabilities(),
    blockers: {},
  },
  project: null,
  graph: null,
  workspace: {
    activeSurface: 'overview',
    secondarySurface: null,
    splitMode: 'single',
    selectedFilePath: null,
    openFiles: [],
    selectedRoute: null,
    selectedEntityId: null,
    selectedDiagnosticId: null,
    stageProgress: 0,
    stageId: 'intent',
  },
  intent: null,
  runtime: { status: 'unavailable', pid: null, port: null, url: null, command: null, startedAt: null, blocker: null },
  terminal: { sessions: [], activeSessionId: null },
  preview: { url: null, viewport: DEFAULT_PREVIEW_VIEWPORT, refreshKey: 0, consoleState: 'idle' },
  ai: {
    mode: 'ask',
    routingMode: 'auto',
    task: 'general',
    providerId: null,
    modelId: null,
    routing: null,
    providers: [],
  },
  permissions: { pending: null, decisions: [] },
  git: null,
  environment: { signals: [], fetchedAt: null },
  database: null,
  diagnostics: [],
  verification: null,
  executions: [],
  failures: [],
  status: 'idle',
  error: null,
  access: 'unknown',
};

export type BuildAction =
  | { type: 'facts/unavailable' }
  | { type: 'snapshot/resolved'; snapshot: import('./types').ProjectSnapshot }
  | { type: 'project/activate'; path: string; name: string }
  | { type: 'integrations/resolved'; snapshot: IntegrationSnapshot }
  | { type: 'preferences/set'; preferences: WorkspacePreferences }
  | { type: 'activity/record'; message: string }
  | { type: 'status/loading' }
  | { type: 'status/ready' }
  | { type: 'status/error'; error: string }
  | { type: 'access/set'; access: BuildWorkspaceState['access'] }
  | { type: 'adapter/resolved'; adapter: ProjectAdapter['id']; label: string; environment: EnvironmentName; capabilities: Record<BuildCapability, CapabilityStatus>; blockers: Partial<Record<BuildCapability, string>> }
  | { type: 'project/resolved'; project: ProjectIdentity; graph: ProjectGraph }
  | { type: 'git/resolved'; git: GitSnapshot }
  | { type: 'environment/resolved'; signals: EnvironmentSignal[]; fetchedAt: string }
  | { type: 'database/resolved'; database: DatabaseStatus }
  | { type: 'providers/resolved'; providers: ProviderStatus[] }
  | { type: 'routing/resolved'; routing: RoutingDecision }
  | { type: 'verification/resolved'; snapshot: VerificationSnapshot }
  | { type: 'diagnostics/resolved'; diagnostics: Diagnostic[] }
  | { type: 'intent/compiled'; intent: BuildIntent }
  | { type: 'surface/active'; surface: WorkspaceSurface }
  | { type: 'surface/secondary'; surface: WorkspaceSurface | null }
  | { type: 'split/set'; mode: SplitMode }
  | { type: 'file/open'; file: OpenFile }
  | { type: 'file/close'; path: string }
  | { type: 'file/draft'; path: string; draft: string | null; line?: number; column?: number }
  | { type: 'route/select'; route: string | null }
  | { type: 'stage/progress'; progress: number }
  | { type: 'stage/select'; stageId: string; progress: number }
  | { type: 'entity/select'; id: string | null }
  | { type: 'diagnostic/select'; id: string | null }
  | { type: 'ai/mode'; mode: SenshialMode }
  | { type: 'ai/routing-mode'; mode: RoutingMode }
  | { type: 'ai/task'; task: TaskClass }
  | { type: 'ai/selection'; providerId: string | null; modelId: string | null }
  | { type: 'execution/add'; execution: SenshialExecution }
  | { type: 'execution/update'; id: string; patch: Partial<SenshialExecution>; status?: ExecutionStatus }
  | { type: 'failure/record'; failure: FailureRecord }
  | { type: 'permission/request'; action: ProposedAction }
  | { type: 'permission/resolve'; approved: boolean; reason: string }
  | { type: 'terminal/session'; session: TerminalSession }
  | { type: 'terminal/active'; id: string | null }
  | { type: 'preview/url'; url: string | null }
  | { type: 'preview/viewport'; viewport: PreviewState['viewport'] }
  | { type: 'preview/refresh' }
  | { type: 'preview/console'; consoleState: PreviewState['consoleState'] }
  | { type: 'runtime/resolved'; runtime: RuntimeProcess }
  | { type: 'reset' };

export function buildReducer(state: BuildWorkspaceState, action: BuildAction): BuildWorkspaceState {
  switch (action.type) {
    case 'facts/unavailable': return { ...state, snapshot: null, project: null, graph: null, git: null, verification: null, runtime: initialBuildState.runtime, adapter: { ...initialBuildState.adapter, capabilities: undetectedCapabilities() }, workspace: { ...state.workspace, openFiles: [], selectedFilePath: null, selectedRoute: null } };
    case 'snapshot/resolved': return { ...state, snapshot: action.snapshot };
    case 'project/activate': return { ...initialBuildState, ai: state.ai, preferences: state.preferences, integrations: state.integrations, activity: state.activity, projectRef: action.path, recentProjects: [{ name: action.name, path: action.path }, ...state.recentProjects.filter((p) => p.path !== action.path)].slice(0, 12) };
    case 'integrations/resolved': return { ...state, integrations: action.snapshot };
    case 'preferences/set': return { ...state, preferences: action.preferences };
    case 'activity/record': return { ...state, activity: [{ id: crypto.randomUUID(), at: new Date().toISOString(), message: action.message }, ...state.activity].slice(0, 60) };
    case 'status/loading':
      return { ...state, status: 'loading', error: null };
    case 'status/ready':
      return { ...state, status: 'ready', error: null };
    case 'status/error':
      return { ...state, status: 'error', error: action.error };
    case 'access/set':
      return { ...state, access: action.access };
    case 'adapter/resolved':
      return {
        ...state,
        adapter: {
          id: action.adapter, label: action.label, environment: action.environment,
          capabilities: action.capabilities, blockers: action.blockers,
        },
      };
    case 'project/resolved':
      return { ...state, project: action.project, graph: action.graph };
    case 'git/resolved':
      return { ...state, git: action.git, project: state.project ? { ...state.project, currentBranch: action.git.branch, headSha: action.git.headSha } : state.project };
    case 'environment/resolved':
      return { ...state, environment: { signals: action.signals, fetchedAt: action.fetchedAt } };
    case 'database/resolved':
      return { ...state, database: action.database };
    case 'providers/resolved':
      return { ...state, ai: { ...state.ai, providers: action.providers } };
    case 'routing/resolved':
      return { ...state, ai: { ...state.ai, routing: action.routing, providerId: action.routing.providerId, modelId: action.routing.modelId } };
    case 'verification/resolved':
      return { ...state, verification: action.snapshot };
    case 'diagnostics/resolved':
      return { ...state, diagnostics: action.diagnostics };
    case 'intent/compiled':
      return { ...state, intent: action.intent };

    case 'surface/active':
      // A split needs a second surface; switching to single clears the split.
      return {
        ...state,
        workspace: {
          ...state.workspace,
          activeSurface: action.surface,
          splitMode: state.workspace.splitMode === 'single' ? 'single' : state.workspace.splitMode,
          secondarySurface:
            state.workspace.splitMode === 'single'
              ? null
              : state.workspace.secondarySurface === action.surface
                ? state.workspace.activeSurface
                : state.workspace.secondarySurface,
        },
      };
    case 'surface/secondary':
      return {
        ...state,
        workspace: {
          ...state.workspace,
          secondarySurface: action.surface,
          splitMode: action.surface ? (state.workspace.splitMode === 'single' ? 'horizontal' : state.workspace.splitMode) : 'single',
        },
      };
    case 'split/set':
      return {
        ...state,
        workspace: {
          ...state.workspace,
          splitMode: action.mode,
          secondarySurface: action.mode === 'single' ? null : state.workspace.secondarySurface ?? 'system',
        },
      };

    case 'file/open': {
      const existing = state.workspace.openFiles.find((file) => file.path === action.file.path);
      const openFiles = existing
        ? state.workspace.openFiles.map((file) => (file.path === action.file.path ? action.file : file))
        : [...state.workspace.openFiles, action.file];
      return {
        ...state,
        workspace: { ...state.workspace, openFiles, selectedFilePath: action.file.path },
      };
    }
    case 'file/close':
      return {
        ...state,
        workspace: {
          ...state.workspace,
          openFiles: state.workspace.openFiles.filter((file) => file.path !== action.path),
          selectedFilePath:
            state.workspace.selectedFilePath === action.path
              ? (state.workspace.openFiles.find((file) => file.path !== action.path)?.path ?? null)
              : state.workspace.selectedFilePath,
        },
      };
    case 'file/draft':
      return {
        ...state,
        workspace: {
          ...state.workspace,
          openFiles: state.workspace.openFiles.map((file) =>
            file.path === action.path
              ? {
                  ...file,
                  draft: action.draft,
                  cursorLine: action.line ?? file.cursorLine,
                  cursorColumn: action.column ?? file.cursorColumn,
                }
              : file,
          ),
        },
      };
    case 'route/select':
      return { ...state, workspace: { ...state.workspace, selectedRoute: action.route } };
    case 'stage/progress':
      return {
        ...state,
        workspace: { ...state.workspace, stageProgress: clamp01(action.progress) },
      };
    case 'stage/select':
      return {
        ...state,
        workspace: {
          ...state.workspace,
          stageProgress: clamp01(action.progress),
          stageId: action.stageId,
        },
      };
    case 'entity/select':
      return { ...state, workspace: { ...state.workspace, selectedEntityId: action.id } };
    case 'diagnostic/select':
      return { ...state, workspace: { ...state.workspace, selectedDiagnosticId: action.id } };

    case 'ai/mode':
      return { ...state, ai: { ...state.ai, mode: action.mode } };
    case 'ai/routing-mode':
      return { ...state, ai: { ...state.ai, routingMode: action.mode } };
    case 'ai/task':
      return { ...state, ai: { ...state.ai, task: action.task } };
    case 'ai/selection':
      return { ...state, ai: { ...state.ai, providerId: action.providerId, modelId: action.modelId } };

    case 'execution/add':
      return { ...state, executions: [action.execution, ...state.executions].slice(0, 50) };
    case 'execution/update':
      return {
        ...state,
        executions: state.executions.map((execution) =>
          execution.id === action.id ? { ...execution, ...action.patch } : execution,
        ),
      };
    case 'failure/record':
      return { ...state, failures: [action.failure, ...state.failures].slice(0, 50) };

    case 'permission/request':
      return { ...state, permissions: { ...state.permissions, pending: action.action } };
    case 'permission/resolve': {
      const pending = state.permissions.pending;
      if (!pending) return state;
      return {
        ...state,
        permissions: {
          pending: null,
          decisions: [
            { actionId: pending.id, approved: action.approved, reason: action.reason, at: new Date().toISOString() },
            ...state.permissions.decisions,
          ].slice(0, 100),
        },
      };
    }

    case 'terminal/session': {
      const exists = state.terminal.sessions.some((session) => session.id === action.session.id);
      return {
        ...state,
        terminal: {
          sessions: exists
            ? state.terminal.sessions.map((session) => (session.id === action.session.id ? action.session : session))
            : [action.session, ...state.terminal.sessions].slice(0, 20),
          activeSessionId: action.session.id,
        },
      };
    }
    case 'terminal/active':
      return { ...state, terminal: { ...state.terminal, activeSessionId: action.id } };

    case 'preview/url':
      return { ...state, preview: { ...state.preview, url: action.url } };
    case 'preview/viewport':
      return { ...state, preview: { ...state.preview, viewport: action.viewport } };
    case 'preview/refresh':
      return { ...state, preview: { ...state.preview, refreshKey: state.preview.refreshKey + 1 } };
    case 'preview/console':
      return { ...state, preview: { ...state.preview, consoleState: action.consoleState } };

    case 'runtime/resolved':
      return { ...state, runtime: action.runtime };

    case 'reset':
      // Keep the detected adapter and provider projection: re-detecting the
      // environment on every reset would flash the UI back to "unknown".
      return { ...initialBuildState, adapter: state.adapter, ai: { ...initialBuildState.ai, providers: state.ai.providers } };
    default:
      return state;
  }
}

/** Every capability and its status, as a flat list for the status rail. */
export function capabilityResolutions(state: BuildWorkspaceState): CapabilityResolution[] {
  return (Object.keys(state.adapter.capabilities) as BuildCapability[]).map((capability) => {
    const status = state.adapter.capabilities[capability];
    const blocker = state.adapter.blockers[capability] ?? null;
    return {
      capability,
      status,
      reason:
        status === 'available'
          ? 'Available in this environment.'
          : (blocker ?? 'Not available in this environment.'),
      requirement: status === 'available' ? null : blocker,
    };
  });
}

export function dirtyFiles(state: BuildWorkspaceState): OpenFile[] {
  return state.workspace.openFiles.filter((file) => file.draft !== null && file.draft !== file.content);
}

export function activeFile(state: BuildWorkspaceState): OpenFile | null {
  return state.workspace.openFiles.find((file) => file.path === state.workspace.selectedFilePath) ?? null;
}
