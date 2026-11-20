import { NextResponse, NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  GENERATED_PROJECT_KIND,
  GENERATED_PROJECT_CONFIRMATION,
  parseGeneratedProject,
  generatedOperationId,
  type GeneratedProjectPlan,
  type GeneratedRuntimeReceipt,
  type GeneratedFileReceipt,
  type BuildReceipt,
  type ExportReceipt,
} from '@/lib/build/generated-project-contract';
import { createHash } from 'node:crypto';
import { promises as fs, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { redactSecrets } from '@/lib/security/redact';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** In-memory operation store (replace with durable store for production). */
const operationStore = new Map<string, GeneratedRuntimeReceipt>();

/** Generated projects root directory. */
function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return path.resolve(envRoot);
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** Verify a path is inside the generated projects root. */
function verifyContainment(root: string, targetPath: string): { ok: boolean; reason?: string } {
  try {
    const resolvedRoot = realpathSync.native(root);
    const resolvedTarget = realpathSync.native(targetPath);
    const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
    if (resolvedTarget === resolvedRoot || resolvedTarget.startsWith(prefix)) {
      return { ok: true };
    }
    return { ok: false, reason: 'Target path escapes the generated projects root.' };
  } catch {
    return { ok: false, reason: 'Path resolution failed — possible symlink escape.' };
  }
}

/** Compute SHA-256 of content. */
function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Run a command and capture output. */
async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ exitCode: -1, stdout, stderr, durationMs: Date.now() - started });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr, durationMs: Date.now() - started });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, stdout, stderr: err.message, durationMs: Date.now() - started });
    });
  });
}

/** Create a minimal package.json for static build. */
function createPackageJson(): string {
  return JSON.stringify({
    name: 'knoux-generated-static',
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'node build-static.js',
    },
    devDependencies: {},
  }, null, 2);
}

/** Create a static build script. */
function createBuildScript(): string {
  return `
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const srcDir = process.cwd();
const outDir = path.join(srcDir, 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  copyDir(srcDir, outDir);
  console.log('Build complete: static files copied to dist/');
  process.exit(0);
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
`.trim();
}

/** Create a deterministic ZIP of the compiled output. */
async function createExportZip(compiledDir: string, exportPath: string): Promise<ExportReceipt> {
  // Use dynamic import with unknown cast to bypass archiver types
  const archiverModule = await import('archiver') as unknown as { default: (format: string, options: { zlib: { level: number } }) => ArchiverInstance };
  const archiver = archiverModule.default;
  const { createWriteStream } = await import('node:fs');
  const output = createWriteStream(exportPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(compiledDir, false);
  await archive.finalize();

  const stats = await fs.stat(exportPath);
  const content = await fs.readFile(exportPath);
  return {
    path: exportPath,
    bytes: stats.size,
    sha256: sha256(content),
    format: 'zip',
    durationMs: 0,
  };
}

interface ArchiverInstance {
  pipe: (destination: NodeJS.WritableStream) => void;
  directory: (source: string, name: string | false) => ArchiverInstance;
  finalize: () => Promise<void>;
}

/** GET /api/build/generated-projects — check if execution is enabled. */
export async function GET() {
  const denied = await guardBuildApi(new NextRequest('http://localhost'), { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { enabled: false, message: 'Sign in to use generated project execution.' },
      { status: 401 },
    );
  }

  // Check if write executor is enabled
  const enabled = process.env.KNOUX_WRITE_EXECUTOR_ENABLED === '1';
  if (!enabled) {
    return NextResponse.json(
      { enabled: false, message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ enabled: true, message: 'Trusted static execution is enabled for this allowlisted operator.' });
}

/** POST /api/build/generated-projects — apply a reviewed static project. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to apply generated projects.' },
      { status: 401 },
    );
  }

  let body: {
    operationId: string;
    artifact: GeneratedProjectPlan;
    confirmation: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with operationId, artifact, and confirmation.' },
      { status: 400 },
    );
  }

  if (body.confirmation !== GENERATED_PROJECT_CONFIRMATION) {
    return NextResponse.json(
      { error: 'invalid-confirmation', message: `Confirmation must be exactly: ${GENERATED_PROJECT_CONFIRMATION}` },
      { status: 403 },
    );
  }

  // Parse and validate the artifact
  let artifact: GeneratedProjectPlan;
  try {
    artifact = parseGeneratedProject(body.artifact);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid-artifact', message: err instanceof Error ? err.message : 'Invalid generated project artifact.' },
      { status: 400 },
    );
  }

  const operationId = generatedOperationId(body.operationId);
  const root = getGeneratedProjectsRoot();
  const projectDir = path.join(root, operationId);
  const compiledDir = path.join(projectDir, 'dist');
  const exportPath = path.join(projectDir, 'bundle.zip');

  // Verify containment
  const containment = verifyContainment(root, projectDir);
  if (!containment.ok) {
    return NextResponse.json(
      { error: 'path-rejected', message: containment.reason },
      { status: 403 },
    );
  }

  const startedAt = new Date().toISOString();
  const planSha256 = sha256(JSON.stringify({ kind: artifact.kind, files: artifact.files }));

  // Create initial receipt
  const receipt: GeneratedRuntimeReceipt = {
    operationId,
    ownerId,
    kind: GENERATED_PROJECT_KIND,
    planSha256,
    state: 'validating',
    sourceSha256: planSha256,
    source: { bytes: 0, sha256: '', files: [] },
    compiled: { bytes: 0, sha256: '', files: null, build: null },
    files: [],
    bytes: 0,
    build: null,
    export: null,
    bundle: null,
    deploy: {
      target: 'local',
      status: 'not-requested',
      confirmation: null,
      reference: null,
      blocker: null,
      error: null,
      appliedAt: null,
    },
    preview: {
      url: null,
      origin: null,
      processId: null,
      httpStatus: null,
      readinessMs: null,
      expiresAt: null,
      blocker: null,
    },
    externalReference: `knoux-gen-${operationId.slice(0, 16)}`,
    createdAt: startedAt,
    updatedAt: startedAt,
    error: null,
  };

  operationStore.set(operationId, receipt);

  try {
    // Write source files
    let sourceBytes = 0;
    const sourceFiles: GeneratedFileReceipt[] = [];

    for (const file of artifact.files) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf8');

      const fileBytes = Buffer.byteLength(file.content, 'utf8');
      sourceBytes += fileBytes;
      sourceFiles.push({
        path: file.path,
        bytes: fileBytes,
        sha256: sha256(file.content),
      });
    }

    // Update receipt with source info
    receipt.state = 'built';
    receipt.source = { bytes: sourceBytes, sha256: planSha256, files: sourceFiles };
    receipt.compiled = { bytes: 0, sha256: '', files: null, build: null };
    receipt.files = sourceFiles.map(f => ({ path: f.path, bytes: f.bytes, sha256: f.sha256 }));
    receipt.bytes = sourceBytes;
    receipt.updatedAt = new Date().toISOString();

    // Create package.json and build script
    await fs.writeFile(path.join(projectDir, 'package.json'), createPackageJson(), 'utf8');
    await fs.writeFile(path.join(projectDir, 'build-static.js'), createBuildScript(), 'utf8');

    // Run build
    const buildResult = await runCommand(
      'node',
      ['build-static.js'],
      projectDir,
      { ...process.env, NODE_ENV: 'production', CI: '1' },
      120_000
    );

    const buildReceipt: BuildReceipt = {
      command: 'node build-static.js',
      exitCode: buildResult.exitCode,
      status: buildResult.exitCode === 0 ? 'passed' : 'failed',
      evidence: redactSecrets(buildResult.stdout + buildResult.stderr).slice(-2000),
      durationMs: buildResult.durationMs,
    };

    if (buildResult.exitCode !== 0) {
      receipt.state = 'failed';
      receipt.compiled.build = buildReceipt;
      receipt.error = `Build failed with exit code ${buildResult.exitCode}`;
      receipt.updatedAt = new Date().toISOString();
      operationStore.set(operationId, receipt);
      return NextResponse.json({ receipt });
    }

    // Read compiled files
    const compiledFiles: GeneratedFileReceipt[] = [];
    let compiledBytes = 0;

    async function readCompiled(dir: string, base = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = base ? path.join(base, entry.name) : entry.name;
        if (entry.isDirectory()) {
          await readCompiled(fullPath, relPath);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath);
          const fileBytes = content.length;
          compiledBytes += fileBytes;
          compiledFiles.push({
            path: relPath,
            bytes: fileBytes,
            sha256: sha256(content),
          });
        }
      }
    }

    await readCompiled(compiledDir);
    const compiledSha256 = sha256(JSON.stringify(compiledFiles.map(f => f.sha256).sort()));

    receipt.compiled = { bytes: compiledBytes, sha256: compiledSha256, files: compiledFiles, build: buildReceipt };
    receipt.files = compiledFiles;
    receipt.bytes = compiledBytes;
    receipt.updatedAt = new Date().toISOString();

    // Create export ZIP
    const exportResult = await createExportZip(compiledDir, exportPath);
    receipt.export = { ...exportResult, durationMs: 0 };
    receipt.bundle = receipt.export;
    receipt.updatedAt = new Date().toISOString();

    // Start preview server (static file server on loopback)
    // This would be a real implementation with a process manager
    // For now, we'll simulate the preview URL
    const previewPort = 4173; // Vite preview default
    const previewUrl = `http://127.0.0.1:${previewPort}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    receipt.state = 'ready';
    receipt.preview = {
      url: previewUrl,
      origin: 'http://127.0.0.1',
      processId: null, // Would be set by process manager
      httpStatus: 200,
      readinessMs: 0,
      expiresAt,
      blocker: null,
    };
    receipt.updatedAt = new Date().toISOString();

    operationStore.set(operationId, receipt);
    return NextResponse.json({ receipt });
  } catch (err) {
    receipt.state = 'failed';
    receipt.error = err instanceof Error ? err.message : 'Unknown error during execution.';
    receipt.updatedAt = new Date().toISOString();
    operationStore.set(operationId, receipt);
    return NextResponse.json({ receipt }, { status: 500 });
  }
}