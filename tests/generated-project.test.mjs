import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as pause } from 'node:timers/promises';
import { parseGeneratedProject, generatedOperationId, GENERATED_PROJECT_CONFIRMATION, GENERATED_PROJECT_DEPLOY_CONFIRMATION } from '../src/lib/build/generated-project-contract.ts';
import { executeGeneratedProject, readGeneratedReceipt, cancelGeneratedProject, generatedBundlePath, bundleBuffers, deployGeneratedProject, cancelDeployGeneratedProject } from '../src/lib/build/generated-project-executor.ts';
import { parseEngineeringPlan, PLAN_SECTIONS } from '../src/lib/build/engineering-plan.ts';

const artifact = () => ({ kind: 'static-web', files: [
  { path: 'index.html', content: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Real generated app</title><link rel="stylesheet" href="assets/site.css"></head><body><main><h1>Actual static project</h1><button id="increment" type="button">Increment: <span id="count">0</span></button></main><script src="assets/app.js"></script></body></html>' },
  { path: 'assets/site.css', content: 'body{margin:0;background:#090611;color:white;font-family:system-ui}main{min-height:100vh;display:grid;place-content:center;gap:2rem}button{min-height:48px;background:#7951a7;color:white}' },
  { path: 'assets/app.js', content: "document.querySelector('#increment').addEventListener('click',()=>{const node=document.querySelector('#count');node.textContent=String(Number(node.textContent)+1)});" },
] });
const operationId = () => crypto.randomUUID();

test('static generated artifacts are bounded and normalized', () => {
  assert.equal(parseGeneratedProject(artifact()).files.length, 3);
  assert.equal(generatedOperationId(operationId().toUpperCase()).length, 36);
  assert.deepEqual(Object.keys(parseGeneratedProject(artifact())).sort(), ['files', 'kind']);
});

for (const [label, mutate] of [
  ['parent traversal', () => ({ ...artifact(), files: [{ path: '../index.html', content: '<p>x</p>' }, ...artifact().files.slice(1)] })],
  ['Windows traversal', () => ({ ...artifact(), files: [{ path: '..\\index.html', content: '<p>x</p>' }, ...artifact().files.slice(1)] })],
  ['encoded traversal', () => ({ ...artifact(), files: [{ path: '%2e%2e/index.html', content: '<p>x</p>' }, ...artifact().files.slice(1)] })],
  ['environment steal', () => ({ ...artifact(), files: [{ path: '.env', content: 'TOKEN=x' }, ...artifact().files.slice(1)] })],
  ['package execution', () => ({ ...artifact(), files: [{ path: 'package.json', content: '{"scripts":{"build":"evil"}}' }, ...artifact().files.slice(1)] })],
  ['service worker', () => ({ ...artifact(), files: [{ path: 'sw.js', content: 'self.addEventListener("fetch",()=>{})' }, ...artifact().files.slice(1)] })],
  ['duplicate path', () => ({ ...artifact(), files: [...artifact().files, artifact().files[0]] })],
  ['arbitrary backend', () => ({ kind: 'node-server', files: artifact().files })],
]) {
  test(`generated project refuses ${label}`, () => { assert.throws(() => parseGeneratedProject(mutate())); });
}

test('an engineering proposal carries a bounded static artifact without changing old plan compatibility', () => {
  const sections = Object.fromEntries(PLAN_SECTIONS.map((section) => [section, ['Proposal only.']]));
  assert.deepEqual(parseEngineeringPlan(JSON.stringify(sections)), sections);
  const parsed = parseEngineeringPlan(JSON.stringify({ ...sections, generatedProject: artifact() }));
  assert.equal(parsed.generatedProject.files[0].path, 'index.html');
});

test('deterministic bundle writer emits a valid ZIP signature and bounded entries', () => {
  const zip = bundleBuffers([{ path: 'index.html', bytes: new TextEncoder().encode('<h1>ok</h1>') }]);
  assert.equal(Buffer.from(zip).readUInt32LE(0), 0x04034b50);
  assert.equal(Buffer.from(zip).readUInt32LE(zip.length - 22), 0x06054b50);
  assert.equal(Buffer.from(zip).readUInt16LE(zip.length - 14), 1);
});

/**
 * The preview URL is fetched back deliberately: the test proves the real
 * process serves the written files on loopback. Validate the shape at the
 * sink so only the bounded loopback form this suite created can be requested.
 */
const loopbackPreviewUrl = (candidate) => {
  assert.match(candidate, /^http:\/\/127\.0\.0\.1:\d{1,5}\/[a-f0-9]{64}\/[A-Za-z0-9._/-]+$/);
  return candidate;
};

test('a reviewed static project writes, validates, bundles, previews on a different origin, and stops', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const plan = artifact();
  try {
    const receipt = await executeGeneratedProject({ root, ownerId, operationId: id, artifact: plan, parentOrigin: 'http://127.0.0.1:3311' });
    assert.equal(receipt.state, 'ready');
    assert.equal(receipt.operationId, id);
    assert.equal(receipt.externalReference, `generated-static:${id}`);
    assert.equal(receipt.files.length, 3);
    assert.equal(receipt.build.status, 'passed');
    assert.equal(receipt.build.exitCode, 0);
    assert.equal(receipt.preview.httpStatus, 200);
    assert.ok(receipt.preview.readinessMs >= 0);
    assert.notEqual(new URL(receipt.preview.url).origin, 'http://127.0.0.1:3311');
    assert.match(receipt.preview.url, /^http:\/\/127\.0\.0\.1:\d+\/[a-f0-9]{64}\/index\.html$/);
    const response = await fetch(loopbackPreviewUrl(receipt.preview.url));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors http:\/\/127\.0\.0\.1:3311/);
    const html = await response.text();
    assert.match(html, /Actual static project/);
    assert.match(html, /knoux-generated-preview/);
    const css = await fetch(new URL('assets/site.css', receipt.preview.url));
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    assert.equal((await fetch(new URL(receipt.preview.url).origin + '/')).status, 404);
    const rawStatus = (rawPath) => new Promise((resolve, reject) => {
      const target = new URL(receipt.preview.url);
      const request = http.request({ host: target.hostname, port: target.port, path: rawPath, method: 'GET' }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      request.on('error', reject);
      request.end();
    });
    const ticket = new URL(receipt.preview.url).pathname.split('/')[1];
    assert.equal(await rawStatus(`/${ticket}/%2e%2e/index.html`), 400);
    assert.equal(await rawStatus(`/${ticket}/..%5cindex.html`), 400);
    assert.equal(await rawStatus('/not-the-ticket/index.html'), 404);
    const idempotent = await executeGeneratedProject({ root, ownerId, operationId: id, artifact: plan, parentOrigin: 'http://127.0.0.1:3311' });
    assert.equal(idempotent.preview.url, receipt.preview.url);
    assert.equal(idempotent.planSha256, receipt.planSha256);
    await assert.rejects(executeGeneratedProject({ root, ownerId, operationId: id, artifact: { ...plan, files: plan.files.map((file, index) => index === 1 ? { ...file, content: 'body{}' } : file) }, parentOrigin: 'http://127.0.0.1:3311' }), /different generated artifact/);
    assert.equal(await readGeneratedReceipt(root, crypto.randomUUID(), id), null);
    const bundle = await fs.readFile(await generatedBundlePath(root, ownerId, id));
    assert.equal(bundle.readUInt32LE(0), 0x04034b50);
    assert.equal(bundle.byteLength, receipt.bundle.bytes);
    const cancelled = await cancelGeneratedProject(root, ownerId, id);
    assert.equal(cancelled.state, 'cancelled');
    let unavailable = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try { await fetch(loopbackPreviewUrl(receipt.preview.url), { signal: AbortSignal.timeout(250) }); await pause(10); } catch { unavailable = true; break; }
    }
    assert.equal(unavailable, true, 'operator cancellation stops the owned preview process');
  } finally {
    await cancelGeneratedProject(root, ownerId, id).catch(() => null);
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('concurrent retries share one receipt and reject a different artifact for the same UUID', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-retry-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const input = { root, ownerId, operationId: id, artifact: artifact(), parentOrigin: 'http://localhost:3311' };
  try {
    const first = executeGeneratedProject(input);
    const retry = executeGeneratedProject(input);
    await assert.rejects(executeGeneratedProject({
      ...input,
      artifact: { kind: 'static-web', files: [{ path: 'index.html', content: '<h1>Different project</h1>' }] },
    }), /already bound/);
    const [result, repeated] = await Promise.all([first, retry]);
    assert.equal(result.state, 'ready');
    assert.equal(result.preview.url, repeated.preview.url);
    assert.equal(await readGeneratedReceipt(root, crypto.randomUUID(), id), null);
  } finally {
    await cancelGeneratedProject(root, ownerId, id).catch(() => undefined);
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('operation execution cannot adopt an existing destination', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-collision-'));
  const id = operationId();
  const ownerId = crypto.randomUUID();
  try {
    await fs.mkdir(path.join(root, id));
    await fs.writeFile(path.join(root, id, '.keep'), 'unique-work');
    await assert.rejects(executeGeneratedProject({ root, ownerId, operationId: id, artifact: artifact(), parentOrigin: 'http://127.0.0.1:3311' }), /EEXIST/);
    assert.equal(await fs.readFile(path.join(root, id, '.keep'), 'utf8'), 'unique-work');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('the workbench wires reviewed static execution into its shipped surfaces', async () => {
  const read = (relative) => fs.readFile(new URL(relative, import.meta.url), 'utf8');
  const [monitor, home, component] = await Promise.all([
    read('../src/components/build/generator/GenerationMonitor.tsx'),
    read('../src/components/build/dev/DevWorkspaceHome.tsx'),
    read('../src/components/build/generator/GeneratedProjectExecution.tsx'),
  ]);
  assert.match(monitor, /GeneratedProjectExecution/);
  assert.match(monitor, /plan\?\.generatedProject/);
  assert.match(home, /GeneratedProjectExecution/);
  assert.match(home, /plan\.generatedProject/);
  assert.match(component, /GENERATED_PROJECT_CONFIRMATION/);
  assert.match(component, /\/api\/build\/generated-projects/);
  assert.match(component, /method: 'DELETE'/);
  assert.match(component, /generated-projects\/\$\{receipt\.operationId\}`, \{ method: 'PATCH' \}/);
  assert.match(component, /disabled=\{cancelDeployBusy \|\| alreadyDeployed\}/);
  assert.match(component, /sandbox="allow-scripts"/);
  assert.match(component, /No generated files have been written/);
});

test('the generated-project API routes delegate to the bounded executor, never a private store', async () => {
  // The regression this guards: each route once kept its own in-memory
  // operationStore that no other route populated, so status/bundle/deploy
  // could never find an operation, and the POST route invented preview
  // readiness (httpStatus 200, readinessMs 0) instead of probing a process.
  const read = (relative) => fs.readFile(new URL(relative, import.meta.url), 'utf8');
  const routes = await Promise.all([
    read('../src/app/api/build/generated-projects/route.ts'),
    read('../src/app/api/build/generated-projects/[operationId]/route.ts'),
    read('../src/app/api/build/generated-projects/[operationId]/bundle/route.ts'),
    read('../src/app/api/build/generated-projects/[operationId]/deploy/route.ts'),
  ]);
  for (const route of routes) {
    assert.match(route, /generated-project-executor/);
    assert.doesNotMatch(route, /new Map<string, GeneratedRuntimeReceipt>/);
    assert.doesNotMatch(route, /httpStatus: 200/);
    assert.doesNotMatch(route, /readinessMs: 0/);
  }
  assert.match(routes[0], /executeGeneratedProject/);
  assert.match(routes[0], /KNOUX_WRITE_EXECUTOR_ENABLED/);
  assert.match(routes[1], /readGeneratedReceipt/);
  assert.match(routes[1], /cancelGeneratedProject/);
  assert.match(routes[1], /cancelDeployGeneratedProject/);
  assert.match(routes[2], /generatedBundlePath/);
  assert.match(routes[3], /deployGeneratedProject/);
  assert.match(routes[1], /export async function PATCH/);
  assert.doesNotMatch(routes[3], /export async function PATCH/);
});

test('build produces separate source and compiled output with real measured hashes', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-build-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const plan = artifact();
  try {
    const receipt = await executeGeneratedProject({ root, ownerId, operationId: id, artifact: plan, parentOrigin: 'http://127.0.0.1:3312' });
    assert.equal(receipt.state, 'ready');
    // Source and compiled are tracked separately.
    assert.equal(receipt.source.files.length, 3);
    assert.equal(receipt.source.sha256, sourceDigest(plan));
    assert.ok(receipt.source.bytes > 0);
    assert.equal(receipt.compiled.files.length, 3);
    assert.equal(receipt.compiled.build.status, 'passed');
    assert.equal(receipt.compiled.build.exitCode, 0);
    assert.ok(receipt.compiled.build.durationMs !== null && receipt.compiled.build.durationMs >= 0);
    assert.ok(receipt.compiled.build.evidence.includes('validated'));
    assert.ok(receipt.compiled.build.evidence.includes('compiled'));
    assert.ok(receipt.compiled.build.evidence.includes('no shell'));
    // Compiled files match source content byte-for-byte.
    for (const compiled of receipt.compiled.files) {
      const sourceFile = receipt.source.files.find((f) => f.path === compiled.path);
      assert.ok(sourceFile, `compiled file ${compiled.path} has no matching source`);
      assert.equal(compiled.bytes, sourceFile.bytes);
      assert.equal(compiled.sha256, sourceFile.sha256);
    }
    // Top-level fields remain populated for existing surfaces.
    assert.equal(receipt.files.length, 3);
    assert.equal(receipt.bytes, receipt.compiled.bytes);
    assert.equal(receipt.sourceSha256, receipt.source.sha256);
  } finally {
    await cancelGeneratedProject(root, ownerId, id).catch(() => null);
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('export emits a deterministic ZIP whose hash matches the bundle', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-export-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const id2 = operationId();
  const plan = artifact();
  try {
    const receipt = await executeGeneratedProject({ root, ownerId, operationId: id, artifact: plan, parentOrigin: 'http://127.0.0.1:3313' });
    assert.equal(receipt.state, 'ready');
    assert.ok(receipt.export, 'export receipt must be present');
    assert.equal(receipt.export.format, 'zip');
    assert.equal(receipt.export.path, 'artifacts/knoux-static-app.zip');
    assert.ok(receipt.export.bytes > 0);
    assert.ok(receipt.export.durationMs !== null && receipt.export.durationMs >= 0);
    assert.equal(receipt.bundle.path, receipt.export.path);
    assert.equal(receipt.bundle.bytes, receipt.export.bytes);
    assert.equal(receipt.bundle.sha256, receipt.export.sha256);
    const bundle = await fs.readFile(await generatedBundlePath(root, ownerId, id));
    assert.equal(receipt.bundle.sha256, createHash('sha256').update(bundle).digest('hex'));
    // Determinism: same plan produces same bundle hash.
    const receipt2 = await executeGeneratedProject({ root, ownerId, operationId: id2, artifact: plan, parentOrigin: 'http://127.0.0.1:3313' });
    assert.equal(receipt2.export.sha256, receipt.export.sha256);
    await cancelGeneratedProject(root, ownerId, id2);
    await assert.rejects(fetch(loopbackPreviewUrl(receipt2.preview.url), { signal: AbortSignal.timeout(1000) }), {
      name: 'TypeError',
    });
  } finally {
    await cancelGeneratedProject(root, ownerId, id2).catch(() => null);
    await cancelGeneratedProject(root, ownerId, id).catch(() => null);
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('deployment is refused without exact confirmation, operator credentials, or enabled flag', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-generated-deploy-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const plan = artifact();
  const deployRoot = await fs.mkdtemp(path.join(tmpdir(), 'knoux-deploy-root-'));
  try {
    // First execute to get an exported receipt.
    const origAllowPublish = process.env.KNOUX_DEPLOY_ALLOW_PUBLISH;
    const origDeployRoot = process.env.KNOUX_DEPLOY_ROOT;
    const origOperatorIds = process.env.KNOUX_DEPLOY_OPERATOR_IDS;
    process.env.KNOUX_DEPLOY_ALLOW_PUBLISH = '1';
    process.env.KNOUX_DEPLOY_ROOT = deployRoot;
    process.env.KNOUX_DEPLOY_OPERATOR_IDS = ownerId;
    try {
      const receipt = await executeGeneratedProject({ root, ownerId, operationId: id, artifact: plan, parentOrigin: 'http://127.0.0.1:3314' });
      assert.equal(receipt.state, 'ready');

      // Wrong confirmation is refused.
      await assert.rejects(deployGeneratedProject(root, ownerId, id, 'local', 'WRONG CONFIRMATION'), /exact confirmation/);

      // Unsupported target is refused.
      await assert.rejects(deployGeneratedProject(root, ownerId, id, 'production', GENERATED_PROJECT_DEPLOY_CONFIRMATION), /Unsupported deploy target/);

      // Disabled flag refuses.
      process.env.KNOUX_DEPLOY_ALLOW_PUBLISH = '0';
      await assert.rejects(deployGeneratedProject(root, ownerId, id, 'local', GENERATED_PROJECT_DEPLOY_CONFIRMATION), /Local publish is disabled/);
      process.env.KNOUX_DEPLOY_ALLOW_PUBLISH = '1';

      // Wrong operator is refused.
      process.env.KNOUX_DEPLOY_OPERATOR_IDS = crypto.randomUUID();
      await assert.rejects(deployGeneratedProject(root, ownerId, id, 'local', GENERATED_PROJECT_DEPLOY_CONFIRMATION), /operator in KNOUX_DEPLOY_OPERATOR_IDS/);
      process.env.KNOUX_DEPLOY_OPERATOR_IDS = ownerId;

      // Correct confirmation and operator applies deployment.
      const deployed = await deployGeneratedProject(root, ownerId, id, 'local', GENERATED_PROJECT_DEPLOY_CONFIRMATION);
      assert.equal(deployed.deploy.status, 'applied');
      assert.equal(deployed.deploy.target, 'local');
      assert.equal(deployed.deploy.confirmation, GENERATED_PROJECT_DEPLOY_CONFIRMATION);
      assert.ok(deployed.deploy.reference);
      assert.ok(deployed.deploy.appliedAt);
      assert.equal(deployed.state, 'deployed');

      // Re-deploy is refused.
      await assert.rejects(deployGeneratedProject(root, ownerId, id, 'local', GENERATED_PROJECT_DEPLOY_CONFIRMATION), /already been deployed/);

      // Cancel of applied deployment is refused.
      await assert.rejects(cancelDeployGeneratedProject(root, ownerId, id), /cannot be cancelled/);
    } finally {
      process.env.KNOUX_DEPLOY_ALLOW_PUBLISH = origAllowPublish;
      process.env.KNOUX_DEPLOY_ROOT = origDeployRoot;
      process.env.KNOUX_DEPLOY_OPERATOR_IDS = origOperatorIds;
    }
  } finally {
    await cancelGeneratedProject(root, ownerId, id).catch(() => null);
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(deployRoot, { recursive: true, force: true });
  }
});

async function withPublishFixture(action) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'knoux-deploy-contract-'));
  const publishRoot = await fs.mkdtemp(path.join(tmpdir(), 'knoux-publish-contract-'));
  const ownerId = crypto.randomUUID();
  const id = operationId();
  const keys = ['KNOUX_DEPLOY_ALLOW_PUBLISH', 'KNOUX_DEPLOY_ROOT', 'KNOUX_DEPLOY_OPERATOR_IDS'];
  const previous = keys.map((key) => process.env[key]);
  process.env.KNOUX_DEPLOY_ALLOW_PUBLISH = '1';
  process.env.KNOUX_DEPLOY_ROOT = publishRoot;
  process.env.KNOUX_DEPLOY_OPERATOR_IDS = ownerId;
  try {
    await executeGeneratedProject({ root, ownerId, operationId: id, artifact: artifact(), parentOrigin: 'http://localhost:3315' });
    await action({ root, publishRoot, ownerId, id, publish: () => deployGeneratedProject(root, ownerId, id, 'local', GENERATED_PROJECT_DEPLOY_CONFIRMATION) });
  } finally {
    await cancelGeneratedProject(root, ownerId, id).catch(() => undefined);
    for (let index = 0; index < keys.length; index += 1) {
      if (previous[index] === undefined) delete process.env[keys[index]];
      else process.env[keys[index]] = previous[index];
    }
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(publishRoot, { recursive: true, force: true });
  }
}

test('cancellation joins a real in-flight copy, concurrent retries share it, and cancelled output is never published', async (t) => {
  await withPublishFixture(async ({ root, publishRoot, ownerId, id, publish }) => {
    const reached = Promise.withResolvers();
    const release = Promise.withResolvers();
    const writeFile = fs.writeFile.bind(fs);
    let blocked = false;
    let writes = 0;
    t.mock.method(fs, 'writeFile', async (file, ...args) => {
      const result = await writeFile(file, ...args);
      if (String(file).startsWith(path.join(publishRoot, `.knoux-${id}-`))) {
        writes += 1;
        if (!blocked) {
          blocked = true;
          reached.resolve();
          await release.promise;
        }
      }
      return result;
    });
    const first = publish();
    const retry = publish();
    let cancellation;
    try {
      await reached.promise;
      const pending = await readGeneratedReceipt(root, ownerId, id);
      assert.equal(pending.state, 'ready', 'a copy request is not deployed output');
      assert.equal(pending.deploy.status, 'requested');
      assert.equal(pending.deploy.appliedAt, null);
      await assert.rejects(fs.stat(path.join(publishRoot, id)), { code: 'ENOENT' });
      let settled = false;
      cancellation = cancelDeployGeneratedProject(root, ownerId, id).then((receipt) => { settled = true; return receipt; });
      await pause(20);
      assert.equal(settled, false, 'cancellation must wait for the active write to stop');
      release.resolve();
      const [cancelled, firstResult, retryResult] = await Promise.all([cancellation, first, retry]);
      for (const receipt of [cancelled, firstResult, retryResult]) {
        assert.equal(receipt.deploy.status, 'cancelled');
        assert.equal(receipt.deploy.reference, null);
        assert.equal(receipt.deploy.appliedAt, null);
        assert.notEqual(receipt.state, 'deployed');
      }
      assert.equal(writes, 1, 'abort stops the next file and retries share the same copy');
      assert.deepEqual(await fs.readdir(publishRoot), [], 'no final output or private staging remains');
      assert.equal((await readGeneratedReceipt(root, ownerId, id)).deploy.status, 'cancelled');
      t.mock.restoreAll();
      const applied = await publish();
      assert.equal(applied.deploy.status, 'applied', 'an explicit new deployment can retry after cancellation');
      for (const file of artifact().files) assert.equal(await fs.readFile(path.join(publishRoot, id, file.path), 'utf8'), file.content);
    } finally {
      release.resolve();
      await Promise.allSettled([first, retry, cancellation]);
      t.mock.restoreAll();
    }
  });
});

test('cancellation after the publish commit point waits and refuses to label applied output cancelled', async (t) => {
  await withPublishFixture(async ({ root, publishRoot, ownerId, id, publish }) => {
    const reached = Promise.withResolvers();
    const release = Promise.withResolvers();
    const rename = fs.rename.bind(fs);
    t.mock.method(fs, 'rename', async (from, to) => {
      const result = await rename(from, to);
      if (to === path.join(publishRoot, id)) {
        reached.resolve();
        await release.promise;
      }
      return result;
    });
    const deployment = publish();
    let refusal;
    try {
      await reached.promise;
      assert.equal(await fs.readFile(path.join(publishRoot, id, 'index.html'), 'utf8'), artifact().files[0].content);
      let settled = false;
      const cancellation = cancelDeployGeneratedProject(root, ownerId, id).finally(() => { settled = true; });
      refusal = assert.rejects(cancellation, /applied deployment cannot be cancelled/);
      await pause(20);
      assert.equal(settled, false);
      release.resolve();
      assert.equal((await deployment).deploy.status, 'applied');
      await refusal;
      const receipt = await readGeneratedReceipt(root, ownerId, id);
      assert.equal(receipt.state, 'deployed');
      assert.equal(receipt.deploy.status, 'applied');
      assert.ok(receipt.deploy.appliedAt);
    } finally {
      release.resolve();
      await Promise.allSettled([deployment, refusal]);
      t.mock.restoreAll();
    }
  });
});

test('publish rejects changed compiled bytes and excludes unreviewed files', async () => {
  await withPublishFixture(async ({ root, publishRoot, ownerId, id, publish }) => {
    const compiled = path.join(root, id, 'dist');
    await fs.writeFile(path.join(compiled, 'index.html'), '<h1>Host-mutated output</h1>');
    await assert.rejects(publish(), /no longer matches its measured receipt/);
    assert.deepEqual(await fs.readdir(publishRoot), []);
    assert.equal((await readGeneratedReceipt(root, ownerId, id)).deploy.status, 'failed');
    await fs.writeFile(path.join(compiled, 'index.html'), artifact().files[0].content);
    await fs.writeFile(path.join(compiled, 'unreviewed.txt'), 'must not be published');
    assert.equal((await publish()).deploy.status, 'applied');
    await assert.rejects(fs.stat(path.join(publishRoot, id, 'unreviewed.txt')), { code: 'ENOENT' });
  });
});

test('publish rejects a linked compiled parent instead of copying outside its operation', async () => {
  await withPublishFixture(async ({ root, publishRoot, id, publish }) => {
    const outside = path.join(root, 'outside');
    await fs.mkdir(outside);
    for (const file of artifact().files.slice(1)) await fs.writeFile(path.join(outside, path.basename(file.path)), file.content);
    const assets = path.join(root, id, 'dist', 'assets');
    await fs.rm(assets, { recursive: true });
    await fs.symlink(outside, assets, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(publish(), /not a regular directory/);
    assert.deepEqual(await fs.readdir(publishRoot), []);
    assert.equal(await fs.readFile(path.join(outside, 'site.css'), 'utf8'), artifact().files[1].content);
  });
});

test('a stale requested receipt cannot claim cancellation when published output already exists', async () => {
  await withPublishFixture(async ({ root, publishRoot, ownerId, id }) => {
    const receiptFile = path.join(root, id, '.knoux-operation.json');
    const receipt = JSON.parse(await fs.readFile(receiptFile, 'utf8'));
    receipt.deploy.status = 'requested';
    await fs.writeFile(receiptFile, JSON.stringify(receipt));
    await fs.mkdir(path.join(publishRoot, id));
    await fs.writeFile(path.join(publishRoot, id, 'unique.txt'), 'existing output');
    await assert.rejects(cancelDeployGeneratedProject(root, ownerId, id), /already exists and cannot be cancelled/);
    assert.equal((await readGeneratedReceipt(root, ownerId, id)).deploy.status, 'requested');
    assert.equal(await fs.readFile(path.join(publishRoot, id, 'unique.txt'), 'utf8'), 'existing output');
  });
});

function sourceDigest(plan) {
  const hash = createHash('sha256');
  for (const file of [...plan.files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path).update('\0').update(String(new TextEncoder().encode(file.content).byteLength)).update('\0').update(new TextEncoder().encode(file.content));
  }
  return hash.digest('hex');
}

assert.equal(GENERATED_PROJECT_CONFIRMATION, 'APPLY STATIC PROJECT');
