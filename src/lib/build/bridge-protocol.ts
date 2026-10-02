/**
 * KNOuX Bridge protocol — BFF-side copy.
 *
 * This file must stay in sync with `bridge/src/protocol.ts`. Both sides
 * compile against the same schema. A test verifies they match.
 *
 * Zero imports. The rule: a status word is only shown if something measured it.
 */

export const BRIDGE_SCOPES = [
  'terminal:open',
  'terminal:input',
  'fs:read',
  'fs:write',
  'fs:delete',
  'git:read',
  'git:write',
  'proc:list',
  'proc:manage',
  'run:allowlisted',
  'metrics:read',
  'logs:read',
  'project:import',
  'tools:read',
] as const;

export type BridgeScope = (typeof BRIDGE_SCOPES)[number];

export function isBridgeScope(value: unknown): value is BridgeScope {
  return typeof value === 'string' && (BRIDGE_SCOPES as readonly string[]).includes(value);
}

export type ShellProfile = 'pwsh' | 'powershell' | 'cmd' | 'bash' | 'zsh';

export interface TicketClaims {
  iss: string;
  aud: string;
  sub: string;
  sid: string;
  scope: BridgeScope[];
  jti: string;
  iat: number;
  exp: number;
  cwd?: string;
  profile?: ShellProfile;
}

export interface BridgeProfile {
  id: ShellProfile;
  path: string;
  version: string;
  args: string[];
}

export interface BridgeCapabilities {
  terminal: boolean;
  filesystem: boolean;
  git: boolean;
  exec: boolean;
  processes: boolean;
  metrics: boolean;
  logs: boolean;
  conpty: boolean;
}

export interface Handshake {
  projectImport?: boolean;
  bridgeId: string;
  version: string;
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  user: string;
  elevated: boolean;
  root: string;
  profiles: BridgeProfile[];
  capabilities: BridgeCapabilities;
  maxSessions: number;
  idleTimeoutMinutes: number;
  maxLifetimeHours: number;
  scrollbackBytes: number;
  detachTtlMinutes: number;
  allowlistedTasks: Record<string, string[]>;
  processProfiles: Record<string, { cmd: string; args: string[]; port?: number }>;
  powershellVersion: string | null;
  executionPolicy: string | null;
  measuredAt: string;
}

export type TerminalClientFrame =
  | { t: 'input'; d: string }
  | { t: 'resize'; cols: number; rows: number }
  /** Client confirms it has received output through `seq`. */
  | { t: 'ack'; seq: number }
  | { t: 'ping' }
  | { t: 'close' };

export type TerminalServerFrame =
  | { t: 'output'; d: string; seq: number }
  | { t: 'exit'; code: number | null; signal: string | null }
  | { t: 'pong' }
  | { t: 'error'; code: string }
  | { t: 'ready'; sessionId: string; profile: ShellProfile; cwd: string; pid: number }
  | { t: 'replay'; frames: TerminalServerFrame[] };

export interface FsEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
}

export interface FsReadResult {
  content: string;
  language: string;
  bytes: number;
  lines: number;
  hash: string;
}

export interface FsWriteRequest {
  path: string;
  content: string;
  expectedHash?: string | null;
}

export interface GitStatusEntry {
  path: string;
  state: 'staged' | 'unstaged' | 'untracked';
}

export interface GitCommit {
  sha: string;
  subject: string;
  author: string;
  at: string;
}

export interface GitSnapshot {
  available: boolean;
  branch: string | null;
  headSha: string | null;
  dirty: boolean;
  files: GitStatusEntry[];
  commits: GitCommit[];
  blocker: string | null;
}

export interface ExecRequest {
  task: string;
  cwd?: string;
}

/**
 * One SSE event from `POST /v1/exec/run`.
 *
 * The bridge names the SSE event (`event: chunk`) and puts the discriminator in
 * the payload as `type`. Both must agree; parseExecStream trusts neither alone.
 */
export interface ExecEvent {
  type: 'start' | 'chunk' | 'exit' | 'error';
  stream?: 'stdout' | 'stderr';
  data?: string;
  code?: number | null;
  signal?: string | null;
  durationMs?: number;
}

/** A line of real output captured from a supervised process. */
export interface ProcessLogLine {
  stream: 'stdout' | 'stderr';
  data: string;
  at: number;
}

export interface ProcessInfo {
  name: string;
  pid: number | null;
  status: 'running' | 'stopped' | 'failed';
  port: number | null;
  uptime: number | null;
  exitCode: number | null;
  restarts: number;
  cmd: string;
  args: string[];
}

export interface MetricsSample {
  timestamp: string;
  /** Node process CPU only, not whole-machine. Null when unmeasurable. */
  cpuPercent: number | null;
  /** Machine CPU across all cores. Null on the first sample. */
  systemCpuPercent: number | null;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  /** Free space on the volume holding the bridge root. Null when unreadable. */
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
  /** Real byte rates. Null when the platform has no counter source. */
  networkRxBytesPerSec: number | null;
  networkTxBytesPerSec: number | null;
  /** POSIX load average. Null on Windows. */
  loadAverage: number[] | null;
  processUptimeSeconds: number;
}

/** Cumulative interface byte counters. */
export interface NetworkCounters {
  rxBytes: number;
  txBytes: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  outcome: 'success' | 'failure' | 'denied';
  detail: string;
  approvalId: string | null;
}

export interface PairRequest {
  code: string;
  issuerPublicKey: string;
}

export interface PairResponse {
  bridgeId: string;
  publicKey: string;
  fingerprint: string;
  handshake: Handshake;
}

export function validateHandshake(value: unknown): Handshake | null {
  if (typeof value !== 'object' || value === null) return null;
  const h = value as Record<string, unknown>;
  if (typeof h.bridgeId !== 'string' || typeof h.hostname !== 'string') return null;
  if (!Array.isArray(h.profiles)) return null;
  if (typeof h.capabilities !== 'object' || h.capabilities === null) return null;
  return value as Handshake;
}

export function validateTicketClaims(value: unknown): TicketClaims | null {
  if (typeof value !== 'object' || value === null) return null;
  const c = value as Record<string, unknown>;
  if (typeof c.iss !== 'string' || typeof c.aud !== 'string' || typeof c.sub !== 'string') return null;
  if (typeof c.sid !== 'string' || typeof c.jti !== 'string') return null;
  if (typeof c.iat !== 'number' || typeof c.exp !== 'number') return null;
  if (!Array.isArray(c.scope)) return null;
  if (!c.scope.every(isBridgeScope)) return null;
  return value as TicketClaims;
}
