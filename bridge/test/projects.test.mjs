import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectProject, cloneProject, projectRoot, publicRepository } from '../dist/projects.js';
import { detectTools } from '../dist/tools.js';
import { validateConfigObject } from '../dist/config.js';
async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'knoux-project-inspect-'));
  try { await run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
test('project inspection measures manifests, scripts, files and routes without executing packages', async () => fixture(async (root) => {
  mkdirSync(join(root, 'project/src/app/products'), { recursive: true });
  writeFileSync(join(root, 'project/package.json'), JSON.stringify({ name: 'Actual project', scripts: { postinstall: 'node CREATE_UNSAFE_SENTINEL.js', test: 'malicious-task' }, dependencies: { next: '16.3.6' } }));
  writeFileSync(join(root, 'project/src/app/page.tsx'), 'export default function Page() { return null; }');
  writeFileSync(join(root, 'project/src/app/products/page.tsx'), 'export default function Products() { return null; }');
  writeFileSync(join(root, 'project/README.md'), '# Actual project\nReal documentation');
  writeFileSync(join(root, 'project/.env'), 'SECRET=never-inspect');
  writeFileSync(join(root, 'project/package-lock.json'), '{}');
  const facts = await inspectProject(root, 'project'); assert.equal(facts.name, 'Actual project'); assert.equal(facts.packageManager, 'npm'); assert.equal(facts.framework, 'Next.js'); assert.deepEqual(facts.routes.map((r) => r.route).sort(), ['/', '/products']); assert.equal(facts.scripts[0].name, 'postinstall'); assert.equal(facts.files.find((f) => f.path === 'README.md').lines, 2); assert.ok(!facts.files.some((f) => f.path.includes('.env'))); assert.equal(existsSync(join(root, 'project/CREATE_UNSAFE_SENTINEL.js')), false);
}));
test('oversized source reports unmeasured line count instead of invented zero', async () => fixture(async (root) => {
  writeFileSync(join(root, 'large.ts'), 'x'.repeat(140 * 1024)); const result = await inspectProject(root, '.'); assert.equal(result.files[0].lines, null);
}));
test('project roots reject traversal and symlink escape', async () => fixture(async (root) => {
  await assert.rejects(projectRoot(root, '../outside')); await assert.rejects(projectRoot(root, join(root, '..')));
  const outside = mkdtempSync(join(tmpdir(), 'knoux-project-outside-'));
  try { symlinkSync(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); await assert.rejects(projectRoot(root, 'escape')); } finally { rmSync(outside, { recursive: true, force: true }); }
}));
test('clone requires explicit config, public URL and new safe destination before any subprocess', async () => fixture(async (root) => {
  assert.equal(validateConfigObject({ root }).allowProjectImport, false);
  await assert.rejects(cloneProject(root, 'https://github.com/example/project', 'new', false), /allowProjectImport/);
  for (const url of ['https://user:token@github.com/a/b', 'file:///repo', 'https://evil.test/a/b', 'https://github.com/a/b?key=secret', 'https://github.com/a/b/../c']) { assert.equal(publicRepository(url), null); await assert.rejects(cloneProject(root, url, 'new', true)); }
  for (const dir of ['../outside', '.', 'with spaces', '--config', 'a/b']) await assert.rejects(cloneProject(root, 'https://github.com/a/b', dir, true));
  assert.equal(existsSync(join(root, 'new')), false);
}));
test('clone never overwrites or adopts existing empty or dirty directories', async () => fixture(async (root) => {
  mkdirSync(join(root, 'existing')); await assert.rejects(cloneProject(root, 'https://github.com/a/b', 'existing', true), { code: 'EEXIST' });
  writeFileSync(join(root, 'existing/unsaved.txt'), 'preserve me'); await assert.rejects(cloneProject(root, 'https://github.com/a/b', 'existing', true), { code: 'EEXIST' }); assert.equal(readFileSync(join(root, 'existing/unsaved.txt'), 'utf8'), 'preserve me');
}));
test('tool detector refuses directory-shaped executables and never invokes Windows command shims', async () => fixture(async (root) => {
  const previous = process.env.PATH; process.env.PATH = root;
  try {
    mkdirSync(join(root, process.platform === 'win32' ? 'codex.exe' : 'codex'));
    if (process.platform === 'win32') writeFileSync(join(root, 'claude.cmd'), '@echo SHOULD_NOT_EXECUTE > sentinel.txt');
    const result = await detectTools(); assert.equal(result.find((t) => t.id === 'codex').available, false); assert.equal(existsSync(join(root, 'sentinel.txt')), false);
    if (process.platform === 'win32') { assert.equal(result.find((t) => t.id === 'claude').available, true); assert.equal(result.find((t) => t.id === 'claude').version, null); }
    assert.equal(result.find((t) => t.id === 'node').available, false); assert.ok(result.every((t) => t.measuredAt)); assert.ok(!JSON.stringify(result).includes(root));
  } finally { process.env.PATH = previous; }
}));
