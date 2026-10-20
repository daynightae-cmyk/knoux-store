import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVisualOutputDirectory } from '../scripts/visual-output-directory.mjs';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const auditRoot = resolve(projectRoot, 'visual-audit');

test('visual output accepts only paths inside visual-audit', () => {
  assert.equal(resolveVisualOutputDirectory(undefined, 'visual-audit/workspace'), resolve(auditRoot, 'workspace'));
  assert.equal(resolveVisualOutputDirectory('visual-audit/final/screenshots', 'visual-audit/workspace'), resolve(auditRoot, 'final', 'screenshots'));
  assert.equal(resolveVisualOutputDirectory(resolve(auditRoot, 'baseline'), 'visual-audit/workspace'), resolve(auditRoot, 'baseline'));
});

test('visual output rejects parent traversal and outside paths before disk writes', () => {
  for (const input of [
    '../sibling/safe', 'visual-audit/../escape', 'visual-audit/nested/../../escape',
    resolve(projectRoot, 'outside'), projectRoot, auditRoot, '..' + sep + 'outside'
  ]) {
    assert.throws(() => resolveVisualOutputDirectory(input, 'visual-audit/workspace'), /traversal|inside/);
  }
});

test('visual output rejects empty and NUL-bearing paths', () => {
  assert.throws(() => resolveVisualOutputDirectory('', 'visual-audit/workspace'), /Invalid/);
  assert.throws(() => resolveVisualOutputDirectory('visual-audit/a' + String.fromCharCode(0) + 'b', 'visual-audit/workspace'), /Invalid/);
});
