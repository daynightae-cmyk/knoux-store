/** Source-level regression checks for the safe offline KNOuX repair handoff.
 * Does NOT claim live bridge pairing, Supabase credentials, or browser UI passed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('DEV content inherits chosen locale rather than enforcing English LTR', () => {
  const shell = source('src/components/build/dev/DevWorkspaceShell.tsx');
  assert.match(shell, /dir=\{guideDirection\(language\)\}/);
  assert.doesNotMatch(shell, /lang="en" dir="ltr"/);
});

test('provider secret entry remains write-only, with an explicit authenticated sign-in path', () => {
  const center = source('src/components/build/providers/ProviderCenter.tsx');
  const entry = source('src/components/build/providers/CredentialEntry.tsx');
  assert.match(center, /data\?\.persistence === 'AUTH_REQUIRED'/);
  assert.match(center, /\/login\?next=%2Fbuild%2Fproviders/);
  assert.match(center, /writable && data\?\.secretStore\.writable/);
  assert.match(entry, /type=\{visible&&secret\?'text':'password'\}/);
  assert.match(entry, /disabled=\{!writable\|\|busy\}/);
  assert.doesNotMatch(entry, /localStorage|sessionStorage/);
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

test('PowerShell buffers only actual PTY output until xterm mounts', () => {
  const page = source('src/components/build/dev/PowerShellPage.tsx');
  assert.match(page, /onOutput: \(data\) => \{/);
  assert.match(page, /pendingOutputRef\.current\.push\(data\)/);
  assert.match(page, /pendingBytesRef\.current > 131072/);
  assert.match(page, /terminal\.write\(pendingOutputRef\.current\.join\(''\)\)/);
  assert.match(page, /getSelection: \(\) => terminal\.getSelection\(\)/);
  assert.doesNotMatch(page, /child_process|node-pty|powershell:run/);
});

test('Settings bridge check reports measured state instead of claiming shell availability', () => {
  const page = source('src/components/build/dev/SettingsPage.tsx');
  assert.match(page, /fetch\('\/api\/build\/bridge\/status'/);
  assert.match(page, /result\.reachable && result\.handshake/);
  assert.match(page, /response\.status === 401/);
  assert.match(page, /Check bridge connection/);
});
