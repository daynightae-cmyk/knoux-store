/**
 * KNOuX Static Builder — Trusted child process for static-web projects.
 *
 * This script is invoked by the executor with fixed server-resolved arguments.
 * It validates source, materializes compiled output, and emits a build manifest.
 * No generated code is executed. No shell is used. No network access.
 *
 * Usage:
 *   node generated-static-builder.mjs --source <dir> --output <dir> --manifest <file>
 *
 * Exit codes:
 *   0  success
 *   1  source validation failed
 *   2  output integrity failed
 *   3  I/O error
 *   4  timeout
 *   5  invalid arguments
 */

import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const FILE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md']);
const FORBIDDEN_SEGMENTS = new Set(['node_modules', 'dist', 'build', 'coverage']);

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument: ${key} ${value}`);
    }
    result[key.slice(2)] = value;
  }
  if (!result.source || !result.output || !result.manifest) {
    throw new Error('Missing required arguments: --source, --output, --manifest');
  }
  return { source: result.source, output: result.output, manifest: result.manifest };
}

function validatePath(root, candidate) {
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes root: ${candidate}`);
  }
  return resolved;
}

async function validateSource(sourceDir) {
  const entries = [];
  let totalBytes = 0;

  async function walk(dir, base = '') {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      const relPath = path.join(base, dirent.name);
      const normalizedRel = relPath.replace(/\\/g, '/');

      if (dirent.isDirectory()) {
        const lower = dirent.name.toLowerCase();
        if (FORBIDDEN_SEGMENTS.has(lower)) continue;
        await walk(fullPath, normalizedRel);
      } else if (dirent.isFile()) {
        const ext = path.extname(dirent.name).toLowerCase();
        if (!FILE_EXTENSIONS.has(ext)) continue;

        const content = await fs.readFile(fullPath);
        const bytes = content.byteLength;
        if (bytes > 64 * 1024) throw new Error(`File exceeds 64 KiB limit: ${normalizedRel}`);
        totalBytes += bytes;
        if (totalBytes > 96 * 1024) throw new Error('Total source exceeds 96 KiB limit');

        entries.push({ path: normalizedRel, bytes, sha256: sha256(content) });
      }
    }
  }

  await walk(sourceDir);

  if (entries.length === 0) throw new Error('No valid source files found');
  if (!entries.some((e) => e.path === 'index.html')) throw new Error('Missing index.html');

  if (entries.length > 32) throw new Error('Source exceeds 32 file limit');

  const sorted = entries.sort((a, b) => a.path.localeCompare(b.path));
  const treeHash = createHash('sha256');
  for (const e of sorted) {
    treeHash.update(e.path).update('\0').update(String(e.bytes)).update('\0').update(e.sha256);
  }

  return { files: sorted, treeSha256: treeHash.digest('hex'), totalBytes };
}

async function materializeOutput(sourceDir, outputDir, files) {
  await fs.mkdir(outputDir, { recursive: true });

  const outputFiles = [];

  for (const file of files) {
    const sourcePath = validatePath(sourceDir, file.path);
    const targetPath = validatePath(outputDir, file.path);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const handle = await fs.open(targetPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size !== 0) throw new Error(`Output target exists: ${file.path}`);
      const content = await fs.readFile(sourcePath);
      await handle.writeFile(content);
      const after = await handle.stat();
      if (!after.isFile() || after.size !== content.byteLength) throw new Error(`Output size mismatch: ${file.path}`);
    } finally {
      await handle.close();
    }

    const actual = await fs.realpath(targetPath);
    if (!inside(outputDir, actual)) throw new Error(`Output escaped: ${file.path}`);

    const content = await fs.readFile(actual);
    outputFiles.push({ path: file.path, bytes: content.byteLength, sha256: sha256(content) });
  }

  return outputFiles;
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function writeManifest(manifestPath, manifest) {
  const tmp = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(manifest, null, 2), { encoding: 'utf8', flag: 'wx' });
  await fs.rename(tmp, manifestPath);
}

async function main() {
  const started = Date.now();
  let sourceDir = '', outputDir = '', manifestPath = '';

  try {
    ({ source: sourceDir, output: outputDir, manifest: manifestPath } = parseArgs());

    // Validate and measure source
    const source = await validateSource(sourceDir);

    // Materialize compiled output
    const outputFiles = await materializeOutput(sourceDir, outputDir, source.files);

    // Verify output integrity
    for (const expected of source.files) {
      const actual = outputFiles.find((f) => f.path === expected.path);
      if (!actual) throw new Error(`Missing output file: ${expected.path}`);
      if (actual.bytes !== expected.bytes) throw new Error(`Byte mismatch: ${expected.path}`);
      if (actual.sha256 !== expected.sha256) throw new Error(`Hash mismatch: ${expected.path}`);
    }

    // Build manifest
    const durationMs = Date.now() - started;
    const manifest = {
      schemaVersion: 1,
      tool: { id: 'knoux-static-builder', version: 1 },
      sourceTreeSha256: source.treeSha256,
      outputTreeSha256: sha256(JSON.stringify(outputFiles.sort((a, b) => a.path.localeCompare(b.path)))),
      files: outputFiles,
      totalBytes: source.totalBytes,
      durationMs,
      completedAt: new Date().toISOString(),
    };

    await writeManifest(manifestPath, manifest);

    console.log(JSON.stringify({ status: 'success', manifestPath, durationMs, files: outputFiles.length, bytes: source.totalBytes }));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown build error';
    const code = message.includes('escapes') || message.includes('exceeds') || message.includes('Missing') || message.includes('limit') ? 1 :
                 message.includes('mismatch') || message.includes('integrity') ? 2 :
                 message.includes('I/O') || message.includes('ENOENT') || message.includes('EEXIST') ? 3 : 5;
    console.error(JSON.stringify({ status: 'error', code, message, durationMs: Date.now() - started }));
    process.exit(code);
  }
}

main();
