/**
 * Verification aggregation and the Reality Ledger.
 *
 * `VerificationStatus` has no optimistic member, so a status cannot be widened
 * by accident. A check that never ran is `not-run`, not `pass`; a capability
 * with no credential is `unconfigured`, not `pass`; something the environment
 * forbids is `blocked`, not `pass`.
 *
 * The six ledger axes are independent by design. `tested` says a test suite
 * exists and passed. It says nothing about CI, and `ci-verified` says nothing
 * about production. Collapsing them is how a project convinces itself it is
 * finished before it is.
 */

import type {
  RealityLedgerRow,
  VerificationCheck,
  VerificationSnapshot,
  VerificationStatus,
} from './types';

export const VERIFICATION_CHECKS: readonly { id: string; label: string; command: string | null }[] = [
  { id: 'lint', label: 'Lint', command: 'npm run lint' },
  { id: 'typecheck', label: 'Typecheck', command: 'npm run typecheck' },
  { id: 'test', label: 'Tests', command: 'npm test' },
  { id: 'build', label: 'Build', command: 'npm run build' },
  { id: 'diff-check', label: 'Diff check', command: 'git diff --check' },
  { id: 'runtime', label: 'Runtime', command: null },
  { id: 'ci', label: 'CI', command: null },
  { id: 'deployment', label: 'Deployment', command: null },
];

/** A check that has not been run in this session. Never `pass`. */
export function notRun(id: string, reason: string): VerificationCheck {
  const definition = VERIFICATION_CHECKS.find((entry) => entry.id === id);
  return {
    id,
    label: definition?.label ?? id,
    command: definition?.command ?? null,
    exitCode: null,
    status: 'not-run',
    evidence: reason,
    ranAt: null,
    durationMs: null,
  };
}

export function blocked(id: string, reason: string): VerificationCheck {
  return { ...notRun(id, reason), status: 'blocked' };
}

export function unconfigured(id: string, reason: string): VerificationCheck {
  return { ...notRun(id, reason), status: 'unconfigured' };
}

/** The aggregate is the worst status present. Warnings never downgrade a pass. */
export function aggregate(checks: VerificationCheck[]): VerificationStatus {
  if (checks.length === 0) return 'not-run';
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'blocked')) return 'blocked';
  if (checks.some((check) => check.status === 'unconfigured')) return 'unconfigured';
  if (checks.some((check) => check.status === 'not-run')) return 'not-run';
  if (checks.every((check) => check.status === 'pass' || check.status === 'not-applicable')) return 'pass';
  return 'not-run';
}

export function checksById(snapshot: VerificationSnapshot | null): Map<string, VerificationCheck> {
  const map = new Map<string, VerificationCheck>();
  for (const check of snapshot?.checks ?? []) map.set(check.id, check);
  return map;
}

/**
 * The four gates a score is measured over. A number is only produced when all
 * of them have a real measurement, because "100%" over one passing check is a
 * decoration, not a measurement.
 */
export const SCOREABLE_CHECKS = ['lint', 'typecheck', 'test', 'build'] as const;

/**
 * A percentage is only produced when every contributor is a real measurement.
 * Anything unrun or blocked makes the score unavailable rather than partial,
 * because a score over a partly unrun set is a misleading number.
 */
export function measurableScore(checks: VerificationCheck[]): number | null {
  const byId = new Map(checks.map((check) => [check.id, check]));
  const scored: VerificationCheck[] = [];
  for (const id of SCOREABLE_CHECKS) {
    const check = byId.get(id);
    // A gate that was never measured, or that is blocked or unconfigured, is
    // not a measurement. Any of them withholds the number entirely.
    if (!check) return null;
    if (check.status !== 'pass' && check.status !== 'fail') return null;
    scored.push(check);
  }
  const passed = scored.filter((check) => check.status === 'pass').length;
  return Math.round((passed / scored.length) * 100);
}

export type LedgerInput = {
  subject: string;
  implemented: VerificationStatus;
  configured: VerificationStatus;
  tested: VerificationStatus;
  runtimeVerified?: VerificationStatus;
  ciVerified?: VerificationStatus;
  productionVerified?: VerificationStatus;
  blocker?: string | null;
};

export function ledgerRow(input: LedgerInput): RealityLedgerRow {
  return {
    subject: input.subject,
    implemented: input.implemented,
    configured: input.configured,
    tested: input.tested,
    runtimeVerified: input.runtimeVerified ?? 'not-run',
    ciVerified: input.ciVerified ?? 'not-run',
    productionVerified: input.productionVerified ?? 'not-run',
    blocker: input.blocker ?? null,
  };
}

export function ledgerHeadline(row: RealityLedgerRow): VerificationStatus {
  const statuses: VerificationStatus[] = [
    row.implemented, row.configured, row.tested,
    row.runtimeVerified, row.ciVerified, row.productionVerified,
  ];
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.includes('unconfigured')) return 'unconfigured';
  if (statuses.includes('not-run')) return 'not-run';
  return statuses.every((status) => status === 'pass' || status === 'not-applicable') ? 'pass' : 'not-run';
}
