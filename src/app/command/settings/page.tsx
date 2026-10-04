'use client';

/**
 * Command Center — Settings, audit trail and safety posture.
 *
 * Three things live here because they are the workspace's standing commitments
 * rather than a screen: who may do what, what has been done, and what the product
 * is structurally incapable of doing on its own.
 */

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, Pane, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { activityFor } from '@/data/growth/connections';
import {
  DEFAULT_AUTONOMY,
  RISK_LEVEL_MEANING,
  type RiskLevel,
} from '@/lib/growth/states';
import { ROLES, ROLE_MEANING, ROLE_PERMISSIONS, ROLE_SCOPE } from '@/lib/growth/rbac';
import styles from '@/components/command/command.module.css';

export default function SettingsPage() {
  return <Settings />;
}

const AUDIT_ACTIONS = [
  'CONNECTION_CREATED',
  'CONNECTION_REMOVED',
  'CAMPAIGN_SUBMITTED',
  'CAMPAIGN_APPROVED',
  'CAMPAIGN_CHANGED',
  'CAMPAIGN_LAUNCH_REQUESTED',
  'BUDGET_CHANGED',
  'CONTENT_APPROVED',
  'COMMUNITY_POST_DISTRIBUTED',
  'AI_RECOMMENDATION_ACCEPTED',
] as const;

function Settings() {
  const { activeClient } = useWorkspace();
  const area = areaBySlug('settings')!;
  const activity = activityFor(activeClient.id);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'settings',
        contextLine: `${activeClient.name} · ${ROLES.length} roles · default autonomy ${DEFAULT_AUTONOMY}`,
      }}
      facts={[{ label: 'Default autonomy', value: DEFAULT_AUTONOMY }]}
    >
      <Section
        title="Safety posture"
        note="Structural, not advisory. Each of these is enforced by a type or a transition table."
      >
        <div className={styles.commandGrid3 ?? ''}>
          <Pane title="Risk scale is inherited">
            <p className={styles.ccPaneBody ?? ''}>
              KNOuX Repair&apos;s RISK LEVEL 0–3 scale is reused, not redefined. Advertising money and
              published brand content are at least as consequential as a firewall rule, so one
              approval model covers the whole institution.
            </p>
            <ol className={styles.ccPaneList ?? ''} style={{ paddingLeft: 16, listStyle: 'decimal' }}>
              {([0, 1, 2, 3] as RiskLevel[]).map((level) => (
                <li key={level}>{RISK_LEVEL_MEANING[level]}</li>
              ))}
            </ol>
          </Pane>

          <Pane title="What this build cannot do">
            <ul className={styles.ccPaneList ?? ''}>
              <li>Spend money. No mutating connector is callable.</li>
              <li>Publish an ad or a post to any real account.</li>
              <li>Send a WhatsApp message.</li>
              <li>Read a private group member list.</li>
              <li>Return a credential to a browser.</li>
              <li>Move a campaign to LIVE without a provider confirmation.</li>
            </ul>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CodeBadge tone="live">ENFORCED</CodeBadge>
            </div>
          </Pane>

          <Pane title="Autonomy">
            <p className={styles.ccPaneBody ?? ''}>
              Default <strong>{DEFAULT_AUTONOMY}</strong>. Advisor analyses, Copilot prepares actions
              for a named human, and Autopilot is a reserved slot with no enabling code path.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CodeBadge tone="info">DEFAULT {DEFAULT_AUTONOMY}</CodeBadge>
              <CodeBadge tone="bad">AUTOPILOT NOT SELECTABLE</CodeBadge>
            </div>
          </Pane>
        </div>
      </Section>

      <Section title="Roles and permissions" note="Client scope is checked before any permission, so no role can cross clients.">
        <div className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Scope</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Permissions</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role}>
                  <td>
                    <CodeBadge tone={role === 'CLIENT' ? 'info' : 'neutral'}>{role.replace(/_/g, ' ')}</CodeBadge>
                  </td>
                  <td>{ROLE_SCOPE[role].replace(/_/g, ' ')}</td>
                  <td className={styles.ccTableNum ?? ''}>{ROLE_PERMISSIONS[role].length}</td>
                  <td>{ROLE_MEANING[role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Separation of duties" note="An approval record only proves something if the approver is not the author.">
        <div className={styles.ccGrid2Fallback ?? ''}>
          <Pane title="Campaign approval">
            <ul className={styles.ccPaneList ?? ''}>
              <li>The author of a plan cannot approve it.</li>
              <li>Approval is granted over a frozen budget, duration and target snapshot.</li>
              <li>Approval is held by Owner, Manager, or the client themselves.</li>
              <li>Approval does not spend money. Launch is a separate, connector-gated step.</li>
            </ul>
          </Pane>
          <Pane title="Connection credentials">
            <ul className={styles.ccPaneList ?? ''}>
              <li>Reading connection state is ordinary operator work.</li>
              <li>Changing where a credential comes from is restricted to the workspace owner.</li>
              <li>Tokens are never written to local storage and never serialised into a response.</li>
            </ul>
          </Pane>
        </div>
      </Section>

      <Section title="Audit trail" note="Sensitive operations are recorded. Secrets are never recorded.">
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Recorded action types">
            <div className={styles.ccCommunityTags ?? ''}>
              {AUDIT_ACTIONS.map((action) => (
                <span key={action} className={styles.ccTag ?? ''}>
                  {action.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </Pane>

          <Pane title={`Entries for ${activeClient.name}`}>
            {activity.length === 0 ? (
              <p className={styles.ccPaneBody ?? ''}>No entries recorded for this workspace.</p>
            ) : (
              <ul className={styles.ccPaneList ?? ''}>
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <CodeBadge tone="info">{entry.action.replace(/_/g, ' ')}</CodeBadge>{' '}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--cc-ink-4)' }}>
                      {entry.at.slice(0, 16).replace('T', ' ')}
                    </span>{' '}
                    · {entry.actor}
                    {entry.detail ? <div style={{ fontSize: 11.5 }}>{entry.detail}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Pane>
        </div>
      </Section>

      <Section title="Environment" note="Names only. This screen cannot read a value.">
        <div className={styles.ccPaneList ?? ''}>
          <p className={styles.ccPaneBody ?? ''}>
            The browser is never sent a provider credential. Configuration is read server-side and
            projected as presence counts, capability names and env var names.
          </p>
        </div>
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          This workspace holds demo clients only. Nothing in these settings has been applied to a real
          advertising account.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}