import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveInsideRoot, normalizeRelativePath, isValidGitRef, hasScope,
  realpathInside, realpathForCreate,
} from '../dist/policy.js';

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'knx-policy-'));
}

test('normalizeRelativePath rejects absolute paths', () => {
  const result = normalizeRelativePath('/etc/passwd');
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /absolute/i);
});

test('normalizeRelativePath rejects traversal that leaves the root', () => {
  for (const path of ['../outside', 'a/../../b', '..', '../../etc/passwd']) {
    const result = normalizeRelativePath(path);
    assert.equal(result.ok, false, `expected ${path} to be rejected`);
  }
});

test('traversal that stays inside the root collapses to the root itself', () => {
  // 'a/..' does not escape, so it is allowed and resolves to the root. Refusing
  // it would be noise; the containment check is what actually matters.
  assert.deepEqual(normalizeRelativePath('a/..'), { ok: true, relative: '.' });
  assert.deepEqual(normalizeRelativePath('.'), { ok: true, relative: '.' });
  assert.deepEqual(normalizeRelativePath('a/./b'), { ok: true, relative: 'a/b' });
});

test('normalizeRelativePath rejects null bytes', () => {
  const result = normalizeRelativePath('a\0b');
  assert.equal(result.ok, false);
});

test('normalizeRelativePath rejects Windows reserved names', () => {
  for (const name of ['con', 'NUL.txt', 'com1', 'LPT9']) {
    const result = normalizeRelativePath(`dir/${name}`);
    assert.equal(result.ok, false, `expected ${name} to be rejected`);
  }
});

test('normalizeRelativePath rejects alternate data streams', () => {
  const result = normalizeRelativePath('file.txt:hidden');
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /data stream/i);
});

test('normalizeRelativePath accepts ordinary relative paths', () => {
  const result = normalizeRelativePath('src/lib/index.ts');
  assert.equal(result.ok, true);
  assert.equal(result.relative, 'src/lib/index.ts');
});

test('resolveInsideRoot confines a path to the root', () => {
  const root = tempRoot();
  try {
    const result = resolveInsideRoot(root, 'a/b.txt');
    assert.equal(result.ok, true);
    assert.equal(result.relative, 'a/b.txt');
    assert.equal(result.absolute, join(root, 'a', 'b.txt'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolveInsideRoot denies .git internals', () => {
  const root = tempRoot();
  try {
    assert.equal(resolveInsideRoot(root, '.git').ok, false);
    assert.equal(resolveInsideRoot(root, '.git/config').ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolveInsideRoot denies bridge configuration', () => {
  const root = tempRoot();
  try {
    assert.equal(resolveInsideRoot(root, 'bridge').ok, false);
    assert.equal(resolveInsideRoot(root, 'bridge/src/server.ts').ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolveInsideRoot denies env files unless explicitly allowed', () => {
  const root = tempRoot();
  try {
    assert.equal(resolveInsideRoot(root, '.env').ok, false);
    assert.equal(resolveInsideRoot(root, '.env.local').ok, false);
    assert.equal(resolveInsideRoot(root, '.env', { allowEnvWrite: true }).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a sibling directory sharing a name prefix is still outside the root', () => {
  const base = tempRoot();
  const root = join(base, 'app');
  const sibling = join(base, 'app-secrets');
  mkdirSync(root, { recursive: true });
  mkdirSync(sibling, { recursive: true });
  try {
    // The traversal is caught by normalizeRelativePath, and the containment
    // check is the second line of defence if it ever were not.
    assert.equal(resolveInsideRoot(root, '../app-secrets/key.txt').ok, false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('isValidGitRef rejects shell metacharacters', () => {
  for (const ref of ['main;rm -rf /', 'a$(whoami)', 'a|b', 'a&b', 'a\nb', 'a`b`']) {
    assert.equal(isValidGitRef(ref), false, `expected ${JSON.stringify(ref)} to be rejected`);
  }
});

test('isValidGitRef rejects structurally invalid names', () => {
  for (const ref of ['', 'a..b', 'a//b', '/leading', 'trailing/', 'x.lock', 'x'.repeat(256)]) {
    assert.equal(isValidGitRef(ref), false, `expected ${JSON.stringify(ref)} to be rejected`);
  }
});

test('isValidGitRef accepts real branch names', () => {
  for (const ref of ['main', 'feat/dev-workspace-real', 'fix/bridge-1', 'release-2.0']) {
    assert.equal(isValidGitRef(ref), true, `expected ${ref} to be accepted`);
  }
});

test('hasScope checks membership', () => {
  assert.equal(hasScope(['fs:read', 'fs:write'], 'fs:write'), true);
  assert.equal(hasScope(['fs:read'], 'fs:write'), false);
  assert.equal(hasScope([], 'logs:read'), false);
});

/**
 * A path can be lexically inside the root and still escape it through a symlink.
 * Lexical checks cannot see that, so the I/O boundary re-checks with realpath.
 * These tests cover the escape that the lexical layer necessarily allows.
 */
test('realpathInside rejects a symlink that escapes the root', () => {
  const root = tempRoot();
  const outside = tempRoot();
  try {
    writeFileSync(join(outside, 'secret.txt'), 'classified');
    symlinkSync(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');

    // The lexical check passes, which is exactly why the realpath check exists.
    assert.equal(resolveInsideRoot(root, 'escape/secret.txt').ok, true);

    assert.throws(
      () => realpathInside(root, join(root, 'escape', 'secret.txt')),
      /outside the workspace root/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('realpathInside allows a symlink that stays inside the root', () => {
  const root = tempRoot();
  try {
    mkdirSync(join(root, 'real'), { recursive: true });
    writeFileSync(join(root, 'real', 'file.txt'), 'ok');
    symlinkSync(join(root, 'real'), join(root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');

    const resolved = realpathInside(root, join(root, 'alias', 'file.txt'));
    assert.match(resolved, /file\.txt$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('realpathForCreate rejects a new file under an escaping symlink', () => {
  const root = tempRoot();
  const outside = tempRoot();
  try {
    symlinkSync(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () => realpathForCreate(root, join(root, 'escape', 'new.txt')),
      /outside the workspace root/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('realpathForCreate accepts a new file inside the root', () => {
  const root = tempRoot();
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    const resolved = realpathForCreate(root, join(root, 'src', 'new.ts'));
    assert.match(resolved, /new\.ts$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});