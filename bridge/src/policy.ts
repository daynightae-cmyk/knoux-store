/**
 * Bridge policy — path jail, scope enforcement, limits and denylist.
 *
 * All filesystem paths are relative to the configured root. Absolute paths
 * are rejected. The resolved path must be inside root after realpath.
 * Denied writes: .git/**, bridge identity/config, .env* (unless allowEnvWrite).
 *
 * Pure and testable — no I/O in the path resolution helpers.
 */

import { resolve, sep, isAbsolute, normalize } from 'node:path';
import { realpathSync } from 'node:fs';
import type { BridgeScope } from './protocol.js';

// ---------------------------------------------------------------------------
// Path jail
// ---------------------------------------------------------------------------

/** Device names Windows reserves, whatever the extension. */
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export interface PathResolution {
  ok: boolean;
  /** The resolved absolute path, when ok. */
  absolute?: string;
  /** The normalized relative path, when ok. */
  relative?: string;
  reason?: string;
}

/** Normalize a path segment: reject absolute, traversal, UNC, reserved names. */
export function normalizeRelativePath(input: string): { ok: boolean; relative?: string; reason?: string } {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'Path must be a non-empty string' };
  }
  if (isAbsolute(input)) {
    return { ok: false, reason: 'Absolute paths are not allowed' };
  }
  if (input.includes('\0')) {
    return { ok: false, reason: 'Path contains null bytes' };
  }
  // Normalize with forward slashes as the canonical separator. `normalize()` on
  // Windows would otherwise return backslashes, and every check below — plus
  // `resolve(root, rel)` — assumes forward slashes. Without this, a path like
  // 'bridge\src\server.ts' would slip past the deny list.
  const normalized = normalize(input.replace(/\\/g, '/')).replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..') {
    return { ok: false, reason: 'Path traversal is not allowed' };
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((s) => s === '..')) {
    return { ok: false, reason: 'Path traversal is not allowed' };
  }
  for (const seg of segments) {
    // Windows alternate data streams: 'file.txt:hidden', and any drive colon.
    if (seg.includes(':')) {
      return { ok: false, reason: `Alternate data streams not allowed: ${seg}` };
    }
    // A segment ending in a space or dot is silently stripped by Windows, which
    // makes 'file ' and 'file' the same path. Refuse rather than normalize.
    // '.' is the current directory, handled above, so it is not a real segment.
    if (/[ .]$/.test(seg) && seg !== '.') {
      return { ok: false, reason: `Path segment may not end in a space or dot: ${seg}` };
    }
    // Windows reserved device names. The reservation applies to the stem
    // before the extension, so NUL.txt and COM1.log are both reserved.
    const stem = seg.split('.')[0] ?? '';
    if (RESERVED_WINDOWS_NAMES.test(stem)) {
      return { ok: false, reason: `Reserved name: ${seg}` };
    }
  }
  return { ok: true, relative: normalized };
}

/**
 * Resolve a relative path against root, verifying it stays inside root.
 * Uses realpath on the parent for not-yet-existing targets.
 */
export function resolveInsideRoot(
  root: string,
  relative: string,
  options: { allowEnvWrite?: boolean } = {},
): PathResolution {
  const norm = normalizeRelativePath(relative);
  if (!norm.ok) return { ok: false, reason: norm.reason };

  const rel = norm.relative!;
  const absolute = resolve(root, rel);

  // Verify containment
  const rootResolved = resolve(root);
  const prefix = rootResolved.endsWith(sep) ? rootResolved : `${rootResolved}${sep}`;
  if (absolute !== rootResolved && !absolute.startsWith(prefix)) {
    return { ok: false, reason: 'Path resolves outside root' };
  }

  // Deny .git/**
  if (rel === '.git' || rel.startsWith('.git/')) {
    return { ok: false, reason: 'Git internals are managed through the git API' };
  }

  // Deny bridge identity/config
  if (rel === 'bridge' || rel.startsWith('bridge/')) {
    return { ok: false, reason: 'Bridge configuration is not accessible through the filesystem API' };
  }

  // Deny .env* unless explicitly allowed
  const basename = rel.split('/').pop() ?? '';
  if (basename.startsWith('.env') && !options.allowEnvWrite) {
    return { ok: false, reason: 'Environment files are not writable through the filesystem API' };
  }

  return { ok: true, absolute, relative: rel };
}

// ---------------------------------------------------------------------------
// Symlink containment
// ---------------------------------------------------------------------------

/** Thrown when a path resolves outside the workspace root after symlink resolution. */
export class PathEscapeError extends Error {
  constructor(message = 'Path resolves outside the workspace root.') {
    super(message);
    this.name = 'PathEscapeError';
  }
}

/**
 * Resolve `target` through symlinks and confirm it is still inside `root`.
 *
 * A path that is lexically inside the root can still escape it: a symlink, a
 * Windows junction, or a mount point. Lexical checks cannot see that, so every
 * filesystem route re-checks containment after `realpath`.
 *
 * Throws `PathEscapeError` when the path resolves outside the root, and a
 * filesystem error when it cannot be resolved at all. Callers must distinguish
 * these: an escape is a refusal (403), a missing path is a 404.
 */
export function realpathInside(root: string, target: string): string {
  const realRoot = realpathSync(root);
  const real = realpathSync(target);
  const prefix = realRoot.endsWith(sep) ? realRoot : `${realRoot}${sep}`;
  if (real !== realRoot && !real.startsWith(prefix)) {
    throw new PathEscapeError();
  }
  return real;
}

/**
 * Like `realpathInside`, but for a target that does not exist yet.
 *
 * Resolves the nearest existing ancestor and appends the missing segments, so a
 * write to a new file inside the root is still checked against symlinked
 * parents.
 */
export function realpathForCreate(root: string, target: string): string {
  const realRoot = realpathSync(root);
  const missing: string[] = [];
  let current = resolve(target);

  // Walk up until something exists, remembering what did not.
  for (;;) {
    try {
      const real = realpathSync(current);
      missing.unshift(current.slice(real.length + 1));
      const assembled = missing.length > 0 ? resolve(real, ...missing) : real;
      const prefix = realRoot.endsWith(sep) ? realRoot : `${realRoot}${sep}`;
      if (assembled !== realRoot && !assembled.startsWith(prefix)) {
        throw new PathEscapeError();
      }
      return assembled;
    } catch (err) {
      // Only an escape stops the walk; anything else means this level simply
      // does not exist yet, so try the parent.
      if (err instanceof PathEscapeError) throw err;
      const parent = resolve(current, '..');
      if (parent === current) throw err;
      missing.unshift(current.split(/[\\/]/).pop() ?? '');
      current = parent;
    }
  }
}

// ---------------------------------------------------------------------------
// Scope enforcement
// ---------------------------------------------------------------------------

/** Map bridge scopes to permission levels. */
export function scopeToPermissionLevel(scope: BridgeScope): string {
  switch (scope) {
    case 'terminal:open':
    case 'terminal:input':
    case 'proc:manage':
    case 'run:allowlisted':
      return 'run';
    case 'fs:write':
    case 'fs:delete':
      return 'edit';
    case 'git:write':
      return 'git-write';
    default:
      return 'read';
  }
}

/** Check if a scope set contains a required scope. */
export function hasScope(scopes: BridgeScope[], required: BridgeScope): boolean {
  return scopes.includes(required);
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export interface BridgeLimits {
  maxSessions: number;
  idleTimeoutMinutes: number;
  maxLifetimeHours: number;
  scrollbackBytes: number;
  detachTtlMinutes: number;
  maxOutputBytesPerSec: number;
  maxInputRatePerSec: number;
}

export const DEFAULT_LIMITS: BridgeLimits = {
  maxSessions: 3,
  idleTimeoutMinutes: 30,
  maxLifetimeHours: 8,
  scrollbackBytes: 256 * 1024,
  detachTtlMinutes: 10,
  maxOutputBytesPerSec: 1_048_576,
  maxInputRatePerSec: 100,
};

// ---------------------------------------------------------------------------
// Denylist — patterns that are never allowed in git branch names, etc.
// ---------------------------------------------------------------------------

export const GIT_INJECTION_PATTERN = /[;&|`$()\n\r]/;

/** Validate a git ref name — reject injection characters. */
export function isValidGitRef(ref: string): boolean {
  if (!ref || ref.length > 255) return false;
  if (GIT_INJECTION_PATTERN.test(ref)) return false;
  if (ref.startsWith('/') || ref.endsWith('/')) return false;
  if (ref.includes('..')) return false;
  if (ref.includes('//')) return false;
  if (ref.endsWith('.lock')) return false;
  return true;
}
