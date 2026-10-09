import { readFile, writeFile, rm, rename, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runIntegrity, inspectBuild, assetPath, startOwnedServer, stopOwnedServer, verifyServedAsset } from './css-integrity.mjs';

const root = process.cwd();
const buildDirectory = resolve(root, '.next');
if (buildDirectory !== join(root, '.next')) throw new Error('Refusing cleanup outside the chosen checkout');
const sources = ['src/app/globals.css', 'src/components/command/command.module.css'];
const original = await Promise.all(sources.map(file => readFile(file, 'utf8')));
const patches = ['\n:root { --knoux-css-integrity-control: 731; }\n', '\n.command { --knoux-css-integrity-control: 947; }\n'];
await mkdir('.qa-css', { recursive: true });
const scenarios = [ ['A-pristine', false, false], ['B-global', true, false], ['C-module', false, true], ['D-combined', true, true], ['E-revert', false, false] ];
const evidence = { base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), next: JSON.parse(await readFile('node_modules/next/package.json', 'utf8')).version, scenarios: [] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function build(name) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let log = '';
    child.stdout.on('data', data => { log += data; });
    child.stderr.on('data', data => { log += data; });
    child.once('error', reject);
    child.once('exit', async code => { await writeFile(`.qa-css/${name}-build.log`, log); if (code === 0) accept(code); else reject(new Error(`${name}: build exit ${code}`)); });
  });
}

try {
  for (const [name, global, module] of scenarios) {
    await Promise.all(sources.map((file, index) => writeFile(file, original[index] + ([global, module][index] ? patches[index] : ''))));
    // All managed servers from the preceding scenario have exited before removal.
    await rm(buildDirectory, { recursive: true, force: true });
    const exit = await build(name);
    const proof = await runIntegrity({ reportPath: `.qa-css/${name}-integrity.json` });
    const manifests = {};
    for (const manifest of ['build-manifest.json', 'app-build-manifest.json', 'prerender-manifest.json', 'routes-manifest.json', 'server/app-paths-manifest.json', 'server/app-path-routes-manifest.json']) {
      try { const content = await readFile(join(buildDirectory, manifest)); manifests[manifest] = { sha256: sha(content), cssReferences: [...content.toString().matchAll(/[^"\s]*\.css/g)].map(match => match[0]) }; }
      catch (error) { if (error.code !== 'ENOENT') throw error; manifests[manifest] = { emitted: false }; }
    }
    const emitted = await Promise.all(proof.served.map(asset => readFile(assetPath(buildDirectory, asset.href), 'utf8')));
    if ((global && !emitted.some(css => css.includes('--knoux-css-integrity-control:731'))) || (module && !emitted.some(css => css.includes('--knoux-css-integrity-control:947')))) throw new Error(`${name}: edit did not survive CSS emission`);
    evidence.scenarios.push({ name, buildExit: exit, sourceHashes: await Promise.all(sources.map(async file => sha(await readFile(file)))), manifests, ...proof });
    await writeFile('.qa-css/control-matrix.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(`${name}: PASS, ${proof.disk.documents} documents, ${proof.served.length} stylesheets, build ${proof.buildId}, PID ${proof.provenance.pid}`);
  }
  const disk = await inspectBuild(buildDirectory);
  const href = disk.assets[0].href;
  const file = assetPath(buildDirectory, href);
  const hidden = file + '.integrity-withheld';
  let diskFailed = false;
  let httpFailed = false;
  let failureStatus;
  let gateExit;
  const server = await startOwnedServer(root, 4469);
  try {
    await rename(file, hidden);
    try { await inspectBuild(buildDirectory); } catch { diskFailed = true; }
    try { execFileSync(process.execPath, ['scripts/css-integrity.mjs'], { cwd: root, stdio: 'pipe' }); gateExit = 0; }
    catch (error) { gateExit = error.status; await writeFile('.qa-css/negative-gate.log', String(error.stderr)); }
    const response = await fetch(server.base + href, { redirect: 'manual' });
    failureStatus = response.status;
    await response.arrayBuffer();
    try { await verifyServedAsset(server.base, buildDirectory, href); } catch { httpFailed = true; }
  } finally {
    await rename(hidden, file);
    await stopOwnedServer(server.child);
  }
  if (!diskFailed || !httpFailed || gateExit !== 1) throw new Error('Intentionally withheld stylesheet was not rejected');
  evidence.negativeControl = { href, diskFailed, httpFailed, gateExit, failureStatus, restored: true };
  evidence.restored = await runIntegrity({ reportPath: '.qa-css/restored-integrity.json' });
  await writeFile('.qa-css/control-matrix.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Negative control PASS: missing stylesheet refused on disk and HTTP (${failureStatus}); restored build PASS`);
} finally { await Promise.all(sources.map((file, index) => writeFile(file, original[index]))); }
