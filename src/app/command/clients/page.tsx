'use client';

/**
 * Command Center — Clients.
 *
 * Each client is an independent workspace. This screen shows the whole shape of
 * one: brand rules, branches, platforms with a stored credential, and the AI
 * memory KNOuX reasons over.
 *
 * The brand panel is the operational half of the product. `forbiddenClaims` is
 * not documentation — it is injected server-side into every KNOuX request for
 * this client, which is why it is rendered prominently rather than tucked into a
 * settings sub-tab.
 */

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  DemoNotice,
  EmptyState,
  OriginLabel,
  Pane,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { connectionsFor } from '@/data/growth/connections';
import { DEMO_CLIENTS } from '@/data/growth/clients';
import { countryByCode } from '@/data/growth/taxonomy';
import { AUTONOMY_MEANING, type AutonomyMode } from '@/lib/growth/states';
import styles from '@/components/command/command.module.css';

export default function ClientsPage() {
  return <Clients />;
}

function Clients() {
  const { activeClient, setActiveClientId, clients } = useWorkspace();
  const area = areaBySlug('clients')!;
  const connections = connectionsFor(activeClient.id);
  const country = countryByCode(activeClient.country);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'clients',
        subjectId: activeClient.id,
        contextLine: `${activeClient.name} · ${activeClient.businessCategory} · ${activeClient.city}`,
      }}
      facts={[
        { label: 'Branches', value: String(activeClient.branches.length) },
        { label: 'Workspaces', value: String(clients.length) },
      ]}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <DemoNotice>
          Every client here is an invented demonstration workspace. No real business, brand or contact
          detail is represented.
        </DemoNotice>
      </div>

      <Section title="Workspaces" note="Select a workspace to load it into every screen.">
        <div className={styles.commandGrid4 ?? ''}>
          {DEMO_CLIENTS.map((client) => (
            <button
              key={client.id}
              type="button"
              className={styles.ccPane ?? ''}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
                borderColor:
                  client.id === activeClient.id ? 'color-mix(in srgb, var(--cc-violet) 45%, var(--cc-line))' : undefined,
              }}
              onClick={() => setActiveClientId(client.id)}
              aria-pressed={client.id === activeClient.id}
            >
              <span className={styles.ccPaneTitle ?? ''}>{client.name}</span>
              <span className={styles.ccPaneBody ?? ''} style={{ fontSize: 11.5 }}>
                {client.businessCategory} · {countryByCode(client.country)?.name}
              </span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <CodeBadge>{client.city}</CodeBadge>
                <CodeBadge>{client.branches.length} BRANCH</CodeBadge>
                <OriginLabel origin={client.origin} />
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={`${activeClient.name} — brand`} note="These rules travel with every KNOuX request for this client.">
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Identity">
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 12 }}>
              <Term>Category</Term>
              <Def>{activeClient.businessCategory}</Def>
              <Term>Market</Term>
              <Def>
                {activeClient.city}, {country?.name}
              </Def>
              <Term>Languages</Term>
              <Def>{activeClient.languages.join(', ')}</Def>
              <Term>Tone</Term>
              <Def>{activeClient.brand.tone}</Def>
              {activeClient.website ? (
                <>
                  <Term>Website</Term>
                  <Def>{activeClient.website}</Def>
                </>
              ) : null}
              {activeClient.phone ? (
                <>
                  <Term>Phone</Term>
                  <Def>{activeClient.phone}</Def>
                </>
              ) : null}
              {activeClient.whatsapp ? (
                <>
                  <Term>WhatsApp</Term>
                  <Def>{activeClient.whatsapp}</Def>
                </>
              ) : null}
              <Term>Autonomy</Term>
              <Def>
                <CodeBadge tone="info">{activeClient.autonomyMode}</CodeBadge>{' '}
                {AUTONOMY_MEANING[activeClient.autonomyMode as AutonomyMode]}
              </Def>
            </dl>
          </Pane>

          <Pane title="Forbidden claims" className={styles.ccApproval ?? ''}>
            <p className={styles.ccPaneBody ?? ''}>
              KNOuX must never generate, imply or repeat these. They are attached server-side to every
              intelligence request for this client, so omitting them from a request is not possible.
            </p>
            <ul className={styles.ccPaneList ?? ''}>
              {activeClient.brand.forbiddenClaims.map((claim) => (
                <li key={claim} style={{ display: 'flex', gap: 8 }}>
                  <span aria-hidden="true" style={{ color: 'var(--cc-red)' }}>
                    ×
                  </span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          </Pane>
        </div>
      </Section>

      <Section title="Brand system" note="Platform brand colours are not brand colours.">
        <div className={styles.commandGrid3 ?? ''}>
          <Pane title="Colours">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeClient.brand.colors.map((colour) => (
                <span
                  key={colour}
                  title={colour}
                  style={{
                    width: 30,
                    height: 30,
                    background: colour,
                    border: '1px solid var(--cc-line-bright)',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
            <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10 }}>
              {activeClient.brand.colors.join('  ')}
            </p>
          </Pane>

          <Pane title="Typography and register">
            <ul className={styles.ccPaneList ?? ''}>
              {activeClient.brand.fonts.map((font) => (
                <li key={font}>{font}</li>
              ))}
            </ul>
            {activeClient.brand.arabicStyle ? (
              <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 6 }}>
                <strong>AR:</strong> {activeClient.brand.arabicStyle}
              </p>
            ) : null}
            {activeClient.brand.englishStyle ? (
              <p className={styles.ccPaneBody ?? ''}>
                <strong>EN:</strong> {activeClient.brand.englishStyle}
              </p>
            ) : null}
          </Pane>

          <Pane title="Approved assets">
            <ul className={styles.ccPaneList ?? ''}>
              {activeClient.brand.approvedAssets.length === 0 ? (
                <li>No approved assets recorded.</li>
              ) : (
                activeClient.brand.approvedAssets.map((asset) => <li key={asset}>{asset}</li>)
              )}
            </ul>
            <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 6, fontSize: 11.5 }}>
              Only approved assets may appear in generated creative.
            </p>
          </Pane>
        </div>
      </Section>

      <Section title="Branches" note="A Business Profile location is scoped to a branch, so branches are real records.">
        {activeClient.branches.length === 0 ? (
          <EmptyState title="No branches recorded" />
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Branch</th>
                  <th scope="col">City</th>
                  <th scope="col">Address</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Business Profile</th>
                </tr>
              </thead>
              <tbody>
                {activeClient.branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.name}</td>
                    <td>{branch.city}</td>
                    <td>{branch.addressLine}</td>
                    <td>{branch.phone ?? '—'}</td>
                    <td>
                      {branch.googleLocationId ? (
                        <CodeBadge tone="live">LINKED</CodeBadge>
                      ) : (
                        <CodeBadge tone="warn">NOT LINKED</CodeBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Connected platforms"
        note="A platform is listed here only when a credential is stored. None are, in this deployment."
      >
        {connections.length === 0 ? (
          <EmptyState title="No connection records">
            Connect a platform from the Connections area to begin recording credential state.
          </EmptyState>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {connections.map((connection) => (
              <span
                key={connection.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <CodeBadge>{connection.platform}</CodeBadge>
                <CapabilityBadge state={connection.capabilityState} />
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Products and services" note="The catalogue creative and landing pages reason over.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <tbody>
              {activeClient.brand.products.map((product, index) => (
                <tr key={product}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 10, width: 40, color: 'var(--cc-ink-4)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td>{product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <p className={styles.ccFoot ?? ''}>
        <strong>Workspace isolation.</strong> A client-role principal is bound to exactly one client
        id. Every permission check verifies that binding first, so no role can read another client.
      </p>
    </CommandShell>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <dt
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--cc-ink-4)',
      }}
    >
      {children}
    </dt>
  );
}

function Def({ children }: { children: React.ReactNode }) {
  return <dd style={{ margin: 0, color: 'var(--cc-ink-2)' }}>{children}</dd>;
}