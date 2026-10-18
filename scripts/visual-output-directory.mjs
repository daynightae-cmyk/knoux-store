/**
 * Screenshot output belongs to this repository's ignored visual-audit tree.
 * A basename check alone cannot prevent ../../other-project/innocent-folder.
 */
import { lstatSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const auditRoot = resolve(projectRoot, 'visual-audit');

export function resolveVisualOutputDirectory(requested, fallback) {
  const raw = requested ?? fallback;
  if (typeof raw !== 'string' || !raw.length || raw.includes(String.fromCharCode(0))) {
    throw new Error('Invalid visual output directory');
  }
  if (raw.split(/[\\/]/).includes('..')) {
    throw new Error('Parent traversal is prohibited in visual output paths');
  }
  const target = resolve(projectRoot, raw);
  const rel = relative(auditRoot, target);
  if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    throw new Error('Visual output must stay inside visual-audit');
  }
  return target;
}

export function prepareVisualOutputDirectory(requested, fallback) {
  const target = resolveVisualOutputDirectory(requested, fallback);
  const parts = ['visual-audit', ...relative(auditRoot, target).split(sep)];
  let current = projectRoot;
  for (const part of parts) {
    current = join(current, part);
    try {
      const entry = lstatSync(current);
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        throw new Error('Visual output contains an unsafe directory component: ' + part);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      mkdirSync(current);
    }
  }
  return target;
}
