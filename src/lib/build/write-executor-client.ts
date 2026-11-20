/**
 * Client-side write executor integration.
 * Handles batch creation, diff preview, authorization, and execution.
 */

import type { WriteBatch, WriteOperation, WriteReceipt } from './write-executor';

export interface WriteBatchClient extends WriteBatch {
  /** Local UI state */
  ui?: {
    diffExpanded?: boolean;
    executing?: boolean;
  };
}

export interface CreateWriteBatchOptions {
  projectId: string;
  projectName: string;
  files: { path: string; content: string }[];
}

export interface DiffResult {
  diffs: Array<{
    relativePath: string;
    isNew: boolean;
    currentHash: string | null;
    newHash: string;
    hasChanges: boolean;
  }>;
  totalBytes: number;
  estimatedFiles: number;
}

export interface ExecuteResult {
  receipt: WriteReceipt;
}

const API_BASE = '/api/build/write';

async function post<T>(action: string, body: unknown): Promise<T> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...(body as Record<string, unknown>) }),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? `${action} failed with ${response.status}`);
  }
  return data as T;
}

async function get<T>(params: URLSearchParams): Promise<T> {
  const response = await fetch(`${API_BASE}?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? `GET failed with ${response.status}`);
  }
  return data as T;
}

/** Create a new write batch from an engineering proposal. */
export async function createWriteBatchClient(options: CreateWriteBatchOptions): Promise<{ batchId: string; status: string; operations: number }> {
  return post('create', options);
}

/** Compute diffs for a write batch. */
export async function computeWriteDiffsClient(batchId: string): Promise<DiffResult> {
  return post('diff', { batchId });
}

/** Authorize a write batch (operator approval). */
export async function authorizeWriteBatchClient(batchId: string): Promise<{ batchId: string; status: string; authorizedBy: string }> {
  return post('authorize', { batchId });
}

/** Execute an authorized write batch. */
export async function executeWriteBatchClient(batchId: string, _abortSignal?: AbortSignal): Promise<ExecuteResult> {
  return post('execute', { batchId });
}

/** Cancel a write batch. */
export async function cancelWriteBatchClient(batchId: string): Promise<{ ok: true }> {
  return post('cancel', { batchId });
}

/** Get a write batch by ID. */
export async function getWriteBatchClient(batchId: string): Promise<WriteBatchClient> {
  return get(new URLSearchParams({ batchId }));
}

/** List write batches for a project. */
export async function listWriteBatchesClient(projectId: string): Promise<{ batches: WriteBatchClient[] }> {
  return get(new URLSearchParams({ projectId }));
}

/** Get write executor capabilities. */
export async function getWriteExecutorCapabilitiesClient(): Promise<{
  capabilities: Record<string, string>;
  blockers: Record<string, string>;
}> {
  return get(new URLSearchParams({ capabilities: 'true' }));
}

/** Convert an engineering plan to write operations. */
export function planToWriteOperations(plan: Record<string, string[]>): WriteOperation[] {
  const operations: WriteOperation[] = [];

  // Parse FILES / MODULES section
  const fileEntries = plan['FILES / MODULES'] ?? [];
  for (const entry of fileEntries) {
    // Entry format: "path/to/file.ts — description" or just "path/to/file.ts"
    const parts = entry.split(' — ');
    const filePath = parts[0].trim();
    // For now, we can't extract content from the plan alone.
    // The content would come from the provider's detailed output or a follow-up generation.
    operations.push({
      relativePath: filePath,
      content: `// TODO: Implement ${filePath}\n// Generated from engineering plan\n\nexport function placeholder() {\n  return '${filePath}';\n}`,
      isNew: true,
    });
  }

  return operations;
}

/** Generate a human-readable diff summary for UI. */
export function summarizeDiffResult(result: DiffResult): string {
  const newFiles = result.diffs.filter(d => d.isNew).length;
  const modifiedFiles = result.diffs.filter(d => !d.isNew && d.hasChanges).length;
  const unchangedFiles = result.diffs.filter(d => !d.isNew && !d.hasChanges).length;

  const parts = [];
  if (newFiles) parts.push(`${newFiles} new`);
  if (modifiedFiles) parts.push(`${modifiedFiles} modified`);
  if (unchangedFiles) parts.push(`${unchangedFiles} unchanged`);

  return `${parts.join(', ')} · ${(result.totalBytes / 1024).toFixed(1)} KB`;
}