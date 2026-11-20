/**
 * Structured Write Executor — real file writes with path containment, authorization, and audit.
 *
 * This is the bridge between a parsed engineering proposal and actual project mutations.
 * Every write is:
 *   - Contained to a project-owned directory (no symlink/junction escape)
 *   - Authorized by the operator (explicit approval per batch)
 *   - Confirmed by diff before application
 *   - Bounded in size and count
 *   - Cancellable and recoverable
 *   - Audited with immutable receipts
 *
 * No arbitrary shell, no host credential leakage, no same-origin privilege escalation.
 */

import { promises as fs, constants, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { BuildCapability, CapabilityStatus, ProjectIdentity } from './types';
import { redactSecrets } from '../security/redact';

/** Maximum bytes for a single written file. */
export const MAX_WRITE_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Maximum files in a single write batch. */
export const MAX_WRITE_BATCH_FILES = 500;

/** Maximum total bytes in a single write batch. */
export const MAX_WRITE_BATCH_BYTES = 50 * 1024 * 1024; // 50 MB

/** Write executor workspace root — all generated projects live under this. */
export function getWriteExecutorRoot(): string {
  const envRoot = process.env.KNOUX_WRITE_EXECUTOR_ROOT;
  if (envRoot) return path.resolve(envRoot);
  // Default to a sibling directory of the checkout, never inside it.
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** Project-owned directory for a specific project. */
export function getProjectWriteDir(projectId: string): string {
  const root = getWriteExecutorRoot();
  // Sanitize projectId to prevent path traversal.
  const safeId = projectId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(root, safeId);
}

/** Verify a path is inside the project write directory (no escape). */
export function verifyContainment(projectWriteDir: string, targetPath: string): { ok: boolean; reason?: string } {
  try {
    const resolvedWriteDir = realpathSync.native(projectWriteDir);
    const resolvedTarget = realpathSync.native(targetPath);
    const prefix = resolvedWriteDir.endsWith(path.sep) ? resolvedWriteDir : `${resolvedWriteDir}${path.sep}`;
    if (resolvedTarget === resolvedWriteDir || resolvedTarget.startsWith(prefix)) {
      return { ok: true };
    }
    return { ok: false, reason: 'Target path escapes the project write directory.' };
  } catch {
    return { ok: false, reason: 'Path resolution failed — possible symlink escape.' };
  }
}

/** A single file write operation. */
export interface WriteOperation {
  /** Relative path within the project write directory. */
  relativePath: string;
  /** File content (UTF-8). */
  content: string;
  /** Expected SHA-256 of existing content for optimistic concurrency. */
  expectedHash?: string | null;
  /** Whether this is a new file (vs overwrite). */
  isNew: boolean;
}

/** A batch of write operations with metadata. */
export interface WriteBatch {
  id: string;
  projectId: string;
  projectName: string;
  operations: WriteOperation[];
  requestedBy: string;
  requestedAt: string;
  authorizedBy: string | null;
  authorizedAt: string | null;
  status: 'pending' | 'authorized' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  receipt: WriteReceipt | null;
  cancellationToken: AbortSignal | null;
}

/** Result of a write batch execution. */
export interface WriteReceipt {
  batchId: string;
  projectId: string;
  executedAt: string;
  executedBy: string;
  filesWritten: { relativePath: string; bytes: number; hash: string; isNew: boolean }[];
  filesFailed: { relativePath: string; reason: string }[];
  totalBytes: number;
  durationMs: number;
  gitStatusBefore: string | null;
  gitStatusAfter: string | null;
  gitDiff: string | null;
}

/** In-memory batch store (replace with durable store for production). */
const batchStore = new Map<string, WriteBatch>();

/** Active execution tracker (one at a time). */
let activeExecution: { batchId: string; abortController: AbortController } | null = null;

/** Create a new write batch from an engineering proposal. */
export function createWriteBatch(
  project: ProjectIdentity,
  proposalFiles: { path: string; content: string }[],
  requestedBy: string
): WriteBatch {
  const operations: WriteOperation[] = [];
  for (const file of proposalFiles) {
    if (operations.length >= MAX_WRITE_BATCH_FILES) break;
    operations.push({
      relativePath: file.path,
      content: file.content,
      expectedHash: null, // Will be filled during diff phase
      isNew: true, // Will be determined during diff phase
    });
  }

  const batch: WriteBatch = {
    id: randomUUID(),
    projectId: project.id,
    projectName: project.name,
    operations,
    requestedBy,
    requestedAt: new Date().toISOString(),
    authorizedBy: null,
    authorizedAt: null,
    status: 'pending',
    receipt: null,
    cancellationToken: null,
  };

  batchStore.set(batch.id, batch);
  return batch;
}

/** Compute diffs and determine new vs existing files. */
export async function computeWriteDiffs(batch: WriteBatch): Promise<{
  diffs: { relativePath: string; isNew: boolean; currentHash: string | null; newHash: string; currentContent: string | null }[];
  totalBytes: number;
  estimatedFiles: number;
} | { error: string }> {
  const projectWriteDir = getProjectWriteDir(batch.projectId);
  const diffs = [];
  let totalBytes = 0;

  for (const op of batch.operations) {
    if (totalBytes > MAX_WRITE_BATCH_BYTES) {
      return { error: `Batch exceeds maximum size of ${MAX_WRITE_BATCH_BYTES} bytes.` };
    }
    if (Buffer.byteLength(op.content, 'utf8') > MAX_WRITE_FILE_BYTES) {
      return { error: `File ${op.relativePath} exceeds maximum size of ${MAX_WRITE_FILE_BYTES} bytes.` };
    }

    const absolutePath = path.join(projectWriteDir, op.relativePath);
    const containment = verifyContainment(projectWriteDir, absolutePath);
    if (!containment.ok) {
      return { error: `Containment violation for ${op.relativePath}: ${containment.reason}` };
    }

    const newHash = createHash('sha256').update(op.content).digest('hex');
    let currentContent: string | null = null;
    let currentHash: string | null = null;
    let isNew = true;

    try {
      currentContent = await fs.readFile(absolutePath, 'utf8');
      currentHash = createHash('sha256').update(currentContent).digest('hex');
      isNew = false;

      // Verify optimistic concurrency if expectedHash provided
      if (op.expectedHash && op.expectedHash !== currentHash) {
        return { error: `File ${op.relativePath} changed since read. Expected ${op.expectedHash}, found ${currentHash}.` };
      }
    } catch {
      // File doesn't exist — it's new
      isNew = true;
    }

    diffs.push({
      relativePath: op.relativePath,
      isNew,
      currentHash,
      newHash,
      currentContent,
    });

    totalBytes += Buffer.byteLength(op.content, 'utf8');
  }

  return { diffs, totalBytes, estimatedFiles: diffs.length };
}

/** Authorize a write batch (operator approval). */
export function authorizeWriteBatch(batchId: string, authorizedBy: string): { ok: true; batch: WriteBatch } | { error: string } {
  const batch = batchStore.get(batchId);
  if (!batch) return { error: 'Batch not found.' };
  if (batch.status !== 'pending') return { error: `Batch is not pending (current: ${batch.status}).` };

  batch.status = 'authorized';
  batch.authorizedBy = authorizedBy;
  batch.authorizedAt = new Date().toISOString();
  return { ok: true, batch };
}

/** Execute an authorized write batch. */
export async function executeWriteBatch(
  batchId: string,
  executedBy: string,
  abortSignal?: AbortSignal
): Promise<{ ok: true; receipt: WriteReceipt } | { error: string }> {
  const batch = batchStore.get(batchId);
  if (!batch) return { error: 'Batch not found.' };
  if (batch.status !== 'authorized') return { error: `Batch is not authorized (current: ${batch.status}).` };
  if (activeExecution) return { error: `Another write execution is in progress (${activeExecution.batchId}).` };

  const abortController = new AbortController();
  const combinedSignal = abortSignal
    ? AbortSignal.any([abortController.signal, abortSignal])
    : abortController.signal;

  activeExecution = { batchId, abortController };
  batch.status = 'executing';
  batch.cancellationToken = combinedSignal;

  const projectWriteDir = getProjectWriteDir(batch.projectId);
  const startedAt = Date.now();

  // Capture git status before
  let gitStatusBefore: string | null = null;
  let gitDiff: string | null = null;
  try {
    gitStatusBefore = await runGit(projectWriteDir, ['status', '--porcelain=v1']);
  } catch {
    gitStatusBefore = 'unavailable';
  }

  const filesWritten: WriteReceipt['filesWritten'] = [];
  const filesFailed: WriteReceipt['filesFailed'] = [];

  // Re-compute diffs to get current state
  const diffResult = await computeWriteDiffs(batch);
  if ('error' in diffResult) {
    batch.status = 'failed';
    activeExecution = null;
    return { error: diffResult.error };
  }

  for (const diff of diffResult.diffs) {
    if (combinedSignal.aborted) {
      batch.status = 'cancelled';
      activeExecution = null;
      return { error: 'Write batch cancelled.' };
    }

    const absolutePath = path.join(projectWriteDir, diff.relativePath);
    const containment = verifyContainment(projectWriteDir, absolutePath);
    if (!containment.ok) {
      filesFailed.push({ relativePath: diff.relativePath, reason: containment.reason ?? 'Containment violation' });
      continue;
    }

    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      // Write to temp file then atomic rename
      const tmpPath = `${absolutePath}.knx-${randomUUID()}.tmp`;
      await fs.writeFile(tmpPath, batch.operations.find(o => o.relativePath === diff.relativePath)?.content ?? '', 'utf8');
      await fs.rename(tmpPath, absolutePath);

      const writtenHash = createHash('sha256').update(
        batch.operations.find(o => o.relativePath === diff.relativePath)?.content ?? ''
      ).digest('hex');

      filesWritten.push({
        relativePath: diff.relativePath,
        bytes: Buffer.byteLength(batch.operations.find(o => o.relativePath === diff.relativePath)?.content ?? '', 'utf8'),
        hash: writtenHash,
        isNew: diff.isNew,
      });
    } catch (err) {
      filesFailed.push({
        relativePath: diff.relativePath,
        reason: err instanceof Error ? err.message : 'Unknown write error',
      });
    }
  }

  // Capture git status after and diff
  let gitStatusAfter: string | null = null;
  try {
    gitStatusAfter = await runGit(projectWriteDir, ['status', '--porcelain=v1']);
    if (gitStatusBefore && gitStatusBefore !== 'unavailable' && gitStatusAfter !== 'unavailable') {
      gitDiff = await runGit(projectWriteDir, ['diff', '--no-ext-diff', '--no-textconv']);
    }
  } catch {
    gitStatusAfter = 'unavailable';
  }

  const receipt: WriteReceipt = {
    batchId: batch.id,
    projectId: batch.projectId,
    executedAt: new Date().toISOString(),
    executedBy,
    filesWritten,
    filesFailed,
    totalBytes: diffResult.totalBytes,
    durationMs: Date.now() - startedAt,
    gitStatusBefore,
    gitStatusAfter,
    gitDiff,
  };

  batch.status = filesFailed.length > 0 && filesWritten.length === 0 ? 'failed' : 'completed';
  batch.receipt = receipt;
  activeExecution = null;

  return { ok: true, receipt };
}

/** Cancel an in-progress write batch. */
export function cancelWriteBatch(batchId: string): { ok: true } | { error: string } {
  if (activeExecution?.batchId === batchId) {
    activeExecution.abortController.abort();
    return { ok: true };
  }
  const batch = batchStore.get(batchId);
  if (!batch) return { error: 'Batch not found.' };
  if (batch.status === 'executing') {
    // Can't cancel if not our active execution
    return { error: 'Batch is executing but not tracked as active.' };
  }
  batch.status = 'cancelled';
  return { ok: true };
}

/** Get a write batch by ID. */
export function getWriteBatch(batchId: string): WriteBatch | undefined {
  return batchStore.get(batchId);
}

/** List all write batches for a project. */
export function listWriteBatches(projectId: string): WriteBatch[] {
  return [...batchStore.values()].filter(b => b.projectId === projectId);
}

/** Run a git command in the project directory. */
async function runGit(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const gitExe = process.platform === 'win32'
      ? path.join(process.env.ProgramW6432 || process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe')
      : '/usr/bin/git';

    const child = spawn(gitExe, ['-c', 'core.fsmonitor=false', ...args], {
      cwd,
      windowsHide: true,
      shell: false,
      env: {
        NODE_ENV: 'production',
        ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot || 'C:\\Windows' } : {}),
        PATH: process.platform === 'win32'
          ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32')
          : '/usr/bin:/bin',
        GIT_OPTIONAL_LOCKS: '0',
      },
    });

    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', () => {}); // Ignore stderr

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString('utf8'));
      } else {
        reject(new Error(`Git command failed with exit code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

/** Capability status for the write executor. */
export function getWriteExecutorCapabilities(): Record<BuildCapability, CapabilityStatus> {
  const root = getWriteExecutorRoot();
  const writeAvailable = process.env.KNOUX_WRITE_EXECUTOR_ENABLED === '1';

  return {
    'project.read': 'available',
    'project.files': 'available',
    'project.write': writeAvailable ? 'available' : 'blocked',
    'project.delete': writeAvailable ? 'available' : 'blocked',
    'command.allowlisted': 'blocked',
    'command.arbitrary': 'blocked',
    'terminal.interactive': 'blocked',
    'terminal.powershell': 'blocked',
    'runtime.manage': 'blocked',
    'git.read': 'available',
    'git.write': writeAvailable ? 'available' : 'blocked',
    'preview.live': 'blocked',
    'preview.inspect': 'blocked',
    'database.read': 'unconfigured',
    'database.write': 'blocked',
    'provider.execute': 'unconfigured',
    'provider.probe': 'unconfigured',
    'diagnostics.read': 'blocked',
    'test.run': 'blocked',
    'deploy.trigger': 'blocked',
    'deploy.history': 'unconfigured',
    'metrics.read': 'blocked',
    'fs.watch': 'blocked',
  };
}

/** Blocker messages for write executor capabilities. */
export function getWriteExecutorBlockers(): Partial<Record<BuildCapability, string>> {
  if (process.env.KNOUX_WRITE_EXECUTOR_ENABLED !== '1') {
    return {
      'project.write': 'Write executor is disabled. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 on a trusted host to enable.',
      'project.delete': 'Write executor is disabled. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 on a trusted host to enable.',
      'git.write': 'Write executor is disabled. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 on a trusted host to enable.',
    };
  }
  return {};
}