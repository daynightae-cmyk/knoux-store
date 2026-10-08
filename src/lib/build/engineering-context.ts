import 'server-only';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectTools } from '../../../bridge/src/tools';

function invoke(binary: string, args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => execFile(/* turbopackIgnore: true */ binary, args, { cwd, shell: false, windowsHide: true, timeout: 4000, maxBuffer: 256_000 }, (error, stdout) => resolve(error ? null : stdout.trim())));
}

export function parseWorktrees(porcelain: string) {
  return porcelain.trim().split(/\r?\n\r?\n/).filter(Boolean).map((block) => {
    const lines = block.split(/\r?\n/);
    return { path: lines.find((line) => line.startsWith('worktree '))?.slice(9) ?? '', head: lines.find((line) => line.startsWith('HEAD '))?.slice(5) ?? null, branch: lines.find((line) => line.startsWith('branch '))?.slice(7).replace(/^refs\/heads\//, '') ?? null, detached: lines.includes('detached'), locked: lines.some((line) => line.startsWith('locked')), prunable: lines.some((line) => line.startsWith('prunable')) };
  }).filter((tree) => tree.path && !tree.path.includes('\0'));
}

export async function readEngineeringContext(root = process.cwd()) {
  const measuredAt = new Date().toISOString();
  const tools = await detectTools();
  const git = tools.find((tool) => tool.id === 'git')?.binary;
  const worktreeList = git ? await invoke(git, ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'worktree', 'list', '--porcelain'], root) : null;
  const listed = worktreeList ? parseWorktrees(worktreeList) : [];
  // Bound inspection on large recovery repositories, without altering any ref or checkout.
  const inspectTree = async (tree: ReturnType<typeof parseWorktrees>[number]) => {
    const run = (args: string[]) => git ? invoke(git, ['-c', `safe.directory=${tree.path.replace(/\\/g, '/')}`, ...args], tree.path) : Promise.resolve(null);
    const [status, divergence, activity] = await Promise.all([run(['status', '--porcelain', '--untracked-files=normal']), run(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']), run(['log', '-1', '--format=%cI'])]);
    const files = status === null ? null : status.split(/\r?\n/).filter(Boolean);
    const counts = divergence?.match(/^(\d+)\s+(\d+)$/);
    return { ...tree, repository: path.basename(root), dirtyFiles: files?.filter((line) => !line.startsWith('??')).length ?? null, untracked: files?.filter((line) => line.startsWith('??')).length ?? null, ahead: counts ? Number(counts[1]) : null, behind: counts ? Number(counts[2]) : null, lastCommitAt: activity, task: null, agent: null, state: status === null ? 'UNAVAILABLE' : 'DETECTED' };
  };
  const worktrees: Awaited<ReturnType<typeof inspectTree>>[] = [];
  for (let offset = 0; offset < Math.min(listed.length, 64); offset += 4) {
    worktrees.push(...await Promise.all(listed.slice(offset, offset + 4).map(inspectTree)));
  }
  let disk: { totalBytes: number; freeBytes: number } | null = null;
  try { const stats = await fs.statfs(root); disk = { totalBytes: stats.bsize * stats.blocks, freeBytes: stats.bsize * stats.bavail }; } catch { /* unsupported platform */ }
  return { measuredAt, source: 'Current server process and read-only Git inspection', host: { name: os.hostname(), os: `${os.type()} ${os.release()}`, architecture: os.arch(), cpu: os.cpus()[0]?.model ?? null, cores: os.cpus().length, ramBytes: os.totalmem(), freeRamBytes: os.freemem(), disk, node: process.version, root, kind: process.env.VERCEL ? 'Deployment server · not your local machine' : 'Active server host' }, tools, worktrees, worktreeCount: listed.length, worktreeBlocker: worktreeList === null ? 'Git worktree metadata is unavailable on this host.' : null, capabilities: { mcp: [], plugins: [], skills: [], source: 'No authenticated capability inventory adapter is connected', state: 'EXECUTOR_NOT_CONNECTED' } };
}

export type EngineeringContext = Awaited<ReturnType<typeof readEngineeringContext>>;
