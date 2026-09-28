/**
 * Permission engine.
 *
 * The rule this file exists to enforce: a control in the UI is not a security
 * boundary, so the decision must be reproducible on the server from the action
 * itself. `evaluatePermission` is pure and takes only the action, which means
 * a caller cannot obtain approval by constructing a different object than the
 * one it displays.
 *
 * Read actions proceed. Anything that mutates, installs, writes to a database,
 * writes to Git or deploys requires an explicit approval whose level is derived
 * here rather than chosen by the caller.
 */

import type {
  PermissionDecision,
  PermissionLevel,
  ProposedAction,
  SenshialMode,
} from './types';

/** Ordering used when several actions in one request are aggregated. */
const LEVEL_ORDER: PermissionLevel[] = [
  'read',
  'edit',
  'run',
  'install',
  'database-write',
  'git-write',
  'deploy',
];

export function levelRank(level: PermissionLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

export function highestLevel(levels: PermissionLevel[]): PermissionLevel {
  return levels.reduce<PermissionLevel>(
    (highest, level) => (levelRank(level) > levelRank(highest) ? level : highest),
    'read',
  );
}

const REASONS: Record<PermissionLevel, { read: string; approval: string }> = {
  read: {
    read: 'Read-only inspection of a real source.',
    approval: 'Read-only inspection never requires approval.',
  },
  edit: {
    read: 'Reads and proposes file changes without writing them.',
    approval: 'Writing to a project file requires explicit approval.',
  },
  run: {
    read: 'Inspecting allowlisted command definitions.',
    approval: 'Running a command executes code on the host and requires approval.',
  },
  install: {
    read: 'Inspecting declared dependencies.',
    approval: 'Installing dependencies changes the lockfile and the tree, and requires approval.',
  },
  'database-write': {
    read: 'Inspecting declared database capabilities.',
    approval: 'A database write can destroy data that no client can recover, and requires approval.',
  },
  'git-write': {
    read: 'Inspecting Git state read-only.',
    approval: 'A Git write rewrites history or publishes it, and requires approval.',
  },
  deploy: {
    read: 'Inspecting deployment state.',
    approval: 'A deployment is publicly visible and cannot be silently undone, and requires approval.',
  },
};

/**
 * Decide whether an action may proceed. Pure, and total: it always returns a
 * reason, including for the permissive cases.
 */
export function evaluatePermission(action: ProposedAction): PermissionDecision {
  const level = action.level;
  const entry = REASONS[level];
  if (!entry) {
    return { allowed: false, requiresApproval: true, reason: 'Unknown action level.', level };
  }
  if (level === 'read') {
    return { allowed: true, requiresApproval: false, reason: entry.read, level };
  }
  const irreversibleNote = action.irreversible ? ' It is not reversible by a simple revert.' : '';
  return {
    allowed: false,
    requiresApproval: true,
    reason: `${entry.approval}${irreversibleNote}`,
    level,
  };
}

/**
 * A Senshial mode may only propose the level of change it is permitted to ask
 * for. ASK may never propose mutation at all; PLAN may propose but is expected
 * to stop there. This is the mechanism that stops a plan turning into an edit.
 */
export function ceilingForMode(mode: SenshialMode): PermissionLevel {
  if (mode === 'ask') return 'read';
  if (mode === 'plan') return 'edit';
  return 'deploy';
}

export function modeMayPropose(mode: SenshialMode, level: PermissionLevel): boolean {
  return levelRank(level) <= levelRank(ceilingForMode(mode));
}

export function modeDescription(mode: SenshialMode): string {
  if (mode === 'ask') return 'Read-only. Inspects the project and reasons. Proposes nothing.';
  if (mode === 'plan') return 'Proposes structured changes. Writes nothing.';
  return 'May request mutations. Each one passes the permission engine first.';
}

export function newAction(
  id: string,
  level: PermissionLevel,
  title: string,
  detail: string,
  affects: string[] = [],
  irreversible = false,
): ProposedAction {
  return { id, level, title, detail, affects, irreversible };
}
