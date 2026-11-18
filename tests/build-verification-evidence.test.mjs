import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import * as nodeCrypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import * as nextServer from 'next/server.js';
import ts from 'typescript';
import { root } from './helpers.mjs';

// Execute shipped modules; replace only framework session I/O and host processes.
function load(relative, dependencies = {}) {
  const output = ts.transpileModule(readFileSync(nodePath.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)((specifier) => {
    assert.ok(specifier in dependencies, `Unexpected dependency: ${specifier}`);
    return dependencies[specifier];
  }, loaded, loaded.exports);
  return loaded.exports;
}

function environment(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function routeHarness(t, { user = null, lookupThrows = false, env = {} } = {}) {
  environment(t, {
    KNOUX_BUILD_ENVIRONMENT: 'production', KNOUX_BUILD_PUBLIC: '0',
    KNOUX_BUILD_ALLOW_VERIFY: '1', KNOUX_BUILD_OPERATOR_IDS: 'operator', ...env,
  });
  const rateLimit = load('src/lib/http/rate-limit.ts');
  const guard = load('src/lib/build/api-guard.ts', {
    'next/server': nextServer,
    '../ai/provider-os/runtime-context': { providerRuntimeContext: () => undefined },
    './deployment': load('src/lib/build/deployment.ts'),
    '../http/rate-limit': rateLimit,
    '../supabase/server': { createClient: async () => {
      if (lookupThrows) throw new Error('Identity provider unavailable');
      return { auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) } };
    } },
  });
  const tasks = [];
  let adapters = 0;
  const route = load('src/app/api/build/verify/route.ts', {
    'next/server': nextServer,
    '@/lib/build/api-guard': guard,
    '@/lib/build/operator': load('src/lib/build/operator.ts'),
    '@/lib/build/diagnostics': load('src/lib/build/diagnostics.ts'),
    '@/lib/build/adapter-factory': { createProjectAdapter: () => {
      adapters++;
      return { runVerification: async task => {
        tasks.push(task);
        return { checks: [{ id: task, status: 'pass', exitCode: 0, evidence: 'Controlled runner' }], headSha: 'a'.repeat(40) };
      } };
    } },
  });
  const request = (method, origin = 'https://knoux.store', body = '{"task":"typecheck"}') => new nextServer.NextRequest('https://knoux.store/api/build/verify', {
    method, headers: origin === null ? {} : { origin }, ...(method === 'POST' ? { body } : {}),
  });
  return { route, request, tasks, adapterCount: () => adapters };
}

for (const scenario of [
  { name: 'anonymous hosted request', status: 401 },
  { name: 'failed hosted identity lookup', lookupThrows: true, status: 401 },
  { name: 'authenticated non-operator', user: 'visitor', status: 403 },
  { name: 'operator with cross-origin request', user: 'operator', origin: 'https://attacker.invalid', status: 403 },
  { name: 'operator with missing Origin', user: 'operator', origin: null, status: 403 },
  { name: 'operator with opaque Origin', user: 'operator', origin: 'null', status: 403 },
  { name: 'empty operator allowlist', user: 'operator', env: { KNOUX_BUILD_OPERATOR_IDS: '' }, status: 403 },
  { name: 'local anonymous read policy is not execution permission', env: { KNOUX_BUILD_ENVIRONMENT: 'local' }, status: 403 },
  { name: 'public anonymous read policy is not execution permission', env: { KNOUX_BUILD_PUBLIC: '1' }, status: 403 },
  { name: 'public policy with failed identity lookup', lookupThrows: true, env: { KNOUX_BUILD_PUBLIC: '1' }, status: 403 },
]) {
  test(`shipped verify GET/POST refuse ${scenario.name} before adapter creation`, async t => {
    const h = routeHarness(t, scenario);
    for (const method of ['POST', 'GET']) {
      const response = await h.route[method](h.request(method, scenario.origin));
      assert.equal(response.status, scenario.status);
      const body = await response.json();
      assert.notEqual(body.enabled, true);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(h.adapterCount(), 0);
    assert.deepEqual(h.tasks, []);
  });
}

test('authenticated same-origin allowlisted operator is the positive execution control', async t => {
  const h = routeHarness(t, { user: 'operator', env: { KNOUX_BUILD_OPERATOR_IDS: 'other, operator ' } });
  const get = await h.route.GET(h.request('GET'));
  assert.equal(get.status, 200);
  assert.equal((await get.json()).enabled, true);
  assert.equal(h.adapterCount(), 0);
  const post = await h.route.POST(h.request('POST'));
  assert.equal(post.status, 200);
  assert.equal((await post.json()).snapshot.checks[0].status, 'pass');
  assert.equal(h.adapterCount(), 1);
  assert.deepEqual(h.tasks, ['typecheck']);
});

test('native same-origin browser GET uses Fetch metadata without relaxing POST', async t => {
  const h = routeHarness(t, { user: 'operator' });
  const request = new nextServer.NextRequest('https://knoux.store/api/build/verify', {
    headers: { 'sec-fetch-site': 'same-origin' },
  });
  assert.equal((await (await h.route.GET(request)).json()).enabled, true);
  for (const site of ['cross-site', 'same-site', 'none']) {
    const denied = await h.route.GET(new nextServer.NextRequest(request.url, { headers: { 'sec-fetch-site': site } }));
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).enabled, false);
  }
  const post = new nextServer.NextRequest(request.url, { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: '{"task":"typecheck"}' });
  assert.equal((await h.route.POST(post)).status, 403);
  assert.equal(h.adapterCount(), 0);
});

test('deployment flag and task allowlist still refuse before adapter construction', async t => {
  const h = routeHarness(t, { user: 'operator', env: { KNOUX_BUILD_ALLOW_VERIFY: '0' } });
  assert.equal((await h.route.POST(h.request('POST'))).status, 403);
  assert.equal((await (await h.route.GET(h.request('GET'))).json()).enabled, false);
  process.env.KNOUX_BUILD_ALLOW_VERIFY = '1';
  for (const body of ['not-json', '{"task":"test;whoami"}', '{"task":7}']) {
    assert.equal((await h.route.POST(h.request('POST', 'https://knoux.store', body))).status, 400);
  }
  assert.equal(h.adapterCount(), 0);
});

const HEAD_A = 'a'.repeat(40);
const HEAD_B = 'b'.repeat(40);
const fixtureRoot = nodePath.resolve(root, 'controlled-verification-fixture');

function adapterHarness({ before = {}, after = {}, output = 'Controlled success', code = 0, onRun } = {}) {
  const initial = { head: HEAD_A, status: '', diff: '', untracked: {}, ...before,
    headReads: before.headReads?.slice(), statusReads: before.statusReads?.slice(),
  };
  const final = { ...initial, ...after,
    headReads: (after.headReads ?? initial.headReads)?.slice(),
    statusReads: (after.statusReads ?? initial.statusReads)?.slice(),
  };
  const calls = [];
  let ran = false;
  let state = initial;
  const fsMock = {
    ...nodeFs, existsSync: () => false, realpathSync: { native: value => value },
    promises: {
      realpath: async value => state.alias ? nodePath.join(fixtureRoot, 'private', 'secret') : value,
      open: async file => {
        const relative = nodePath.relative(fixtureRoot, file).split(nodePath.sep).join('/');
        assert.ok(relative in state.untracked, `Unexpected file read: ${relative}`);
        const entry = state.untracked[relative];
        if (entry === null) throw new Error('Unreadable source');
        const content = Buffer.from(entry);
        let position = 0;
        return {
          stat: async () => ({ isFile: () => true, size: content.length, mtimeMs: 1, ctimeMs: 1 }),
          read: async (buffer, offset, length) => {
            const bytesRead = Math.min(length, content.length - position);
            content.copy(buffer, offset, position, position + bytesRead);
            position += bytesRead;
            return { bytesRead };
          },
          close: async () => {},
        };
      },
    },
  };
  const spawn = (binary, argv, options) => {
    const isGit = /^git(?:\.exe)?$/i.test(nodePath.basename(binary));
    const args = isGit ? argv.slice(2) : argv;
    calls.push({ isGit, args });
    assert.equal(options.cwd, fixtureRoot);
    assert.equal(options.shell, false);
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => {
      let value = null;
      if (isGit) {
        assert.ok(nodePath.isAbsolute(binary), 'Git must not be resolved from the ambient PATH');
        assert.deepEqual(argv.slice(0, 2), ['-c', 'core.fsmonitor=false']);
        const systemRoot = process.env.SystemRoot || 'C:\\Windows';
        assert.deepEqual(options.env, process.platform === 'win32'
          ? { NODE_ENV: 'production', SystemRoot: systemRoot, PATH: nodePath.join(systemRoot, 'System32'), GIT_OPTIONAL_LOCKS: '0' }
          : { NODE_ENV: 'production', PATH: '/usr/bin:/bin', GIT_OPTIONAL_LOCKS: '0' });
        if (args[0] === 'rev-parse') value = args.at(-1) === 'HEAD' ? (state.headReads?.shift() ?? state.head) : HEAD_A;
        else if (args[0] === 'status') value = state.statusReads?.shift() ?? state.status;
        else if (args[0] === 'diff') {
          assert.ok(args.includes('--no-ext-diff') && args.includes('--no-textconv') && args.includes('--binary'));
          assert.equal(args[4], state.head);
          value = state.diff;
        } else if (args[0] === 'ls-files') {
          assert.ok(args.includes('--exclude-standard') && args.includes('-z'));
          assert.ok(args.includes('src') && args.includes('tests') && args.includes('package-lock.json'));
          assert.equal(args.includes('.env'), false);
          value = state.listUnavailable ? null : state.listing ?? Object.keys(state.untracked).map(file => `${file}\0`).join('');
        } else if (args[0] === 'log') value = '';
        else if (args[0] === 'rev-list') value = '0\t0';
        else throw new Error(`Unexpected git command: ${args.join(' ')}`);
      } else {
        assert.equal(ran, false, 'at most one app process');
        assert.deepEqual(args, ['run', 'typecheck']);
        assert.ok(calls.some(call => call.args[0] === 'diff'), 'content identity precedes spawn');
        assert.ok(calls.filter(call => call.args[0] === 'status').length >= 2, 'status bracket precedes spawn');
        ran = true;
        value = output;
        state = final;
        onRun?.();
      }
      if (value !== null) child.stdout.write(Buffer.from(value));
      child.emit('close', isGit && value === null ? 128 : isGit ? 0 : code);
    });
    return child;
  };
  const { FsProjectAdapter } = load('src/lib/build/project-adapter.ts', {
    'node:fs': fsMock, 'node:path': nodePath, 'node:crypto': nodeCrypto,
    'node:child_process': { spawn }, '../security/redact': load('src/lib/security/redact.ts'),
  });
  return { adapter: new FsProjectAdapter({ root: fixtureRoot, environment: 'local', label: 'controlled' }), calls, didRun: () => ran };
}

for (const scenario of [
  { name: 'unchanged clean source', before: {}, evidence: /Working tree clean/ },
  { name: 'unchanged dirty tracked WIP', before: { status: ' M src/dirty.ts\0', diff: 'PRIVATE_TRACKED_SOURCE_CONTENT' }, evidence: /dirty \(WIP\)/ },
  { name: 'unchanged untracked WIP', before: { status: '?? src/\0', untracked: { 'src/new.ts': 'PRIVATE_UNTRACKED_SOURCE_CONTENT' } }, evidence: /dirty \(WIP\)/ },
]) {
  test(`verification allows ${scenario.name} without exposing source`, async t => {
    environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '1' });
    const h = adapterHarness(scenario);
    const snapshot = await h.adapter.runVerification('typecheck');
    assert.equal(snapshot.checks[0].status, 'pass');
    assert.equal(snapshot.headSha, HEAD_A);
    assert.match(snapshot.checks[0].evidence, scenario.evidence);
    assert.equal(snapshot.sourceState, scenario.before.status ? 'wip' : 'clean');
    assert.equal(h.didRun(), true);
    assert.equal(JSON.stringify(snapshot).includes('PRIVATE_'), false);
    assert.equal('digest' in snapshot, false);
  });
}

for (const scenario of [
  { name: 'HEAD A to B', after: { head: HEAD_B } },
  { name: 'clean to dirty status', after: { status: ' M src/file.ts\0', diff: 'EDIT' } },
  { name: 'already-dirty tracked content with identical status', before: { status: ' M src/file.ts\0', diff: 'PRIVATE_CONTENT_A' }, after: { diff: 'PRIVATE_CONTENT_B' } },
  { name: 'already-untracked content with identical status and paths', before: { status: '?? src/\0', untracked: { 'src/new.ts': 'PRIVATE_CONTENT_A' } }, after: { untracked: { 'src/new.ts': 'PRIVATE_CONTENT_B' } } },
  { name: 'added untracked source inside an already-untracked directory', before: { status: '?? src/\0', untracked: { 'src/new.ts': 'A' } }, after: { untracked: { 'src/new.ts': 'A', 'src/another.ts': 'B' } } },
]) {
  test(`exit zero cannot establish PASS after ${scenario.name}`, async t => {
    environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '1' });
    const h = adapterHarness(scenario);
    const snapshot = await h.adapter.runVerification('typecheck');
    assert.equal(snapshot.checks[0].exitCode, 0);
    assert.equal(snapshot.checks[0].status, 'blocked');
    assert.equal(snapshot.sourceState, 'unknown');
    assert.match(snapshot.checks[0].evidence, /Source identity changed/);
    assert.equal(snapshot.headSha, HEAD_A, 'never relabel a run with post-spawn HEAD B');
    assert.equal(JSON.stringify(snapshot).includes('PRIVATE_'), false);
  });
}

for (const failure of [
  { name: 'missing HEAD', head: null },
  { name: 'empty HEAD', head: '' },
  { name: 'invalid HEAD', head: 'HEAD' },
  { name: 'missing status', status: null },
  { name: 'missing tracked diff', diff: null },
  { name: 'overflowed tracked diff', diff: 'x'.repeat(400_001) },
  { name: 'missing untracked listing', listUnavailable: true },
  { name: 'malformed untracked listing', listing: 'src/new.ts' },
  { name: 'too many untracked files', untracked: Object.fromEntries(Array.from({ length: 4001 }, (_, i) => [`src/file-${i}.ts`, ''])) },
  { name: 'exceeded total source byte bound', untracked: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`src/file-${i}.ts`, 'x'.repeat(512 * 1024)])) },
  { name: 'untracked symlink alias', alias: true, untracked: { 'src/new.ts': 'secret target must not be read' } },
  { name: 'HEAD moving during identity acquisition', headReads: [HEAD_A, HEAD_B] },
  { name: 'status moving during identity acquisition', statusReads: ['', ' M src/file.ts\0'] },
  { name: 'unreadable untracked source', untracked: { 'src/new.ts': null } },
  { name: 'oversized untracked source', untracked: { 'src/new.ts': 'x'.repeat(512 * 1024 + 1) } },
]) {
  for (const phase of ['before', 'after']) {
    test(`${failure.name} ${phase} spawn fails closed`, async t => {
      environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '1' });
      const h = adapterHarness({ [phase]: failure });
      const snapshot = await h.adapter.runVerification('typecheck');
      assert.equal(snapshot.checks[0].status, 'blocked');
      assert.match(snapshot.checks[0].evidence, /Source identity unavailable/);
      assert.equal(h.didRun(), phase === 'after');
      assert.equal(snapshot.checks[0].exitCode, phase === 'after' ? 0 : null);
    });
  }
}

test('nonzero exit remains fail for stable source and output redaction precedes truncation', async t => {
  environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '1' });
  const h = adapterHarness({ code: 1, output: `API_KEY=${'SENSITIVE_VALUE'.repeat(110)}\nordinary diagnostic` });
  const snapshot = await h.adapter.runVerification('typecheck');
  assert.equal(snapshot.checks[0].status, 'fail');
  assert.equal(snapshot.checks[0].exitCode, 1);
  assert.equal(snapshot.checks[0].evidence.includes('SENSITIVE_VALUE'), false);
  assert.match(snapshot.checks[0].evidence, /ordinary diagnostic/);
});

test('source measurement remains covered by the process-wide single-run lock', async t => {
  environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '1' });
  let concurrent;
  const h = adapterHarness({ onRun: () => {
    concurrent = h.adapter.runVerification('typecheck').catch(error => error);
  } });
  assert.equal((await h.adapter.runVerification('typecheck')).checks[0].status, 'pass');
  assert.match((await concurrent).message, /already in progress/);
  assert.equal(h.calls.filter(call => !call.isGit).length, 1);
});

test('adapter flag and task allowlist refuse without any process', async t => {
  environment(t, { KNOUX_BUILD_ALLOW_VERIFY: '0' });
  const h = adapterHarness();
  await assert.rejects(h.adapter.runVerification('typecheck'), /disabled/);
  process.env.KNOUX_BUILD_ALLOW_VERIFY = '1';
  await assert.rejects(h.adapter.runVerification('arbitrary'), /allowlist/);
  assert.equal(h.calls.length, 0);
});

for (const scenario of [
  { name: 'unreadable status', before: { status: null }, available: false, dirty: null, head: HEAD_A },
  { name: 'overflowed status', before: { status: 'x'.repeat(400_001) }, available: false, dirty: null, head: HEAD_A },
  { name: 'missing HEAD', before: { head: null }, available: false, dirty: null, head: null },
  { name: 'empty HEAD', before: { head: '' }, available: false, dirty: null, head: null },
  { name: 'known clean checkout', before: {}, available: true, dirty: false, head: HEAD_A },
  { name: 'known dirty checkout', before: { status: ' M src/file.ts\n' }, available: true, dirty: true, head: HEAD_A },
]) {
  test(`gitSnapshot reports ${scenario.name} honestly`, async () => {
    const h = adapterHarness(scenario);
    const snapshot = await h.adapter.gitSnapshot();
    assert.equal(snapshot.available, scenario.available);
    assert.equal(snapshot.dirty, scenario.dirty);
    assert.equal(snapshot.headSha, scenario.head);
    assert.equal(snapshot.blocker !== null, !scenario.available);
    assert.equal(h.didRun(), false);
    if (!scenario.available) assert.match(snapshot.blocker, /unknown/);
  });
}
