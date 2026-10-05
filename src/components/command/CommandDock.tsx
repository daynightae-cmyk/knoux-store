'use client';

/**
 * Command Center — the contextual KNOuX command dock.
 *
 * This is the only place in the product an operator talks to KNOuX, and it is
 * docked under the context bar rather than floating over the workspace, because
 * it is bound to the selected client and the surface in view. That binding is
 * what makes it contextual: on the Community Hub it carries the hub's filters, on
 * a campaign it carries that campaign, and in every case the client memory and
 * forbidden claims travel with the request.
 *
 * It calls the KNOuX Intelligence API route and never a provider. The response
 * renders with its identity as KNOuX and, when the router fell back to the local
 * reasoner, says so rather than presenting the answer as full intelligence.
 */

import { useCallback, useMemo, useState, useTransition } from 'react';
import { DOCK_ACTIONS, type DockAction } from './navigation';
import { useWorkspace } from './workspace-context';
import { CapabilityBadge, DemoNotice } from './primitives';
import type { IntelligenceIntent, IntelligenceResponse } from '@/lib/growth/intelligence/types';
import styles from './command.module.css';

export type DockSurface = {
  /** Which screen the operator is on. Traveled with every request. */
  surface: string;
  /** A concrete subject in view, if any. */
  subjectId?: string;
  /** Filters or fields the operator has set, so KNOuX sees the working state. */
  inputs?: Record<string, unknown>;
  /** Sentence shown in the collapsed dock header. */
  contextLine: string;
};

export function CommandDock({ surface }: { surface: DockSurface }) {
  const { activeClient, isDemoWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<IntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const actions = useMemo<DockAction[]>(
    () => DOCK_ACTIONS.filter((action) => !action.requiresConnection || !isDemoWorkspace),
    [isDemoWorkspace],
  );

  const run = useCallback(
    async (action: DockAction) => {
      setOpen(true);
      setBusy(true);
      setError(null);
      setResponse(null);

      try {
        const res = await fetch('/api/intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: action.intent as IntelligenceIntent,
            prompt: `${action.label} — ${activeClient.name}`,
            clientId: activeClient.id,
            surface: surface.surface,
            subjectId: surface.subjectId,
            inputs: surface.inputs ?? {},
          }),
        });

        const payload = (await res.json()) as {
          response?: IntelligenceResponse;
          reason?: string;
        };

        if (!res.ok || !payload.response) {
          setError(payload.reason ?? `The intelligence route responded ${res.status}.`);
          return;
        }
        setResponse(payload.response);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `The intelligence request could not be sent: ${cause.message}`
            : 'The intelligence request could not be sent.',
        );
      } finally {
        setBusy(false);
      }
    },
    [activeClient.id, activeClient.name, surface.subjectId, surface.surface, surface.inputs],
  );

  return (
    <div className={styles.ccDock ?? ''}>
      <button
        type="button"
        className={styles.ccDockHead ?? ''}
        onClick={() => startTransition(() => setOpen((value) => !value))}
        aria-expanded={open}
        aria-controls="knoux-command-dock-body"
      >
        {/* The KNOuX living mark, reused rather than redrawn. */}
        <svg
          className={styles.ccDockMark ?? ''}
          viewBox="0 0 24 32"
          fill="none"
          role="img"
          aria-label="KNOuX"
        >
          <path
            d="M12 1 L23 7 L23 25 L12 31 L1 25 L1 7 Z"
            stroke="currentColor"
            strokeWidth="1.1"
            opacity="0.55"
          />
          <path d="M12 1 L12 31" stroke="currentColor" strokeWidth="1.1" opacity="0.35" />
          <path d="M1 7 L23 25 M23 7 L1 25" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
          <circle cx="12" cy="16" r="3.1" fill="currentColor" opacity="0.8" />
        </svg>

        <span className={styles.ccDockText ?? ''}>
          <span className={styles.ccDockTitle ?? ''}>KNOuX Intelligence</span>
          <span className={styles.ccDockContext ?? ''}>{surface.contextLine}</span>
        </span>

        <span className={styles.ccDockHint ?? ''}>{open ? 'CLOSE' : 'OPEN'}</span>
      </button>

      {open ? (
        <div className={styles.ccDockBody ?? ''} id="knoux-command-dock-body">
          <div className={styles.ccDockActions ?? ''}>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                onClick={() => void run(action)}
                disabled={busy}
              >
                {action.label}
              </button>
            ))}
          </div>

          {isDemoWorkspace ? (
            <DemoNotice>
              KNOuX can plan and explain without a platform credential. It cannot verify live
              performance, and it will say so rather than estimate.
            </DemoNotice>
          ) : null}

          {busy ? (
            <p className={styles.ccDockSummary ?? ''} role="status">
              KNOuX is reasoning…
            </p>
          ) : null}

          {error ? (
            <div className={styles.ccDockLimitation ?? ''} role="alert">
              <span aria-hidden="true">!</span>
              <span>{error}</span>
            </div>
          ) : null}

          {response ? <DockResponse response={response} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function DockResponse({ response }: { response: IntelligenceResponse }) {
  return (
    <div className={styles.ccDockReply ?? ''}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Always KNOuX. The provider that served this is operational
            provenance and is shown as a state, never as the assistant name. */}
        <span className={styles.ccDockTitle ?? ''}>{response.identity}</span>
        <CapabilityBadge state={response.provisional ? 'ADAPTER_READY' : 'LIVE_VERIFIED'} />
        {response.provisional ? <span className={styles.ccDockContext ?? ''}>Local reasoner · provisional</span> : null}
      </div>

      <p className={styles.ccDockSummary ?? ''}>{response.summary}</p>

      {response.sections.map((section) => (
        <div key={section.heading} className={styles.ccDockSection ?? ''}>
          <p className={styles.ccDockSectionHead ?? ''}>
            {section.heading}
            {section.hypothesis ? ' · hypothesis' : ''}
          </p>
          <p className={styles.ccDockSectionBody ?? ''}>{section.body}</p>
        </div>
      ))}

      {response.evidence.length > 0 ? (
        <div className={styles.ccDockSection ?? ''}>
          <p className={styles.ccDockSectionHead ?? ''}>Evidence</p>
          <ul className={styles.ccDockEvidence ?? ''}>
            {response.evidence.map((item, index) => (
              <li key={`${item.source}-${index}`}>
                {item.source} — {item.live ? 'live' : 'workspace record'}
                {item.detail ? ` (${item.detail})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.limitations.length > 0 ? (
        <div className={styles.ccDockSection ?? ''}>
          <p className={styles.ccDockSectionHead ?? ''}>What KNOuX could not establish</p>
          <ul className={styles.ccDockLimitation ?? ''} style={{ display: 'grid', gap: 5 }}>
            {response.limitations.map((limitation) => (
              <li key={limitation} style={{ display: 'flex', gap: 8 }}>
                <span aria-hidden="true">—</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.proposedActions.length > 0 ? (
        <div className={styles.ccDockSection ?? ''}>
          <p className={styles.ccDockSectionHead ?? ''}>Proposed, not executed</p>
          <ul className={styles.ccPaneList ?? ''}>
            {response.proposedActions.map((action) => (
              <li key={action.actionId}>
                {action.label} · risk {action.risk}
                {action.requiresApproval ? ' · requires approval' : ''}
                {action.rationale ? ` — ${action.rationale}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
