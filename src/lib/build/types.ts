/**
 * KNOuX Build OS — domain contracts.
 *
 * These types are the boundary between the workspace and everything it could
 * possibly touch. They are deliberately free of React and of any assumption
 * that a capability exists: a capability is something an adapter can actually
 * perform, and anything else is reported as a status rather than rendered as a
 * working control.
 *
 * The single rule this file enforces is that "unknown" can never be widened
 * into "pass". `VerificationStatus` has no optimistic member.
 */

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

/** Every operation the Build OS can be asked to perform. */
export type BuildCapability =
  | 'project.read'
  | 'project.files'
  | 'project.write'
  | 'project.delete'
  | 'command.allowlisted'
  | 'command.arbitrary'
  | 'terminal.interactive'
  | 'runtime.manage'
  | 'git.read'
  | 'git.write'
  | 'preview.live'
  | 'preview.inspect'
  | 'database.read'
  | 'database.write'
  | 'provider.execute'
  | 'diagnostics.read'
  | 'test.run'
  | 'deploy.trigger';

/**
 * Capability state. `blocked` and `unconfigured` are deliberately distinct:
 * `blocked` means a policy or environment forbids it, `unconfigured` means a
 * credential or service is missing. Collapsing them would hide the blocker.
 */
export type CapabilityStatus =
  | 'available'
  | 'unavailable'
  | 'unconfigured'
  | 'blocked'
  | 'unknown';

export type CapabilityResolution = {
  capability: BuildCapability;
  status: CapabilityStatus;
  /** Plain, specific reason. Never a euphemism such as "coming soon". */
  reason: string;
  /** The exact thing that must change for this to become available. */
  requirement: string | null;
};

// ---------------------------------------------------------------------------
// Intent — the Command Deck
// ---------------------------------------------------------------------------

export type ProductKind =
  | 'website'
  | 'web-application'
  | 'ecommerce'
  | 'portal'
  | 'saas'
  | 'api'
  | 'ai-application'
  | 'admin'
  | 'landing'
  | 'booking'
  | 'desktop'
  | 'system-tool'
  | 'unknown';

export type DeploymentTarget =
  | 'pwa'
  | 'web'
  | 'desktop'
  | 'wordpress'
  | 'ios'
  | 'android'
  | 'unknown';

export type IntentConfidence = 'resolved' | 'partial' | 'empty';

/**
 * A normalised reading of what the visitor asked for.
 *
 * This is produced by deterministic term extraction against the KNOuX
 * registries. It is not a model output and it never claims to be one. When no
 * provider is configured, `confidence` is still meaningful because the
 * deterministic layer does the work on its own.
 */
export type BuildIntent = {
  rawInput: string;
  productKind: ProductKind;
  requestedCapabilities: string[];
  requestedStack: string[];
  requestedIntegrations: string[];
  languagePreferences: string[];
  deploymentTarget: DeploymentTarget;
  /** Entity ids resolved in the KNOuX registries, with the reason recorded. */
  resolvedEntityIds: string[];
  /** Words in the input that matched nothing. Surfaced rather than hidden. */
  unresolvedTerms: string[];
  confidence: IntentConfidence;
  /** Phrases that actually fired, so the reading is inspectable. */
  matchedPhrases: string[];
};

// ---------------------------------------------------------------------------
// Workspace state
// ---------------------------------------------------------------------------

export type WorkspaceSurface =
  | 'genesis'
  | 'code'
  | 'preview'
  | 'terminal'
  | 'system'
  | 'data'
  | 'tests'
  | 'git'
  | 'release';

export type SplitMode = 'single' | 'horizontal' | 'vertical';

export type ProjectIdentity = {
  id: string;
  name: string;
  root: string;
  type: ProductKind;
  framework: string | null;
  packageManager: string | null;
  currentBranch: string | null;
  headSha: string | null;
};

export type WorkspaceUiState = {
  activeSurface: WorkspaceSurface;
  secondarySurface: WorkspaceSurface | null;
  splitMode: SplitMode;
  selectedFile: string | null;
  selectedRoute: string | null;
  selectedEntityId: string | null;
  selectedDiagnosticId: string | null;
};

export type RuntimeStatus =
  | 'idle'
  | 'running'
  | 'stopped'
  | 'failed'
  | 'unavailable';

export type RuntimeProcess = {
  status: RuntimeStatus;
  pid: number | null;
  port: number | null;
  url: string | null;
  command: string | null;
  startedAt: string | null;
  /** Set when the environment cannot manage processes at all. */
  blocker: string | null;
};

export type TerminalSessionKind = 'dev' | 'build' | 'test' | 'git' | 'custom';

export type TerminalSessionStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'failed'
  | 'stopped'
  | 'unavailable';

export type TerminalSession = {
  id: string;
  kind: TerminalSessionKind;
  command: string | null;
  cwd: string | null;
  pid: number | null;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  status: TerminalSessionStatus;
  /** Why the session cannot run, when it cannot. */
  blocker: string | null;
};

export type PreviewViewport = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type PreviewState = {
  url: string | null;
  viewport: PreviewViewport;
  refreshKey: number;
  consoleState: 'idle' | 'listening' | 'unavailable';
};

// ---------------------------------------------------------------------------
// AI — providers, routing, Senshial
// ---------------------------------------------------------------------------

export type SenshialMode = 'ask' | 'plan' | 'execute';

export type ProviderCapabilitySet = {
  text: boolean;
  vision: boolean;
  tools: boolean;
  structuredOutput: boolean;
  streaming: boolean;
};

export type AIModelDefinition = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number | null;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  tags: string[];
};

/**
 * Provider contract. Implementations live server-side. `isConfigured` is the
 * only thing the client is ever told, and it is told the requirement too.
 */
export type AIProviderAdapter = {
  id: string;
  displayName: string;
  /** Environment variable names the provider needs. Names only, never values. */
  requiredEnv: string[];
  capabilities: ProviderCapabilitySet;
  /** Documented model catalogue. Never derived from a live call. */
  models: AIModelDefinition[];
  isConfigured(env: Record<string, string | undefined>): boolean;
  /** Server-side only. Absent when no credential exists. */
  execute?: (request: ProviderRequest) => Promise<ProviderResponse>;
};

export type ProviderRequest = {
  model: string;
  prompt: string;
  mode: SenshialMode;
  system?: string;
  maxOutputTokens?: number;
};

export type ProviderResponse = {
  ok: boolean;
  text: string;
  errorCategory: string | null;
  /** True when the failure is a missing credential rather than a bad request. */
  configurationProblem: boolean;
};

export type ProviderStatus = {
  id: string;
  displayName: string;
  configured: boolean;
  requiredEnv: string[];
  capabilities: ProviderCapabilitySet;
  models: AIModelDefinition[];
  /** Explicit, actionable. Never "offline" for a provider that was never set up. */
  status: CapabilityStatus;
  reason: string;
};

export type RoutingMode = 'manual' | 'auto';

/** Task classes the router reasons about. Each maps to declared capabilities. */
export type TaskClass =
  | 'search'
  | 'fast-edit'
  | 'architecture'
  | 'debugging'
  | 'vision'
  | 'refactor'
  | 'long-context'
  | 'test-repair'
  | 'general';

export type RoutingDecision = {
  task: TaskClass;
  mode: RoutingMode;
  providerId: string | null;
  modelId: string | null;
  /** Every rule that fired, in order. Empty when nothing was selectable. */
  reason: string[];
  status: 'resolved' | 'unavailable';
  /** The exact blocker when nothing could be selected. */
  blocker: string | null;
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionLevel =
  | 'read'
  | 'edit'
  | 'run'
  | 'install'
  | 'database-write'
  | 'git-write'
  | 'deploy';

export type ProposedAction = {
  id: string;
  level: PermissionLevel;
  title: string;
  /** What would actually happen, in concrete terms. */
  detail: string;
  /** Files or systems this would touch, for review before approval. */
  affects: string[];
  /** True when the action cannot be undone by a simple revert. */
  irreversible: boolean;
};

export type PermissionDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  level: PermissionLevel;
};

// ---------------------------------------------------------------------------
// Senshial execution
// ---------------------------------------------------------------------------

export type ExecutionStatus =
  | 'queued'
  | 'inspecting'
  | 'waiting-approval'
  | 'executing'
  | 'verifying'
  | 'complete'
  | 'partial'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export type ProposedChange = {
  path: string;
  summary: string;
  level: PermissionLevel;
  approved: boolean;
};

export type SenshialExecution = {
  id: string;
  prompt: string;
  mode: SenshialMode;
  providerId: string | null;
  modelId: string | null;
  startedAt: string;
  completedAt: string | null;
  inspectedResources: string[];
  proposedChanges: ProposedChange[];
  approvedActions: string[];
  changedFiles: string[];
  commands: string[];
  verification: VerificationSnapshot | null;
  status: ExecutionStatus;
  /** Why it stopped where it stopped. Always populated for non-complete. */
  blocker: string | null;
};

export type FailureRecord = {
  id: string;
  problem: string;
  attempt: string;
  result: string;
  evidence: string;
  at: string;
};

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type VerificationStatus =
  | 'pass'
  | 'fail'
  | 'blocked'
  | 'unconfigured'
  | 'not-run'
  | 'not-applicable';

/** The six independent axes. None of them imply any other. */
export type VerificationAxis =
  | 'implemented'
  | 'configured'
  | 'tested'
  | 'runtime-verified'
  | 'ci-verified'
  | 'production-verified';

export type VerificationCheck = {
  id: string;
  label: string;
  command: string | null;
  exitCode: number | null;
  status: VerificationStatus;
  /** The measured detail: pass counts, page counts, SHAs. Never a guess. */
  evidence: string;
  ranAt: string | null;
  durationMs: number | null;
};

export type VerificationSnapshot = {
  checks: VerificationCheck[];
  headSha: string | null;
  capturedAt: string;
};

/** One row of the Reality Ledger. */
export type RealityLedgerRow = {
  subject: string;
  implemented: VerificationStatus;
  configured: VerificationStatus;
  tested: VerificationStatus;
  runtimeVerified: VerificationStatus;
  ciVerified: VerificationStatus;
  productionVerified: VerificationStatus;
  blocker: string | null;
};

// ---------------------------------------------------------------------------
// Project Cortex
// ---------------------------------------------------------------------------

export type ProjectNodeDomain =
  | 'ui'
  | 'routes'
  | 'api'
  | 'auth'
  | 'data'
  | 'storage'
  | 'ai'
  | 'tests'
  | 'dependencies'
  | 'deployment'
  | 'unavailable';

export type ProjectNodeStatus = 'present' | 'absent' | 'unavailable';

export type ProjectGraphNode = {
  id: string;
  domain: ProjectNodeDomain;
  label: string;
  /**
   * Where this fact came from. Null only for a domain that could not be
   * introspected at all, which is why that case exists.
   */
  source: string | null;
  path: string | null;
  route: string | null;
  status: ProjectNodeStatus;
  detail: string;
};

export type ProjectGraphEdge = {
  from: string;
  to: string;
  kind: 'imports' | 'routes-to' | 'calls' | 'depends-on';
  evidence: string;
};

export type ProjectGraph = {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  /** Domains that could not be introspected. Listed, not hidden. */
  unavailableDomains: ProjectNodeDomain[];
};

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type DiagnosticSource =
  | 'typescript'
  | 'eslint'
  | 'runtime'
  | 'browser'
  | 'test'
  | 'build'
  | 'security'
  | 'accessibility';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type Diagnostic = {
  id: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
  file: string | null;
  line: number | null;
  column: number | null;
  relatedFiles: string[];
  evidence: string;
  status: VerificationStatus;
  /**
   * Only set when the cause was actually established. Correlation is recorded
   * in `evidence` and must not be promoted to a root cause.
   */
  rootCause: string | null;
  verificationMethod: string | null;
};

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export type GitFileState = 'staged' | 'unstaged' | 'untracked';

export type GitSnapshot = {
  available: boolean;
  branch: string | null;
  headSha: string | null;
  originMainSha: string | null;
  dirty: boolean;
  ahead: number | null;
  behind: number | null;
  files: { path: string; state: GitFileState }[];
  commits: { sha: string; subject: string; author: string; at: string }[];
  blocker: string | null;
};

/**
 * The semantic states a change can be in. These are distinct facts and the
 * UI must never collapse them: a local edit is not a commit, and a commit is
 * not a deployment.
 */
export type ChangeLifecycle =
  | 'local-change'
  | 'saved'
  | 'committed'
  | 'pushed'
  | 'ci-verified'
  | 'merged'
  | 'deployed';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export type EnvironmentName = 'local' | 'preview' | 'production';

export type EnvironmentSignal = {
  name: string;
  /** Presence only. The value is never transmitted. */
  present: boolean;
  scope: 'server-only' | 'public';
  purpose: string;
};

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export type DatabaseCapabilitySet = {
  schemas: boolean;
  tables: boolean;
  columns: boolean;
  relations: boolean;
  query: boolean;
  write: boolean;
  migrations: boolean;
};

export type DatabaseStatus = {
  connected: boolean;
  adapterId: string | null;
  capabilities: DatabaseCapabilitySet;
  blocker: string | null;
  requirement: string | null;
};

// ---------------------------------------------------------------------------
// Project adapter
// ---------------------------------------------------------------------------

export type SourceFileEntry = {
  path: string;
  language: string;
  bytes: number;
  lines: number;
  /** Why this file is in the project view. */
  role: string;
};

export type ProjectSnapshot = {
  name: string;
  root: string;
  framework: string | null;
  packageManager: string | null;
  scripts: { name: string; command: string }[];
  dependencies: { name: string; version: string; dev: boolean }[];
  files: SourceFileEntry[];
  routes: { route: string; file: string }[];
  apiRoutes: { route: string; file: string }[];
  tests: { file: string; bytes: number }[];
  graph: ProjectGraph;
  /** Domains the adapter could not reach in this environment. */
  unavailableDomains: ProjectNodeDomain[];
};

/**
 * The only route to the outside world for the workspace.
 *
 * An implementation must return honest capabilities. A `false` capability
 * must never be presented in the UI as an available control, and no method
 * may be invoked for a capability it reports as false.
 */
export type ProjectAdapter = {
  id: string;
  label: string;
  environment: EnvironmentName;
  capabilities(): Record<BuildCapability, CapabilityStatus>;
  snapshot(): Promise<ProjectSnapshot>;
  readFile(path: string): Promise<{ content: string; language: string; bytes: number; lines: number } | null>;
  gitSnapshot(): Promise<GitSnapshot>;
  /** Only ever runs commands on an explicit allowlist. Never arbitrary argv. */
  runVerification?(task: string): Promise<VerificationSnapshot>;
  database?(): DatabaseStatus;
  blockerFor(capability: BuildCapability): string | null;
};
