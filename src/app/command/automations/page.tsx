'use client';

/**
 * Command Center — Automations.
 *
 * The rules engine, and the screen that has to make "safe" legible rather than
 * merely asserted. It states the same thing three ways: no action kind can spend,
 * the ceiling risk is 1, and the evaluator returns `advisoryOnly` on every
 * outcome.
 *
 * It also includes a live evaluator so a reviewer can watch a threshold fire and
 * see that firing produce a flag rather than a pause.
 */

import { useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, EmptyState, Pane, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  evaluateRules,
  validateRule,
  type AutomationEvent,
} from '@/lib/growth/automation';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_PLATFORMS, type AutomationTrigger } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';
import lab from './simulation.module.css';

export default function AutomationsPage() {
  return <Automations />;
}

function Automations() {
  const { records, activeClient } = useWorkspace();
  const area = areaBySlug('automations')!;
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [event, setEvent] = useState<AutomationEvent>({
    type: 'CAMPAIGN_CPL_ABOVE',
    clientId: activeClient.id,
    currency,
    observedAt: new Date().toISOString(),
  });

  const rules = records.automations.map((rule) => ({
    ...rule,
    enabled: enabled[rule.id] ?? rule.enabled,
  }));

  const campaignId = records.campaigns.some((campaign) => campaign.id === event.campaignId) ? event.campaignId : undefined;
  const outcomes = evaluateRules(rules, { ...event, currency, clientId: activeClient.id, campaignId });
  const candidates = rules.filter((rule) => rule.enabled && rule.trigger === event.type).length;

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'automations',
        contextLine: `${activeClient.name} · ${rules.length} rules · ${rules.filter((rule) => rule.enabled).length} enabled`,
      }}
      facts={[
        { label: 'Rules', value: String(rules.length) },
        { label: 'Spend actions', value: '0' },
      ]}
    >
      <Section title="Evaluate an event" note="Simulate an input and inspect the advisory result.">
        <ol className={lab.flow} aria-label="Simulation path" aria-live="polite">
          <li><strong>Event</strong><span>{TRIGGER_LABELS[event.type]}</span></li>
          <li><strong>Enabled rules for this trigger</strong><span>{candidates}</span></li>
          <li><strong>Advisory outcomes</strong><span>{outcomes.length}</span></li>
        </ol>
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Simulate">
            <label className={styles.ccField ?? ''} style={{ marginBottom: 10 }}>
              <span className={styles.ccFieldLabel ?? ''} id="simulation-trigger-label">Trigger</span>
              <select
                className={styles.ccFieldControl ?? ''}
                aria-labelledby="simulation-trigger-label"
                value={event.type}
                onChange={(changeEvent) =>
                  setEvent((state) => ({ ...state, type: changeEvent.target.value as AutomationTrigger }))
                }
              >
                {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {TRIGGER_LABELS[trigger]}
                  </option>
                ))}
              </select>
            </label>

            {records.campaigns.length > 0 && <label className={styles.ccField ?? ''}>
              <span className={styles.ccFieldLabel ?? ''} id="simulation-campaign-label">Campaign context</span>
              <select className={styles.ccFieldControl ?? ''} aria-labelledby="simulation-campaign-label" value={campaignId ?? ''} onChange={(changeEvent) => {
                const value = changeEvent.currentTarget.value;
                setEvent((state) => ({ ...state, campaignId: value || undefined }));
              }}>
                <option value="">No campaign selected</option>
                {records.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </label>}

            <label className={styles.ccField ?? ''}>
              <span className={styles.ccFieldLabel ?? ''}>
                Value {currency} — leave empty to simulate a provider that reported nothing
              </span>
              <input
                className={styles.ccFieldControl ?? ''}
                type="number"
                value={event.value ?? ''}
                onChange={(changeEvent) =>
                  setEvent((state) => ({
                    ...state,
                    value: changeEvent.target.value === '' ? undefined : Number(changeEvent.target.value),
                  }))
                }
              />
            </label>
          </Pane>

          <Pane title={`Outcomes (${outcomes.length})`}>
            {outcomes.length === 0 ? (
              <EmptyState title="No rule fired">
                Either no enabled rule matches this trigger, or the value did not cross its threshold.
              </EmptyState>
            ) : (
              <ul className={styles.ccPaneList ?? ''}>
                {outcomes.map((outcome) => (
                  <li key={outcome.ruleId} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <CodeBadge tone="info">{outcome.actionLabel}</CodeBadge>
                    <span style={{ flex: 1, minWidth: 200 }}>{outcome.summary}</span>
                    <CodeBadge tone="warn">RISK {outcome.risk}</CodeBadge>
                    <CodeBadge tone="live">ADVISORY</CodeBadge>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 12, marginTop: 8 }}>
              Each outcome previews the advisory action the rule proposes. This simulation leaves campaigns and tasks as they are.
            </p>
          </Pane>
        </div>
      </Section>

      <Section title="Safety posture" note="Stated three ways because it matters three ways.">
        <div className={styles.commandGrid3 ?? ''}>
          <Pane title="The type cannot express spending">
            <p className={styles.ccPaneBody ?? ''}>
              The action union admits only annotation, alert, task and routing. There is no member
              that pauses a campaign, moves a budget or launches anything — so a spend path cannot be
              added without a reviewable type change.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CodeBadge tone="live">NO SPEND ACTION</CodeBadge>
            </div>
          </Pane>

          <Pane title="Risk ceiling is 1">
            <p className={styles.ccPaneBody ?? ''}>
              Every action kind is capped at risk level 1 — low-risk reversible. Risk level 2 and above
              requires human approval, so no rule here can reach that threshold.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CodeBadge tone="info">MAX RISK 1</CodeBadge>
            </div>
          </Pane>

          <Pane title="Outcomes are advisory">
            <p className={styles.ccPaneBody ?? ''}>
              The evaluator performs no I/O and returns <code>advisoryOnly: true</code> on every
              outcome. It cannot call a provider even in principle.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CodeBadge tone="live">ADVISORY ONLY</CodeBadge>
            </div>
          </Pane>
        </div>
      </Section>

      <Section title="Rules" note="These switches apply to this evaluation.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Trigger</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Threshold</th>
                <th scope="col">Action</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Risk</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const validation = validateRule(rule);
                return (
                  <tr key={rule.id}>
                    <td>{rule.name}</td>
                    <td>{TRIGGER_LABELS[rule.trigger]}</td>
                    <td className={styles.ccTableNum ?? ''}>
                      {rule.threshold !== undefined ? `${rule.threshold} ${currency}` : '—'}
                    </td>
                    <td>{ACTION_LABELS[rule.action]}</td>
                    <td className={styles.ccTableNum ?? ''}>{validation.ok ? validation.risk : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                        aria-pressed={rule.enabled}
                        onClick={() =>
                          setEnabled((state) => ({ ...state, [rule.id]: !rule.enabled }))
                        }
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Campaign vocabulary" note="Shared with the campaign form.">
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Objectives">
            <ul className={styles.ccPaneList ?? ''}>
              {CAMPAIGN_OBJECTIVES.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </Pane>
          <Pane title="Platforms">
            <ul className={styles.ccPaneList ?? ''}>
              {CAMPAIGN_PLATFORMS.map((platform) => (
                <li key={platform}>{platform}</li>
              ))}
            </ul>
          </Pane>
        </div>
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          The selected workspace rules are evaluated in memory using the simulated event above.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}
