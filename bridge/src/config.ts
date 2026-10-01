/**
 * Bridge configuration — load, validate and merge with defaults.
 *
 * Hand-rolled validators, matching the repo's style. No zod. Config comes from
 * `bridge.config.json` in the working directory, with env var overrides.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BridgeLimits } from './policy.js';
import { DEFAULT_LIMITS } from './policy.js';

export interface BridgeConfig {
  root: string;
  port: number;
  host: string;
  /** Require TLS when listening on non-loopback interfaces. */
  requireTls: boolean;
  /** Allow writes to .env files. */
  allowEnvWrite: boolean;
  /** Allow loading PowerShell profiles. */
  loadProfile: boolean;
  limits: BridgeLimits;
  allowlistedTasks: Record<string, string[]>;
  processProfiles: Record<string, { cmd: string; args: string[]; port?: number }>;
}

const DEFAULT_CONFIG: BridgeConfig = {
  root: process.cwd(),
  port: 7331,
  host: '127.0.0.1',
  requireTls: true,
  allowEnvWrite: false,
  loadProfile: false,
  limits: DEFAULT_LIMITS,
  allowlistedTasks: {
    lint: ['npm', 'run', 'lint'],
    typecheck: ['npm', 'run', 'typecheck'],
    build: ['npm', 'run', 'build'],
    test: ['npm', 'run', 'test'],
  },
  processProfiles: {},
};

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
        out[key] !== null && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function validateConfig(raw: Record<string, unknown>): BridgeConfig {
  const merged = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, raw);
  return {
    root: resolve(typeof merged.root === 'string' ? merged.root : process.cwd()),
    port: typeof merged.port === 'number' && merged.port > 0 && merged.port < 65536 ? merged.port : DEFAULT_CONFIG.port,
    host: typeof merged.host === 'string' ? merged.host : DEFAULT_CONFIG.host,
    requireTls: merged.requireTls !== false,
    allowEnvWrite: merged.allowEnvWrite === true,
    loadProfile: merged.loadProfile === true,
    limits: { ...DEFAULT_LIMITS, ...(merged.limits as Partial<BridgeLimits> | undefined) },
    allowlistedTasks: typeof merged.allowlistedTasks === 'object' && merged.allowlistedTasks !== null
      ? merged.allowlistedTasks as Record<string, string[]>
      : DEFAULT_CONFIG.allowlistedTasks,
    processProfiles: typeof merged.processProfiles === 'object' && merged.processProfiles !== null
      ? merged.processProfiles as Record<string, { cmd: string; args: string[]; port?: number }>
      : {},
  };
}

/** Load config from bridge.config.json, merged with defaults. */
export function loadConfig(cwd: string = process.cwd()): BridgeConfig {
  const configPath = join(cwd, 'bridge.config.json');
  if (!existsSync(configPath)) return { ...DEFAULT_CONFIG, root: resolve(cwd) };
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    return validateConfig(raw);
  } catch {
    return { ...DEFAULT_CONFIG, root: resolve(cwd) };
  }
}

/** Validate a config object without loading from disk. Exported for tests. */
export function validateConfigObject(raw: Record<string, unknown>): BridgeConfig {
  return validateConfig(raw);
}
