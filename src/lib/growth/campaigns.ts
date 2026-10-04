/**
 * KNOuX Growth — campaign lifecycle and approval.
 *
 * This module is the enforcement point for the mission's central safety claim:
 * no campaign reaches `LIVE` without a named human having approved a specific
 * budget. Rather than relying on UI sequencing, the rule lives in a transition
 * table that has no edge permitting it.
 *
 * The approval model itself is not new. It is the KNOuX Repair safety policy
 * applied to advertising: RISK LEVEL 2 is "privileged change" (it spends money),
 * and level 2 requires explicit approval with disclosed reason, benefit, scope,
 * risk and rollback. A campaign plan is that disclosure, and the approver
 * approves a frozen snapshot of it rather than the live object — otherwise the
 * budget could be raised after the click.
 */

import { APPROVAL_REQUIRED_AT, type RiskLevel } from './states';
import type {
  Approval,
  ApprovalDecision,
  Campaign,
  CampaignStatus,
} from './types';
import { canApproveOwnSubmission, type Principal } from './rbac';

/* ------------------------------------------------------------- transitions */

export type TransitionReason =
  | 'AUTHOR_CREATED'
  | 'AUTHOR_SUBMITTED'
  | 'APPROVER_APPROVED'
  | 'APPROVER_REQUESTED_CHANGES'
  | 'APPROVER_REJECTED'
  | 'AUTHOR_WITHDREW'
  | 'LAUNCH_CONFIRMED_BY_CONNECTOR'
  | 'PAUSED_BY_OPERATOR'
  | 'RESUMED_BY_OPERATOR'
  | 'END_DATE_PASSED'
  | 'CONNECTOR_FAILED';

export type TransitionOutcome =
  | { ok: true; from: CampaignStatus; to: CampaignStatus; reason: TransitionReason; requiresApproval: boolean }
  | { ok: false; from: CampaignStatus; to: CampaignStatus; blocked: true; reason: string; remedy: string };

/**
 * The legal edges. Anything not listed here is illegal.
 *
 * The two edges worth reading twice:
 *
 *  - `APPROVED -> LAUNCH_PENDING` requires an approval record. Without one the
 *    transition is refused with a reason an operator can act on.
 *  - `LAUNCH_PENDING -> LIVE` requires a *connector confirmation*, which is a
 *    provider reporting the campaign as serving. It is not reachable by a
 *    local status write, which is why this build can never assert a live
 *    campaign.
 */
const EDGES: Readonly<Record<CampaignStatus, Partial<Record<TransitionReason, CampaignStatus>>>> = {
  DRAFT: {
    AUTHOR_SUBMITTED: 'READY_FOR_REVIEW',
  },
  READY_FOR_REVIEW: {
    APPROVER_APPROVED: 'APPROVED',
    APPROVER_REQUESTED_CHANGES: 'CHANGES_REQUESTED',
    APPROVER_REJECTED: 'FAILED',
    AUTHOR_WITHDREW: 'DRAFT',
  },
  CHANGES_REQUESTED: {
    AUTHOR_SUBMITTED: 'READY_FOR_REVIEW',
  },
  APPROVED: {
    LAUNCH_CONFIRMED_BY_CONNECTOR: 'LAUNCH_PENDING',
    AUTHOR_WITHDREW: 'DRAFT',
  },
  LAUNCH_PENDING: {
    LAUNCH_CONFIRMED_BY_CONNECTOR: 'LIVE',
    CONNECTOR_FAILED: 'FAILED',
  },
  LIVE: {
    PAUSED_BY_OPERATOR: 'PAUSED',
    END_DATE_PASSED: 'COMPLETED',
    CONNECTOR_FAILED: 'FAILED',
  },
  PAUSED: {
    RESUMED_BY_OPERATOR: 'LIVE',
    END_DATE_PASSED: 'COMPLETED',
  },
  COMPLETED: {},
  FAILED: {
    AUTHOR_WITHDREW: 'DRAFT',
  },
};

export type TransitionContext = {
  /** The approval record backing an approve/launch, when one is required. */
  approval?: Approval;
  /** True only when a real provider call reported the campaign as serving. */
  connectorConfirmed?: boolean;
  /** Set when `connectorConfirmed` is true, naming the provider call. */
  connectorEvidence?: string;
  /** Present when the target's end date has passed. */
  endDatePassed?: boolean;
};

/**
 * Attempts a transition.
 *
 * Returns a refusal with a remedy rather than throwing, because a refusal is a
 * normal outcome that the approval screen needs to display.
 */
export function transition(
  from: CampaignStatus,
  reason: TransitionReason,
  context: TransitionContext = {},
): TransitionOutcome {
  const target = EDGES[from]?.[reason];
  if (!target) {
    return {
      ok: false,
      from,
      to: from,
      blocked: true,
      reason: `A campaign in ${from} cannot move via ${reason}.`,
      remedy: `Allowed next states from ${from}: ${Object.values(EDGES[from] ?? {}).join(', ') || 'none — this state is terminal'}.`,
    };
  }

  // The money edge. Two separate gates, both required.
  if (reason === 'LAUNCH_CONFIRMED_BY_CONNECTOR') {
    if (target === 'LAUNCH_PENDING') {
      if (!context.approval || context.approval.decision !== 'APPROVE') {
        return {
          ok: false,
          from,
          to: from,
          blocked: true,
          reason: 'No recorded approval backs this campaign.',
          remedy: 'Submit the campaign for review and have a different named person approve it.',
        };
      }
      if (!context.approval.budgetSnapshot) {
        return {
          ok: false,
          from,
          to: from,
          blocked: true,
          reason: 'The approval carries no budget snapshot.',
          remedy: 'Re-approve so the approver signs off on a frozen budget, duration and target.',
        };
      }
    }

    if (target === 'LIVE') {
      if (!context.connectorConfirmed) {
        return {
          ok: false,
          from,
          to: from,
          blocked: true,
          reason: 'No connector has confirmed this campaign is serving.',
          remedy:
            'A campaign only becomes LIVE from a real provider response. Nothing in this build can set it.',
        };
      }
    }
  }

  return {
    ok: true,
    from,
    to: target,
    reason,
    requiresApproval: target === 'APPROVED' || target === 'LAUNCH_PENDING' || target === 'LIVE',
  };
}

/** Legal next states, for rendering the available actions on a row. */
export function nextStates(from: CampaignStatus): CampaignStatus[] {
  return [...new Set(Object.values(EDGES[from] ?? {}))];
}

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return nextStates(from).includes(to);
}

/* -------------------------------------------------------------- approvals */

export type ApprovalRequest = {
  campaign: Campaign;
  requestedBy: string;
  approver: Principal;
  /** Optional assignee chosen by the requester. */
  assignedApprover?: string;
};

export type ApprovalOutcome =
  | { ok: true; approval: Approval; risk: RiskLevel }
  | { ok: false; reason: string; remedy: string };

/**
 * Creates an approval request for a campaign, or explains why it cannot.
 *
 * The budget snapshot is taken here, at submission time, and is what the
 * approver sees. It is deliberately the campaign's values and not the
 * approver's — an approver who could edit the number while approving it would
 * be approving their own change.
 */
export function requestApproval(params: ApprovalRequest): ApprovalOutcome {
  const { campaign, requestedBy, approver } = params;

  if (campaign.status !== 'DRAFT' && campaign.status !== 'CHANGES_REQUESTED') {
    return {
      ok: false,
      reason: `A campaign in ${campaign.status} cannot be submitted for review.`,
      remedy: 'Submit is available from DRAFT or CHANGES_REQUESTED.',
    };
  }

  if (!canApproveOwnSubmission({ requestedBy, decidedBy: approver.userId }).allowed) {
    return {
      ok: false,
      reason: 'The author of a plan cannot also be its approver.',
      remedy: 'Assign a different reviewer, or have a manager submit it.',
    };
  }

  const days = daysInclusive(campaign.startDate, campaign.endDate);
  if (days <= 0) {
    return {
      ok: false,
      reason: 'The campaign end date is not after its start date.',
      remedy: 'Set a duration before submitting for approval.',
    };
  }

  if (campaign.budgetMinor <= 0) {
    return {
      ok: false,
      reason: 'The campaign has no budget.',
      remedy: 'A budget is required before a plan can be approved for spend.',
    };
  }

  if (campaign.platforms.length === 0) {
    return {
      ok: false,
      reason: 'No platform is selected.',
      remedy: 'Select at least one platform so the approver knows where money would go.',
    };
  }

  const approval: Approval = {
    id: `apr_${campaign.id}_${campaign.updatedAt}`,
    subjectType: 'CAMPAIGN',
    subjectId: campaign.id,
    clientId: campaign.clientId,
    requestedBy,
    requestedAt: campaign.updatedAt,
    budgetSnapshot: {
      budgetMinor: campaign.budgetMinor,
      currency: campaign.currency,
      days,
      target: campaign.locations.join(', ') || 'Not specified',
    },
  };

  // Spending money is RISK LEVEL 2 under the KNOuX Repair safety policy.
  return { ok: true, approval, risk: APPROVAL_REQUIRED_AT };
}

/**
 * Records an approval decision.
 *
 * Separates "the author cannot approve" from "this role cannot approve", so the
 * drawer can tell an operator which problem they have.
 */
export function decideApproval(
  approval: Approval,
  decision: ApprovalDecision,
  decider: Principal,
  note?: string,
): { ok: true; approval: Approval; campaignStatus: CampaignStatus } | { ok: false; reason: string; remedy: string } {
  if (approval.decision) {
    return {
      ok: false,
      reason: 'This approval already has a recorded decision.',
      remedy: 'Withdraw and resubmit if the plan has changed.',
    };
  }

  if (!canApproveOwnSubmission({ requestedBy: approval.requestedBy, decidedBy: decider.userId }).allowed) {
    return {
      ok: false,
      reason: 'The author of a plan cannot be its approver.',
      remedy: 'Assign a different reviewer.',
    };
  }

  const approved = decision === 'APPROVE';
  if (approved && decider.role !== 'OWNER' && decider.role !== 'MANAGER' && decider.role !== 'CLIENT') {
    return {
      ok: false,
      reason: `Role ${decider.role} cannot approve a campaign.`,
      remedy: 'Campaign approval is held by Owner, Manager, or the client themselves.',
    };
  }

  const decided: Approval = {
    ...approval,
    decision,
    decidedBy: decider.userId,
    decidedAt: approval.requestedAt,
    ...(note ? { note } : {}),
  };

  const campaignStatus: CampaignStatus =
    decision === 'APPROVE' ? 'APPROVED'
    : decision === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED'
    : decision === 'REJECT' ? 'FAILED'
    : 'DRAFT';

  return { ok: true, approval: decided, campaignStatus };
}

/* ---------------------------------------------------------------- helpers */

/** Inclusive day count between two ISO dates. Invalid input yields 0. */
export function daysInclusive(start: string, end: string): number {
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  if (to < from) return 0;
  return Math.round((to - from) / 86_400_000) + 1;
}

/** Total budget in major units, for display only. Never used in arithmetic. */
export function budgetMajor(campaign: Campaign): number {
  return campaign.budgetMinor / 100;
}

export function formatBudget(budgetMinor: number, currency: string): string {
  return `${currency} ${(budgetMinor / 100).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}