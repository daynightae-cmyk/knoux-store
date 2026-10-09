import { readdir, readFile, open, realpath, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';

export const representativeRoutes = ['/', '/products', '/products/knoux-one', '/build', '/build/providers', '/command', '/command/connections', '/growth', '/wordpress', '/creative', '/web', '/engineering', '/solutions', '/login', '/account'];
const hash = data => createHash('sha256').update(data).digest('hex');
export function gitHead(root = process.cwd()) {
  const executable = process.platform === 'win32' ? 'C:/Program Files/Git/cmd/git.exe' : '/usr/bin/git';
  return execFileSync(executable, ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
}

export function cssReferences(html) {
  return [...new Set([...html.matchAll(/\/_next\/static\/[^"'\\\s<>)]*?\.css(?:\?[^"'\\\s<>)]*)?/g)].map(match => match[0].replaceAll('&amp;', '&')))];
}

export function assetPath(buildDirectory, href) {
  const pathname = decodeURIComponent(href.split('?')[0]);
  if (!pathname.startsWith('/_next/static/') || pathname.includes('..') || pathname.includes('\\')) throw new Error('Unsafe stylesheet reference');
  const target = resolve(buildDirectory, pathname.slice('/_next/'.length));
  if (!target.startsWith(resolve(buildDirectory, 'static') + sep)) throw new Error('Stylesheet escapes build output');
  return target;
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

async function stylesheetBytes(file) {
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || !metadata.size || metadata.size > 16 * 1024 * 1024) throw new Error('Missing, empty or oversized stylesheet');
    return await handle.readFile();
  } finally { await handle.close(); }
}

async function emittedStylesheets(directory, prefix = '/_next/static') {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    if (entry.isDirectory()) assets.push(...await emittedStylesheets(join(directory, entry.name), prefix + '/' + entry.name));
    else if (entry.isFile() && entry.name.endsWith('.css')) assets.push(prefix + '/' + entry.name);
  }
  return assets;
}

export async function inspectBuild(buildDirectory) {
  const documents = await htmlFiles(join(buildDirectory, 'server/app'));
  if (!documents.length) throw new Error('No prerendered HTML: integrity cannot be established');
  const references = new Map();
  for (const document of documents) {
    const html = await readFile(document, 'utf8');
    const hrefs = cssReferences(html);
    // Next's emergency global-error document deliberately uses inline styles.
    if (!hrefs.length && !document.endsWith(`${sep}_global-error.html`)) throw new Error(`No stylesheets in ${relative(buildDirectory, document)}`);
    for (const href of hrefs) {
      const owners = references.get(href) ?? [];
      owners.push(relative(buildDirectory, document));
      references.set(href, owners);
    }
  }
  const assets = [];
  for (const [href, documents] of references) {
    const file = assetPath(buildDirectory, href);
    const canonical = await realpath(file);
    if (!canonical.startsWith(await realpath(join(buildDirectory, 'static')) + sep)) throw new Error(`Asset outside build: ${href}`);
    const data = await stylesheetBytes(file);
    assets.push({ href, documents, bytes: data.length, sha256: hash(data) });
  }
  return { documents: documents.length, assets };
}

export async function verifyServedAsset(base, buildDirectory, href) {
  const file = assetPath(buildDirectory, href);
  const response = await fetch(base + href, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/css')) throw new Error(`Stylesheet ${href}: HTTP ${response.status} or incorrect content type`);
  const data = Buffer.from(await response.arrayBuffer());
  const disk = await stylesheetBytes(file);
  if (!data.length || hash(data) !== hash(disk)) throw new Error(`Served stylesheet differs from this build: ${href}`);
  // Persist trusted disk metadata after equality, never remote body bytes.
  return { href, status: 200, bytes: disk.length, sha256: hash(disk) };
}

async function assertFreePort(port) {
  const probe = createServer();
  await new Promise((accept, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', accept);
  });
  await new Promise(accept => probe.close(accept));
}

export async function startOwnedServer(root, port) {
  await assertFreePort(port); // Occupied ports fail; never reuse another server.
  const startedAt = new Date().toISOString();
  const executable = process.execPath;
  const entry = resolve(root, 'node_modules/next/dist/bin/next');
  const child = spawn(executable, [entry, 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: root, env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  try {
    await new Promise((accept, reject) => {
      const timeout = setTimeout(() => reject(new Error('Owned production server did not become ready')), 60000);
      const finish = error => { clearTimeout(timeout); if (error) reject(error); else accept(); };
      child.once('error', finish);
      child.once('exit', code => finish(new Error(`Owned server exited ${code} before verification`)));
      const onData = data => { output = (output + data.toString()).slice(-4000); if (/Ready in/.test(output)) finish(); };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
    });
  } catch (error) { child.kill(); throw error; }
  const provenance = { pid: child.pid, startedAt, root, port, executable, entry, head: gitHead(root) };
  if (process.platform === 'win32') {
    try {
      const observed = JSON.parse(execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-Command', `$observedProcess=Get-CimInstance Win32_Process -Filter 'ProcessId=${child.pid}'; $listener=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction Stop; [pscustomobject]@{pid=$observedProcess.ProcessId; startedAt=$observedProcess.CreationDate.ToUniversalTime().ToString('o'); commandLine=$observedProcess.CommandLine; owner=$listener.OwningProcess} | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true, timeout: 30000 }));
      if (observed.pid !== child.pid || observed.owner !== child.pid || !observed.commandLine.includes(entry)) throw new Error('Listening process does not match the owned checkout');
      provenance.observed = observed;
    } catch (error) { await stopOwnedServer(child); throw error; }
  }
  return { child, provenance, base: `http://127.0.0.1:${port}` };
}

export async function stopOwnedServer(child) {
  if (child.exitCode !== null) return;
  await new Promise((accept, reject) => {
    const timeout = setTimeout(() => reject(new Error('Owned server failed to stop; do not replace its build')), 15000);
    child.once('exit', () => { clearTimeout(timeout); accept(); });
    child.kill();
  });
}

export async function runIntegrity({ root = process.cwd(), port = Number(process.env.KNOUX_CSS_PORT ?? 4469), reportPath } = {}) {
  const buildDirectory = resolve(root, process.env.NEXT_DIST_DIR ?? '.next');
  const disk = await inspectBuild(buildDirectory);
  const emitted = await emittedStylesheets(join(buildDirectory, 'static'));
  const buildId = (await readFile(join(buildDirectory, 'BUILD_ID'), 'utf8')).trim();
  const server = await startOwnedServer(root, port);
  try {
    const hrefs = new Set(disk.assets.map(asset => asset.href));
    const routes = [];
    for (const route of representativeRoutes) {
      const response = await fetch(server.base + route, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const status = [200, 301, 302, 303, 307, 308, 401, 403].find(allowed => allowed === response.status);
      const authBoundary = status !== undefined && status !== 200 && ['/account', '/build', '/build/providers', '/command', '/command/connections'].includes(route);
      if (response.status !== 200 && !authBoundary) throw new Error(`Representative route ${route}: HTTP ${response.status}`);
      const remoteReferences = cssReferences(await response.text());
      // Project the network references back onto the locally emitted inventory.
      // Reports can contain local names only, never arbitrary HTTP text.
      const references = emitted.filter(local => remoteReferences.some(remote => remote.split('?')[0] === local));
      if (remoteReferences.some(remote => !emitted.includes(remote.split('?')[0]))) throw new Error(`Response references un-emitted CSS: ${route}`);
      if (status === 200 && !references.length) throw new Error(`Unstyled response: ${route}`);
      references.forEach(href => hrefs.add(href));
      routes.push({ route, status, hrefs: references, authBoundary });
    }
    const served = [];
    for (const href of hrefs) served.push(await verifyServedAsset(server.base, buildDirectory, href));
    const report = { status: 'PASS', measuredAt: new Date().toISOString(), buildId, provenance: server.provenance, disk, routes, served };
    if (reportPath) { await mkdir(resolve(reportPath, '..'), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); }
    return report;
  } finally { await stopOwnedServer(server.child); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = await runIntegrity({ reportPath: process.env.KNOUX_CSS_REPORT ?? '.qa-css/integrity.json' });
    console.log(`CSS integrity PASS: ${report.disk.documents} emitted documents, ${report.served.length} byte-matched HTTP 200 stylesheets, ${report.routes.length} route families; owned PID ${report.provenance.pid}, port ${report.provenance.port}, head ${report.provenance.head}`);
  } catch (error) {
    const reportPath = process.env.KNOUX_CSS_REPORT ?? '.qa-css/integrity.json';
    await mkdir(resolve(reportPath, '..'), { recursive: true });
    await writeFile(reportPath, JSON.stringify({ status: 'FAIL', measuredAt: new Date().toISOString(), reason: 'See gate stderr for the failed operation; no HTTP body is persisted.' }, null, 2) + '\n');
    console.error(`CSS integrity FAIL: ${error.message}`); process.exitCode = 1;
  }
}
