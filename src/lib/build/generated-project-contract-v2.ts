/**
 * KNOuX Build OS — Generated Project Execution Contract v2
 *
 * Versioned, durable receipt schema for the complete execution lifecycle:
 * SOURCE → VALIDATION → BUILD → ARTIFACT → RUNTIME → EXPORT → APPROVAL → DEPLOYMENT → VERIFICATION
 */

export const GENERATED_RECEIPT_SCHEMA_VERSION = 2 as const;

export const GENERATED_PROJECT_KIND = 'static-web' as const;
export const GENERATED_PROJECT_CONFIRMATION = 'APPLY STATIC PROJECT';
export const GENERATED_PROJECT_DEPLOY_CONFIRMATION = 'CONFIRM DEPLOYMENT';
export const GENERATED_PROJECT_MAX_FILES = 32;
export const GENERATED_PROJECT_MAX_FILE_BYTES = 64 * 1024;
export const GENERATED_PROJECT_MAX_TOTAL_BYTES = 96 * 1024;
export const GENERATED_PROJECT_MAX_ARTIFACT_BYTES = 120 * 1024;

const FILE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md']);
const FORBIDDEN_SEGMENTS = new Set(['node_modules', 'dist', 'build', 'coverage']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GeneratedProjectFile = { path: string; content: string };
export type GeneratedProjectPlan = { kind: typeof GENERATED_PROJECT_KIND; files: GeneratedProjectFile[] };
export type GeneratedFileReceipt = { path: string; bytes: number; sha256: string };

/** One measured stage of the pipeline. */
export type BuildReceipt = {
  command: string;
  exitCode: number | null;
  signal: string | null;
  status: 'not-run' | 'passed' | 'failed';
  evidence: string;
  durationMs: number | null;
  stdout: { path: string; bytes: number; sha256: string } | null;
  stderr: { path: string; bytes: number; sha256: string } | null;
};

/** The deterministic ZIP export of the compiled output. */
export type ExportReceipt = {
  path: string;
  bytes: number;
  sha256: string;
  format: 'zip';
  durationMs: number | null;
};

/** A deployment receipt, gated behind explicit confirmation and server-side credentials. */
export type DeployReceipt = {
  target: string;
  status: 'not-requested' | 'requested' | 'refused' | 'applied' | 'cancelled' | 'failed';
  confirmation: string | null;
  reference: string | null;
  blocker: string | null;
  error: string | null;
  appliedAt: string | null;
};

export type PreviewReceipt = {
  url: string | null;
  origin: string | null;
  processId: number | null;
  httpStatus: number | null;
  readinessMs: number | null;
  expiresAt: string | null;
  blocker: string | null;
};

/** Per-stage state for the operation state machine. */
export type StageState =
  | 'not-run'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'blocked';

/** Operation-level state machine. */
export type OperationState =
  | 'not-run'
  | 'running'
  | 'cancelling'
  | 'cancelled'
  | 'failed'
  | 'succeeded';

/** A single stage record in the receipt. */
export type StageRecord = {
  name: string;
  state: StageState;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
  signal: string | null;
  evidence: string;
  inputHash: string | null;
  outputHash: string | null;
  error: { code: string; message: string; at: string; retryable: boolean } | null;
};

/** Extended stage records with stage-specific properties. */
export type SourceStageRecord = StageRecord & { name: 'source' };
export type BuildStageRecord = StageRecord & {
  name: 'build';
  tool: { id: string; version: number; scriptSha256: string };
  runtime: { name: string; version: string };
  command: { executable: string; args: string[]; shell: boolean; cwd: string };
  manifest: { path: string; bytes: number; sha256: string } | null;
  files: GeneratedFileReceipt[];
};
export type RuntimeStageRecord = StageRecord & {
  name: 'runtime';
  process: {
    instanceId: string;
    pid: number | null;
    startedAt: string | null;
    heartbeatAt: string | null;
    expiresAt: string | null;
  } | null;
  endpoint: {
    origin: string;
    url: string;
    httpStatus: number;
    readinessMs: number;
  } | null;
  overlay: { id: string; version: number; mutatesHtml: boolean } | null;
};
export type ExportStageRecord = StageRecord & {
  name: 'export';
  tool: { id: string; version: number };
  artifact: { path: string; bytes: number; sha256: string; format: 'zip' } | null;
  entries: GeneratedFileReceipt[];
};
export type DeploymentStageRecord = StageRecord & {
  name: 'deployment';
  adapter: { id: string; version: number } | null;
  target: { id: string; environment: string } | null;
  release: { reference: string; url: string | null; appliedAt: string } | null;
};

/** Union of all stage record types. */
export type AnyStageRecord = SourceStageRecord | BuildStageRecord | RuntimeStageRecord | ExportStageRecord | DeploymentStageRecord;

/** Transition history entry. */
export type TransitionRecord = {
  sequence: number;
  revision: number;
  at: string;
  stage: string | null;
  from: string | null;
  to: string;
  code: string;
  attempt: number;
  actor: { type: 'operator' | 'system' | 'tool'; id: string | null };
};

/** Idempotency binding. */
export type IdempotencyRecord = {
  key: string;
  artifactSha256: string;
  boundAt: string;
  attempt: number;
};

/** Approval record. */
export type ApprovalRecord = {
  level: 'run' | 'deploy';
  actionId: string;
  artifactSha256: string;
  confirmation: string;
  approvedBy: string;
  approvedAt: string;
  permissionReason: string;
};

/** Provenance tiers. */
export type ProvenanceRecord = {
  origin: {
    trust: 'server-observed' | 'client-reported' | 'unknown';
    generationRequestId: string | null;
    providerId: string | null;
    modelId: string | null;
    profile: string | null;
    planSha256: string | null;
  };
  executor: {
    id: string;
    version: number;
    invocationId: string;
    host: { platform: string; architecture: string; nodeVersion: string };
  };
};

/** Complete v2 execution receipt. */
export type GeneratedRuntimeReceiptV2 = {
  schemaVersion: typeof GENERATED_RECEIPT_SCHEMA_VERSION;
  operationId: string;
  attemptId: string;
  kind: typeof GENERATED_PROJECT_KIND;
  revision: number;
  operationState: OperationState;
  currentStage: string | null;
  attempt: number;

  idempotency: IdempotencyRecord;
  approval: ApprovalRecord | null;
  provenance: ProvenanceRecord;

  source: StageRecord;
  build: StageRecord & {
    tool: { id: string; version: number; scriptSha256: string };
    runtime: { name: string; version: string };
    command: { executable: string; args: string[]; shell: boolean; cwd: string };
    manifest: { path: string; bytes: number; sha256: string } | null;
    files: GeneratedFileReceipt[];
  };
  runtime: StageRecord & {
    process: {
      instanceId: string;
      pid: number | null;
      startedAt: string | null;
      heartbeatAt: string | null;
      expiresAt: string | null;
    } | null;
    endpoint: {
      origin: string;
      url: string;
      httpStatus: number;
      readinessMs: number;
    } | null;
    overlay: { id: string; version: number; mutatesHtml: boolean } | null;
  };
  export: StageRecord & {
    tool: { id: string; version: number };
    artifact: { path: string; bytes: number; sha256: string; format: 'zip' } | null;
    entries: GeneratedFileReceipt[];
  };
  deployment: StageRecord & {
    adapter: { id: string; version: number } | null;
    target: { id: string; environment: string } | null;
    release: { reference: string; url: string | null; appliedAt: string } | null;
  };

  worker: { instanceId: string; heartbeatAt: string; leaseExpiresAt: string } | null;
  cancellation: { requestedAt: string; requestedBy: string; reason: string | null } | null;

  transitions: TransitionRecord[];

  externalReference: string;
  createdAt: string;
  updatedAt: string;
  lastError: { code: string; message: string; at: string; retryable: boolean } | null;
};

/** Legacy v1 receipt for backward compatibility. */
export type GeneratedRuntimeReceiptV1 = {
  operationId: string;
  ownerId: string;
  kind: typeof GENERATED_PROJECT_KIND;
  planSha256: string;
  state: 'validating' | 'applied' | 'ready' | 'stopped' | 'failed' | 'cancelled';
  files: GeneratedFileReceipt[];
  bytes: number;
  sourceSha256: string | null;
  build: { command: string; exitCode: number | null; status: 'not-run' | 'passed' | 'failed'; evidence: string; durationMs: number | null } | null;
  bundle: { path: string; bytes: number; sha256: string } | null;
  preview: { url: string | null; origin: string | null; processId: number | null; httpStatus: number | null; readinessMs: number | null; expiresAt: string | null; blocker: string | null } | null;
  externalReference: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
};

export function generatedProjectPath(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 320 || value !== value.normalize('NFC')) throw new Error('Generated file path is invalid.');
  if (value.startsWith('/') || value.includes('\\') || value.includes('\0') || /%[0-9a-f]{2}/i.test(value)) throw new Error('Generated file path must be a plain relative path.');
  const segments = value.split('/');
  if (segments.length > 6 || segments.some((segment) => {
    if (!/^[A-Za-z0-9][A-Za-z0-9_@().+-]{0,79}$/.test(segment)) return true;
    const lower = segment.toLowerCase();
    return segment === '.' || segment === '..' || segment.startsWith('.') || FORBIDDEN_SEGMENTS.has(lower) || lower === '.env' || lower.endsWith('.env') || lower === '.git' || lower === '.gitignore' || lower === 'package.json' || lower === 'package-lock.json' || lower === 'service-worker.js' || lower === 'sw.js';
  })) throw new Error(`Generated file path is outside the supported static project boundary: ${value}`);
  const extension = value.includes('.') ? `.${value.split('.').at(-1)?.toLowerCase()}` : '';
  if (!FILE_EXTENSIONS.has(extension)) throw new Error(`Generated file type is not supported: ${value}`);
  return value;
}

export function parseGeneratedProject(value: unknown): GeneratedProjectPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A structured generatedProject artifact is required.');
  const candidate = value as { kind?: unknown; files?: unknown };
  if (candidate.kind !== GENERATED_PROJECT_KIND) throw new Error(`Only ${GENERATED_PROJECT_KIND} projects can be executed by this bounded runtime.`);
  if (!Array.isArray(candidate.files) || candidate.files.length < 1 || candidate.files.length > GENERATED_PROJECT_MAX_FILES) throw new Error(`Generated project must contain 1–${GENERATED_PROJECT_MAX_FILES} files.`);
  const paths = new Set<string>();
  let bytes = 0;
  const files = candidate.files.map((entry): GeneratedProjectFile => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Each generated file must be an object.');
    const file = entry as { path?: unknown; content?: unknown };
    const normalizedPath = generatedProjectPath(file.path);
    if (paths.has(normalizedPath.toLowerCase())) throw new Error(`Duplicate generated path: ${normalizedPath}`);
    paths.add(normalizedPath.toLowerCase());
    if (typeof file.content !== 'string' || file.content.includes('\0') || !file.content.trim()) throw new Error(`Generated file content is invalid: ${normalizedPath}`);
    const contentBytes = new TextEncoder().encode(file.content).byteLength;
    if (contentBytes > GENERATED_PROJECT_MAX_FILE_BYTES) throw new Error(`Generated file exceeds its byte limit: ${normalizedPath}`);
    bytes += contentBytes;
    if (bytes > GENERATED_PROJECT_MAX_TOTAL_BYTES) throw new Error('Generated project exceeds its total byte limit.');
    return { path: normalizedPath, content: file.content };
  });
  if (!paths.has('index.html')) throw new Error('A static project requires an index.html entry point.');
  const jsonBytes = new TextEncoder().encode(JSON.stringify({ kind: candidate.kind, files })).byteLength;
  if (jsonBytes > GENERATED_PROJECT_MAX_ARTIFACT_BYTES) throw new Error('Generated project artifact exceeds its transport limit.');
  return { kind: GENERATED_PROJECT_KIND, files };
}

export function generatedOperationId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('A valid operation UUID is required.');
  return value.toLowerCase();
}

export function generatedAttemptId(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{3}$/.test(value)) throw new Error('A valid 3-digit attempt ID is required (e.g., "001").');
  return value;
}

export function generatedDeployTarget(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 120) throw new Error('A deploy target is required.');
  if (value !== 'local') throw new Error(`Unsupported deploy target: ${value}. Only local publish is supported.`);
  return value;
}

export function generatedDeployConfirmation(value: unknown): string {
  if (value !== GENERATED_PROJECT_DEPLOY_CONFIRMATION) throw new Error(`Deploy requires the exact confirmation: ${GENERATED_PROJECT_DEPLOY_CONFIRMATION}`);
  return value;
}

import { createHash } from 'node:crypto';

export function artifactDigest(plan: GeneratedProjectPlan): string {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

export function sourceTreeDigest(plan: GeneratedProjectPlan): string {
  const hash = createHash('sha256');
  for (const file of [...plan.files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path).update('\0').update(String(Buffer.byteLength(file.content, 'utf8'))).update('\0').update(file.content);
  }
  return hash.digest('hex');
}

export function computedSourceHashes(plan: GeneratedProjectPlan): GeneratedFileReceipt[] {
  return plan.files.map((file) => ({
    path: file.path,
    bytes: Buffer.byteLength(file.content, 'utf8'),
    sha256: createHash('sha256').update(file.content).digest('hex'),
  }));
}

/** Detect if a receipt is legacy v1 format. */
export function isLegacyReceipt(obj: unknown): obj is GeneratedRuntimeReceiptV1 {
  return !!obj && typeof obj === 'object' && 'planSha256' in obj && !('schemaVersion' in obj);
}

/** Convert legacy v1 receipt to v2 projection (read-only). */
export function projectLegacyToV2(legacy: GeneratedRuntimeReceiptV1, _ownerId: string): GeneratedRuntimeReceiptV2 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    operationId: legacy.operationId,
    attemptId: '001',
    kind: legacy.kind,
    revision: 1,
    operationState: legacy.state === 'ready' ? 'succeeded' : legacy.state === 'failed' ? 'failed' : legacy.state === 'cancelled' ? 'cancelled' : 'running',
    currentStage: legacy.state === 'ready' ? 'runtime' : legacy.state === 'applied' ? 'build' : 'source',
    attempt: 1,
    idempotency: { key: legacy.operationId, artifactSha256: legacy.planSha256, boundAt: legacy.createdAt, attempt: 1 },
    approval: null,
    provenance: {
      origin: { trust: 'server-observed', generationRequestId: null, providerId: null, modelId: null, profile: null, planSha256: legacy.planSha256 },
      executor: { id: 'knoux-generated-project-executor', version: 1, invocationId: 'legacy', host: { platform: process.platform, architecture: process.arch, nodeVersion: process.version } },
    },
    source: {
      name: 'source', state: 'succeeded', startedAt: legacy.createdAt, completedAt: legacy.createdAt, durationMs: 0,
      exitCode: 0, signal: null, evidence: `${legacy.files.length} files written`, inputHash: null, outputHash: legacy.sourceSha256, error: null,
    },
    build: {
      name: 'build', state: legacy.build?.status === 'passed' ? 'succeeded' : 'not-run', startedAt: null, completedAt: null, durationMs: legacy.build?.durationMs ?? null,
      exitCode: legacy.build?.exitCode ?? null, signal: null, evidence: legacy.build?.evidence ?? 'Not executed', inputHash: legacy.sourceSha256, outputHash: null, error: null,
      tool: { id: 'knoux-static-builder', version: 1, scriptSha256: '' },
      runtime: { name: 'node', version: process.version },
      command: { executable: 'node', args: [], shell: false, cwd: '' },
      manifest: null,
      files: legacy.files,
    },
    runtime: {
      name: 'runtime', state: legacy.preview?.url ? 'succeeded' : 'not-run', startedAt: null, completedAt: null, durationMs: legacy.preview?.readinessMs ?? null,
      exitCode: null, signal: null, evidence: legacy.preview?.url ? 'Preview running' : 'Not started', inputHash: null, outputHash: null, error: legacy.preview?.blocker ? { code: 'RUNTIME_BLOCKED', message: legacy.preview.blocker, at: now, retryable: false } : null,
      process: legacy.preview?.processId ? { instanceId: 'legacy', pid: legacy.preview.processId, startedAt: null, heartbeatAt: null, expiresAt: legacy.preview.expiresAt ?? null } : null,
      endpoint: legacy.preview?.url ? { origin: legacy.preview.origin ?? '', url: legacy.preview.url, httpStatus: legacy.preview.httpStatus ?? 200, readinessMs: legacy.preview.readinessMs ?? 0 } : null,
      overlay: { id: 'knoux-preview-probe', version: 1, mutatesHtml: true },
    },
    export: {
      name: 'export', state: legacy.bundle ? 'succeeded' : 'not-run', startedAt: null, completedAt: null, durationMs: null,
      exitCode: null, signal: null, evidence: legacy.bundle ? 'ZIP created' : 'Not executed', inputHash: null, outputHash: legacy.bundle?.sha256 ?? null, error: null,
      tool: { id: 'knoux-zip', version: 1 },
      artifact: legacy.bundle ? { path: legacy.bundle.path, bytes: legacy.bundle.bytes, sha256: legacy.bundle.sha256, format: 'zip' } : null,
      entries: [],
    },
    deployment: {
      name: 'deployment', state: 'blocked', startedAt: null, completedAt: null, durationMs: null,
      exitCode: null, signal: null, evidence: 'No deployment adapter', inputHash: null, outputHash: null, error: { code: 'ADAPTER_MISSING', message: 'Deployment adapter not configured', at: now, retryable: false },
      adapter: null, target: null, release: null,
    },
    worker: null,
    cancellation: null,
    transitions: [],
    externalReference: legacy.externalReference,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    lastError: legacy.error ? { code: 'LEGACY_ERROR', message: legacy.error, at: legacy.updatedAt, retryable: false } : null,
  };
}