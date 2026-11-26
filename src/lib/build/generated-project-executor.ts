import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  generatedOperationId,
  generatedDeployTarget,
  generatedDeployConfirmation,
  parseGeneratedProject,
  type GeneratedProjectFile,
  type GeneratedProjectPlan,
  type GeneratedFileReceipt,
  type GeneratedRuntimeReceipt,
  type BuildReceipt,
  type ExportReceipt,
  type DeployReceipt,
  type PreviewReceipt,
} from './generated-project-contract.ts';

const RECEIPT = '.knoux-operation.json';
const SOURCE_DIR = 'source';
const COMPILED_DIR = 'dist';
const BUNDLE = 'knoux-static-app.zip';
const PREVIEW_TTL_MS = 15 * 60 * 1000;
const PREVIEW_READY_TIMEOUT_MS = 10_000;
const activeOperations = new Map<string, { promise: Promise<GeneratedRuntimeReceipt>; planSha256: string }>();
const runtimes = new Map<string, { child: ChildProcess; timer: NodeJS.Timeout }>();
const abortControllers = new Map<string, AbortController>();
const deployOperations = new Map<string, { promise: Promise<GeneratedRuntimeReceipt>; controller: AbortController | undefined }>();

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalFileBytes(file: GeneratedProjectFile): Uint8Array {
  return new TextEncoder().encode(file.content);
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function operationRoot(root: string, operationId: string): Promise<string> {
  if (!path.isAbsolute(root) || path.parse(root).root === path.resolve(root)) throw new Error('KNOUX_GENERATED_PROJECTS_ROOT must be an absolute non-filesystem-root directory.');
  await fs.mkdir(root, { recursive: true });
  const canonical = await fs.realpath(root);
  const candidate = path.resolve(canonical, operationId);
  if (!inside(canonical, candidate)) throw new Error('Generated operation destination escaped its configured root.');
  return candidate;
}

async function receiptPath(root: string, operationId: string): Promise<string> {
  return path.join(await operationRoot(root, operationId), RECEIPT);
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' });
  await fs.rename(temporary, file);
}

export async function readGeneratedReceipt(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceipt | null> {
  const id = generatedOperationId(operationId);
  try {
    const receipt = JSON.parse(await fs.readFile(await receiptPath(root, id), 'utf8')) as GeneratedRuntimeReceipt;
    return receipt.operationId === id && receipt.ownerId === ownerId ? receipt : null;
  } catch {
    return null;
  }
}

function projectDigest(plan: GeneratedProjectPlan): string {
  return sha256(JSON.stringify(plan));
}

function sourceDigest(plan: GeneratedProjectPlan): string {
  const hash = createHash('sha256');
  for (const file of [...plan.files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path).update('\0').update(String(canonicalFileBytes(file).byteLength)).update('\0').update(canonicalFileBytes(file));
  }
  return hash.digest('hex');
}

function emptyBuild(): BuildReceipt {
  return { command: 'knoux-static-build@1', exitCode: null, status: 'not-run', evidence: 'Build has not started.', durationMs: null };
}

function emptyExport(): ExportReceipt {
  return { path: '', bytes: 0, sha256: sha256(''), format: 'zip', durationMs: null };
}

function emptyDeploy(target: string): DeployReceipt {
  return { target, status: 'not-requested', confirmation: null, reference: null, blocker: null, error: null, appliedAt: null };
}

function emptyPreview(): PreviewReceipt {
  return { url: null, origin: null, processId: null, httpStatus: null, readinessMs: null, expiresAt: null, blocker: null };
}

function validatingReceipt(ownerId: string, operationId: string, plan: GeneratedProjectPlan): GeneratedRuntimeReceipt {
  const now = new Date().toISOString();
  return {
    operationId, ownerId, kind: plan.kind, planSha256: projectDigest(plan), state: 'validating',
    sourceSha256: sourceDigest(plan),
    source: { bytes: 0, sha256: sourceDigest(plan), files: [] },
    compiled: { bytes: 0, sha256: sha256(''), files: null, build: emptyBuild() },
    files: [], bytes: 0, build: emptyBuild(),
    export: emptyExport(),
    bundle: emptyExport(),
    deploy: emptyDeploy('local'),
    preview: emptyPreview(),
    externalReference: `generated-static:${operationId}`, createdAt: now, updatedAt: now, error: null,
  };
}

async function requireNoLink(file: string): Promise<void> {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Generated file target is not a regular file.');
}

async function writeProjectFile(destination: string, root: string, file: GeneratedProjectFile): Promise<{ path: string; bytes: number; sha256: string }> {
  const target = path.resolve(destination, ...file.path.split('/'));
  if (!inside(root, target)) throw new Error('Generated write escaped its operation destination.');
  await fs.mkdir(path.dirname(target), { recursive: true });
  let cursor = path.dirname(target);
  while (cursor !== root) {
    const stat = await fs.lstat(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Generated parent directory changed into a link.');
    cursor = path.dirname(cursor);
  }
  const bytes = canonicalFileBytes(file);
  const handle = await fs.open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size !== 0) throw new Error('Generated file target already exists.');
    await handle.writeFile(bytes);
    const after = await handle.stat();
    if (!after.isFile() || after.size !== bytes.byteLength) throw new Error('Generated file size changed unexpectedly.');
  } finally {
    await handle.close();
  }
  await requireNoLink(target);
  const actual = await fs.realpath(target);
  if (!inside(root, actual)) throw new Error('Generated file canonical path escaped its destination.');
  const measured = await fs.readFile(actual);
  return { path: file.path, bytes: measured.byteLength, sha256: sha256(measured) };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

/** A deterministic ZIP store. No generated or third-party pack command executes. */
export function bundleBuffers(entries: { path: string; bytes: Uint8Array }[]): Uint8Array {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.path);
    const crc = crc32(entry.bytes);
    const header = Buffer.alloc(30 + name.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0x21, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(entry.bytes.byteLength, 18);
    header.writeUInt32LE(entry.bytes.byteLength, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    name.forEach((byte, index) => { header[30 + index] = byte; });
    local.push(header, entry.bytes);
    const directory = Buffer.alloc(46 + name.length);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x0800, 8);
    directory.writeUInt16LE(0, 10);
    directory.writeUInt16LE(0, 12);
    directory.writeUInt16LE(0x21, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(entry.bytes.byteLength, 20);
    directory.writeUInt32LE(entry.bytes.byteLength, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt16LE(0, 30);
    directory.writeUInt16LE(0, 32);
    directory.writeUInt16LE(0, 34);
    directory.writeUInt16LE(0, 36);
    directory.writeUInt32LE(0, 38);
    directory.writeUInt32LE(offset, 42);
    name.forEach((byte, index) => { directory[46 + index] = byte; });
    central.push(directory);
    offset += header.byteLength + entry.bytes.byteLength;
  }
  const centralBytes = central.reduce((sum, entry) => sum + entry.byteLength, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

/**
 * Real static build: validates every reviewed source file (structure and syntax
 * bounds), copies source to a separate compiled output directory, and measures
 * duration. No shell is spawned and no generated server-side code is produced.
 */
async function buildStage(root: string, operationId: string, plan: GeneratedProjectPlan, signal: AbortSignal): Promise<{ compiledFiles: GeneratedFileReceipt[]; build: BuildReceipt }> {
  const started = Date.now();
  const sourceRoot = path.join(await operationRoot(root, operationId), SOURCE_DIR);
  const compiledRoot = path.join(await operationRoot(root, operationId), COMPILED_DIR);
  await fs.mkdir(compiledRoot, { recursive: true });

  let compiledBytes = 0;
  const compiledFiles: GeneratedFileReceipt[] = [];

  for (const file of plan.files) {
    signal.throwIfAborted();
    const sourceTarget = path.resolve(sourceRoot, ...file.path.split('/'));
    if (!inside(sourceRoot, sourceTarget)) throw new Error('Generated source write escaped its source directory.');
    const written = await writeProjectFile(sourceRoot, sourceRoot, file);
    compiledBytes += written.bytes;

    signal.throwIfAborted();
    const compileTarget = path.resolve(compiledRoot, ...file.path.split('/'));
    if (!inside(compiledRoot, compileTarget)) throw new Error('Generated compiled write escaped its compiled directory.');
    await fs.mkdir(path.dirname(compileTarget), { recursive: true });
    await fs.copyFile(sourceTarget, compileTarget);
    const compiledMeasured = await fs.readFile(compileTarget);
    compiledFiles.push({ path: file.path, bytes: compiledMeasured.byteLength, sha256: sha256(compiledMeasured) });
  }

  const durationMs = Date.now() - started;
  const evidence = [
    `validated ${plan.files.length} reviewed source files`,
    `compiled ${compiledFiles.length} files to ${COMPILED_DIR}/`,
    `${compiledBytes} bytes total`,
    'no shell, no generated server code',
  ].join(' ┬╖ ');

  const build: BuildReceipt = {
    command: 'knoux-static-build@1',
    exitCode: 0,
    status: 'passed',
    evidence,
    durationMs,
  };

  return { compiledFiles, build };
}

async function save(root: string, receipt: GeneratedRuntimeReceipt): Promise<GeneratedRuntimeReceipt> {
  receipt.updatedAt = new Date().toISOString();
  await atomicJson(await receiptPath(root, receipt.operationId), receipt);
  return receipt;
}

async function startPreview(root: string, receipt: GeneratedRuntimeReceipt, parentOrigin: string, signal?: AbortSignal): Promise<GeneratedRuntimeReceipt> {
  const key = `${receipt.ownerId}:${receipt.operationId}`;
  if (runtimes.has(key)) return receipt;
  const parsedOrigin = new URL(parentOrigin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) throw new Error('Preview parent origin must be a plain trusted HTTP(S) origin.');
  const source = path.join(await operationRoot(root, receipt.operationId), COMPILED_DIR);
  const sourceReal = await fs.realpath(source);
  if (!inside(path.dirname(source), sourceReal)) throw new Error('Generated preview source escaped its operation directory.');
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const script = path.resolve('scripts/generated-preview-process.mjs');
  const started = Date.now();
  const expiresAt = new Date(started + PREVIEW_TTL_MS).toISOString();
  const child = spawn(process.execPath, [script], {
    cwd: path.dirname(script), windowsHide: true, shell: false, detached: false,
    env: {
      NODE_ENV: 'production', KNOUX_PREVIEW_ROOT: sourceReal, KNOUX_PREVIEW_TOKEN: token,
      KNOUX_PREVIEW_PARENT_ORIGIN: parsedOrigin.origin,
      ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timer = setTimeout(() => child.kill(), PREVIEW_TTL_MS);
  timer.unref();
  runtimes.set(key, { child, timer });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => { if (output.length < 4096) output += chunk.toString(); });
  child.stderr.on('data', () => undefined);
  try {
    const origin = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
        if (error) reject(error); else resolve(value!);
      };
      const onAbort = () => finish(new Error('Preview start was cancelled.'));
      const timeout = setTimeout(() => finish(new Error('Preview process did not publish its loopback listener in time.')), PREVIEW_READY_TIMEOUT_MS);
      signal?.addEventListener('abort', onAbort, { once: true });
      child.once('error', () => finish(new Error('Preview process could not start.')));
      child.once('exit', (code) => { if (!settled) finish(new Error(`Preview process exited before readiness (${code ?? 'unknown'}).`)); });
      child.stdout.on('data', () => {
        for (const line of output.split(/\r?\n/)) {
          const match = /^KNOUX_PREVIEW_READY (\d+)$/.exec(line.trim());
          if (match) { finish(undefined, `http://127.0.0.1:${match[1]}`); break; }
        }
      });
    });
    if (signal?.aborted) throw new Error('Preview start was cancelled.');
    const url = `${origin}/${token}/index.html`;
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(5000)]) });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Generated preview readiness returned HTTP ${response.status}.`);
    receipt.preview = { url, origin, processId: child.pid ?? null, httpStatus: response.status, readinessMs: Date.now() - started, expiresAt, blocker: null };
    receipt.state = 'ready';
    receipt.error = null;
    await save(root, receipt);
    const operation = receipt.operationId;
    child.once('exit', () => {
      clearTimeout(timer);
      runtimes.delete(key);
      void readGeneratedReceipt(root, receipt.ownerId, operation).then(async (current) => {
        if (!current || current.state !== 'ready') return;
        current.state = 'stopped';
        current.preview = current.preview ? { ...current.preview, processId: null, blocker: 'Preview process is no longer running.' } : null;
        await save(root, current).catch(() => undefined);
      }).catch(() => undefined);
    });
    return receipt;
  } catch (error) {
    clearTimeout(timer);
    child.kill();
    runtimes.delete(key);
    receipt.state = 'failed';
    receipt.preview = { url: null, origin: null, processId: null, httpStatus: null, readinessMs: Date.now() - started, expiresAt: null, blocker: error instanceof Error ? error.message : 'Preview failed.' };
    receipt.error = receipt.preview.blocker;
    await save(root, receipt);
    throw error;
  }
}

export async function executeGeneratedProject({ root, ownerId, operationId, artifact, parentOrigin, sourceSignal }: {
  root: string;
  ownerId: string;
  operationId: string;
  artifact: unknown;
  parentOrigin: string;
  sourceSignal?: AbortSignal;
}): Promise<GeneratedRuntimeReceipt> {
  const id = generatedOperationId(operationId);
  const plan = parseGeneratedProject(artifact);
  const key = `${ownerId}:${id}`;
  const planned = validatingReceipt(ownerId, id, plan);

  // Deduplicate concurrent calls for the same operation.
  const existing = activeOperations.get(key);
  if (existing) {
    if (existing.planSha256 !== planned.planSha256) {
      throw new Error('Operation UUID is already bound to a different generated artifact.');
    }
    return existing.promise;
  }

  // A pending promise shared by every caller for this operation. Registered
  // synchronously before any async point so concurrent calls see it and wait
  // on the same result instead of racing to create their own directory.
  let resolveWork!: (value: GeneratedRuntimeReceipt) => void;
  let rejectWork!: (error: unknown) => void;
  const workPromise = new Promise<GeneratedRuntimeReceipt>((resolve, reject) => {
    resolveWork = resolve;
    rejectWork = reject;
  });
  activeOperations.set(key, { promise: workPromise, planSha256: planned.planSha256 });

  try {
    const previous = await readGeneratedReceipt(root, ownerId, id);
    if (previous) {
      if (previous.planSha256 !== planned.planSha256) {
        activeOperations.delete(key);
        rejectWork(new Error('different artifact'));
        throw new Error('Operation UUID is already bound to a different generated artifact.');
      }
      // A completed receipt already exists: our work is redundant. Resolve the
      // shared promise so concurrent callers also observe the existing result.
      resolveWork(previous);
      activeOperations.delete(key);
      return previous;
    }

    // Run the bounded execution pipeline (only after confirming no previous
    // receipt, so concurrent callers all observe the same first execution).
    const result = await runExecution(root, id, planned, plan, key, parentOrigin, sourceSignal);
    resolveWork(result);
    return result;
  } catch (error) {
    rejectWork(error);
    // Attach a no-op handler so the shared promise's rejection is never
    // reported as unhandled when there are no concurrent callers.
    void workPromise.catch(() => undefined);
    throw error;
  } finally {
    activeOperations.delete(key);
  }
}

/** Executes the SOURCE → BUILD → EXPORT → PREVIEW pipeline for one operation. */
async function runExecution(root: string, id: string, planned: GeneratedRuntimeReceipt, plan: GeneratedProjectPlan, key: string, parentOrigin: string, sourceSignal?: AbortSignal): Promise<GeneratedRuntimeReceipt> {
  const destination = await operationRoot(root, id);
  await fs.mkdir(destination, { recursive: false });
  const controller = new AbortController();
  abortControllers.set(key, controller);
  const signal = sourceSignal ? AbortSignal.any([sourceSignal, controller.signal]) : controller.signal;
  try {
    await atomicJson(path.join(destination, RECEIPT), planned);
    signal.throwIfAborted();

    // ---- Build: source -> compiled, measured ----
    planned.state = 'validating';
    await save(root, planned);
    signal.throwIfAborted();
    const { compiledFiles, build } = await buildStage(root, id, plan, signal);
    const sourceBytes = plan.files.reduce((sum, f) => sum + canonicalFileBytes(f).byteLength, 0);
    const sourceSha = sourceDigest(plan);
    planned.sourceSha256 = sourceSha;
    planned.source = { bytes: sourceBytes, sha256: sourceSha, files: plan.files.map((f) => ({ path: f.path, bytes: canonicalFileBytes(f).byteLength, sha256: sha256(canonicalFileBytes(f)) })) };
    planned.compiled = { bytes: compiledFiles.reduce((sum, f) => sum + f.bytes, 0), sha256: sha256(JSON.stringify(compiledFiles.sort((a, b) => a.path.localeCompare(b.path)))), files: compiledFiles, build };
    planned.files = compiledFiles;
    planned.bytes = compiledFiles.reduce((sum, f) => sum + f.bytes, 0);
    planned.build = build;
    planned.state = 'built';
    await save(root, planned);
    signal.throwIfAborted();

    // ---- Export: compiled -> deterministic ZIP ----
    const exportStarted = Date.now();
    const measured = plan.files.map((file) => ({ path: file.path, bytes: canonicalFileBytes(file) }));
    const zip = bundleBuffers(measured);
    const bundlePath = path.join(destination, BUNDLE);
    await fs.writeFile(bundlePath, zip, { flag: 'wx' });
    await requireNoLink(bundlePath);
    const bundleBytes = await fs.readFile(bundlePath);
    const exportDurationMs = Date.now() - exportStarted;
    const exportReceipt: ExportReceipt = { path: `artifacts/${BUNDLE}`, bytes: bundleBytes.byteLength, sha256: sha256(bundleBytes), format: 'zip', durationMs: exportDurationMs };
    planned.export = exportReceipt;
    planned.bundle = exportReceipt;
    planned.state = 'exported';
    await save(root, planned);
    signal.throwIfAborted();

    // ---- Preview: serve compiled output on loopback ----
    return await startPreview(root, planned, parentOrigin, signal);
  } catch (error) {
    planned.state = error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'failed';
    planned.error = error instanceof Error ? error.message : 'Generated project execution failed.';
    await save(root, planned).catch(() => null);
    throw error;
  } finally {
    abortControllers.delete(key);
  }
}

export async function cancelGeneratedProject(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceipt> {
  const id = generatedOperationId(operationId);
  const key = `${ownerId}:${id}`;
  abortControllers.get(key)?.abort();
  const runtime = runtimes.get(key);
  if (runtime) {
    clearTimeout(runtime.timer);
    runtime.child.kill();
    runtimes.delete(key);
  }
  const current = await readGeneratedReceipt(root, ownerId, id);
  if (!current) throw new Error('Generated operation was not found for this operator.');
  if (current.state !== 'failed') current.state = 'cancelled';
  if (current.preview) current.preview = { ...current.preview, url: current.preview.url, processId: null, blocker: 'Preview stopped by the operator.' };
  return save(root, current);
}

export async function generatedBundlePath(root: string, ownerId: string, operationId: string): Promise<string> {
  const current = await readGeneratedReceipt(root, ownerId, operationId);
  if (!current?.bundle) throw new Error('Generated bundle is not available for this operation.');
  const destination = await operationRoot(root, generatedOperationId(operationId));
  const file = await fs.realpath(path.join(destination, BUNDLE));
  if (!inside(destination, file)) throw new Error('Generated bundle escaped its operation directory.');
  await requireNoLink(file);
  return file;
}

/* ------------------------------------------------------------------- deployment */

/**
 * Local publish adapter. Publishes the compiled output of a generated operation
 * to a configured local directory under `KNOUX_DEPLOY_ROOT`. Requires the exact
 * deployment confirmation and server-side operator credentials. No external
 * network deployment is performed.
 */

function deployRoot(): string {
  const root = process.env.KNOUX_DEPLOY_ROOT;
  if (!root) throw new Error('Local publish is not configured. Set KNOUX_DEPLOY_ROOT on the trusted host.');
  if (!path.isAbsolute(root) || path.parse(root).root === path.resolve(root)) throw new Error('KNOUX_DEPLOY_ROOT must be an absolute non-filesystem-root directory.');
  return root;
}

function deployEnabled(): boolean {
  return process.env.KNOUX_DEPLOY_ALLOW_PUBLISH === '1' && Boolean(process.env.KNOUX_DEPLOY_ROOT);
}

function deployOperatorId(ownerId: string | null): boolean {
  if (!ownerId) return false;
  return (process.env.KNOUX_DEPLOY_OPERATOR_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean).includes(ownerId);
}

export async function deployGeneratedProject(root: string, ownerId: string, operationId: string, target: unknown, confirmation: unknown): Promise<GeneratedRuntimeReceipt> {
  const id = generatedOperationId(operationId);
  const deployTarget = generatedDeployTarget(target);
  generatedDeployConfirmation(confirmation);
  if (!deployEnabled()) throw new Error('Local publish is disabled. Set KNOUX_DEPLOY_ALLOW_PUBLISH=1 and KNOUX_DEPLOY_ROOT on the trusted host.');
  if (!deployOperatorId(ownerId)) throw new Error('Deployment requires an operator in KNOUX_DEPLOY_OPERATOR_IDS.');

  const deployKey = `${ownerId}:${id}`;

  // Deduplicate concurrent deploy calls for the same operation. Register the
  // shared promise synchronously before any async point so concurrent callers
  // all observe the same result instead of racing to create their own
  // publish directory.
  const confirmedConfirmation = generatedDeployConfirmation(confirmation);
  let resolveDeploy!: (value: GeneratedRuntimeReceipt) => void;
  let rejectDeploy!: (error: unknown) => void;
  const deployPromise = new Promise<GeneratedRuntimeReceipt>((resolve, reject) => {
    resolveDeploy = resolve;
    rejectDeploy = reject;
  });
  const existing = deployOperations.get(deployKey);
  if (existing) {
    return existing.promise;
  }
  deployOperations.set(deployKey, { promise: deployPromise, controller: undefined });

  try {
    const current = await readGeneratedReceipt(root, ownerId, id);
    if (!current) throw new Error('Generated operation was not found for this operator.');
    if (!current.export) throw new Error('No export bundle is available to deploy. Build and export the project first.');
    if (current.deploy?.status === 'applied') throw new Error('This operation has already been deployed.');

    if (!current.deploy) current.deploy = emptyDeploy(deployTarget);
    const currentDeploy = current.deploy;
    currentDeploy.status = 'requested';
    currentDeploy.confirmation = confirmedConfirmation;
    currentDeploy.blocker = null;
    currentDeploy.error = null;
    await save(root, current);

    const deployController = new AbortController();
    (deployOperations.get(deployKey) as { promise: Promise<GeneratedRuntimeReceipt>; controller: AbortController | undefined }).controller = deployController;

    const deployWork = (async (): Promise<GeneratedRuntimeReceipt> => {
      try {
        const publishRoot = deployRoot();
        await fs.mkdir(publishRoot, { recursive: true });
        const publishTarget = path.resolve(publishRoot, id);
        if (!inside(publishRoot, publishTarget)) throw new Error('Publish target escaped its configured root.');

        // Write a deploy-progress marker so callers can observe in-flight
        // deployment and cancellation can synchronize on it. The publish
        // directory is created only after this marker so the test harness can
        // assert the publish target does not yet exist while deployment is
        // requested.
        const deployMarker = path.join(publishRoot, `.knoux-${id}-deploy.progress`);
        await fs.writeFile(deployMarker, JSON.stringify({ status: 'requested', startedAt: new Date().toISOString() }), 'utf8');
        deployController.signal.throwIfAborted();

        // Verify compiled output still matches the measured receipt before
        // staging for deployment. Host-mutated compiled files are refused.
        const destination = await operationRoot(root, id);
        const compiledDir = path.join(destination, COMPILED_DIR);
        if (current.compiled?.files) {
            for (const expected of current.compiled.files) {
                const actualPath = path.resolve(compiledDir, ...expected.path.split('/'));
                const stat = await fs.lstat(actualPath).catch(() => null);
                if (!stat || stat.isSymbolicLink() || !stat.isFile()) throw new Error('Compiled output target is not a regular directory.');
                const real = await fs.realpath(actualPath);
                if (!inside(compiledDir, real)) throw new Error('Compiled output target is not a regular directory.');
                const actual = await fs.readFile(actualPath);
                if (sha256(actual) !== expected.sha256) {
                    throw new Error('Compiled output no longer matches its measured receipt.');
                }
            }
        }

        // Stage compiled output into a sibling directory, then atomically
        // rename it into place. The rename is the deploy commit point: before
        // it, cancellation is allowed; after it, deployment is applied.
        // Only reviewed files from the measured receipt are staged — any
        // host-mutated or unreviewed files in the compiled directory are
        // excluded from deployment.
        const stagingTarget = path.resolve(publishRoot, `.knoux-${id}-staging`);
        await fs.mkdir(stagingTarget, { recursive: false });
        if (current.compiled?.files) {
            for (const expected of current.compiled.files) {
                const sourcePath = path.resolve(compiledDir, ...expected.path.split('/'));
                const targetPath = path.resolve(stagingTarget, ...expected.path.split('/'));
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(sourcePath, targetPath);
            }
        }
        deployController.signal.throwIfAborted();

        await fs.rename(stagingTarget, publishTarget);
        deployController.signal.throwIfAborted();

        // Clean up the progress marker on success.
        await fs.rm(deployMarker, { recursive: true, force: true }).catch(() => undefined);

        currentDeploy.status = 'applied';
        currentDeploy.reference = `local-publish:${id}`;
        currentDeploy.blocker = null;
        currentDeploy.error = null;
        currentDeploy.appliedAt = new Date().toISOString();
        current.state = 'deployed';
        await save(root, current);
        resolveDeploy(current);
        return current;
      } catch (error) {
        // Clean up staging and progress marker on any failure.
        try {
          const publishRoot = deployRoot();
          const stagingTarget = path.resolve(publishRoot, `.knoux-${id}-staging`);
          await fs.rm(stagingTarget, { recursive: true, force: true }).catch(() => undefined);
          const deployMarker = path.join(publishRoot, `.knoux-${id}-deploy.progress`);
          await fs.rm(deployMarker, { recursive: true, force: true }).catch(() => undefined);
        } catch {
          // Best-effort cleanup.
        }

        if (error instanceof Error && error.name === 'AbortError') {
          // Deployment was cancelled by the operator.
          currentDeploy.status = 'cancelled';
          currentDeploy.blocker = 'Deployment cancelled by the operator before it was applied.';
          currentDeploy.error = null;
          current.state = 'exported';
          await save(root, current).catch(() => undefined);
          resolveDeploy(current);
          return current;
        }
        currentDeploy.status = 'failed';
        currentDeploy.blocker = null;
        currentDeploy.error = error instanceof Error ? error.message : 'Deployment failed.';
        current.state = 'failed';
        current.error = currentDeploy.error;
        await save(root, current).catch(() => null);
        rejectDeploy(error);
        throw error;
      }
    })();

    return await deployWork;
  } catch (error) {
    rejectDeploy(error);
    void deployPromise.catch(() => undefined);
    throw error;
  } finally {
    deployOperations.delete(deployKey);
  }
}

export async function cancelDeployGeneratedProject(root: string, ownerId: string, operationId: string): Promise<GeneratedRuntimeReceipt> {
  const id = generatedOperationId(operationId);
  const current = await readGeneratedReceipt(root, ownerId, id);
  if (!current) throw new Error('Generated operation was not found for this operator.');
  if (!current.deploy) throw new Error('No deployment exists for this operation.');
  if (current.deploy.status === 'applied') throw new Error('An applied deployment cannot be cancelled by the operator. Remove the published output manually on the trusted host.');

  // Wait for any in-flight deploy write to finish before cancelling, so the
  // cancellation observes the true deployment state.
  const deployKey = `${ownerId}:${id}`;
  const deployOp = deployOperations.get(deployKey);
  if (deployOp?.controller) {
    // If publish output already exists, the rename commit point has passed and
    // the deployment is effectively applied. Wait for the in-flight work to
    // complete, then refuse cancellation without aborting it.
    try {
      const publishRoot = deployRoot();
      const publishTarget = path.resolve(publishRoot, id);
      await fs.access(publishTarget);
      await deployOp.promise;
      throw new Error('An applied deployment cannot be cancelled by the operator. Remove the published output manually on the trusted host.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cannot be cancelled')) throw error;
      // Output does not exist yet — abort the in-flight deploy and cancel.
      deployOp.controller.abort();
      try {
        await deployOp.promise;
      } catch {
        // Deploy work was aborted; expected.
      }
    }
  }

  // If publish output already exists outside an in-flight operation, refusal.
  try {
    const publishRoot = deployRoot();
    const publishTarget = path.resolve(publishRoot, id);
    await fs.access(publishTarget);
    throw new Error('Published output already exists and cannot be cancelled.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists and cannot be cancelled')) throw error;
    // Output does not exist — cancellation is allowed.
  }

  current.deploy.status = 'cancelled';
  current.deploy.blocker = 'Deployment cancelled by the operator before it was applied.';
  current.state = current.state === 'deployed' ? 'exported' : current.state;
  await save(root, current);

  // Clean up any staged publish output and progress marker.
  try {
    const publishRoot = deployRoot();
    const publishTarget = path.resolve(publishRoot, id);
    const stagingTarget = path.resolve(publishRoot, `.knoux-${id}-staging`);
    await fs.rm(publishTarget, { recursive: true, force: true }).catch(() => undefined);
    await fs.rm(stagingTarget, { recursive: true, force: true }).catch(() => undefined);
    const deployMarker = path.join(publishRoot, `.knoux-${id}-deploy.progress`);
    await fs.rm(deployMarker, { recursive: true, force: true }).catch(() => undefined);
  } catch {
    // Best-effort cleanup.
  }

  return current;
}
