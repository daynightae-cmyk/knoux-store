import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Campaign lifecycle and approval — behavioural.
 *
 * The single most important safety property in this product is that a campaign
 * cannot reach LIVE without a human having approved a specific budget. These
 * tests drive the transition table with the exact sequences an attacker or a
 * careless operator would try, and assert the refusal.
 */

const {
  transition,
  nextStates,
  canTransition,
  requestApproval,
  decideApproval,
  daysInclusive,
  formatBudget,
} = await import('../src/lib/growth/campaigns.ts');

const baseCampaign = {
  id: 'cmp_test',
  clientId: 'cl_test',
  name: 'Test plan',
  objective: 'LEADS',
  platforms: ['facebook'],
  budgetMinor: 75000,
  currency: 'AED',
  startDate: '2026-10-06',
  endDate: '2026-10-13',
  locations: ['Abu Dhabi'],
  languages: ['ar'],
  creativeSetIds: [],
  status: 'DRAFT',
  remoteCampaignIds: {},
  origin: 'FIXTURE',
  createdAt: '2026-10-04T00:00:00.000Z',
  updatedAt: '2026-10-04T00:00:00.000Z',
};

const approvalRecord = {
  id: 'apr_1',
  subjectType: 'CAMPAIGN',
  subjectId: 'cmp_test',
  clientId: 'cl_test',
  requestedBy: 'author@knoux.store',
  requestedAt: '2026-10-04T00:00:00.000Z',
  decision: 'APPROVE',
  budgetSnapshot: { budgetMinor: 75000, currency: 'AED', days: 8, target: 'Abu Dhabi' },
};

const manager = { userId: 'manager@knoux.store', role: 'MANAGER', clientIds: [] };

/* ------------------------------------------------------- no path to LIVE */

test('a campaign cannot reach LAUNCH_PENDING without a recorded approval', () => {
  const outcome = transition('APPROVED', 'LAUNCH_CONFIRMED_BY_CONNECTOR', {});
  assert.equal(outcome.ok, false);
  assert.equal(outcome.blocked, true);
  assert.match(outcome.reason, /approval/i);
  assert.ok(outcome.remedy.length > 0, 'a refusal must tell the operator what to do');
});

test('an approval with no budget snapshot does not unlock launch', () => {
  const outcome = transition('APPROVED', 'LAUNCH_CONFIRMED_BY_CONNECTOR', {
    approval: { ...approvalRecord, budgetSnapshot: undefined },
  });
  assert.equal(outcome.ok, false, 'an approval without a frozen budget must not authorise spend');
  assert.match(outcome.reason, /budget snapshot/i);
});

test('an approval whose decision is not APPROVE does not unlock launch', () => {
  for (const decision of ['REQUEST_CHANGES', 'REJECT', 'WITHDRAW', undefined]) {
    const outcome = transition('APPROVED', 'LAUNCH_CONFIRMED_BY_CONNECTOR', {
      approval: { ...approvalRecord, decision },
    });
    assert.equal(outcome.ok, false, `decision ${decision} must not unlock launch`);
  }
});

test('an approved campaign still cannot become LIVE without a connector confirmation', () => {
  const withoutConfirmation = transition('LAUNCH_PENDING', 'LAUNCH_CONFIRMED_BY_CONNECTOR', {});
  assert.equal(withoutConfirmation.ok, false, 'a local status write must not be able to set LIVE');
  assert.match(withoutConfirmation.reason, /connector/i);

  const withConfirmation = transition('LAUNCH_PENDING', 'LAUNCH_CONFIRMED_BY_CONNECTOR', {
    connectorConfirmed: true,
    connectorEvidence: 'meta.campaigns.create#demo',
  });
  assert.equal(withConfirmation.ok, true, 'a provider confirmation is the only route to LIVE');
  assert.equal(withConfirmation.to, 'LIVE');
});

test('no transition reaches LIVE from a state that has not been approved', () => {
  for (const from of ['DRAFT', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'FAILED', 'COMPLETED']) {
    const next = nextStates(from);
    assert.equal(
      next.includes('LIVE'),
      false,
      `${from} must not be able to move directly to LIVE`,
    );
  }
});

test('the full spend path requires approval and a connector, in that order', () => {
  const submitted = transition('DRAFT', 'AUTHOR_SUBMITTED');
  assert.equal(submitted.to, 'READY_FOR_REVIEW');

  const approved = transition('READY_FOR_REVIEW', 'APPROVER_APPROVED');
  assert.equal(approved.to, 'APPROVED');

  const queued = transition('APPROVED', 'LAUNCH_CONFIRMED_BY_CONNECTOR', { approval: approvalRecord });
  assert.equal(queued.to, 'LAUNCH_PENDING');

  const live = transition('LAUNCH_PENDING', 'LAUNCH_CONFIRMED_BY_CONNECTOR', { connectorConfirmed: true });
  assert.equal(live.to, 'LIVE');
  assert.equal(live.requiresApproval, true);
});

test('a terminal state offers no next state', () => {
  assert.deepEqual(nextStates('COMPLETED'), []);
  assert.equal(canTransition('COMPLETED', 'LIVE'), false);
});

test('an illegal transition refuses and names the legal ones', () => {
  const outcome = transition('DRAFT', 'APPROVER_APPROVED');
  assert.equal(outcome.ok, false);
  assert.match(outcome.remedy, /READY_FOR_REVIEW/, 'the refusal must list what is actually possible');
});

/* --------------------------------------------------------- approval record */

test('an approval freezes the budget the approver saw', () => {
  const result = requestApproval({ campaign: baseCampaign, requestedBy: 'a@knoux.store', approver: manager });
  assert.equal(result.ok, true);
  assert.equal(result.approval.budgetSnapshot.budgetMinor, 75000);
  assert.equal(result.approval.budgetSnapshot.days, 8);
  assert.equal(result.approval.budgetSnapshot.target, 'Abu Dhabi');
  assert.equal(result.risk, 2, 'spending money is risk level 2 under the inherited scale');
});

test('the author of a plan cannot be its approver', () => {
  const refused = requestApproval({
    campaign: baseCampaign,
    requestedBy: 'self@knoux.store',
    approver: { userId: 'self@knoux.store', role: 'MANAGER', clientIds: [] },
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /approver/i);
});

test('an approver cannot be the submitter even after the plan is drafted', () => {
  // The record must be undecided, and the decider must not be the author, or the
  // test would pass on the wrong branch.
  const undecided = { ...approvalRecord };
  delete undecided.decision;
  delete undecided.budgetSnapshot;

  const refusal = decideApproval(undecided, 'APPROVE', {
    userId: approvalRecord.requestedBy,
    role: 'MANAGER',
    clientIds: [],
  });
  assert.equal(refusal.ok, false);
  assert.match(refusal.reason, /cannot be its approver/i);
});

test('a decision can be recorded once, and only by an authorised role', () => {
  const undecided = { ...approvalRecord };
  delete undecided.decision;
  delete undecided.budgetSnapshot;

  // A specialist who is not the author is refused on role, not on authorship.
  const otherSpecialist = { userId: 'other@knoux.store', role: 'ADS_SPECIALIST', clientIds: ['cl_test'] };
  const bySpecialist = decideApproval(undecided, 'APPROVE', otherSpecialist);
  assert.equal(bySpecialist.ok, false, 'an ads specialist holds submit, not approve');
  assert.match(bySpecialist.reason, /cannot approve/i);

  const byManager = decideApproval(undecided, 'APPROVE', manager);
  assert.equal(byManager.ok, true);
  assert.equal(byManager.campaignStatus, 'APPROVED');

  const twice = decideApproval(byManager.approval, 'REJECT', manager);
  assert.equal(twice.ok, false, 'a recorded decision must not be overwritten');
  assert.match(twice.reason, /already has a recorded decision/i);
});

test('a request is refused when the plan is not approvable', () => {
  const submit = (overrides) =>
    requestApproval({ campaign: { ...baseCampaign, ...overrides }, requestedBy: 'a@x.store', approver: manager });

  const noBudget = submit({ budgetMinor: 0 });
  assert.equal(noBudget.ok, false);
  assert.match(noBudget.reason, /budget/i);

  const noPlatform = submit({ platforms: [] });
  assert.equal(noPlatform.ok, false);
  assert.match(noPlatform.reason, /platform/i);

  const backwards = submit({ startDate: '2026-10-13', endDate: '2026-10-06' });
  assert.equal(backwards.ok, false, 'an end before the start must not be approvable');
});

test('a campaign already past review cannot be resubmitted', () => {
  const outcome = requestApproval({
    campaign: { ...baseCampaign, status: 'APPROVED' },
    requestedBy: 'a@x.store',
    approver: manager,
  });
  assert.equal(outcome.ok, false);
  assert.match(outcome.remedy, /DRAFT or CHANGES_REQUESTED/);
});

/* ----------------------------------------------------------------- helpers */

test('duration is inclusive and rejects a reversed window', () => {
  assert.equal(daysInclusive('2026-10-06', '2026-10-13'), 8);
  assert.equal(daysInclusive('2026-10-06', '2026-10-06'), 1);
  assert.equal(daysInclusive('2026-10-13', '2026-10-06'), 0);
  assert.equal(daysInclusive('not-a-date', '2026-10-13'), 0);
});

test('money formats from minor units without floating point drift', () => {
  assert.equal(formatBudget(75000, 'AED'), 'AED 750.00');
  assert.equal(formatBudget(1, 'AED'), 'AED 0.01');
  assert.equal(formatBudget(0, 'AED'), 'AED 0.00');
});
