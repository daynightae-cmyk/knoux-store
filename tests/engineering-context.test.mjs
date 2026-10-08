import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { parseWorktrees } = await loadTypeScript('../src/lib/build/engineering-context.ts');
test('worktree parsing preserves spaces, detached and recovery state without cleanup', () => {
  const trees = parseWorktrees('worktree D:/Knoux Store\nHEAD abc\nbranch refs/heads/main\n\nworktree D:/Recovery checkout\nHEAD def\ndetached\nlocked operator\nprunable missing\n');
  assert.equal(trees[0].path, 'D:/Knoux Store');
  assert.equal(trees[0].branch, 'main');
  assert.equal(trees[1].detached, true);
  assert.equal(trees[1].locked, true);
  assert.equal(trees[1].prunable, true);
  assert.equal(trees[1].branch, null);
});
