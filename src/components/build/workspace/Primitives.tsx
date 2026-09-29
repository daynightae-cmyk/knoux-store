'use client';

import { useId, type ReactNode } from 'react';
import type { VerificationStatus, CapabilityStatus } from '@/lib/build/types';

/**
 * A named region of the machine. Every surface composes from these so the
 * machine reads as one object rather than a set of unrelated widgets.
 */
export function Pane({
  title,
  meta,
  actions,
  padded = false,
  children,
  bodyClass,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  children: ReactNode;
  bodyClass?: string;
}) {
  /**
   * The body is a scroll container (`overflow: auto` in `build-os.css`), and a
   * scroll container that holds no focusable content cannot be scrolled from the
   * keyboard — a mouse user can reach content below the fold and a keyboard user
   * cannot. That is WCAG 2.1.1, and it is machine-detectable, so it was a
   * `serious` axe failure rather than a matter of taste.
   *
   * It surfaced here because of a layout correction, not because anything about
   * accessibility changed: the workspace dashboard was rearranged to match its
   * approved reference, which moved the live preview into a row beside a taller
   * panel and made its body overflow where it previously fit. A pane whose body
   * happens not to scroll needs no tab stop, but a pane that does is
   * unreachable without one. So the tab stop is stated here, on the element that
   * scrolls, and named by the pane's own heading — which is the accessible name
   * a screen-reader user needs in order to know what they have just scrolled into.
   */
  const titleId = useId();

  return (
    <section className="bo-pane">
      <div className="bo-pane__head">
        <h3 className="bo-pane__title" id={titleId}>
          {title}
        </h3>
        {actions ? <div className="bo-pane__meta">{actions}</div> : null}
        {meta ? <div className="bo-pane__meta">{meta}</div> : null}
      </div>
      <div
        className={`bo-pane__body${padded ? ' bo-pane__body--pad' : ''}${bodyClass ? ` ${bodyClass}` : ''}`}
        tabIndex={0}
        aria-labelledby={titleId}
      >
        {children}
      </div>
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pass: 'PASS',
  fail: 'FAIL',
  blocked: 'BLOCKED',
  unconfigured: 'UNCONFIGURED',
  'not-run': 'NOT RUN',
  'not-applicable': 'N/A',
  available: 'AVAILABLE',
  unavailable: 'UNAVAILABLE',
  unknown: 'UNKNOWN',
  partial: 'PARTIAL',
  resolved: 'RESOLVED',
  queued: 'QUEUED',
  inspecting: 'INSPECTING',
  'waiting-approval': 'AWAITING APPROVAL',
  executing: 'EXECUTING',
  verifying: 'VERIFYING',
  complete: 'COMPLETE',
  cancelled: 'CANCELLED',
  idle: 'IDLE',
  running: 'RUNNING',
  success: 'SUCCESS',
  failed: 'FAILED',
  stopped: 'STOPPED',
  loading: 'LOADING',
  ready: 'READY',
  empty: 'EMPTY',
  error: 'ERROR',
  pending: 'PENDING',
};

export function StatusBadge({ status, label }: { status: VerificationStatus | CapabilityStatus | string; label?: string }) {
  return (
    <span className="bo-status" data-status={status}>
      {label ?? STATUS_LABEL[status] ?? status.toUpperCase()}
    </span>
  );
}

/**
 * The component that stops a dark region from being a lie.
 *
 * It always names what is missing and what would provide it. There is no
 * variant that renders an empty box, because an empty box is indistinguishable
 * from a bug and this surface must never be one.
 */
export function Blocked({
  title,
  body,
  requirement,
  children,
}: {
  title: string;
  body: string;
  requirement?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="bo-blocked" role="note">
      <span className="bo-blocked__title">
        <span aria-hidden="true">▚</span>
        {title}
      </span>
      <p className="bo-blocked__body">{body}</p>
      {requirement ? (
        <>
          <span className="bo-label">Requirement</span>
          <p className="bo-blocked__req">{requirement}</p>
        </>
      ) : null}
      {children}
    </div>
  );
}

export function KV({ rows }: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="bo-kv">
      {rows.map((row) => (
        <div key={row.k} style={{ display: 'contents' }}>
          <dt>{row.k}</dt>
          <dd>{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  options: { id: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (id: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="bo-chips" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="bo-chip"
          aria-pressed={value === option.id}
          disabled={disabled || option.disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="bo-label">{label}</span>
      {children}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: '34px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="bo-label">{title}</span>
      <p className="bo-note">{body}</p>
    </div>
  );
}
