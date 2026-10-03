import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Read-only repository/reference rescan for the temporary Foursquare staging RPC.
// A previous scan recorded a fingerprint of live-structural-catalog.json that the
// Phase A reconciliation has since rewritten, so this rescan re-establishes the
// result against current bytes. Re-running it must not change its conclusion by
// itself; if it does, the conclusion was never stable.
const here = path.dirname(fileURLToPath(import.meta.url));
const needle = 'signal_temp_stage_foursquare';
const roots = [
  'D:/Knoux Store',
  'C:/Users/k7/.codex/worktrees/2f53/Knoux Store',
  'C:/Users/k7/.codex/worktrees/6528/Knoux Store',
  'C:/Users/k7/.codex/worktrees/9bea/Knoux Store',
  'C:/Users/k7/.codex/worktrees/task04-solar-system',
  'C:/Users/k7/Knoux-Signal-Deploy',
  'C:/Users/k7/ksci-d549392',
  'D:/Knoux Signal',
  'D:/Knoux Store Auth',
  'D:/Knoux Store Supabase',
  'D:/Knoux Store-worktrees/about-origin-room-v2',
  'D:/Knoux Store-worktrees/convergence-20261003',
  'D:/Knoux Store-worktrees/creative-digital-atelier-v2',
  'D:/Knoux Store-worktrees/dependency-audit-braces-20261003',
  'D:/Knoux Store-worktrees/dev-workspace-real',
  'D:/Knoux Store-worktrees/global-visual-shell-v2',
  'D:/Knoux Store-worktrees/home-system-field',
  'D:/Knoux Store-worktrees/labs-experiment-chamber-v2',
  'D:/Knoux Store-worktrees/local-bridge-registration',
  'D:/Knoux Store-worktrees/product-cinematic-v2',
  'D:/Knoux Store-worktrees/wordpress-ecosystem-v2',
  'D:/Knoux Store Recovery/2026-10-02/restored',
  'D:/Knoux Store Integration',
];
const traycerRoot = 'C:/Users/k7/.traycer/worktrees/daynightae-cmyk__knoux-store';
if (fs.existsSync(traycerRoot)) {
  for (const entry of fs.readdirSync(traycerRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) roots.push(path.join(traycerRoot.replace(/\//g, path.sep), entry.name));
  }
}
const excludedDirs = new Set(['node_modules', '.git', '.next', 'data', 'dist', 'test-results', 'playwright-report', '.venv', 'venv']);
const maxBytes = 4 * 1024 * 1024;

let scanned = 0;
let skippedLarge = 0;
let skippedEnv = 0;
const matches = [];

const walk = (dir) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/^\.env/.test(entry.name)) {
      skippedEnv++;
      continue;
    }
    // Read exactly once. The text that is inspected and the bytes that are hashed must
    // come from the same snapshot, so there is no stat pre-check and no second read.
    let bytes;
    try {
      bytes = fs.readFileSync(full);
    } catch {
      continue;
    }
    if (bytes.length > maxBytes) {
      skippedLarge++;
      continue;
    }
    const text = bytes.toString('utf8');
    scanned++;
    const lines = [];
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.includes(needle)) lines.push(index + 1);
    });
    if (lines.length) {
      matches.push({
        path: full,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        lines,
        auditArtifact: full.replace(/\//g, '\\').includes('\\docs\\audit\\'),
      });
    }
  }
};

for (const root of roots) if (fs.existsSync(root)) walk(root);

matches.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(path.join(here, 'foursquare-reference-scan.json'), JSON.stringify({
  rescannedAt: new Date().toISOString(),
  needle,
  scannedFiles: scanned,
  skipped: { largerThan4Mb: skippedLarge, dotEnv: skippedEnv, excludedDirectories: [...excludedDirs] },
  roots,
  matches,
  conclusion: matches.every((m) => m.auditArtifact)
    ? 'Only audit artifacts reference the RPC. This is not proof of absence: external jobs, clients and schedulers are outside these roots, and track_functions=none makes zero recorded calls unusable as inactivity evidence.'
    : 'NON-AUDIT REFERENCES EXIST: the repository does reference this RPC outside audit material. Retirement cannot be inferred.',
}, null, 2) + '\n');

console.log(JSON.stringify({ scannedFiles: scanned, skippedLarge, skippedEnv, matches: matches.map((m) => ({ file: path.basename(m.path), auditArtifact: m.auditArtifact, lines: m.lines.length })) }, null, 2));