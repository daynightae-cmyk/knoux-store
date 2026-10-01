/**
 * Shell profile discovery — probe the host for available shells.
 *
 * On Windows: pwsh (PowerShell 7) → powershell.exe (5.1) → cmd.exe.
 * Elsewhere: bash → zsh.
 * Discovery uses a real `where`/`which` probe at startup.
 */

import { existsSync } from 'node:fs';
import { platform, userInfo } from 'node:os';
import { execFileSync } from 'node:child_process';
import type { BridgeProfile } from '../protocol.js';

const IS_WINDOWS = platform() === 'win32';

function where(command: string): string | null {
  try {
    const output = execFileSync('where', [command], { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
    const first = output.split('\n')[0]?.trim();
    return first && existsSync(first) ? first : null;
  } catch {
    return null;
  }
}

function which(command: string): string | null {
  try {
    const output = execFileSync('which', [command], { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
    const first = output.split('\n')[0]?.trim();
    return first && existsSync(first) ? first : null;
  } catch {
    return null;
  }
}

function probeVersion(command: string, args: string[]): string | null {
  try {
    const output = execFileSync(command, args, { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
    return output.trim().split('\n')[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Probe results are cached.
 *
 * Discovery runs `where`/`which` and then launches each shell to read its
 * version, which costs hundreds of milliseconds. Doing that per WebSocket
 * handshake or per HTTP request would make opening a terminal feel broken, so
 * results are memoised for a short window. A shell installed while the bridge is
 * running is picked up within the TTL — long enough to be invisible, short
 * enough to not require a restart.
 */
const CACHE_TTL_MS = 60_000;

let cachedProfiles: { at: number; value: BridgeProfile[] } | null = null;
let cachedPolicy: { at: number; value: string | null } | null = null;
let cachedPowerShell: { at: number; value: string | null } | null = null;

/** Discover available shell profiles on this host. */
export function discoverProfiles(options: { fresh?: boolean } = {}): BridgeProfile[] {
  if (!options.fresh && cachedProfiles && Date.now() - cachedProfiles.at < CACHE_TTL_MS) {
    return cachedProfiles.value;
  }
  const value = probeProfiles();
  cachedProfiles = { at: Date.now(), value };
  return value;
}

/** Drop the memoised probes. Exported for tests. */
export function resetProfileCache(): void {
  cachedProfiles = null;
  cachedPolicy = null;
  cachedPowerShell = null;
}

function probeProfiles(): BridgeProfile[] {
  const profiles: BridgeProfile[] = [];

  if (IS_WINDOWS) {
    const pwshPath = where('pwsh.exe') ?? where('pwsh');
    if (pwshPath) {
      const version = probeVersion(pwshPath, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']);
      profiles.push({
        id: 'pwsh',
        path: pwshPath,
        version: version ?? 'unknown',
        args: ['-NoLogo', '-NoProfile'],
      });
    }

    const psPath = where('powershell.exe') ?? where('powershell');
    if (psPath) {
      const version = probeVersion(psPath, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']);
      profiles.push({
        id: 'powershell',
        path: psPath,
        version: version ?? 'unknown',
        args: ['-NoLogo', '-NoProfile'],
      });
    }

    const cmdPath = where('cmd.exe') ?? where('cmd');
    if (cmdPath) {
      profiles.push({
        id: 'cmd',
        path: cmdPath,
        version: 'unknown',
        args: [],
      });
    }
  } else {
    const bashPath = which('bash');
    if (bashPath) {
      const version = probeVersion(bashPath, ['--version']);
      profiles.push({
        id: 'bash',
        path: bashPath,
        version: version?.split('\n')[0] ?? 'unknown',
        args: [],
      });
    }

    const zshPath = which('zsh');
    if (zshPath) {
      const version = probeVersion(zshPath, ['--version']);
      profiles.push({
        id: 'zsh',
        path: zshPath,
        version: version ?? 'unknown',
        args: [],
      });
    }
  }

  return profiles;
}

/** Get the PowerShell execution policy. */
export function getExecutionPolicy(): string | null {
  if (!IS_WINDOWS) return null;
  if (cachedPolicy && Date.now() - cachedPolicy.at < CACHE_TTL_MS) return cachedPolicy.value;
  const value = probeExecutionPolicy();
  cachedPolicy = { at: Date.now(), value };
  return value;
}

function probeExecutionPolicy(): string | null {
  const psPath = where('powershell.exe') ?? where('pwsh.exe');
  if (!psPath) return null;
  try {
    const output = execFileSync(psPath, ['-NoProfile', '-Command', 'Get-ExecutionPolicy -List | Select-Object -ExpandProperty ExecutionPolicy'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output.trim().split('\n')[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Get the PowerShell version string. */
export function getPowerShellVersion(): string | null {
  if (!IS_WINDOWS) return null;
  if (cachedPowerShell && Date.now() - cachedPowerShell.at < CACHE_TTL_MS) return cachedPowerShell.value;
  const value = probePowerShellVersion();
  cachedPowerShell = { at: Date.now(), value };
  return value;
}

function probePowerShellVersion(): string | null {
  const pwshPath = where('pwsh.exe') ?? where('pwsh');
  const psPath = where('powershell.exe') ?? where('powershell');
  const path = pwshPath ?? psPath;
  if (!path) return null;
  return probeVersion(path, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']);
}

/** Check if the current process is elevated (Windows) or root (POSIX). */
export function isElevated(): boolean {
  if (IS_WINDOWS) {
    try {
      execFileSync('net', ['session'], { timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] });
      return true;
    } catch {
      return false;
    }
  }
  return process.getuid?.() === 0;
}

/** Get the current user name. */
export function currentUser(): string {
  try {
    return userInfo().username;
  } catch {
    return 'unknown';
  }
}
