/**
 * Filesystem-bound project adapter.
 *
 * This reads the actual KNOuX Store checkout that produced the running build.
 * It is not a simulation: every file path, route, script and dependency it
 * reports is read from disk with `node:fs`, and every one of them carries the
 * path it came from.
 *
 * The adapter is read-only by construction. There is no `writeFile`, no
 * `deleteFile` and no arbitrary command execution anywhere in this file, so
 * `capabilities()` reporting `false` is not a policy decision that could later
 * be bypassed — the code to bypass it does not exist. Git reads use `spawn`
 * with a fixed argument array and never a shell string.
 *
 * Server-only. Nothing in this module may be imported by a client component.
 */

import { promises as fs, existsSync, constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  type BuildCapability,
  type CapabilityStatus,
  type DatabaseCapabilitySet,
  type DatabaseStatus,
  type EnvironmentName,
  type GitSnapshot,
  type ProjectAdapter,
  type ProjectGraph,
  type ProjectGraphEdge,
  type ProjectGraphNode,
  type ProjectNodeDomain,
  type ProjectSnapshot,
  type SourceFileEntry,
  type VerificationSnapshot,
} from './types';

/**
 * Directories never walked. These are build outputs and caches, not source.
 *
 * `build` is only skipped at the repository root. A directory named `build`
 * inside `src` is real source — `src/components/build`, `src/lib/build` and
 * `src/app/api/build` all exist in this project — so skipping it everywhere
 * would silently drop real modules from the topology.
 */
const ROOT_ONLY_SKIP = new Set(['node_modules', 'build', 'dist', 'out', 'coverage']);
const ANY_DEPTH_SKIP = new Set(['.git', '.next', '.vercel', '.traycer', '.turbo', '.cache']);

const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILES = 4000;
const GIT_TIMEOUT_MS = 8000;

function isReadableProjectPath(relative: string): boolean {
  const segments = relative.split('/');
  if (segments.some((segment) => !/^[A-Za-z0-9_@().\[\]-]+$/.test(segment) || segment.startsWith('.'))) return false;
  return relative.startsWith('src/') || relative.startsWith('tests/') ||
    (relative.startsWith('references/') && relative.endsWith('.md')) ||
    ['README.md', 'package.json', 'tsconfig.json', 'next.config.ts', 'next.config.mjs', 'AGENTS.md'].includes(relative);
}

/** At most one verification task may be in flight across the whole process. */
let activeVerification: string | null = null;

/** Keep the last few hundred kilobytes of output, which is where failures are. */
function summariseOutput(stdout: string, stderr: string): string {
  const combined = `${stdout}\n${stderr}`.trim();
  if (combined.length <= 1200) return combined || 'No output.';
  return `…${combined.slice(-1200)}`;
}

function detectLockSync(root: string): 'npm' | 'pnpm' | 'yarn' | 'bun' | null {
  if (existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  if (existsSync(path.join(root, 'package-lock.json'))) return 'npm';
  return null;
}

export type AdapterOptions = {
  root: string;
  environment: EnvironmentName;
  label: string;
};

function languageOf(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.css') return 'css';
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'markdown';
  if (ext === '.svg') return 'svg';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  if (ext === '.mjs' || ext === '.cjs') return 'javascript';
  return 'text';
}

function walk(dir: string, root: string, out: string[], depth = 0): Promise<void> {
  if (depth > 8 || out.length >= MAX_FILES) return Promise.resolve();
  return fs
    .readdir(dir, { withFileTypes: true })
    .then((entries) =>
      Promise.all(
        entries.map(async (entry) => {
          if (entry.name.startsWith('.') && entry.name !== '.env.example' && entry.name !== '.gitignore') return;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (ANY_DEPTH_SKIP.has(entry.name)) return;
            if (depth === 0 && ROOT_ONLY_SKIP.has(entry.name)) return;
            await walk(full, root, out, depth + 1);
            return;
          }
          if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
        }),
      ).then(() => undefined),
    )
    .catch(() => undefined);
}

/** Turn `src/app/about/page.tsx` into `/about`. */
function routeOf(relative: string): string | null {
  const match = /^src\/app\/(.*)\/(page|layout|route)\.tsx?$/.exec(relative);
  if (!match) return null;
  const segments = match[1].split('/').filter(Boolean);
  const cleaned = segments.map((segment) => {
    const group = /^\(.+\)$/.exec(segment);
    if (group) return null;
    if (/^\[\.\.\.(.+)\]$/.test(segment)) return `*`;
    if (/^\[(.+)\]$/.test(segment)) return `[${segment.replace(/[[\]]/g, '')}]`;
    return segment;
  }).filter((segment): segment is string => segment !== null);
  return `/${cleaned.join('/')}` || '/';
}

function roleOf(relative: string): string {
  if (relative.startsWith('src/app/api/')) return 'api-route';
  if (relative.startsWith('src/app/')) return 'app-route';
  if (relative.startsWith('src/components/')) return 'component';
  if (relative.startsWith('src/lib/')) return 'library';
  if (relative.startsWith('src/data/')) return 'registry';
  if (relative.startsWith('tests/')) return 'test';
  if (relative === 'package.json') return 'manifest';
  if (relative.startsWith('references/')) return 'reference';
  if (relative.startsWith('public/')) return 'asset';
  return 'root';
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Run a git subcommand with a fixed argv. Never a shell string, never user input. */
function git(root: string, args: string[], timeout = GIT_TIMEOUT_MS): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const child = spawn('git', args, { cwd: root, windowsHide: true, shell: false });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill();
        finish(null);
      }, timeout);
      child.stdout.on('data', (chunk: Buffer) => { if (out.length < 400_000) out += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { if (err.length < 40_000) err += chunk.toString(); });
      child.on('error', () => { clearTimeout(timer); finish(null); });
      child.on('close', (code) => {
        clearTimeout(timer);
        finish(code === 0 ? out : err || null);
      });
    } catch {
      finish(null);
    }
  });
}

export class FsProjectAdapter implements ProjectAdapter {
  readonly id = 'knoux-fs-readonly';
  readonly label: string;
  readonly environment: EnvironmentName;
  /**
   * The resolved checkout root.
   *
   * Public because the project snapshot already publishes it verbatim, so
   * keeping it private here would only mean a caller had to re-derive the same
   * value. It is a path, not a credential.
   */
  readonly root: string;

  constructor(options: AdapterOptions) {
    this.root = path.resolve(options.root);
    this.environment = options.environment;
    this.label = options.label;
  }

  /**
   * Every capability is derived from what this process can actually do.
   * Writes are false because no write method exists on this class.
   */
  capabilities(): Record<BuildCapability, CapabilityStatus> {
    const readOnly: CapabilityStatus = 'available';
    return {
      'project.read': readOnly,
      'project.files': readOnly,
      // The adapter exposes no mutation method at all.
      'project.write': 'blocked',
      'project.delete': 'blocked',
      // A verification runner may exist, but it is opt-in and allowlisted.
      'command.allowlisted': process.env.KNOUX_BUILD_ALLOW_VERIFY === '1' ? 'available' : 'blocked',
      'command.arbitrary': 'blocked',
      'terminal.interactive': 'blocked',
      'runtime.manage': 'blocked',
      'git.read': readOnly,
      'git.write': 'blocked',
      // The site itself is the only runtime that exists here.
      'preview.live': readOnly,
      'preview.inspect': readOnly,
      'database.read': 'unconfigured',
      'database.write': 'blocked',
      'provider.execute': 'unconfigured',
      'diagnostics.read': process.env.KNOUX_BUILD_ALLOW_VERIFY === '1' ? 'available' : 'blocked',
      'test.run': process.env.KNOUX_BUILD_ALLOW_VERIFY === '1' ? 'available' : 'blocked',
      'deploy.trigger': 'blocked',
    };
  }

  blockerFor(capability: BuildCapability): string | null {
    switch (capability) {
      case 'project.write':
      case 'project.delete':
        return 'The Build OS ships a read-only project adapter. No write method exists, so a deployed website cannot modify its own source. A separate authenticated build service is required.';
      case 'command.arbitrary':
        return 'Arbitrary shell execution is never exposed over HTTP. It would be a remote-code-execution hole on the production site.';
      case 'terminal.interactive':
        return 'TERMINAL UNAVAILABLE IN HOSTED MODE. A browser-hosted deployment has no shell. An authenticated KNOuX build bridge is required.';
      case 'runtime.manage':
        return 'Process management needs a host agent. A deployed web server cannot start, stop or supervise processes.';
      case 'git.write':
        return 'The adapter runs read-only git subcommands with a fixed argument list. Writing requires a build service holding credentials.';
      case 'database.read':
        return 'No database connection string is configured on the server.';
      case 'database.write':
        return 'Database writes are blocked in every mode until a connection and an elevated permission path both exist.';
      case 'provider.execute':
        return 'No AI provider credential is configured. See the Provider Center for the exact environment variable required.';
      case 'deploy.trigger':
        return 'Deployment is owned by the release pipeline, not by the website. Triggering it from a page would let any visitor ship code.';
      case 'command.allowlisted':
      case 'test.run':
      case 'diagnostics.read':
        return process.env.KNOUX_BUILD_ALLOW_VERIFY === '1'
          ? null
          : 'Verification execution is disabled on this deployment. Set KNOUX_BUILD_ALLOW_VERIFY=1 on a trusted host to enable the allowlisted runner.';
      default:
        return null;
    }
  }

  database(): DatabaseStatus {
    const capabilities: DatabaseCapabilitySet = {
      schemas: false, tables: false, columns: false,
      relations: false, query: false, write: false, migrations: false,
    };
    const configured = Boolean(process.env.SUPABASE_URL ?? process.env.DATABASE_URL);
    return {
      connected: false,
      adapterId: configured ? 'postgres-unconfigured' : null,
      capabilities,
      blocker: configured
        ? 'A database URL is present but no adapter is implemented, so no schema can be read. Implementing it is required before this reports anything true.'
        : 'No database connection is configured on this deployment.',
      requirement: 'SUPABASE_URL or DATABASE_URL on the server, plus a Postgres adapter that performs read-only introspection.',
    };
  }

  async snapshot(): Promise<ProjectSnapshot> {
    const relative: string[] = [];
    await walk(this.root, this.root, relative);

    const manifest = await readJson<{
      name?: string; scripts?: Record<string, string>;
      dependencies?: Record<string, string>; devDependencies?: Record<string, string>;
    }>(path.join(this.root, 'package.json'), {});

    const files: SourceFileEntry[] = [];
    const routes: { route: string; file: string }[] = [];
    const apiRoutes: { route: string; file: string }[] = [];
    const tests: { file: string; bytes: number }[] = [];

    for (const file of relative) {
      const role = roleOf(file);
      if (role === 'reference') continue;
      let bytes = 0;
      try {
        bytes = (await fs.stat(path.join(this.root, file))).size;
      } catch {
        continue;
      }
      let lines = 0;
      if (bytes < MAX_FILE_BYTES) {
        try {
          const text = await fs.readFile(path.join(this.root, file), 'utf8');
          lines = text.length === 0 ? 0 : text.split('\n').length;
        } catch {
          lines = 0;
        }
      }
      files.push({ path: file, language: languageOf(file), bytes, lines, role });
      if (role === 'app-route') {
        const route = routeOf(file);
        if (route) routes.push({ route, file });
      }
      if (role === 'api-route') {
        const route = routeOf(file);
        if (route) apiRoutes.push({ route, file });
      }
      if (role === 'test') tests.push({ file, bytes });
    }

    const dependencies = [
      ...Object.entries(manifest.dependencies ?? {}).map(([name, version]) => ({ name, version, dev: false })),
      ...Object.entries(manifest.devDependencies ?? {}).map(([name, version]) => ({ name, version, dev: true })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const graph = await this.buildGraph(relative, routes, apiRoutes, dependencies, tests, files);

    return {
      name: manifest.name ?? path.basename(this.root),
      root: this.root,
      framework: dependencies.some((d) => d.name === 'next') ? `next@${dependencies.find((d) => d.name === 'next')?.version ?? '?'}` : null,
      packageManager: this.detectPackageManager(),
      scripts: Object.entries(manifest.scripts ?? {}).map(([name, command]) => ({ name, command })),
      dependencies,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
      routes: routes.sort((a, b) => a.route.localeCompare(b.route)),
      apiRoutes: apiRoutes.sort((a, b) => a.route.localeCompare(b.route)),
      tests: tests.sort((a, b) => a.file.localeCompare(b.file)),
      graph,
      unavailableDomains: graph.unavailableDomains,
    };
  }

  /**
   * The package manager that owns this checkout.
   *
   * This used to be a second, asynchronous copy of `detectLockSync` — the same
   * four probes, expressed with `fs.access`, reached from a different method.
   * Two copies of one probe is one too many, and the async one is the copy
   * that made Turbopack trace the entire project into the server output: the
   * path is built from a constructor argument, so static analysis cannot bound
   * it and conservatively includes everything.
   *
   * There is now one implementation, and it is synchronous. The check runs
   * once per snapshot over four `existsSync` calls, so there was never a reason
   * for it to be async, and the synchronous form is the shape the bundler can
   * reason about. This removes the warning at its cause rather than silencing
   * it.
   */
  private detectPackageManager(): string | null {
    return detectLockSync(this.root);
  }

  /** The Cortex graph. Every node cites the file it was derived from. */
  private async buildGraph(
    relative: string[],
    routes: { route: string; file: string }[],
    apiRoutes: { route: string; file: string }[],
    dependencies: { name: string; version: string; dev: boolean }[],
    tests: { file: string; bytes: number }[],
    files: SourceFileEntry[],
  ): Promise<ProjectGraph> {
    const nodes: ProjectGraphNode[] = [];
    const edges: ProjectGraphEdge[] = [];
    const unavailable: ProjectNodeDomain[] = [];

    for (const entry of routes) {
      const id = `route:${entry.route}`;
      nodes.push({
        id, domain: 'routes', label: entry.route, source: entry.file,
        path: entry.file, route: entry.route, status: 'present',
        detail: `App Router page discovered at ${entry.file}.`,
      });
    }
    for (const entry of apiRoutes) {
      const id = `api:${entry.route}`;
      nodes.push({
        id, domain: 'api', label: entry.route, source: entry.file,
        path: entry.file, route: entry.route, status: 'present',
        detail: `Route handler discovered at ${entry.file}.`,
      });
    }
    for (const dependency of dependencies) {
      const id = `dep:${dependency.name}`;
      nodes.push({
        id, domain: 'dependencies', label: `${dependency.name}@${dependency.version}`,
        source: 'package.json', path: 'package.json', route: null, status: 'present',
        detail: dependency.dev ? 'Declared as a development dependency.' : 'Declared as a runtime dependency.',
      });
    }
    for (const entry of tests) {
      const id = `test:${entry.file}`;
      nodes.push({
        id, domain: 'tests', label: entry.file, source: entry.file,
        path: entry.file, route: null, status: 'present',
        detail: `Test file, ${entry.bytes} bytes.`,
      });
    }
    for (const file of files) {
      if (file.role !== 'component' && file.role !== 'library') continue;
      const id = `mod:${file.path}`;
      nodes.push({
        id, domain: 'ui', label: path.basename(file.path), source: file.path,
        path: file.path, route: null, status: 'present',
        detail: file.role === 'component' ? 'React component.' : 'Library module.',
      });
    }

    // Real import edges, read from the actual module sources.
    const aliasRoot = path.join(this.root, 'src');
    for (const file of files) {
      if (file.language !== 'typescript' && file.language !== 'javascript') continue;
      if (file.bytes > MAX_FILE_BYTES) continue;
      let text = '';
      try {
        text = await fs.readFile(path.join(this.root, file.path), 'utf8');
      } catch {
        continue;
      }
      const from = `mod:${file.path}`;
      for (const match of text.matchAll(/from\s+'(\.[^']+)'/g)) {
        const target = path
          .relative(this.root, path.resolve(path.dirname(path.join(aliasRoot, file.path)), match[1]))
          .split(path.sep)
          .join('/');
        const resolved = [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]
          .find((candidate) => candidate.startsWith('src/'));
        if (!resolved) continue;
        edges.push({
          from, to: `mod:${resolved}`, kind: 'imports',
          evidence: `${file.path} imports "${match[1]}"`,
        });
      }
    }

    // Auth topology reports implementation presence only; runtime provider health is resolved by the auth capability probe.
    const hasAuth = relative.some((file) => file.startsWith('src/lib/auth/'));
    const hasSupabaseAuth = relative.some((file) => file.startsWith('src/lib/supabase/'));
    nodes.push({
      id: 'domain:auth', domain: 'auth', label: 'Auth', source: 'src/lib/auth/',
      path: 'src/lib/auth/', route: null, status: hasAuth ? 'present' : 'absent',
      detail: hasAuth && hasSupabaseAuth
        ? 'Supabase Auth SSR integration is present. Runtime provider availability is verified separately from the repository topology.'
        : hasAuth
          ? 'Auth contracts exist, but no Supabase SSR integration was discovered.'
          : 'No auth module present.',
    });
    nodes.push({
      id: 'domain:data', domain: 'data', label: 'Data', source: 'src/data/',
      path: 'src/data/', route: null, status: 'present',
      detail: 'Typed registries. Static records, not a connected database.',
    });
    nodes.push({
      id: 'domain:ai', domain: 'ai', label: 'AI', source: 'src/lib/build/providers/',
      path: 'src/lib/build/providers/', route: null, status: 'present',
      detail: 'Provider contracts. Execution requires a server credential.',
    });
    nodes.push({
      id: 'domain:storage', domain: 'storage', label: 'Storage', source: null,
      path: null, route: null, status: 'unavailable',
      detail: 'No object storage is bound to this deployment.',
    });
    nodes.push({
      id: 'domain:deployment', domain: 'deployment', label: 'Deployment', source: 'vercel',
      path: null, route: null, status: 'present',
      detail: 'Deployed as a Next.js application. Release is owned by the pipeline, not the page.',
    });

    for (const domain of ['storage'] as ProjectNodeDomain[]) {
      if (nodes.some((node) => node.domain === domain && node.status === 'unavailable')) unavailable.push(domain);
    }

    return { nodes, edges, unavailableDomains: unavailable };
  }

  async readFile(relative: string): Promise<{ content: string; language: string; bytes: number; lines: number } | null> {
    // Only repository source and documentation are inspectable; a guessed
    // path must never turn this into an env-file reader.
    const requested = relative.replace(/\\/g, '/');
    if (!isReadableProjectPath(requested)) return null;

    try {
      // Walk only the named directories. The request selects an existing
      // directory entry by equality; it never supplies bytes to path.join.
      // This costs one readdir per segment rather than a project-wide scan.
      let resolved = this.root;
      const segments = requested.split('/');
      for (const [index, segment] of segments.entries()) {
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const entry = entries.find((item) => item.name === segment);
        if (!entry || entry.isSymbolicLink()) return null;
        if (index < segments.length - 1 && !entry.isDirectory()) return null;
        if (index === segments.length - 1 && !entry.isFile()) return null;
        resolved = path.join(resolved, entry.name);
      }

      // The directory walk rejects symlinks at every segment. Realpath and
      // the second allowlist check remain as defence if a directory entry
      // changes during the walk. Read only the canonical path that passed.
      const actual = await fs.realpath(resolved);
      if (!this.isInsideRoot(actual)) return null;
      // A link can remain inside the checkout while crossing the source
      // allowlist (for example src/alias.ts -> ../../.env).
      const actualRelative = path.relative(this.root, actual).split(path.sep).join('/');
      if (!isReadableProjectPath(actualRelative)) return null;

      // A file descriptor binds the size check and read to the same inode.
      // O_NOFOLLOW also refuses a final-component symlink swapped in after
      // realpath. On platforms without that flag, the descriptor still avoids
      // the stat-then-read race.
      const handle = await fs.open(actual, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
        const content = await handle.readFile('utf8');
        return {
          content,
          language: languageOf(requested),
          bytes: stat.size,
          lines: content.length === 0 ? 0 : content.split('\n').length,
        };
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  }

  /**
   * Whether an absolute path is the root or lies inside it.
   *
   * Named and used for both the pre-symlink and post-symlink checks so the
   * rule is stated once. The trailing separator matters: without it
   * `D:\app-evil` would satisfy a `startsWith('D:\app')` test.
   */
  private isInsideRoot(candidate: string): boolean {
    const prefix = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    return candidate === this.root || candidate.startsWith(prefix);
  }

  async gitSnapshot(): Promise<GitSnapshot> {
    const [branch, head, upstream, status, log, mainSha] = await Promise.all([
      git(this.root, ['rev-parse', '--abbrev-ref', 'HEAD']),
      git(this.root, ['rev-parse', 'HEAD']),
      git(this.root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']),
      git(this.root, ['status', '--porcelain=v1']),
      git(this.root, ['log', '-8', '--pretty=format:%H%x1f%s%x1f%an%x1f%aI']),
      git(this.root, ['rev-parse', 'origin/main']),
    ]);

    if (head === null) {
      return {
        available: false, branch: null, headSha: null, originMainSha: null, dirty: false,
        ahead: null, behind: null, files: [], commits: [],
        blocker: 'The deployment has no .git directory, so no Git state can be read. Source is shipped as a build artefact.',
      };
    }

    const files: GitSnapshot['files'] = [];
    if (status) {
      for (const line of status.split('\n')) {
        if (line.length < 4) continue;
        const code = line.slice(0, 2);
        const file = line.slice(3).trim();
        if (!file) continue;
        files.push({
          path: file,
          state: code === '??' ? 'untracked' : code[1] !== ' ' ? 'staged' : 'unstaged',
        });
      }
    }

    let ahead: number | null = null;
    let behind: number | null = null;
    if (upstream) {
      const counts = await git(this.root, ['rev-list', '--left-right', '--count', `${upstream.trim()}...HEAD`]);
      if (counts) {
        const [behindRaw, aheadRaw] = counts.trim().split(/\s+/);
        ahead = Number(aheadRaw);
        behind = Number(behindRaw);
      }
    }

    const commits: GitSnapshot['commits'] = [];
    if (log) {
      for (const line of log.split('\n')) {
        const [sha, subject, author, at] = line.split('\x1f');
        if (!sha) continue;
        commits.push({ sha, subject: subject ?? '', author: author ?? '', at: at ?? '' });
      }
    }

    return {
      available: true,
      branch: branch?.trim() ?? null,
      headSha: head.trim(),
      originMainSha: mainSha?.trim() ?? null,
      dirty: files.length > 0,
      ahead,
      behind,
      files,
      commits,
      blocker: null,
    };
  }

  /**
   * Runs one task from a fixed allowlist, mapped to the project's own package
   * script. The argument vector is assembled here and nowhere else, so a
   * request can select a task but can never contribute an argument, a binary
   * or a shell string.
   *
   * One task runs at a time. Without that, an unauthenticated caller could
   * start unbounded parallel builds and take the deployment down, which would
   * make a safe command into a denial-of-service vector.
   */
  async runVerification(task: string): Promise<VerificationSnapshot> {
    const allowlist: Record<string, string> = {
      lint: 'lint',
      typecheck: 'typecheck',
      test: 'test',
      build: 'build',
    };
    const script = allowlist[task];
    if (!script) {
      throw new Error(`Verification task "${task}" is not on the allowlist.`);
    }
    if (process.env.KNOUX_BUILD_ALLOW_VERIFY !== '1') {
      throw new Error(
        'Verification execution is disabled on this deployment. Set KNOUX_BUILD_ALLOW_VERIFY=1 on a trusted host.',
      );
    }
    if (activeVerification) {
      throw new Error(
        `A verification run is already in progress (${activeVerification}). Wait for it to finish.`,
      );
    }

    const packageManager = this.detectPackageManager() ?? 'npm';
    const args = packageManager === 'npm' ? ['run', script] : ['run', script];
    const started = Date.now();
    activeVerification = script;
    try {
      const result = await this.spawnCapture(args, script, 300_000);
      return {
        checks: [
          {
            id: task,
            label: script,
            command: `${packageManager} ${args.join(' ')}`,
            exitCode: result.code,
            status: result.code === 0 ? 'pass' : 'fail',
            evidence: summariseOutput(result.stdout, result.stderr),
            ranAt: new Date().toISOString(),
            durationMs: Date.now() - started,
          },
        ],
        headSha: (await git(this.root, ['rev-parse', 'HEAD']))?.trim() ?? null,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      activeVerification = null;
    }
  }

  private spawnCapture(
    args: string[],
    label: string,
    timeout: number,
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(this.packageManagerBin(), args, {
        cwd: this.root,
        windowsHide: true,
        shell: false,
        env: { ...process.env, CI: '1', NEXT_TELEMETRY_DISABLED: '1' },
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => child.kill(), timeout);
      child.stdout.on('data', (chunk: Buffer) => { if (stdout.length < 200_000) stdout += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { if (stderr.length < 200_000) stderr += chunk.toString(); });
      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({ code: -1, stdout, stderr: `${label}: ${error.message}` });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code: code ?? -1, stdout, stderr });
      });
    });
  }

  private packageManagerBin(): string {
    return process.platform === 'win32' ? `${this.packageManagerName()}.cmd` : this.packageManagerName();
  }

  private packageManagerName(): string {
    const lock = detectLockSync(this.root);
    return lock ?? 'npm';
  }
}
