import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Read-only donor preservation recheck. Re-hashes every file recorded dirty in
// census.json and compares against the fingerprint captured at census time.
// No donor file is written, staged, restored or reverted by this script.
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8').replace(/^\uFEFF/, ''));
const write = (name, value) => fs.writeFileSync(path.join(here, name), JSON.stringify(value, null, 2) + '\n');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// The dependency-audit worktree is owned by PR #30 and is deliberately out of scope.
const excludedOwner = 'D:/Knoux Store-worktrees/dependency-audit-braces-20261003';
const census = read('census.json');

const checked = [];
const unchanged = [];
const changed = [];
const missing = [];

for (const worktree of census.worktrees) {
  if (worktree.path === excludedOwner) continue;
  for (const entry of worktree.dirty ?? []) {
    const absolute = path.join(worktree.path, entry.path);
    const record = { worktree: worktree.path, branch: worktree.branch, path: entry.path, expected: entry.sha256 };
    checked.push(record);
    if (!fs.existsSync(absolute)) {
      missing.push(record);
      continue;
    }
    const actual = hashFile(absolute);
    if (actual === entry.sha256) unchanged.push(record);
    else changed.push({ ...record, actual });
  }
}

// Independent structural check of the single donor this Phase A worktree reads
// directly, so a silent change cannot be reported as preserved.
const bridgeDonor = 'D:/Knoux Store-worktrees/local-bridge-registration';
let bridgeDirty = '';
try {
  bridgeDirty = execFileSync('git', ['-C', bridgeDonor, 'status', '--short'], { encoding: 'utf8' });
} catch {
  bridgeDirty = 'unavailable';
}

write('preservation-recheck.json', {
  observedAt: new Date().toISOString(),
  baseline: { census: 'census.json', censusObservedAt: census.observedAt, base: census.base },
  excludedOwner: 'PR #30 dependency-audit worktree (independent owner)',
  checked: checked.length,
  unchanged: unchanged.length,
  changed,
  missing,
  bridgeDirtyStatus: bridgeDirty,
  result: changed.length === 0 && missing.length === 0
    ? 'Every recorded donor byte is unchanged since census. Preservation holds; this proves non-mutation only and implies nothing about runtime behavior.'
    : 'PRESERVATION VIOLATED: investigate before any further work.',
});

console.log(JSON.stringify({
  checked: checked.length,
  unchanged: unchanged.length,
  changed: changed.length,
  missing: missing.length,
}, null, 2));