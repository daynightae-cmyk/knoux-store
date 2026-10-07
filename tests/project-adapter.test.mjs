import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import * as nodeChildProcess from 'node:child_process';
import ts from 'typescript';
import { root } from './helpers.mjs';

/**
 * The filesystem boundary, proven by running it.
 *
 * CodeQL flagged `project-adapter.ts` with three "this path depends on a
 * user-provided value" alerts on the `realpath`/`stat`/`readFile` calls in
 * `readFile`, and it is right to ask. The only test that covered this path was
 * a source match on the route file asserting the string `..` appears — which
 * proves a character is in a file, not that a traversal is refused, and which
 * F-16 already identified as the wrong kind of test.
 *
 * So this exercises the adapter directly, against a real temporary tree, with
 * a real symlink pointing out of the root. It is the test that would fail if
 * the containment check were removed.
 */

/**
 * The adapter imports `node:fs`, `node:path` and `node:child_process`, which
 * the transpiler emits as CommonJS `require` calls. They are real here, not
 * stubs: the test has to exercise the actual `fs.realpath` the defence depends
 * on, and a stubbed filesystem would prove nothing.
 */
function load(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const builtins = {
    'node:fs': nodeFs,
    'node:path': nodePath,
    'node:child_process': nodeChildProcess,
  };
  const req = (specifier) => {
    if (specifier in dependencies) return dependencies[specifier];
    if (specifier in builtins) return builtins[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function('require', 'module', 'exports', output)(req, loaded, loaded.exports);
  return loaded.exports;
}

const { FsProjectAdapter } = load('src/lib/build/project-adapter.ts');

/** A root that looks like the repository: `src/`, `tests/`, `references/`. */
function makeTree() {
  const base = mkdtempSync(join(tmpdir(), 'knoux-adapter-'));

  /**
   * The outside target lives in a *separate* temporary tree, so the symlink
   * genuinely leaves the root. A target placed inside `base/outside/` would
   * only leave the allowlist, which is a different question.
   */
  const elsewhere = mkdtempSync(join(tmpdir(), 'knoux-elsewhere-'));
  const secret = join(elsewhere, 'secret.txt');
  writeFileSync(secret, 'TOP SECRET\n');

  mkdirSync(join(base, 'src', 'lib'), { recursive: true });
  mkdirSync(join(base, 'tests'), { recursive: true });
  mkdirSync(join(base, 'references'), { recursive: true });

  writeFileSync(join(base, 'src', 'lib', 'real.ts'), 'export const real = 1;\n');
  writeFileSync(join(base, 'README.md'), '# tree\n');
  writeFileSync(join(base, 'references', 'NOTE.md'), '# note\n');
  writeFileSync(join(base, 'server.key'), '-----BEGIN PRIVATE KEY-----\n');
  writeFileSync(join(base, '.env'), 'SECRET=1\n');

  /**
   * The attack this test exists for: a link *inside* the allowlisted `src/`
   * tree that resolves outside the root. Every textual guard passes — the path
   * has no dot segment, it starts with `src/`, and `path.resolve` keeps it
   * inside the root. Only `fs.realpath` reveals where it actually points.
   */
  symlinkSync(secret, join(base, 'src', 'lib', 'escape.ts'));

  return { base, elsewhere, secretFile: secret };
}

test('readFile returns a repository file it is allowed to show', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });
  assert.equal(adapter.root, nodeFs.realpathSync.native(base), 'containment must use the canonical checkout root');
  const file = await adapter.readFile('src/lib/real.ts');

  assert.ok(file, 'an allowlisted source file must be readable');
  assert.match(file.content, /export const real/);
  assert.equal(file.bytes, Buffer.byteLength('export const real = 1;\n'));
});

test('a symlink out of the allowlisted tree is refused, not followed', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });
  const file = await adapter.readFile('src/lib/escape.ts');

  assert.equal(
    file,
    null,
    'a path that resolves outside the root must be refused even though its own ' +
      'textual form is inside src/ — that is what fs.realpath is checked for',
  );
});

test('traversal, absolute paths and dot segments are refused', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });

  const refusals = [
    '../outside/secret.txt',
    'src/../../outside/secret.txt',
    'src/lib/../../outside/secret.txt',
    '/etc/passwd',
    'C:\\Windows\\System32\\config\\SAM',
    'src/./lib/../lib/real.ts',
    'src/.hidden/real.ts',
    '',
  ];

  for (const candidate of refusals) {
    assert.equal(
      await adapter.readFile(candidate),
      null,
      `readFile(${JSON.stringify(candidate)}) must be refused`,
    );
  }
});

test('a path outside the allowlist is refused even when it is inside the root', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });

  for (const candidate of ['server.key', 'package.json', '.env', 'src/lib/../server.key']) {
    if (candidate === 'package.json') {
      // package.json is allowlisted at the repository root; this fixture has
      // none, so the refusal below is about the path, not the fixture.
      assert.equal(await adapter.readFile(candidate), null, 'a missing file is null, not an error');
      continue;
    }
    assert.equal(
      await adapter.readFile(candidate),
      null,
      `readFile(${JSON.stringify(candidate)}) must be refused`,
    );
  }
});

test('a directory is refused even when its path is allowlisted', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });
  assert.equal(await adapter.readFile('src/lib'), null, 'a directory is not a readable file');
});

test('an in-checkout symlink cannot cross the readable-file allowlist', async (t) => {
  const { base, elsewhere } = makeTree();
  t.after(() => { rmSync(base, { recursive: true, force: true }); rmSync(elsewhere, { recursive: true, force: true }); });
  symlinkSync(join(base, '.env'), join(base, 'src', 'lib', 'hidden.ts'));
  symlinkSync(join(base, 'server.key'), join(base, 'src', 'lib', 'key.ts'));

  const adapter = new FsProjectAdapter({ root: base, environment: 'local', label: 'test' });
  assert.equal(await adapter.readFile('src/lib/hidden.ts'), null);
  assert.equal(await adapter.readFile('src/lib/key.ts'), null);
});