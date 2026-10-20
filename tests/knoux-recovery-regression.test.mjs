/** Source-level regression checks for the safe offline KNOuX repair handoff.
 * Does NOT claim live bridge pairing, Supabase credentials, or browser UI passed.
 *
 * These assertions describe the merged tree after the growth-branch integration:
 * the dev surface kept the newer app implementation (English chrome, main's
 * bridge/PtyPreloadBuffer mechanics), so the checks below pin the properties
 * that actually matter - write-only secrets, measured bridge state, bounded PTY
 * preload - rather than the superseded branch-side file shapes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('provider secrets stay write-only and gated on a writable vault', () => {
  const center = source('src/components/build/providers/ProviderCenter.tsx');
  assert.match(center, /data\?\.persistence === 'AVAILABLE'/);
  assert.match(center, /writable && data\?\.secretStore\.writable/);
  assert.match(center, /type="password" autoComplete="new-password"/);
  assert.match(center, /disabled=\{!vaultWritable\}/);
  assert.doesNotMatch(center, /localStorage|sessionStorage/);
});

test('terminal and PowerShell require real bridge status and give actionable login/pairing guidance', () => {
  for (const file of ['TerminalPage', 'PowerShellPage']) {
    const text = source(`src/components/build/dev/${file}.tsx`);
    assert.match(text, /fetch\('\/api\/build\/bridge\/status'/);
    assert.match(text, /response\.status === 401/);
    assert.match(text, /\/build\/settings/);
    assert.match(text, /setCwd\(''\)/);
    assert.doesNotMatch(text, /setCwd\(body\.handshake\.root\)/);
  }
});

test('PowerShell buffers only actual PTY output until xterm mounts, bounded', () => {
  const page = source('src/components/build/dev/PowerShellPage.tsx');
  const preload = source('src/lib/build/pty-preload.ts');
  assert.match(page, /onOutput: \(data\) => \{/);
  assert.match(page, /preloadRef\.current\.push\(data\)/);
  assert.match(page, /preloadRef\.current\.drain\(\)/);
  assert.match(page, /preloadRef\.current\.reset\(\)/);
  assert.match(preload, /DEFAULT_PRELOAD_LIMIT_BYTES = 128 \* 1024/);
  assert.doesNotMatch(page, /child_process|node-pty|powershell:run/);
});

test('Settings bridge check reports measured state instead of claiming shell availability', () => {
  const page = source('src/components/build/dev/SettingsPage.tsx');
  assert.match(page, /fetch\('\/api\/build\/bridge\/status'/);
  assert.match(page, /body\?\.reachable && body\.handshake/);
  assert.match(page, /response\.status === 401/);
  assert.match(page, /CHECK BRIDGE CONNECTION/);
});
