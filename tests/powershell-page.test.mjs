import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('PowerShellPage implementation', async (t) => {
  const pagePath = join(process.cwd(), 'src/components/build/dev/PowerShellPage.tsx');
  const code = readFileSync(pagePath, 'utf8');

  await t.test('is no longer placeholder-only', () => {
    assert.ok(!code.includes('placeholder-only'), 'Should not contain placeholder comments');
    assert.ok(code.includes('TerminalTransport'), 'Should use TerminalTransport');
    assert.ok(code.includes('xterm'), 'Should load xterm');
  });

  await t.test('uses /api/build/bridge/status', () => {
    assert.ok(code.includes("fetch('/api/build/bridge/status'"), 'Should check bridge status');
  });

  await t.test('uses TerminalTransport', () => {
    assert.ok(code.includes('new TerminalTransport('), 'Should instantiate TerminalTransport');
  });

  await t.test('only pwsh/powershell profiles are selectable', () => {
    assert.ok(
      code.includes("p.id === 'pwsh' || p.id === 'powershell'"),
      'Should filter profiles to pwsh or powershell'
    );
  });

  await t.test('prefers pwsh when both exist', () => {
    assert.ok(
      code.includes("if (a.id === 'pwsh') return -1;"),
      'Should sort pwsh first'
    );
  });

  await t.test('reports no-profile blocker honestly', () => {
    assert.ok(
      code.includes("blocker: 'NO POWERSHELL PROFILE'"),
      'Should report NO POWERSHELL PROFILE blocker'
    );
  });

  await t.test('renders measured facts', () => {
    assert.ok(code.includes('handshake.powershellVersion'), 'Should render powershellVersion');
    assert.ok(code.includes('handshake.executionPolicy'), 'Should render executionPolicy');
    assert.ok(code.includes('handshake.elevated'), 'Should render elevated state');
  });

  await t.test('does not duplicate PTY backend', () => {
    assert.ok(
      !code.includes('child_process') && !code.includes('node-pty'),
      'Should not contain child_process or node-pty in web app'
    );
  });

  await t.test('does not introduce new bridge scopes', () => {
    assert.ok(
      !code.includes('command.arbitrary') && !code.includes('powershell:run'),
      'Should not introduce new command execution scopes'
    );
  });
  
  await t.test('cleanup closes transport and xterm', () => {
    assert.ok(
      code.includes('transportRef.current.close()'),
      'Should close transport on unmount'
    );
    assert.ok(
      code.includes('termRef.current.dispose()') || code.includes('terminal.dispose()'),
      'Should dispose xterm on unmount'
    );
  });
});

test('Security boundaries for PowerShell page', async (t) => {
  const pagePath = join(process.cwd(), 'src/components/build/dev/PowerShellPage.tsx');
  const code = readFileSync(pagePath, 'utf8');
  
  await t.test('does not introduce a new arbitrary command endpoint', () => {
    assert.ok(!code.includes('/api/build/powershell'), 'Should not hit new powershell backend routes');
    assert.ok(!code.includes('exec('), 'Should not exec');
  });
});
