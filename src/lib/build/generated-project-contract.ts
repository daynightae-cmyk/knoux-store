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
  status: 'not-run' | 'passed' | 'failed';
  evidence: string;
  durationMs: number | null;
};

/** The deterministic ZIP export of the compiled output. */
export type ExportReceipt = {
  path: string;
  bytes: number;
  sha256: string;
  format: 'zip';
  durationMs: number | null;
};

/** A local publish deployment, gated behind explicit confirmation and server-side credentials. */
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

export type GeneratedRuntimeReceipt = {
  operationId: string;
  ownerId: string;
  kind: typeof GENERATED_PROJECT_KIND;
  planSha256: string;
  state: 'validating' | 'built' | 'exported' | 'deployed' | 'ready' | 'stopped' | 'failed' | 'cancelled';
  /** Source digest of the reviewed plan (legacy top-level field kept for surfaces). */
  sourceSha256: string | null;
  /** The exact reviewed source files, written once and never transformed. */
  source: { bytes: number; sha256: string; files: GeneratedFileReceipt[] };
  /** The build-produced compiled output, separate from source. */
  compiled: { bytes: number; sha256: string; files: GeneratedFileReceipt[] | null; build: BuildReceipt | null };
  /** Compiled file receipts (top-level legacy field kept for surfaces). */
  files: GeneratedFileReceipt[];
  /** Compiled bytes total (top-level legacy field kept for surfaces). */
  bytes: number;
  /** Build receipt (top-level legacy field kept for surfaces). */
  build: BuildReceipt | null;
  /** The deterministic ZIP export of the compiled output. */
  export: ExportReceipt | null;
  /** Legacy alias kept for surfaces that still read bundle directly. */
  bundle: ExportReceipt | null;
  /** Local publish deployment, null until explicitly requested by the operator. */
  deploy: DeployReceipt | null;
  preview: PreviewReceipt | null;
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

export function generatedDeployTarget(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 120) throw new Error('A deploy target is required.');
  if (value !== 'local') throw new Error(`Unsupported deploy target: ${value}. Only local publish is supported.`);
  return value;
}

export function generatedDeployConfirmation(value: unknown): string {
  if (value !== GENERATED_PROJECT_DEPLOY_CONFIRMATION) throw new Error(`Deploy requires the exact confirmation: ${GENERATED_PROJECT_DEPLOY_CONFIRMATION}`);
  return value;
}
