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

/** A plain object, not an array and not null. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A runnable argv: at least one non-empty string argument.
 *
 * An empty argv would run the bare command, which for every task in the default
 * allowlist prints help text and exits zero — a green result for no work. That
 * is a configuration mistake, so it is refused rather than run.
 */
function isArgv(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((part) => typeof part === 'string' && part.length > 0);
}

function validateProcessProfiles(value: unknown): Record<string, { cmd: string; args: string[]; port?: number }> {
  if (!isPlainObject(value)) return {};
  const out: Record<string, { cmd: string; args: string[]; port?: number }> = {};

  for (const [name, profile] of Object.entries(value)) {
    if (!isPlainObject(profile)) continue;
    const { cmd, args, port } = profile;
    // A profile without a runnable command is dropped rather than kept as a
    // row that fails every time it is started.
    if (typeof cmd !== 'string' || cmd.length === 0) continue;
    if (!isArgv(args)) continue;
    const entry: { cmd: string; args: string[]; port?: number } = { cmd, args };
    if (typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536) {
      entry.port = port;
    }
    out[name] = entry;
  }
  return out;
}

/**
 * Validate a raw config object.
 *
 * @param raw The merged config from disk.
 * @param baseDir Directory a relative `root` resolves against. A relative root
 *                means "the workspace next to this config", not "wherever the
 *                bridge happened to be started from".
 */
function validateConfig(raw: Record<string, unknown>, baseDir: string = process.cwd()): BridgeConfig {
  const merged = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, raw);

  // An explicitly empty allowlist must be able to turn exec off. Merging it over
  // the defaults would keep the default tasks, so a clear cannot take effect.
  // Presence in `raw` decides: the config owns the whole map.
  const allowlistedTasks = Object.prototype.hasOwnProperty.call(raw, 'allowlistedTasks')
    ? readAllowlistedTasks(raw.allowlistedTasks)
    : DEFAULT_CONFIG.allowlistedTasks;

  const processProfiles = Object.prototype.hasOwnProperty.call(raw, 'processProfiles')
    ? validateProcessProfiles(raw.processProfiles)
    : {};

  return {
    root: typeof merged.root === 'string' && merged.root.length > 0
      ? resolve(baseDir, merged.root)
      : resolve(baseDir),
    port: typeof merged.port === 'number' && Number.isInteger(merged.port) && merged.port > 0 && merged.port < 65536
      ? merged.port
      : DEFAULT_CONFIG.port,
    host: typeof merged.host === 'string' && merged.host.length > 0 ? merged.host : DEFAULT_CONFIG.host,
    requireTls: merged.requireTls !== false,
    allowEnvWrite: merged.allowEnvWrite === true,
    loadProfile: merged.loadProfile === true,
    limits: { ...DEFAULT_LIMITS, ...(isPlainObject(merged.limits) ? merged.limits as Partial<BridgeLimits> : {}) },
    allowlistedTasks,
    processProfiles,
  };
}

/** Read the task allowlist, keeping only entries that are runnable argv arrays. */
function readAllowlistedTasks(value: unknown): Record<string, string[]> {
  if (!isPlainObject(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [task, argv] of Object.entries(value)) {
    // A task name with a shell metacharacter in it must never reach exec.
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(task)) continue;
    if (!isArgv(argv)) continue;
    out[task] = argv as string[];
  }
  return out;
}

/** Config file names, in the order they are consulted. */
const CONFIG_FILENAMES = ['bridge.config.json', 'bridge.config.local.json'];

/**
 * Load configuration, merged with defaults.
 *
 * `bridge.config.json` is the committed example; `bridge.config.local.json` is
 * the developer's uncommitted override. The local file wins, so a shared default
 * can be adjusted without a diff.
 */
export function loadConfig(cwd: string = process.cwd()): BridgeConfig {
  let merged: Record<string, unknown> = {};
  let found = false;

  for (const name of CONFIG_FILENAMES) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    found = true;
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
      merged = deepMerge(merged, raw);
    } catch {
      // A malformed file is skipped rather than fatal; the earlier file, or the
      // defaults, still apply and `doctor` will show what was actually used.
    }
  }

  if (!found) return { ...DEFAULT_CONFIG, root: resolve(cwd) };

  try {
    return validateConfig(merged, cwd);
  } catch {
    return { ...DEFAULT_CONFIG, root: resolve(cwd) };
  }
}

/**
 * Validate a config object without loading from disk.
 *
 * @param raw The config to validate.
 * @param baseDir Directory a relative `root` resolves against.
 */
export function validateConfigObject(raw: Record<string, unknown>, baseDir?: string): BridgeConfig {
  return validateConfig(raw, baseDir);
}
