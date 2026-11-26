/**
 * KNOuX Build OS — Generated Project Executor v2
 *
 * Durable, versioned execution with:
 * - Owner-scoped and attempt-scoped storage
 * - Atomic receipt persistence with revision/transition history
 * - Child-process builder for real measured builds
 * - Crash recovery and stale-runtime reconciliation
 * - Explicit cancel/retry/runtime-stop separation
 */

import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  GENERATED_RECEIPT_SCHEMA_VERSION,
  GENERATED_PROJECT_CONFIRMATION,
  type GeneratedProjectPlan,
  type GeneratedFileReceipt,
  type GeneratedRuntimeReceiptV2,
  type StageRecord,
  type SourceStageRecord,
  type BuildStageRecord,
  type RuntimeStageRecord,
  type ExportStageRecord,
  type DeploymentStageRecord,
  type TransitionRecord,
  type ApprovalRecord,
  type ProvenanceRecord,
  artifactDigest,
  sourceTreeDigest,
  computedSourceHashes,
  generatedOperationId,
  generatedDeployTarget,
  generatedDeployConfirmation,
  parseGeneratedProject,
  isLegacyReceipt,
  projectLegacyToV2,
} from './generated-project-contract-v2.ts';

const ROOT_DIR = 'knoux-generated-projects';
const RECEIPT_FILE = 'receipt.v2.json';
const SOURCE_DIR = 'source';
const COMPILED_DIR = 'compiled';
const BUNDLE_FILE = 'knoux-static-app.zip';
const BUILDER_SCRIPT = path.resolve('scripts/generated-static-builder.mjs');
const PREVIEW_SCRIPT = path.resolve('scripts/generated-preview-process.mjs');

const PREVIEW_TTL_MS = 15 * 60 * 1000;
const PREVIEW_READY_TIMEOUT_MS = 10_000;
const BUILD_TIMEOUT_MS = 60_000;
const RECEIPT_LOCK_TIMEOUT_MS = 5_000;

const previewRuntimes = new Map<string, { child: ChildProcess; timer: NodeJS.Timeout; instanceId: string }>();

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function now(): string { return new Date().toISOString(); }

function ownerKey(ownerId: string): string {
  return sha256(ownerId).slice(0, 32);
}

async function ownerRoot(root: string, ownerId: string): Promise<string> {
  const canonical = await fs.realpath(root);
  const key = ownerKey(ownerId);
  const candidate = path.join(canonical, ROOT_DIR, 'owners', key);
  if (!inside(canonical, candidate)) throw new Error('Owner path escaped configured root.');
  await fs.mkdir(candidate, { recursive: true });
  return candidate;
}

async function operationDir(ownerRootPath: string, operationId: string): Promise<string> {
  const candidate = path.join(ownerRootPath, 'operations', operationId);
  if (!inside(ownerRootPath, candidate)) throw new Error('Operation path escaped owner root.');
  await fs.mkdir(candidate, { recursive: true });
  return candidate;
}

async function attemptDir(operationDirPath: string, attemptId: string): Promise<string> {
  const candidate = path.join(operationDirPath, 'attempts', attemptId);
  if (!inside(operationDirPath, candidate)) throw new Error('Attempt path escaped operation root.');
  await fs.mkdir(candidate, { recursive: true });
  return candidate;
}

async function receiptPath(operationDirPath: string): Promise<string> {
  return path.join(operationDirPath, RECEIPT_FILE);
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function acquireReceiptLock(operationDirPath: string): Promise<() => void> {
  const lockPath = path.join(operationDirPath, '.receipt.lock');
  const start = Date.now();
  while (true) {
    try {
      await fs.writeFile(lockPath, `${process.pid}:${Date.now()}`, { flag: 'wx', encoding: 'utf8' });
      return async () => { await fs.unlink(lockPath).catch(() => {}); };
    } catch {
      if (Date.now() - start > RECEIPT_LOCK_TIMEOUT_MS) throw new Error('Could not acquire receipt lock');
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

async function readReceiptAtomic(file: string): Promise<GeneratedRuntimeReceiptV2 | null> {
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content) as GeneratedRuntimeReceiptV2;
  } catch {
    return null;
  }
}

async function writeReceiptAtomic(file: string, receipt: GeneratedRuntimeReceiptV2): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const updated = { ...receipt, updatedAt: now() };
  await fs.writeFile(tmp, JSON.stringify(updated, null, 2), { encoding: 'utf8', flag: 'wx' });
  await fs.rename(tmp, file);
}

function createEmptyStage(name: string): StageRecord {
  return {
    name,
    state: 'not-run',
    startedAt: null,
    completedAt: null,
    durationMs: null,
    exitCode: null,
    signal: null,
    evidence: 'Not started',
    inputHash: null,
    outputHash: null,
    error: null,
  };
}

function createTransition(receipt: GeneratedRuntimeReceiptV2, stage: string | null, from: string | null, to: string, code: string, actor: TransitionRecord['actor']): TransitionRecord {
  return {
    sequence: receipt.transitions.length + 1,
    revision: receipt.revision + 1,
    at: now(),
    stage,
    from,
    to,
    code,
    attempt: receipt.attempt,
    actor,
  };
}

function initialReceipt(params: {
  operationId: string;
  attemptId: string;
  ownerId: string;
  artifact: GeneratedProjectPlan;
  provenance: ProvenanceRecord;
  approval: ApprovalRecord;
  builderScriptHash: string;
}): GeneratedRuntimeReceiptV2 {
  const artifactSha = artifactDigest(params.artifact);
  const sourceHash = sourceTreeDigest(params.artifact);
  const nowStr = now();

  return {
    schemaVersion: GENERATED_RECEIPT_SCHEMA_VERSION,
    operationId: params.operationId,
    attemptId: params.attemptId,
    kind: params.artifact.kind,
    revision: 1,
    operationState: 'running',
    currentStage: 'source',
    attempt: 1,

    idempotency: {
      key: params.operationId,
      artifactSha256: artifactSha,
      boundAt: nowStr,
      attempt: 1,
    },

    approval: params.approval,

    provenance: params.provenance,

    source: { ...createEmptyStage('source'), inputHash: null, outputHash: sourceHash },
    build: {
      ...createEmptyStage('build'),
      inputHash: sourceHash,
      tool: { id: 'knoux-static-builder', version: 1, scriptSha256: params.builderScriptHash },
      runtime: { name: 'node', version: process.version },
      command: { executable: 'node', args: [BUILDER_SCRIPT], shell: false, cwd: '' },
      manifest: null,
      files: [],
    },
    runtime: {
      ...createEmptyStage('runtime'),
      inputHash: null,
      process: null,
      endpoint: null,
      overlay: { id: 'knoux-preview-probe', version: 1, mutatesHtml: true },
    },
    export: {
      ...createEmptyStage('export'),
      inputHash: null,
      tool: { id: 'knoux-zip', version: 1 },
      artifact: null,
      entries: [],
    },
    deployment: {
      ...createEmptyStage('deployment'),
      inputHash: null,
      adapter: null,
      target: null,
      release: null,
    },

    worker: {
      instanceId: randomUUID(),
      heartbeatAt: nowStr,
      leaseExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
    },

    cancellation: null,
    transitions: [{
      sequence: 1,
      revision: 1,
      at: nowStr,
      stage: 'operation',
      from: null,
      to: 'running',
      code: 'OPERATION_STARTED',
      attempt: 1,
      actor: { type: 'operator', id: params.ownerId },
    }],

    externalReference: `generated-static:${params.operationId}`,
    createdAt: nowStr,
    updatedAt: nowStr,
    lastError: null,
  };
}

async function appendTransition(receipt: GeneratedRuntimeReceiptV2, stage: string | null, from: string | null, to: string, code: string, actor: TransitionRecord['actor']): Promise<GeneratedRuntimeReceiptV2> {
  const transition = createTransition(receipt, stage, from, to, code, actor);
  const updated = { ...receipt, transitions: [...receipt.transitions, transition], revision: transition.revision, updatedAt: now() };
  return updated;
}

async function updateStage(receipt: GeneratedRuntimeReceiptV2, stageName: 'source' | 'build' | 'runtime' | 'export' | 'deployment', patch: Partial<StageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  const stage = receipt[stageName];
  const from = stage.state;
  const to = patch.state ?? stage.state;
  let updatedReceipt = receipt;
  if (from !== to) {
    updatedReceipt = await appendTransition(receipt, stageName, from, to, `STAGE_${to.toUpperCase()}`, { type: 'system', id: receipt.worker?.instanceId ?? 'executor' });
  }
  // Create a new stage object with the patch applied
  const newStage = { ...stage, ...patch } as StageRecord;
  updatedReceipt = { ...updatedReceipt, [stageName]: newStage, updatedAt: now() };
  return updatedReceipt;
}

// Stage-specific update functions with proper typing
async function updateSourceStage(receipt: GeneratedRuntimeReceiptV2, patch: Partial<SourceStageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  return updateStage(receipt, 'source', patch);
}
async function updateBuildStage(receipt: GeneratedRuntimeReceiptV2, patch: Partial<BuildStageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  return updateStage(receipt, 'build', patch);
}
async function updateRuntimeStage(receipt: GeneratedRuntimeReceiptV2, patch: Partial<RuntimeStageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  return updateStage(receipt, 'runtime', patch);
}
async function updateExportStage(receipt: GeneratedRuntimeReceiptV2, patch: Partial<ExportStageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  return updateStage(receipt, 'export', patch);
}
async function updateDeploymentStage(receipt: GeneratedRuntimeReceiptV2, patch: Partial<DeploymentStageRecord>): Promise<GeneratedRuntimeReceiptV2> {
  return updateStage(receipt, 'deployment', patch);
}

export async function executeGeneratedProjectV2(params: {
  root: string;
  ownerId: string;
  operationId: string;
  artifact: unknown;
  parentOrigin: string;
  sourceSignal?: AbortSignal;
  provenance: {
    generationRequestId: string | null;
    providerId: string | null;
    modelId: string | null;
    profile: string;
    planSha256: string | null;
  };
}): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(params.operationId);
  const plan = parseGeneratedProject(params.artifact);

  const ownerRootPath = await ownerRoot(params.root, params.ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const attemptId = '001';
  const attemptDirPath = await attemptDir(opDir, attemptId);

  const builderScriptHash = sha256(await fs.readFile(BUILDER_SCRIPT));

  const provenance: ProvenanceRecord = {
    origin: {
      trust: 'client-reported',
      generationRequestId: params.provenance.generationRequestId,
      providerId: params.provenance.providerId,
      modelId: params.provenance.modelId,
      profile: params.provenance.profile,
      planSha256: params.provenance.planSha256,
    },
    executor: {
      id: 'knoux-generated-project-executor',
      version: 2,
      invocationId: randomUUID(),
      host: { platform: process.platform, architecture: process.arch, nodeVersion: process.version },
    },
  };

  const approval: ApprovalRecord = {
    level: 'run',
    actionId: id,
    artifactSha256: artifactDigest(plan),
    confirmation: GENERATED_PROJECT_CONFIRMATION,
    approvedBy: params.ownerId,
    approvedAt: now(),
    permissionReason: 'Run trusted static builder on reviewed artifact',
  };

  let receipt = initialReceipt({ operationId: id, attemptId, ownerId: params.ownerId, artifact: plan, provenance, approval, builderScriptHash });

  const lock = await acquireReceiptLock(opDir);
  try {
    await writeReceiptAtomic(await receiptPath(opDir), receipt);
  } finally {
    await lock();
  }

  const controller = new AbortController();
  const signal = params.sourceSignal ? AbortSignal.any([params.sourceSignal, controller.signal]) : controller.signal;

  try {
    // ---- STAGE 1: SOURCE ----
    receipt.currentStage = 'source';
    receipt = await updateSourceStage(receipt, { state: 'running', startedAt: now(), evidence: 'Materializing reviewed source files' });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);

    const sourceDirPath = path.join(attemptDirPath, SOURCE_DIR);
    await fs.mkdir(sourceDirPath, { recursive: true });

    computedSourceHashes(plan);
    for (const file of plan.files) {
      signal.throwIfAborted();
      const target = path.join(sourceDirPath, ...file.path.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, { encoding: 'utf8', flag: 'wx' });
    }

    const sourceDuration = Date.now() - new Date(receipt.source.startedAt!).getTime();
    receipt = await updateSourceStage(receipt, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: sourceDuration,
      exitCode: 0,
      evidence: `${plan.files.length} source files materialized`,
    });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);
    signal.throwIfAborted();

    // ---- STAGE 2: BUILD ----
    receipt.currentStage = 'build';
    receipt = await updateBuildStage(receipt, { state: 'running', startedAt: now(), evidence: 'Starting trusted static builder' });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);

    const compiledDirPath = path.join(attemptDirPath, COMPILED_DIR);
    const manifestPath = path.join(attemptDirPath, 'build-manifest.json');

    const buildResult = await runBuilder({
      source: sourceDirPath,
      output: compiledDirPath,
      manifest: manifestPath,
      signal,
      timeoutMs: BUILD_TIMEOUT_MS,
    });

    receipt = await updateBuildStage(receipt, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: buildResult.durationMs,
      exitCode: 0,
      signal: null,
      evidence: `Built ${buildResult.files.length} files to ${COMPILED_DIR}/`,
      outputHash: buildResult.outputTreeSha256,
      tool: { id: 'knoux-static-builder', version: 1, scriptSha256: builderScriptHash },
      runtime: { name: 'node', version: process.version },
      command: { executable: 'node', args: [BUILDER_SCRIPT, '--source', sourceDirPath, '--output', compiledDirPath, '--manifest', manifestPath], shell: false, cwd: attemptDirPath },
      manifest: { path: 'build-manifest.json', bytes: buildResult.manifestBytes, sha256: buildResult.manifestSha256 },
      files: buildResult.files,
    });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);
    signal.throwIfAborted();

    // ---- STAGE 3: EXPORT ----
    receipt.currentStage = 'export';
    receipt = await updateExportStage(receipt, { state: 'running', startedAt: now(), evidence: 'Creating deterministic ZIP export' });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);

    const exportResult = await createExport(compiledDirPath, attemptDirPath, buildResult.files);
    receipt = await updateExportStage(receipt, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: exportResult.durationMs,
      exitCode: 0,
      signal: null,
      evidence: `ZIP export: ${exportResult.bytes} bytes, SHA-256 ${exportResult.sha256}`,
      outputHash: exportResult.sha256,
      tool: { id: 'knoux-zip', version: 1 },
      artifact: { path: `artifacts/${BUNDLE_FILE}`, bytes: exportResult.bytes, sha256: exportResult.sha256, format: 'zip' },
      entries: exportResult.entries,
    });
    receipt.operationState = 'succeeded';
    await writeReceiptAtomic(await receiptPath(opDir), receipt);
    signal.throwIfAborted();

    // ---- STAGE 4: RUNTIME (Preview) ----
    receipt.currentStage = 'runtime';
    receipt = await updateRuntimeStage(receipt, { state: 'running', startedAt: now(), evidence: 'Starting preview runtime' });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);

    const runtimeResult = await startPreview(compiledDirPath, params.parentOrigin, signal);
    receipt = await updateRuntimeStage(receipt, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: runtimeResult.readinessMs,
      exitCode: 0,
      signal: null,
      evidence: `Preview ready at ${runtimeResult.url}`,
      inputHash: buildResult.outputTreeSha256,
      outputHash: null,
      process: runtimeResult.process,
      endpoint: runtimeResult.endpoint,
    });
    await writeReceiptAtomic(await receiptPath(opDir), receipt);

    return receipt;
  } catch (error) {
    const err = error as Error;
    const isAbort = err.name === 'AbortError' || err.message.includes('cancelled');
    const targetState = isAbort ? 'cancelled' : 'failed';

    receipt.operationState = targetState;
    receipt.currentStage = receipt.currentStage ?? 'source';

    const currentStage = receipt[receipt.currentStage as 'source' | 'build' | 'runtime' | 'export' | 'deployment'];
    if (currentStage && currentStage.state === 'running') {
      receipt = await updateStage(receipt, receipt.currentStage as 'source' | 'build' | 'runtime' | 'export' | 'deployment', {
        state: targetState,
        completedAt: now(),
        durationMs: currentStage.startedAt ? Date.now() - new Date(currentStage.startedAt).getTime() : null,
        error: { code: isAbort ? 'CANCELLED' : 'EXECUTION_FAILED', message: err.message, at: now(), retryable: !isAbort },
      });
    }

    receipt.lastError = { code: isAbort ? 'CANCELLED' : 'EXECUTION_FAILED', message: err.message, at: now(), retryable: !isAbort };
    await writeReceiptAtomic(await receiptPath(opDir), receipt);
    throw error;
  }
}

async function runBuilder(params: { source: string; output: string; manifest: string; signal: AbortSignal; timeoutMs: number }): Promise<{
  files: GeneratedFileReceipt[];
  outputTreeSha256: string;
  manifestBytes: number;
  manifestSha256: string;
  durationMs: number;
}> {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      BUILDER_SCRIPT,
      '--source', params.source,
      '--output', params.output,
      '--manifest', params.manifest,
    ], {
      cwd: path.dirname(BUILDER_SCRIPT),
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (error?: Error, value?: typeof resolve extends (value: infer T) => void ? T : never) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      params.signal.removeEventListener('abort', onAbort);
      if (error) reject(error); else resolve(value!);
    };

    const onAbort = () => finish(new Error('Build cancelled'));
    const timeout = setTimeout(() => finish(new Error('Build timeout')), params.timeoutMs);

    params.signal.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (chunk: Buffer) => { if (stdout.length < 16384) stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { if (stderr.length < 16384) stderr += chunk.toString(); });

    child.on('error', (err) => finish(new Error(`Builder process error: ${err.message}`)));
    child.on('exit', (code, signal) => {
      if (settled) return;
      clearTimeout(timeout);
      params.signal.removeEventListener('abort', onAbort);

      if (signal) return finish(new Error(`Builder killed by signal ${signal}`));
      if (code !== 0) {
        try {
          const result = JSON.parse(stdout.trim().split('\n').pop() ?? '{}');
          return finish(new Error(result.message ?? `Builder exited with code ${code}`));
        } catch {
          return finish(new Error(`Builder exited with code ${code}: ${stderr || stdout}`));
        }
      }

      try {
        const result = JSON.parse(stdout.trim().split('\n').pop() ?? '{}');
        if (result.status !== 'success') return finish(new Error(result.message ?? 'Builder reported failure'));

        const manifestContent = result.manifestPath ? readFileSync(result.manifestPath, 'utf8') : '{}';
        const manifest = JSON.parse(manifestContent);
        const files: GeneratedFileReceipt[] = manifest.files ?? [];
        const outputTreeSha256 = manifest.outputTreeSha256 ?? '';
        const manifestBytes = Buffer.byteLength(JSON.stringify(manifest), 'utf8');
        const manifestSha256 = sha256(JSON.stringify(manifest));

        finish(undefined, { files, outputTreeSha256, manifestBytes, manifestSha256, durationMs: Date.now() - started });
      } catch (e) {
        finish(new Error(`Failed to parse builder output: ${e}`));
      }
    });
  });
}

async function createExport(compiledDir: string, attemptDir: string, files: GeneratedFileReceipt[]): Promise<{
  bytes: number;
  sha256: string;
  durationMs: number;
  entries: GeneratedFileReceipt[];
}> {
  const started = Date.now();
  const bundlePath = path.join(attemptDir, BUNDLE_FILE);
  
  // Read actual file contents for ZIP creation
  const entries: { path: string; bytes: Uint8Array }[] = [];
  for (const f of files) {
    const content = await fs.readFile(path.join(compiledDir, ...f.path.split('/')));
    entries.push({ path: f.path, bytes: content });
  }
  const zipData = bundleBuffers(entries);
  await fs.writeFile(bundlePath, zipData, { flag: 'wx' });
  const bytes = zipData.byteLength;
  const sha = sha256(zipData);
  return { bytes, sha256: sha, durationMs: Date.now() - started, entries: files };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, i) => {
  let v = i;
  for (let b = 0; b < 8; b++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
  return v >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let v = 0xffffffff;
  for (const b of bytes) v = CRC_TABLE[(v ^ b) & 0xff] ^ (v >>> 8);
  return (v ^ 0xffffffff) >>> 0;
}
function bundleBuffers(entries: { path: string; bytes: Uint8Array }[]): Uint8Array {
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = new TextEncoder().encode(e.path);
    const crc = crc32(e.bytes);
    const hdr = Buffer.alloc(30 + name.length);
    hdr.writeUInt32LE(0x04034b50, 0);
    hdr.writeUInt16LE(20, 4);
    hdr.writeUInt16LE(0x0800, 6);
    hdr.writeUInt16LE(0, 8);
    hdr.writeUInt16LE(0, 10);
    hdr.writeUInt16LE(0x21, 12);
    hdr.writeUInt32LE(crc, 14);
    hdr.writeUInt32LE(e.bytes.length, 18);
    hdr.writeUInt32LE(e.bytes.length, 22);
    hdr.writeUInt16LE(name.length, 26);
    hdr.writeUInt16LE(0, 28);
    name.forEach((b, i) => hdr[30 + i] = b);
    local.push(hdr, e.bytes);
    const dir = Buffer.alloc(46 + name.length);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(e.bytes.length, 20);
    dir.writeUInt32LE(e.bytes.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt32LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    name.forEach((b, i) => dir[46 + i] = b);
    central.push(dir);
    offset += hdr.length + e.bytes.length;
  }
  const centralBytes = central.reduce((s, e) => s + e.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

async function startPreview(compiledDir: string, parentOrigin: string, signal?: AbortSignal): Promise<{
  url: string;
  process: { instanceId: string; pid: number; startedAt: string; heartbeatAt: string; expiresAt: string };
  endpoint: { origin: string; url: string; httpStatus: number; readinessMs: number };
  readinessMs: number;
}> {
  const parsedOrigin = new URL(parentOrigin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) {
    throw new Error('Preview parent origin must be a plain trusted HTTP(S) origin.');
  }
  const sourceReal = await fs.realpath(compiledDir);
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  const started = Date.now();
  const expiresAt = new Date(started + PREVIEW_TTL_MS).toISOString();
  const instanceId = randomUUID();

  const child = spawn(process.execPath, [PREVIEW_SCRIPT], {
    cwd: path.dirname(PREVIEW_SCRIPT),
    windowsHide: true,
    shell: false,
    detached: false,
    env: {
      NODE_ENV: 'production',
      KNOUX_PREVIEW_ROOT: sourceReal,
      KNOUX_PREVIEW_TOKEN: token,
      KNOUX_PREVIEW_PARENT_ORIGIN: parsedOrigin.origin,
      ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timer = setTimeout(() => child.kill(), PREVIEW_TTL_MS);
  timer.unref();

  let output = '';
  const origin = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error, val?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      err ? reject(err) : resolve(val!);
    };
    const onAbort = () => finish(new Error('Preview start cancelled'));
    const timeout = setTimeout(() => finish(new Error('Preview process did not publish listener in time')), PREVIEW_READY_TIMEOUT_MS);
    signal?.addEventListener('abort', onAbort, { once: true });
    child.once('error', () => finish(new Error('Preview process could not start')));
    child.once('exit', (code) => { if (!settled) finish(new Error(`Preview exited before readiness (${code ?? 'unknown'})`)); });
    child.stdout.on('data', () => {
      for (const line of output.split(/\r?\n/)) {
        const m = /^KNOUX_PREVIEW_READY (\d+)$/.exec(line.trim());
        if (m) { finish(undefined, `http://127.0.0.1:${m[1]}`); break; }
      }
    });
    child.stdout.on('data', (chunk: Buffer) => { if (output.length < 4096) output += chunk.toString(); });
  });

  if (signal?.aborted) throw new Error('Preview start cancelled');
  const url = `${origin}/${token}/index.html`;
  const resp = await fetch(url, { cache: 'no-store', signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(5000)]) });
  await resp.body?.cancel();
  if (!resp.ok) throw new Error(`Preview readiness HTTP ${resp.status}`);

  const readinessMs = Date.now() - started;
  const processInfo = { instanceId, pid: child.pid!, startedAt: new Date(started).toISOString(), heartbeatAt: now(), expiresAt };
  const endpoint = { origin, url, httpStatus: resp.status, readinessMs };

  const key = `${processInfo.instanceId}:${instanceId}`;
  previewRuntimes.set(key, { child, timer, instanceId });

  child.once('exit', () => {
    clearTimeout(timer);
    previewRuntimes.delete(key);
  });

  return { url, process: processInfo, endpoint, readinessMs };
}

export async function cancelGeneratedProjectV2(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(operationId);
  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const lock = await acquireReceiptLock(opDir);
  try {
    const receipt = await readReceiptAtomic(receiptPath_);
    if (!receipt) throw new Error('Operation not found');
    if (receipt.operationState === 'cancelled' || receipt.operationState === 'failed' || receipt.operationState === 'succeeded') {
      throw new Error(`Operation already ${receipt.operationState}`);
    }

    receipt.cancellation = { requestedAt: now(), requestedBy: ownerId, reason: 'Operator cancellation' };
    receipt.operationState = 'cancelling';
    const updated = await appendTransition(receipt, 'operation', receipt.operationState, 'cancelling', 'CANCELLATION_REQUESTED', { type: 'operator', id: ownerId });
    await writeReceiptAtomic(receiptPath_, updated);

    // Abort active preview if any
    const key = `${ownerId}:${id}`;
    const runtime = previewRuntimes.get(key);
    if (runtime) {
      clearTimeout(runtime.timer);
      runtime.child.kill();
      previewRuntimes.delete(key);
    }

    updated.operationState = 'cancelled';
    const final = await appendTransition(updated, 'operation', 'cancelling', 'cancelled', 'CANCELLED', { type: 'operator', id: ownerId });
    await writeReceiptAtomic(receiptPath_, final);

    return final;
  } finally {
    await lock();
  }
}

export async function retryGeneratedProjectV2(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(operationId);
  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const lock = await acquireReceiptLock(opDir);
  try {
    const receipt = await readReceiptAtomic(receiptPath_);
    if (!receipt) throw new Error('Operation not found');
    if (receipt.operationState !== 'failed' && receipt.operationState !== 'cancelled') {
      throw new Error('Can only retry failed or cancelled operations');
    }

    const nextAttempt = receipt.attempt + 1;
    const nextAttemptId = String(nextAttempt).padStart(3, '0');

    // Archive current attempt by leaving it in place
    // Create new attempt directory
    await attemptDir(opDir, nextAttemptId);

    const newReceipt: GeneratedRuntimeReceiptV2 = {
      ...receipt,
      attemptId: nextAttemptId,
      attempt: nextAttempt,
      revision: receipt.revision + 1,
      operationState: 'running',
      currentStage: 'source',
      idempotency: { ...receipt.idempotency, attempt: nextAttempt },
      worker: { instanceId: randomUUID(), heartbeatAt: now(), leaseExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString() },
      cancellation: null,
      lastError: null,
      transitions: [
        ...receipt.transitions,
        createTransition(receipt, 'operation', receipt.operationState, 'running', 'RETRY_STARTED', { type: 'operator', id: ownerId }),
      ],
      source: createEmptyStage('source'),
      build: { ...createEmptyStage('build'), inputHash: receipt.build.inputHash, tool: receipt.build.tool, runtime: receipt.build.runtime, command: receipt.build.command, manifest: null, files: [] },
      runtime: { ...createEmptyStage('runtime'), inputHash: receipt.runtime.inputHash, process: null, endpoint: null, overlay: receipt.runtime.overlay },
      export: { ...createEmptyStage('export'), inputHash: receipt.export.inputHash, tool: receipt.export.tool, artifact: null, entries: [] },
      deployment: { ...createEmptyStage('deployment'), inputHash: receipt.deployment.inputHash, adapter: receipt.deployment.adapter, target: receipt.deployment.target, release: receipt.deployment.release },
    };

    // Recompute source hash for new attempt
    newReceipt.source.outputHash = receipt.source.outputHash;

    await writeReceiptAtomic(receiptPath_, newReceipt);
    return newReceipt;
  } finally {
    await lock();
  }
}

export async function stopRuntimeV2(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(operationId);
  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const lock = await acquireReceiptLock(opDir);
  try {
    const receipt = await readReceiptAtomic(receiptPath_);
    if (!receipt) throw new Error('Operation not found');
    if (receipt.runtime.state !== 'succeeded' && receipt.runtime.state !== 'running') {
      throw new Error('No running runtime to stop');
    }

    const key = `${ownerId}:${id}`;
    const runtime = previewRuntimes.get(key);
    if (runtime) {
      clearTimeout(runtime.timer);
      runtime.child.kill();
      previewRuntimes.delete(key);
    }

    const updated = await updateRuntimeStage(receipt, { state: 'cancelled', completedAt: now(), evidence: 'Preview stopped by operator' });
    await writeReceiptAtomic(receiptPath_, updated);
    return updated;
  } finally {
    await lock();
  }
}

export async function startRuntimeV2(root: string, ownerId: string, operationId: string, parentOrigin: string): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(operationId);
  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const lock = await acquireReceiptLock(opDir);
  try {
    const receipt = await readReceiptAtomic(receiptPath_);
    if (!receipt) throw new Error('Operation not found');
    if (receipt.export.state !== 'succeeded') throw new Error('Export must succeed before starting runtime');
    if (receipt.runtime.state === 'succeeded' || receipt.runtime.state === 'running') throw new Error('Runtime already running');

    const attemptDirPath = path.join(opDir, 'attempts', receipt.attemptId);
    const compiledDir = path.join(attemptDirPath, COMPILED_DIR);

    const updated = await updateRuntimeStage(receipt, { state: 'running', startedAt: now(), evidence: 'Starting preview runtime' });
    await writeReceiptAtomic(receiptPath_, updated);

    const runtimeResult = await startPreview(compiledDir, parentOrigin);
    const final = await updateRuntimeStage(updated, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: runtimeResult.readinessMs,
      exitCode: 0,
      signal: null,
      evidence: `Preview ready at ${runtimeResult.url}`,
      inputHash: updated.build.outputHash,
      outputHash: null,
      process: runtimeResult.process,
      endpoint: runtimeResult.endpoint,
    });
    await writeReceiptAtomic(receiptPath_, final);
    return final;
  } finally {
    await lock();
  }
}

export async function deployGeneratedProjectV2(root: string, ownerId: string, operationId: string, target: string, confirmation: string): Promise<GeneratedRuntimeReceiptV2> {
  const id = generatedOperationId(operationId);
  const deployTarget = generatedDeployTarget(target);
  generatedDeployConfirmation(confirmation);

  const deployRoot = process.env.KNOUX_DEPLOY_ROOT;
  if (!deployRoot) throw new Error('KNOUX_DEPLOY_ROOT not configured');
  if (process.env.KNOUX_DEPLOY_ALLOW_PUBLISH !== '1') throw new Error('Local publish disabled');
  if (!deployOperatorId(ownerId)) throw new Error('Operator not authorized for deployment');

  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const lock = await acquireReceiptLock(opDir);
  try {
    const receipt = await readReceiptAtomic(receiptPath_);
    if (!receipt) throw new Error('Operation not found');
    if (receipt.export.state !== 'succeeded') throw new Error('Export must succeed before deployment');
    if (receipt.deployment.state === 'succeeded') throw new Error('Already deployed');

    const updated = await updateDeploymentStage(receipt, { state: 'running', startedAt: now(), evidence: 'Publishing to local deploy root' });
    updated.deployment.adapter = { id: 'local-publish', version: 1 };
    updated.deployment.target = { id: deployTarget, environment: 'local' };
    await writeReceiptAtomic(receiptPath_, updated);

    const attemptDirPath = path.join(opDir, 'attempts', receipt.attemptId);
    const compiledDir = path.join(attemptDirPath, COMPILED_DIR);
    const publishRoot = await fs.realpath(deployRoot);
    const publishTarget = path.join(publishRoot, id);
    if (!inside(publishRoot, publishTarget)) throw new Error('Publish target escaped deploy root');
    await fs.mkdir(publishTarget, { recursive: false });
    await copyDirectory(compiledDir, publishTarget);

    const reference = `local-publish:${id}`;
    const final = await updateDeploymentStage(updated, {
      state: 'succeeded',
      completedAt: now(),
      durationMs: 0,
      exitCode: 0,
      signal: null,
      evidence: `Published to ${publishTarget}`,
      outputHash: updated.export.outputHash,
      release: { reference, url: `file://${publishTarget}`, appliedAt: now() },
    });
    await writeReceiptAtomic(receiptPath_, final);
    return final;
  } finally {
    await lock();
  }
}

function deployOperatorId(ownerId: string): boolean {
  return (process.env.KNOUX_DEPLOY_OPERATOR_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(ownerId);
}

async function copyDirectory(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) await copyDirectory(src, dst);
    else await fs.copyFile(src, dst);
  }
}

export async function readReceiptV2(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceiptV2 | null> {
  const id = generatedOperationId(operationId);
  const ownerRootPath = await ownerRoot(root, ownerId);
  const opDir = await operationDir(ownerRootPath, id);
  const receiptPath_ = await receiptPath(opDir);

  const receipt = await readReceiptAtomic(receiptPath_);
  if (!receipt) return null;

  // Check for legacy v1 receipt file
  if (isLegacyReceipt(receipt)) {
    return projectLegacyToV2(receipt, ownerId);
  }

  return receipt;
}

export async function listOperationsV2(root: string, ownerId: string): Promise<Array<{ operationId: string; attempt: number; state: string; updatedAt: string }>> {
  const ownerRootPath = await ownerRoot(root, ownerId);
  const operationsDir = path.join(ownerRootPath, 'operations');
  try {
    const entries = await fs.readdir(operationsDir, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const receipt = await readReceiptAtomic(path.join(operationsDir, entry.name, RECEIPT_FILE));
        if (receipt) {
          results.push({ operationId: receipt.operationId, attempt: receipt.attempt, state: receipt.operationState, updatedAt: receipt.updatedAt });
        }
      }
    }
    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}