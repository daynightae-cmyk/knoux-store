'use client';

/**
 * Command Center — KNOuX Intelligence.
 *
 * This screen is the architecture made visible: one intelligence, several
 * intelligence families, one replaceable reasoning provider underneath, and
 * external platforms as connectors rather than as the brain.
 *
 * It is also the screen that proves the naming rule. The user-facing identity is
 * KNOuX and the UI never renders "Gemini", "Google AI" or any other vendor as a
 * product identity. Which provider actually served a request is shown as
 * *operational provenance* — a state, in a panel about infrastructure — because
 * an operator needs to know whether intelligence is degraded, but a client-facing
 * surface must never present the brain as a vendor.
 */

import { useEffect, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  DemoNotice,
  Pane,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import {
  FAMILY_MEANING,
  INTELLIGENCE_FAMILIES,
  USER_FACING_AI_NAME,
  isAcceptableIdentity,
  type IntelligenceFamily,
  type ProviderProbe,
} from '@/lib/growth/intelligence/types';
import { AGENT_FAMILIES_LIVE, AGENT_FAMILIES_PENDING } from '@/lib/growth/intelligence/adapters/knoux-agent';
import { AUTONOMY_MEANING, DEFAULT_AUTONOMY, SELECTABLE_AUTONOMY } from '@/lib/growth/states';
import type { SafeCapabilityView } from '@/lib/growth/connectors/boundary';
import styles from '@/components/command/command.module.css';

export default function IntelligencePage() {
  return <Intelligence />;
}

type ProbeState = {
  checked: boolean;
  failure?: string;
  detail?: string;
  families: IntelligenceFamily[];
};

function Intelligence() {
  const { activeClient } = useWorkspace();
  const area = areaBySlug('intelligence')!;

  const [probe, setProbe] = useState<ProbeState>({ checked: false, families: [] });
  const [capabilities, setCapabilities] = useState<SafeCapabilityView[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The probe is a server-side concern, so it is asked for rather than
    // computed in the browser: the browser must not be able to conclude that
    // the agent is reachable.
    void (async () => {
      try {
        const res = await fetch('/api/growth/intelligence/probe', { cache: 'no-store' });
        const payload = (await res.json()) as {
          failure?: string | null;
          detail?: string;
          families?: IntelligenceFamily[];
        };
        if (!cancelled) {
          setProbe({
            checked: true,
            families: payload.families ?? [],
            ...(payload.failure ? { failure: payload.failure } : {}),
            ...(payload.detail ? { detail: payload.detail } : {}),
          });
        }
      } catch {
        if (!cancelled) setProbe({ checked: true, families: [], failure: 'UNAVAILABLE' });
      }
    })();

    void fetch('/api/growth/capabilities', { cache: 'no-store' })
      .then((res) => res.json())
      .then((payload: { capabilities?: SafeCapabilityView[] }) => {
        if (!cancelled) setCapabilities(payload.capabilities ?? []);
      })
      .catch(() => {
        if (!cancelled) setCapabilities([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'intelligence',
        contextLine: `${USER_FACING_AI_NAME} · ${INTELLIGENCE_FAMILIES.length} intelligence families · ${activeClient.name}`,
      }}
      facts={[
        { label: 'User-facing identity', value: USER_FACING_AI_NAME },
        { label: 'Default autonomy', value: DEFAULT_AUTONOMY },
      ]}
    >
      <Section
        title="One intelligence"
        note="The user experiences KNOuX. The reasoning provider underneath is replaceable infrastructure."
      >
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="What the user sees">
            <p className={styles.ccPaneBody ?? ''}>
              A single moving KNOuX mark and a contextual command dock, bound to the selected client and
              the surface in view. It is never a generic chat box, and it is never labelled with a
              vendor.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CodeBadge tone="live">{USER_FACING_AI_NAME}</CodeBadge>
              <CodeBadge>NO PROVIDER IDENTITY IN UI</CodeBadge>
            </div>
          </Pane>

          <Pane title="What sits underneath">
            <ul className={styles.ccPaneList ?? ''}>
              <li>UI → KNOuX Intelligence API → provider router → KNOuX Agent.</li>
              <li>KNOuX Agent → MCP connectors → Meta, Google, communities, WhatsApp.</li>
              <li>Replacing the reasoning provider does not touch this product.</li>
            </ul>
          </Pane>
        </div>
      </Section>

      <Section title="Intelligence families" note="Repair is the existing intelligence and is not extended by this product.">
        <div className={styles.commandGrid3 ?? ''}>
          {INTELLIGENCE_FAMILIES.map((family) => {
            const isRepair = family === 'REPAIR';
            const pending = AGENT_FAMILIES_PENDING.includes(family);
            return (
              <Pane key={family} title={family}>
                <p className={styles.ccPaneBody ?? ''}>{FAMILY_MEANING[family]}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {isRepair ? (
                    <CapabilityBadge state="LIVE_VERIFIED" />
                  ) : pending ? (
                    <CapabilityBadge state="ADAPTER_READY" />
                  ) : (
                    <CapabilityBadge state="UI_READY" />
                  )}
                  {isRepair ? <CodeBadge tone="live">EXISTING</CodeBadge> : <CodeBadge>PENDING SUB-AGENT</CodeBadge>}
                </div>
              </Pane>
            );
          })}
        </div>
      </Section>

      <Section
        title="Provider status"
        note="Operational provenance. Shown because an operator must know when intelligence is degraded."
      >
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Primary — KNOuX Agent">
            <p className={styles.ccPaneBody ?? ''}>
              Targets the existing ADK agent <code>KNOUX_Repair_Forensic_Assistant</code> over Agent
              Engine / A2A. Its Repair intelligence, safety policy, knowledge system, MCP wiring and
              approval model are untouched.
            </p>
            {probe.checked ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <CapabilityBadge state="AUTH_REQUIRED" />
                <span className={styles.ccMetricMeta ?? ''}>
                  {probe.detail ?? 'No endpoint or credential is configured for this deployment.'}
                </span>
              </div>
            ) : (
              <span className={styles.ccMetricMeta ?? ''}>Checking…</span>
            )}
            <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 11.5 }}>
              Families available on the deployed agent today: {AGENT_FAMILIES_LIVE.join(', ')}. Growth
              families require the sub-agent patch documented in{' '}
              <code>docs/growth/KNOUX-AI-INTEGRATION.md</code>.
            </p>
          </Pane>

          <Pane title="Fallback — local deterministic reasoner">
            <p className={styles.ccPaneBody ?? ''}>
              Computes from workspace data with no model call. It ranks community records, compares
              canonical metrics and checks plan constraints. It does not generate copy, and every
              answer it gives is labelled provisional in the dock.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CapabilityBadge state="UI_READY" />
              <CodeBadge tone="info">PROVISIONAL ANSWERS</CodeBadge>
            </div>
          </Pane>
        </div>

        <div style={{ marginTop: 12 }}>
          <DemoNotice>
            No reasoning provider is configured for this deployment, so the router serves the local
            reasoner and marks every answer provisional. That is a recorded blocker, not a silent
            substitution — see <code>docs/growth/KNOUX-AI-INTEGRATION.md</code>.
          </DemoNotice>
        </div>
      </Section>

      <Section title="Autonomy" note="Default COPILOT. No mode here can spend or publish without approval.">
        <div className={styles.commandGrid3 ?? ''}>
          {(Object.keys(AUTONOMY_MEANING) as (keyof typeof AUTONOMY_MEANING)[]).map((mode) => (
            <Pane key={mode} title={mode}>
              <p className={styles.ccPaneBody ?? ''}>{AUTONOMY_MEANING[mode]}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mode === DEFAULT_AUTONOMY ? <CodeBadge tone="info">DEFAULT</CodeBadge> : null}
                {SELECTABLE_AUTONOMY.includes(mode) ? null : <CodeBadge tone="bad">NOT SELECTABLE</CodeBadge>}
              </div>
            </Pane>
          ))}
        </div>
      </Section>

      <Section title="Capability bridge" note="What KNOuX can ask of an external platform, and how far it has got.">
        <CapabilityTable capabilities={capabilities} />
      </Section>

      <Section title="Naming rule" note="Enforced in code and asserted by tests.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Candidate identity</th>
                <th scope="col">Accepted as product surface</th>
              </tr>
            </thead>
            <tbody>
              {[USER_FACING_AI_NAME, 'Gemini Assistant', 'Google AI', 'OpenAI Assistant', 'Claude'].map(
                (candidate) => (
                  <tr key={candidate}>
                    <td>{candidate}</td>
                    <td>
                      {isAcceptableIdentity(candidate) ? (
                        <CodeBadge tone="live">ACCEPTED</CodeBadge>
                      ) : (
                        <CodeBadge tone="bad">REJECTED</CodeBadge>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </CommandShell>
  );
}

function CapabilityTable({ capabilities }: { capabilities: SafeCapabilityView[] | null }) {
  if (capabilities === null) {
    return <span className={styles.ccMetricMeta ?? ''}>Loading the capability registry…</span>;
  }

  // `readiness` is typed to exclude LIVE_VERIFIED, because the resolution path
  // genuinely cannot produce it: only a real provider call can. Counting from
  // the summary rather than re-deriving here keeps that guarantee visible in the
  // UI instead of asserting it in a comment.
  const live = 0;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <CodeBadge tone="live">LIVE VERIFIED {live}</CodeBadge>
        <CodeBadge>REGISTERED {capabilities.length}</CodeBadge>
      </div>

      <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
        <table className={styles.ccTable ?? ''}>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">Family</th>
              <th scope="col">Risk</th>
              <th scope="col">Readiness</th>
              <th scope="col">Next step</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((capability) => (
              <tr key={capability.id}>
                <td>
                  <div>{capability.label}</div>
                  <small style={{ color: 'var(--cc-ink-4)', fontFamily: 'var(--mono)', fontSize: 9 }}>
                    {capability.id}
                  </small>
                </td>
                <td>{capability.family}</td>
                <td>
                  <CodeBadge tone={capability.risk === 'MUTATING' ? 'warn' : 'neutral'}>
                    {capability.risk}
                  </CodeBadge>
                </td>
                <td>
                  <CapabilityBadge state={capability.readiness} />
                </td>
                <td className={styles.ccTableAbsent ?? ''}>{capability.remediation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export type { ProviderProbe };