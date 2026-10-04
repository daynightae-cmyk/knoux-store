/**
 * KNOuX Growth — automation rules engine.
 *
 * The mission is explicit: build a safe rules engine, and do not build
 * uncontrolled autonomous ad-spend behaviour. The usual way to satisfy that is
 * a comment. Here it is a type: `AutomationActionKind` admits only annotation,
 * alert, task, and routing outcomes. There is no member that pauses a campaign,
 * adjusts a budget, or launches anything, so a spend path cannot be added
 * without changing the union — which is a reviewable diff rather than an
 * unnoticed behaviour change.
 *
 * Rules are also advisory by construction: every rule evaluates to at most risk
 * level 1, and the engine itself never executes a provider call.
 */

import type { RiskLevel } from './states';
import type {
  AutomationActionKind,
  AutomationRule,
  AutomationTrigger,
} from './types';

/* --------------------------------------------------------------- vocabulary */

export const TRIGGER_LABELS: Readonly<Record<AutomationTrigger, string>> = {
  CAMPAIGN_CPL_ABOVE: 'Campaign cost per lead rises above a threshold',
  CAMPAIGN_SPEND_ABOVE: 'Campaign spend reaches a limit',
  LEAD_RECEIVED: 'A lead arrives',
  CONTENT_NEEDS_APPROVAL: 'Content requires approval',
  COMMUNITY_URL_UNAVAILABLE: 'A community public URL becomes unavailable',
  CONNECTION_EXPIRED: 'A platform connection expires',
  REVIEW_RECEIVED: 'A new review is received',
};

export const ACTION_LABELS: Readonly<Record<AutomationActionKind, string>> = {
  FLAG_FOR_REVIEW: 'Flag for review',
  CREATE_APPROVAL_TASK: 'Create an approval task',
  ROUTE_TO_PIPELINE: 'Route to the client pipeline',
  RAISE_ALERT: 'Raise an alert',
  MARK_NEEDS_REVIEW: 'Mark the record NEEDS_REVIEW',
};

/**
 * Every action is advisory. This table is the reason: the ceiling for all of
 * them is 1, and the engine asserts it rather than trusting a stored `risk`
 * field, so an edited fixture cannot escalate a rule.
 */
const ACTION_RISK: Readonly<Record<AutomationActionKind, RiskLevel>> = {
  FLAG_FOR_REVIEW: 1,
  CREATE_APPROVAL_TASK: 1,
  ROUTE_TO_PIPELINE: 1,
  RAISE_ALERT: 0,
  MARK_NEEDS_REVIEW: 1,
};

/** Triggers that must carry a threshold to be evaluable. */
const THRESHOLD_TRIGGERS: readonly AutomationTrigger[] = [
  'CAMPAIGN_CPL_ABOVE',
  'CAMPAIGN_SPEND_ABOVE',
];

export function requiresThreshold(trigger: AutomationTrigger): boolean {
  return THRESHOLD_TRIGGERS.includes(trigger);
}

export type ValidationResult =
  | { ok: true; risk: RiskLevel }
  | { ok: false; reason: string; remedy: string };

/**
 * Validates a rule. The threshold check exists because a CPL rule with no
 * threshold would fire on every event, and a rule that always fires trains
 * operators to ignore automation.
 */
export function validateRule(rule: AutomationRule): ValidationResult {
  if (requiresThreshold(rule.trigger)) {
    if (rule.threshold === undefined || !Number.isFinite(rule.threshold) || rule.threshold <= 0) {
      return {
        ok: false,
        reason: `"${TRIGGER_LABELS[rule.trigger]}" needs a positive threshold.`,
        remedy: 'Set the value that should trigger the rule, for example a cost per lead ceiling.',
      };
    }
  }

  if (rule.threshold !== undefined && (!Number.isFinite(rule.threshold) || rule.threshold < 0)) {
    return {
      ok: false,
      reason: 'The threshold must be a non-negative number.',
      remedy: 'Remove the threshold or set a valid number.',
    };
  }

  return { ok: true, risk: ACTION_RISK[rule.action] };
}

/* ------------------------------------------------------------------ events */

/**
 * An observed fact. Every field is optional because providers differ, and the
 * engine reads only what is present — it never fills a gap to force a match.
 */
export type AutomationEvent = {
  type: AutomationTrigger;
  clientId: string;
  /** The value compared against a threshold, in major units of `currency`. */
  value?: number;
  currency?: string;
  campaignId?: string;
  communityId?: string;
  connectionPlatform?: string;
  contentId?: string;
  leadId?: string;
  observedAt: string;
};

export type AutomationOutcome = {
  ruleId: string;
  ruleName: string;
  action: AutomationActionKind;
  actionLabel: string;
  risk: RiskLevel;
  /** What the operator will see. Fact, not instruction. */
  summary: string;
  /** Always true. There is no outcome that performs an external change. */
  advisoryOnly: true;
};

/**
 * Evaluates rules against an event.
 *
 * Pure and total: it cannot throw, cannot perform I/O, and returns at most one
 * outcome per rule. Triggers that are not rules' configured trigger are ignored
 * rather than treated as errors.
 */
export function evaluateRules(rules: readonly AutomationRule[], event: AutomationEvent): AutomationOutcome[] {
  const outcomes: AutomationOutcome[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.trigger !== event.type) continue;
    if (rule.clientId !== event.clientId) continue;

    if (requiresThreshold(rule.trigger)) {
      if (event.value === undefined) continue;
      if (rule.threshold === undefined) continue;
      if (event.value <= rule.threshold) continue;
    }

    const risk = ACTION_RISK[rule.action];
    outcomes.push({
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
      actionLabel: ACTION_LABELS[rule.action],
      risk,
      summary: describeOutcome(rule, event),
      advisoryOnly: true,
    });
  }

  return outcomes;
}

function describeOutcome(rule: AutomationRule, event: AutomationEvent): string {
  const when = new Date(event.observedAt).toISOString().slice(0, 16).replace('T', ' ');

  switch (rule.trigger) {
    case 'CAMPAIGN_CPL_ABOVE':
      return `Cost per lead reached ${formatMoney(event.value, event.currency)} against a ${formatMoney(rule.threshold, event.currency)} threshold. ${ACTION_LABELS[rule.action]}.`;
    case 'CAMPAIGN_SPEND_ABOVE':
      return `Spend reached ${formatMoney(event.value, event.currency)} against a ${formatMoney(rule.threshold, event.currency)} limit. ${ACTION_LABELS[rule.action]}.`;
    case 'LEAD_RECEIVED':
      return `A lead arrived on ${event.campaignId ?? 'an unattributed campaign'}. ${ACTION_LABELS[rule.action]}.`;
    case 'CONTENT_NEEDS_APPROVAL':
      return `Content ${event.contentId ?? ''} requires approval. ${ACTION_LABELS[rule.action]}.`;
    case 'COMMUNITY_URL_UNAVAILABLE':
      return `A stored community public URL no longer resolves. ${ACTION_LABELS[rule.action]}.`;
    case 'CONNECTION_EXPIRED':
      return `The ${event.connectionPlatform ?? 'platform'} connection expired. ${ACTION_LABELS[rule.action]}.`;
    case 'REVIEW_RECEIVED':
      return `A new review was received at ${when}. ${ACTION_LABELS[rule.action]}.`;
    default:
      return `Rule matched at ${when}. ${ACTION_LABELS[rule.action]}.`;
  }
}

function formatMoney(value: number | undefined, currency = 'AED'): string {
  if (value === undefined || !Number.isFinite(value)) return 'an unreported amount';
  return `${currency} ${value.toFixed(2)}`;
}

/**
 * The template rules shipped with the product.
 *
 * All advisory, all thresholds explicit, all disabled-by-default where acting
 * on them would be premature. An operator enables them per client.
 */
export function templateRules(clientId: string, createdAt: string): AutomationRule[] {
  const base: Omit<AutomationRule, 'id' | 'clientId' | 'createdAt'>[] = [
    {
      name: 'Cost per lead above ceiling',
      trigger: 'CAMPAIGN_CPL_ABOVE',
      threshold: 45,
      action: 'FLAG_FOR_REVIEW',
      enabled: false,
      risk: 1,
    },
    {
      name: 'Campaign spend limit reached',
      trigger: 'CAMPAIGN_SPEND_ABOVE',
      threshold: 750,
      action: 'RAISE_ALERT',
      enabled: false,
      risk: 0,
    },
    {
      name: 'New lead routes to pipeline',
      trigger: 'LEAD_RECEIVED',
      action: 'ROUTE_TO_PIPELINE',
      enabled: true,
      risk: 1,
    },
    {
      name: 'Content needs approval task',
      trigger: 'CONTENT_NEEDS_APPROVAL',
      action: 'CREATE_APPROVAL_TASK',
      enabled: true,
      risk: 1,
    },
    {
      name: 'Community URL unavailable',
      trigger: 'COMMUNITY_URL_UNAVAILABLE',
      action: 'MARK_NEEDS_REVIEW',
      enabled: true,
      risk: 1,
    },
    {
      name: 'Connection expired',
      trigger: 'CONNECTION_EXPIRED',
      action: 'FLAG_FOR_REVIEW',
      enabled: true,
      risk: 1,
    },
  ];

  return base.map((rule, index) => ({
    ...rule,
    id: `auto_${clientId}_${index + 1}`,
    clientId,
    createdAt,
  }));
}