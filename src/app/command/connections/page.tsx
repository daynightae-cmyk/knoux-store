'use client';

/**
 * Command Center — Connections.
 *
 * The screen with the most important job in the product: be honest about what
 * is and is not connected.
 *
 * Two decisions shape it.
 *
 * First, nothing here can render as connected without a credential. The
 * capability resolution happens server-side and `LIVE_VERIFIED` is unreachable
 * from a static resolve, so a green state on this screen is a type-checked
 * impossibility rather than a promise.
 *
 * Second, a blocked capability is not styled as an error. Facebook having no
 * Groups API and WhatsApp sending being intentionally unimplemented are facts
 * about the platform and the scope, not faults to apologise for. They are shown
 * as BLOCKED with the reason attached.
 */

import { useEffect, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  ConnectionBadge,
  DemoNotice,
  Pane,
  PlatformMark,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { CONNECTION_CATALOGUE } from '@/data/growth/connections';
import type { SafeCapabilityView } from '@/lib/growth/connectors/boundary';
import { CALL_FAILURE_MEANING } from '@/lib/growth/states';
import styles from '@/components/command/command.module.css';

export default function ConnectionsPage() {
  return <Connections />;
}

function Connections() {
  const { records, activeClient, isDemoWorkspace } = useWorkspace();
  const area = areaBySlug('connections')!;
  const connections = records.connections;
  const [oauthMessage, setOAuthMessage] = useState<string | null>(null);
  const [oauthBusy, setOAuthBusy] = useState(false);

  async function authorise(platform: string) {
    const choices: Record<string, { provider: string; capability: string }> = {
      facebook: { provider: 'meta', capability: 'META_PAGES' },
      instagram: { provider: 'meta', capability: 'META_INSTAGRAM' },
      meta_ads: { provider: 'meta', capability: 'META_ADS_READ' },
      whatsapp: { provider: 'meta', capability: 'META_WHATSAPP' },
      google_ads: { provider: 'google', capability: 'GOOGLE_ADS' },
      google_business: { provider: 'google', capability: 'GOOGLE_BUSINESS' },
      ga4: { provider: 'google', capability: 'GOOGLE_ANALYTICS' },
      search_console: { provider: 'google', capability: 'GOOGLE_SEARCH_CONSOLE' },
      youtube: { provider: 'google', capability: 'GOOGLE_YOUTUBE' },
    };
    const choice = choices[platform];
    if (!choice) return;
    setOAuthBusy(true);
    setOAuthMessage(null);
    try {
      const response = await fetch(`/api/growth/oauth/${choice.provider}/start`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: activeClient.id, capability: choice.capability }),
      });
      const result = await response.json() as { url?: string; reason?: string };
      if (!response.ok || !result.url) throw new Error(result.reason ?? 'Authorization could not be started.');
      window.location.assign(result.url);
    } catch (error) {
      setOAuthMessage(error instanceof Error ? error.message : 'Authorization could not be started.');
      setOAuthBusy(false);
    }
  }

  async function removeConnection(platform: string) {
    setOAuthBusy(true);
    setOAuthMessage(null);
    try {
      const response = await fetch(`/api/growth/connections/${encodeURIComponent(platform)}?clientId=${encodeURIComponent(activeClient.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Connection removal was refused. Your stored connection was not reported as removed.');
      window.location.reload();
    } catch (error) {
      setOAuthMessage(error instanceof Error ? error.message : 'Connection removal failed.');
      setOAuthBusy(false);
    }
  }

  const [capabilities, setCapabilities] = useState<{
    capabilities: SafeCapabilityView[];
    requiredEnv: string[];
    notice: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/growth/capabilities?clientId=${encodeURIComponent(activeClient.id)}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Capability access refused.');
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) setCapabilities(payload);
      })
      .catch(() => {
        if (!cancelled) setCapabilities({ capabilities: [], requiredEnv: [], notice: 'Registry unavailable.' });
      });
    return () => {
      cancelled = true;
    };
  }, [activeClient.id]);

  const byFamily = groupByFamily(capabilities?.capabilities ?? []);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'connections',
        contextLine: `${activeClient.name} · ${connections.length} connection record(s) · ${capabilities?.capabilities.length ?? 0} registered capabilities`,
      }}
      facts={[
        { label: 'Connected', value: String(connections.filter((c) => c.state === 'CONNECTED').length) },
        { label: 'Registered', value: String(capabilities?.capabilities.length ?? 0) },
      ]}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <DemoNotice>
          This is an explicitly selected DEMO/FIXTURE workspace. Connection cards are
          demonstrations; live authorization requires an authenticated stored workspace.
        </DemoNotice>
      </div>

      <Section
        title="Platform connections"
        note="State is derived from stored credentials, never from a wish."
      >
        {oauthMessage ? <p role="status">{oauthMessage}</p> : null}
        <div className={styles.commandGrid3 ?? ''}>
          {CONNECTION_CATALOGUE.map((entry) => {
            const record = connections.find((connection) => connection.platform === entry.platform);
            const future = entry.group === 'Future';

            return (
              <article key={entry.platform} className={styles.ccPane ?? ''}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlatformMark platform={entry.platform} />
                  <span className={styles.ccPaneTitle ?? ''}>{entry.label}</span>
                </div>

                <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 11.5 }}>
                  {entry.scopesHint}
                </p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {future ? (
                    <CapabilityBadge state="UI_READY" />
                  ) : record ? (
                    <>
                      <ConnectionBadge state={record.state} />
                      <CapabilityBadge state={record.capabilityState} />
                    </>
                  ) : (
                    <ConnectionBadge state="NOT_CONNECTED" />
                  )}
                  <CodeBadge>{entry.group}</CodeBadge>
                </div>

                {record?.lastError ? (
                  <p
                    className={styles.ccPaneBody ?? ''}
                    style={{ fontSize: 11, color: 'var(--cc-ink-4)' }}
                  >
                    {record.lastError}
                  </p>
                ) : null}

                {record?.grantedScopes && record.grantedScopes.length > 0 ? (
                  <div className={styles.ccCommunityTags ?? ''}>
                    {record.grantedScopes.map((scope) => (
                      <span key={scope} className={styles.ccTag ?? ''}>
                        {scope}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className={styles.ccCommunityActions ?? ''}>
                  {future ? (
                    <button
                      type="button"
                      className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                      disabled
                      title="No credential path is wired for this platform."
                    >
                      Not wired
                    </button>
                  ) : (
                    <>
                      <button type="button" className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`} onClick={() => setOAuthMessage('Configure the provider app and registered callback URL on the server. Credentials are never entered into this screen.')}>
                        Configure
                      </button>
                      <button
                        type="button"
                        className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                        disabled={isDemoWorkspace || oauthBusy}
                        onClick={() => void authorise(entry.platform)}
                        title={isDemoWorkspace ? 'Authorisation requires an authenticated stored workspace.' : 'Start owner-authorized OAuth; missing server configuration is reported explicitly.'}
                      >
                        Authorise
                      </button>
                      {record ? (
                        <button
                          type="button"
                          disabled={isDemoWorkspace || oauthBusy}
                          onClick={() => void removeConnection(entry.platform)}
                          title="Remove this workspace's stored connection and credential references. Provider account permissions remain under the provider's controls."
                          className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''} ${styles.ccButtonDanger ?? ''}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Capability registry" note="The MCP-shaped bridge. Names are KNOuX's own vocabulary.">
        {capabilities === null ? (
          <span className={styles.ccMetricMeta ?? ''}>Resolving against the server environment…</span>
        ) : (
          <>
            <p className={styles.ccPaneBody ?? ''} style={{ marginBottom: 10 }}>
              {capabilities.notice}
            </p>

            {Object.entries(byFamily).map(([family, entries]) => (
              <div key={family} style={{ marginBottom: 18 }}>
                <p className={styles.ccPaneTitle ?? ''} style={{ marginBottom: 6 }}>
                  {family}
                </p>
                <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
                  <table className={styles.ccTable ?? ''}>
                    <thead>
                      <tr>
                        <th scope="col">Capability</th>
                        <th scope="col">Returns</th>
                        <th scope="col">Risk</th>
                        <th scope="col">Credentials</th>
                        <th scope="col">Readiness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((capability) => (
                        <tr key={capability.id}>
                          <td>
                            <div>{capability.label}</div>
                            <small
                              style={{
                                color: 'var(--cc-ink-4)',
                                fontFamily: 'var(--mono)',
                                fontSize: 9,
                              }}
                            >
                              {capability.id}
                            </small>
                          </td>
                          <td style={{ maxWidth: 320 }}>{capability.returns}</td>
                          <td>
                            <CodeBadge tone={capability.risk === 'MUTATING' ? 'warn' : 'neutral'}>
                              {capability.risk}
                            </CodeBadge>
                          </td>
                          <td className={styles.ccTableNum ?? ''}>
                            {capability.presentCount}/{capability.requiredCount}
                          </td>
                          <td>
                            <CapabilityBadge state={capability.readiness} />
                            {capability.blockedReason ? (
                              <p
                                className={styles.ccTableAbsent ?? ''}
                                style={{ fontSize: 11, marginTop: 4, maxWidth: 320 }}
                              >
                                {capability.blockedReason}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </Section>

      <Section title="Error taxonomy" note="Every failure is named. None is a generic error.">
        <div className={styles.commandGrid4 ?? ''}>
          {Object.entries(CALL_FAILURE_MEANING).map(([failure, meaning]) => (
            <Pane key={failure} title={failure}>
              <p className={styles.ccPaneBody ?? ''}>{meaning}</p>
            </Pane>
          ))}
        </div>
      </Section>

      <Section title="Environment required" note="Names only. Values are never returned to a browser.">
        <div className={styles.ccCommunityTags ?? ''}>
          {(capabilities?.requiredEnv ?? []).map((name) => (
            <span key={name} className={styles.ccTag ?? ''}>
              {name}
            </span>
          ))}
        </div>
      </Section>

      <p className={styles.ccFoot ?? ''}>
        <strong>OAuth is ready, credentials are not.</strong> Authorisation is server-side. Access
        tokens are never placed in local storage, never serialised into a response, and never logged.
        Changing a connection credential is restricted to the workspace owner.
      </p>
    </CommandShell>
  );
}

function groupByFamily(capabilities: SafeCapabilityView[]): Record<string, SafeCapabilityView[]> {
  const out: Record<string, SafeCapabilityView[]> = {};
  for (const capability of capabilities) {
    (out[capability.family] ??= []).push(capability);
  }
  return out;
}
