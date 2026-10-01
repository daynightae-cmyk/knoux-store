/**
 * Metrics sampler — real measurements only.
 *
 * Every field is measured at call time from node:os, node:fs, or the platform's
 * own counter source. A value that cannot be measured is reported as `null`.
 * A metric is never reported as a plausible-looking number it did not observe.
 *
 * Sampling is on demand — there is no background timer.
 */

import { cpus, totalmem, freemem, loadavg, uptime } from 'node:os';
import { statfsSync } from 'node:fs';
import type { MetricsSample } from './protocol.js';
import { sampleNetworkRate } from './net.js';

/** Previous CPU tick snapshot, so usage reflects the interval, not process lifetime. */
let lastCpuTicks: { idle: number; total: number } | null = null;

function readCpuTicks(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of cpus()) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

/** Disk stats for the volume containing the bridge root. Null when unreadable. */
function readDisk(root: string): { freeBytes: number | null; totalBytes: number | null } {
  try {
    const stats = statfsSync(root);
    if (!stats.bsize) return { freeBytes: null, totalBytes: null };
    return {
      freeBytes: stats.bavail * stats.bsize,
      totalBytes: stats.blocks * stats.bsize,
    };
  } catch {
    return { freeBytes: null, totalBytes: null };
  }
}

/** Machine CPU busy percentage over the interval since the previous sample. */
function sampleMachineCpu(): number | null {
  const current = readCpuTicks();
  const previous = lastCpuTicks;
  lastCpuTicks = current;

  if (!previous) return null;

  const idleDelta = current.idle - previous.idle;
  const totalDelta = current.total - previous.total;

  // A counter reset or an instantaneous call leaves nothing to divide by.
  if (totalDelta <= 0 || idleDelta < 0) return null;

  const usage = 1 - idleDelta / totalDelta;
  if (!Number.isFinite(usage)) return null;
  return Math.max(0, Math.min(100, Math.round(usage * 100)));
}

/** CPU consumed by this Node process since start, as a percentage of one core. */
function sampleProcessCpu(): number | null {
  const usage = process.cpuUsage();
  const wallMicroseconds = uptime() * 1_000_000;
  if (wallMicroseconds <= 0) return null;
  // process.cpuUsage() is cumulative; express it as busy-microseconds per wall-second.
  const busyMicroseconds = usage.user + usage.system;
  const percent = (busyMicroseconds / wallMicroseconds) * 100;
  if (!Number.isFinite(percent)) return null;
  return Math.max(0, Math.round(percent));
}

/** Take a metrics sample. `root` scopes the disk measurement to the right volume. */
export function sampleMetrics(root: string = process.cwd()): MetricsSample {
  const memoryTotalBytes = totalmem();
  const memoryUsedBytes = memoryTotalBytes - freemem();
  const disk = readDisk(root);
  const network = sampleNetworkRate();
  const la = loadavg();

  return {
    timestamp: new Date().toISOString(),
    cpuPercent: sampleProcessCpu(),
    systemCpuPercent: sampleMachineCpu(),
    memoryUsedBytes,
    memoryTotalBytes,
    diskFreeBytes: disk.freeBytes,
    diskTotalBytes: disk.totalBytes,
    networkRxBytesPerSec: network.rxBytesPerSec,
    networkTxBytesPerSec: network.txBytesPerSec,
    loadAverage: process.platform === 'win32' ? null : la,
    processUptimeSeconds: Math.floor(uptime()),
  };
}

/** Reset the CPU baseline — for tests only. */
export function resetMetricsBaseline(): void {
  lastCpuTicks = null;
}