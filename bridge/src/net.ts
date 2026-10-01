/**
 * Network counters — real byte totals, not estimates.
 *
 * node:os exposes interface addresses but no byte counters, so the bridge
 * shells out to the platform's own counter source and caches the last reading
 * to derive a rate. If no source is available the sample reports `null` rather
 * than a fabricated zero.
 *
 * Windows: `netstat -e` (cumulative Interfaces Received/Sent bytes).
 * macOS:    `netstat -ib` (Ibytes/Obytes per interface).
 * Linux:    /proc/net/dev (rx/tx byte counters per interface).
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { NetworkCounters } from './protocol.js';

let lastReading: (NetworkCounters & { at: number }) | null = null;
let lastAvailable: boolean | null = null;

/** Read the platform's cumulative byte counters. Returns null when unavailable. */
export function readNetworkCounters(): NetworkCounters | null {
  if (process.platform === 'win32') return readWindows();
  if (process.platform === 'darwin') return readDarwin();
  return readLinux();
}

/**
 * Cumulative counters for physical, non-loopback interfaces.
 * `netstat -e` reports a single "Interfaces" row that already excludes loopback.
 */
function readWindows(): NetworkCounters | null {
  try {
    const out = execFileSync('netstat', ['-e'], {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });
    for (const line of out.split(/\r?\n/)) {
      // "  Bytes  1234567  ..." with Received / Sent headings earlier in output.
      if (/^\s*Bytes\s+(\d+)\s+(\d+)/i.test(line)) {
        const m = line.match(/^\s*Bytes\s+(\d+)\s+(\d+)/i)!;
        return { rxBytes: Number(m[1]), txBytes: Number(m[2]) };
      }
    }
  } catch { /* unavailable */ }
  return null;
}

/** macOS: sum rx (Ibytes) and tx (Obytes) across interfaces, excluding lo0. */
function readDarwin(): NetworkCounters | null {
  try {
    const out = execFileSync('netstat', ['-ib'], {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let rxBytes = 0;
    let txBytes = 0;
    let found = false;
    for (const line of out.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      // Name, Mtu, Network, Address, Ipkts, Ierrs, Ibytes, Opkts, Oerrs, Obytes
      if (cols.length < 10) continue;
      const name = cols[0];
      if (name === 'lo0' || cols[2] !== 'inet') continue;
      if (cols[3] === '127.0.0.1') continue;
      const ib = Number(cols[6]);
      const ob = Number(cols[9]);
      if (!Number.isFinite(ib) || !Number.isFinite(ob)) continue;
      rxBytes += ib;
      txBytes += ob;
      found = true;
    }
    return found ? { rxBytes, txBytes } : null;
  } catch { /* unavailable */ }
  return null;
}

/** Linux: parse /proc/net/dev, excluding loopback and virtual interfaces. */
function readLinux(): NetworkCounters | null {
  const path = '/proc/net/dev';
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, 'utf8');
    let rxBytes = 0;
    let txBytes = 0;
    for (const line of content.split('\n').slice(2)) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const name = line.slice(0, idx).trim();
      if (name === 'lo' || name.startsWith('veth') || name.startsWith('docker')) continue;
      const cols = line.slice(idx + 1).trim().split(/\s+/);
      if (cols.length < 9) continue;
      const rx = Number(cols[0]);
      const tx = Number(cols[8]);
      if (!Number.isFinite(rx) || !Number.isFinite(tx)) continue;
      rxBytes += rx;
      txBytes += tx;
    }
    return { rxBytes, txBytes };
  } catch {
    return null;
  }
}

/**
 * Network rates in bytes/second, derived from two real readings.
 *
 * Returns `available: false` with null rates when the platform offers no
 * counter source, or on the first call (a rate needs two points in time).
 */
export function sampleNetworkRate(intervalMs = 0): {
  available: boolean;
  rxBytesPerSec: number | null;
  txBytesPerSec: number | null;
} {
  const now = Date.now();
  const reading = readNetworkCounters();

  if (!reading) {
    lastAvailable = false;
    lastReading = null;
    return { available: false, rxBytesPerSec: null, txBytesPerSec: null };
  }

  const previous = lastReading;
  lastReading = { ...reading, at: now };

  if (!previous) {
    return { available: false, rxBytesPerSec: null, txBytesPerSec: null };
  }

  const elapsedMs = now - previous.at;
  // Guard against a tiny or non-advancing window producing a meaningless rate.
  if (elapsedMs < Math.max(250, intervalMs)) {
    return { available: false, rxBytesPerSec: null, txBytesPerSec: null };
  }

  const seconds = elapsedMs / 1000;
  const rx = reading.rxBytes - previous.rxBytes;
  const tx = reading.txBytes - previous.txBytes;

  // A counter reset (interface recreated) must not read as a huge negative rate.
  if (rx < 0 || tx < 0) {
    return { available: false, rxBytesPerSec: null, txBytesPerSec: null };
  }

  lastAvailable = true;
  return {
    available: true,
    rxBytesPerSec: Math.round(rx / seconds),
    txBytesPerSec: Math.round(tx / seconds),
  };
}

/** Whether the platform exposes real network counters. Null until first sample. */
export function networkCountersAvailable(): boolean | null {
  return lastAvailable;
}

/** Reset the cached reading — for tests only. */
export function resetNetworkSampling(): void {
  lastReading = null;
  lastAvailable = null;
}