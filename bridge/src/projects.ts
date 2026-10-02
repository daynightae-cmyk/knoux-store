/** Project inspection and public clone. No install, script or package execution. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolveInsideRoot, realpathInside } from './policy.js';

const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'bridge']);
export function publicRepository(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const match = /^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,99})$/.exec(input);
  if (!match || ['.', '..'].includes(match[2]) || match[2].endsWith('.')) return null;
  return `https://github.com/${match[1]}/${match[2]}`;
}
export async function projectRoot(root: string, relative: string): Promise<string> {
  const result = resolveInsideRoot(root, relative);
  if (!result.ok || !result.absolute) throw new Error('Project path must stay inside the configured bridge root.');
  const canonical = realpathInside(root, result.absolute);
  if (!(await fs.stat(canonical)).isDirectory()) throw new Error('Project path is not a directory.');
  return canonical;
}
function language(file: string): string { const ext = path.extname(file); return ['.ts', '.tsx'].includes(ext) ? 'typescript' : ['.js', '.jsx', '.mjs'].includes(ext) ? 'javascript' : ext === '.md' ? 'markdown' : ext === '.json' ? 'json' : ext === '.css' ? 'css' : 'text'; }
export async function inspectProject(root: string, relative: string) {
  const current = await projectRoot(root, relative);
  const files: { path: string; bytes: number; lines: number | null; language: string; role: string }[] = [];
  let remainingReadBytes = 8 * 1024 * 1024;
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 7 || files.length >= 2000) return;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (files.length >= 2000) break;
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || depth === 0 && SKIP.has(entry.name) || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full, depth + 1); continue; }
      if (!entry.isFile()) continue;
      const file = path.relative(current, full).split(path.sep).join('/');
      if (!/\.(?:tsx?|jsx?|mjs|css|json|md)$/.test(file)) continue;
      const stat = await fs.stat(full);
      let lines: number | null = null;
      if (stat.size <= 128 * 1024 && stat.size <= remainingReadBytes) {
        const content = await fs.readFile(realpathInside(current, full), 'utf8'); remainingReadBytes -= stat.size;
        lines = content.length === 0 ? 0 : content.split('\n').length;
      }
      files.push({ path: file, bytes: stat.size, lines, language: language(file), role: file.endsWith('.md') ? 'documentation' : file === 'package.json' ? 'manifest' : 'source' });
    }
  }
  await walk(current, 0);
  const manifestFile = files.find((f) => f.path === 'package.json');
  let manifest: { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  if (manifestFile && manifestFile.bytes <= 512 * 1024) manifest = JSON.parse(await fs.readFile(realpathInside(current, path.join(current, 'package.json')), 'utf8'));
  const dependencies = [...Object.entries(manifest.dependencies ?? {}).map(([name, version]) => ({ name, version, dev: false })), ...Object.entries(manifest.devDependencies ?? {}).map(([name, version]) => ({ name, version, dev: true }))].filter((item) => typeof item.version === 'string').slice(0, 2000);
  const routes = files.flatMap((f) => {
    const match = /^(?:src\/)?app\/(.*?)\/page\.[jt]sx?$/.exec(f.path);
    if (/^(?:src\/)?app\/page\.[jt]sx?$/.test(f.path)) return [{ route: '/', file: f.path }];
    return match ? [{ route: '/' + match[1].split('/').filter((s) => !s.startsWith('(')).join('/'), file: f.path }] : [];
  });
  let packageManager: string | null = null;
  for (const [file, manager] of [['package-lock.json', 'npm'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun']]) {
    try { if ((await fs.lstat(path.join(current, file))).isFile()) packageManager = manager; } catch { /* no lock */ }
  }
  return { name: typeof manifest.name === 'string' ? manifest.name : path.basename(current), root: current, framework: dependencies.find((d) => d.name === 'next') ? 'Next.js' : dependencies.find((d) => d.name === 'react') ? 'React' : null, packageManager, files, routes, apiRoutes: [], tests: files.filter((f) => /(?:test|spec)\./.test(f.path)).map((f) => ({ file: f.path, bytes: f.bytes })), scripts: Object.entries(manifest.scripts ?? {}).filter(([, command]) => typeof command === 'string').map(([name, command]) => ({ name, command })), dependencies, graph: { nodes: routes.map((r) => ({ id: `route:${r.route}`, domain: 'routes' as const, label: r.route, route: r.route, path: r.file, source: r.file, status: 'present' as const, detail: 'Discovered by bridge project inspection.' })), edges: [], unavailableDomains: ['storage' as const, 'deployment' as const] }, unavailableDomains: ['storage' as const, 'deployment' as const] };
}

/** Exclusive destination creation refuses even an empty existing directory. */
export async function cloneProject(root: string, repository: string, destination: string, enabled: boolean) {
  if (!enabled) throw new Error('Set allowProjectImport=true in the trusted bridge config to permit public clone.');
  const url = publicRepository(repository);
  if (!url) throw new Error('Only canonical public HTTPS github.com repositories can be cloned.');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(destination)) throw new Error('Choose a new folder name using letters, digits, underscore or hyphen.');
  const resolved = resolveInsideRoot(root, destination);
  if (!resolved.ok || !resolved.absolute) throw new Error('Destination rejected by the bridge path policy.');
  const canonicalRoot = realpathInside(root, root);
  const target = path.join(canonicalRoot, destination);
  await fs.mkdir(target); // EEXIST is final: never overwrite or adopt someone else's directory.
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_LFS_SKIP_SMUDGE: '1' };
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['-c', 'core.hooksPath=' + (process.platform === 'win32' ? 'NUL' : '/dev/null'), '-c', 'protocol.file.allow=never', 'clone', '--depth', '1', '--', url, target], { env, shell: false, windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Clone timed out. The reserved destination is retained for manual inspection.')); }, 120000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('Git clone could not start. The reserved destination is retained.')); });
    child.on('close', (code) => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('Clone failed. Check the public repository and network; the reserved destination is retained.')); });
  });
  return inspectProject(root, destination);
}
