import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, isAbsolute } from 'node:path';
import { loadConfig, validateConfigObject } from '../dist/config.js';
import { DEFAULT_LIMITS } from '../dist/policy.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'knx-config-'));
}

function withConfig(name, body) {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
    return { dir, config: loadConfig(dir) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('no config file yields the defaults rooted at the working directory', () => {
  const dir = tempDir();
  try {
    const config = loadConfig(dir);
    assert.equal(config.root, resolve(dir));
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.port, 7331);
    assert.equal(config.allowEnvWrite, false);
    assert.equal(config.loadProfile, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a config file is read and applied', () => {
  const { config } = withConfig('bridge.config.json', {
    port: 7400,
    allowEnvWrite: true,
    limits: { maxSessions: 7 },
  });
  assert.equal(config.port, 7400);
  assert.equal(config.allowEnvWrite, true);
  assert.equal(config.limits.maxSessions, 7);
});

test('the local override wins over the shared file', () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, 'bridge.config.json'), JSON.stringify({ port: 7400, loadProfile: true }), 'utf8');
    writeFileSync(join(dir, 'bridge.config.local.json'), JSON.stringify({ port: 7500 }), 'utf8');

    const config = loadConfig(dir);
    assert.equal(config.port, 7500, 'the local file overrides the shared one');
    assert.equal(config.loadProfile, true, 'settings only in the shared file survive');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a relative root resolves against the config directory, not the process cwd', () => {
  // The bridge may be started from anywhere; 'root: "."' must mean the
  // workspace beside the config file.
  const { dir, config } = withConfig('bridge.config.json', { root: '.' });
  assert.equal(config.root, resolve(dir));
  assert.equal(isAbsolute(config.root), true);
});

test('an absolute root is kept as given', () => {
  const absolute = resolve(tempDir());
  const { config } = withConfig('bridge.config.json', { root: absolute });
  assert.equal(config.root, absolute);
});

test('a boolean that is not exactly true stays false', () => {
  // Anything truthy would let a string "false" open the gate.
  for (const value of ['true', 1, 'yes', {}, []]) {
    const config = validateConfigObject({ allowEnvWrite: value, loadProfile: value });
    assert.equal(config.allowEnvWrite, false, `allowEnvWrite=${JSON.stringify(value)} must be false`);
    assert.equal(config.loadProfile, false, `loadProfile=${JSON.stringify(value)} must be false`);
  }
});

test('an out-of-range port falls back to the default', () => {
  for (const port of [0, -1, 70000, 'not a number', null]) {
    const config = validateConfigObject({ port });
    assert.equal(config.port, 7331, `port=${JSON.stringify(port)} must fall back`);
  }
});

test('an out-of-range port number is clamped rather than trusted', () => {
  assert.equal(validateConfigObject({ port: 1 }).port, 1);
  assert.equal(validateConfigObject({ port: 65535 }).port, 65535);
  assert.equal(validateConfigObject({ port: 65536 }).port, 7331);
});

test('limits merge over the defaults rather than replacing them', () => {
  const config = validateConfigObject({ limits: { maxSessions: 2 } });
  assert.equal(config.limits.maxSessions, 2);
  assert.equal(config.limits.idleTimeoutMinutes, DEFAULT_LIMITS.idleTimeoutMinutes);
  assert.equal(config.limits.scrollbackBytes, DEFAULT_LIMITS.scrollbackBytes);
});

test('a malformed allowlist disables exec rather than enabling the defaults', () => {
  // A typo must not be a privilege grant. Falling back to the four default npm
  // tasks would mean a config error silently turns execution back on, so a
  // malformed value is read as "nothing is allowlisted".
  for (const bad of ['npm run lint', 42, null, ['npm', 'run', 'lint']]) {
    const config = validateConfigObject({ allowlistedTasks: bad });
    assert.deepEqual(config.allowlistedTasks, {}, `allowlistedTasks=${JSON.stringify(bad)} must yield none`);
  }
});

test('an empty allowlist is honoured, disabling exec', () => {
  // Merging an empty object over the defaults would silently keep the default
  // tasks, so an operator could not turn exec off at all.
  const config = validateConfigObject({ allowlistedTasks: {} });
  assert.deepEqual(config.allowlistedTasks, {});
});

test('an omitted allowlist keeps the default tasks', () => {
  const config = validateConfigObject({ port: 7400 });
  assert.ok(Object.keys(config.allowlistedTasks).length > 0);
});

test('a malformed allowlist entry is dropped, keeping the valid ones', () => {
  const config = validateConfigObject({
    allowlistedTasks: {
      good: ['npm', 'run', 'lint'],
      notAnArray: 'npm run lint',
      emptyArgv: [],
      nonStringArgv: ['npm', 42],
      'bad name; rm -rf /': ['npm'],
      another: ['node', 'scripts/x.mjs'],
    },
  });
  assert.deepEqual(Object.keys(config.allowlistedTasks).sort(), ['another', 'good']);
});

test('a non-array allowlisted value leaves exec disabled', () => {
  const config = validateConfigObject({ allowlistedTasks: { lint: 'npm run lint' } });
  assert.deepEqual(config.allowlistedTasks, {});
});

test('a non-object process profile map yields no processes', () => {
  for (const bad of ['dev', 7, []]) {
    assert.deepEqual(validateConfigObject({ processProfiles: bad }).processProfiles, {});
  }
});

test('a process profile without a runnable command is dropped', () => {
  const config = validateConfigObject({
    processProfiles: {
      good: { cmd: 'npm', args: ['run', 'dev'], port: 3000 },
      noCmd: { args: ['run', 'dev'] },
      emptyCmd: { cmd: '', args: ['run', 'dev'] },
      badArgs: { cmd: 'npm', args: 'run dev' },
      emptyArgs: { cmd: 'npm', args: [] },
      nonStringArg: { cmd: 'npm', args: ['run', 7] },
    },
  });
  assert.deepEqual(Object.keys(config.processProfiles), ['good']);
  assert.deepEqual(config.processProfiles.good, { cmd: 'npm', args: ['run', 'dev'], port: 3000 });
});

test('an out-of-range port on a process profile is dropped, not clamped', () => {
  const config = validateConfigObject({
    processProfiles: { dev: { cmd: 'npm', args: ['run', 'dev'], port: 70000 } },
  });
  assert.equal(config.processProfiles.dev.port, undefined);
});

test('an omitted process profile map yields no processes', () => {
  assert.deepEqual(validateConfigObject({ port: 7400 }).processProfiles, {});
});

test('a malformed config file does not prevent startup', () => {
  const { config } = withConfig('bridge.config.json', '{ this is not json');
  assert.equal(config.port, 7331, 'defaults apply when the file cannot be parsed');
});

test('a config file that is a JSON array is ignored', () => {
  const { config } = withConfig('bridge.config.json', '[1, 2, 3]');
  assert.equal(config.port, 7331);
});

test('an invalid local override still leaves the shared file in effect', () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, 'bridge.config.json'), JSON.stringify({ port: 7400 }), 'utf8');
    writeFileSync(join(dir, 'bridge.config.local.json'), 'not json at all', 'utf8');
    assert.equal(loadConfig(dir).port, 7400);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a nested allowlisted task value is preserved verbatim', () => {
  const config = validateConfigObject({
    allowlistedTasks: { custom: ['node', 'scripts/check.mjs', '--json'] },
  });
  assert.deepEqual(config.allowlistedTasks.custom, ['node', 'scripts/check.mjs', '--json']);
});

test('a deeply nested structure merges rather than clobbering', () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, 'bridge.config.json'), JSON.stringify({
      limits: { maxSessions: 5, idleTimeoutMinutes: 60 },
    }), 'utf8');
    writeFileSync(join(dir, 'bridge.config.local.json'), JSON.stringify({
      limits: { maxSessions: 2 },
    }), 'utf8');

    const config = loadConfig(dir);
    assert.equal(config.limits.maxSessions, 2, 'the override wins for its own key');
    assert.equal(config.limits.idleTimeoutMinutes, 60, 'and does not drop its sibling');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a config directory with no files still resolves a usable root', () => {
  const dir = tempDir();
  try {
    const nested = join(dir, 'workspace');
    mkdirSync(nested, { recursive: true });
    assert.equal(loadConfig(nested).root, resolve(nested));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});