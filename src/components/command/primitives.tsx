'use client';

/**
 * Command Center — shared presentational primitives.
 *
 * Each of these exists because a truthfulness rule needed a rendering. A state
 * badge exists so a connection state can never be conveyed by colour alone. A
 * metric cell exists so a missing metric renders as "not reported" instead of a
 * zero. A demo banner exists because the alternative is a fixture reading as a
 * production number.
 */

import type { ReactNode } from 'react';
import type { CapabilityState, ConnectionState, DataOrigin } from '@/lib/growth/states';
import { CAPABILITY_STATE_MEANING, CONNECTION_STATE_MEANING } from '@/lib/growth/states';
import type { Sourced } from '@/lib/growth/states';
import styles from './command.module.css';

/* ------------------------------------------------------------ state badge */

type Tone = 'live' | 'warn' | 'bad' | 'info' | 'demo' | 'neutral';

/**
 * The tone for each state is a decision, not a lookup by severity: `ADAPTER_READY`
 * is neutral because being unproven is not a fault, and `BLOCKED` is neutral too
 * because a platform limitation is not an error in this product.
 */
const CAPABILITY_TONE: Record<CapabilityState, Tone> = {
  UI_READY: 'info',
  ADAPTER_READY: 'neutral',
  CONFIG_REQUIRED: 'warn',
  AUTH_REQUIRED: 'warn',
  DEMO_ONLY: 'demo',
  LIVE_VERIFIED: 'live',
  BLOCKED: 'neutral',
};

const CONNECTION_TONE: Record<ConnectionState, Tone> = {
  NOT_CONNECTED: 'neutral',
  CONNECTING: 'info',
  CONNECTED: 'live',
  EXPIRED: 'bad',
  PERMISSION_REQUIRED: 'warn',
  ERROR: 'bad',
  BLOCKED: 'neutral',
  NOT_CONFIGURED: 'warn',
};

const TONE_CLASS: Record<Tone, string | undefined> = {
  live: styles.ccStateLive,
  warn: styles.ccStateWarn,
  bad: styles.ccStateBad,
  info: styles.ccStateInfo,
  demo: styles.ccStateDemo,
  neutral: undefined,
};

function toneClass(tone: Tone): string {
  return TONE_CLASS[tone] ?? '';
}

export function CapabilityBadge({ state }: { state: CapabilityState }) {
  const tone = CAPABILITY_TONE[state];
  return (
    <span className={`${styles.ccState ?? ''} ${toneClass(tone)}`} title={CAPABILITY_STATE_MEANING[state]}>
      <span className={styles.ccStateDot ?? ''} aria-hidden="true" />
      {state}
    </span>
  );
}

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const tone = CONNECTION_TONE[state];
  return (
    <span className={`${styles.ccState ?? ''} ${toneClass(tone)}`} title={CONNECTION_STATE_MEANING[state]}>
      <span className={styles.ccStateDot ?? ''} aria-hidden="true" />
      {state}
    </span>
  );
}

export function CodeBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${styles.ccState ?? ''} ${toneClass(tone)}`}>{children}</span>;
}

/* ---------------------------------------------------------- platform mark */

/**
 * The two-letter mark. Platform brand colour lives here and nowhere else, which
 * is the whole reason this is a component rather than an inline style.
 */
const PLATFORM_INITIALS: Record<string, string> = {
  facebook: 'f',
  instagram: 'ig',
  meta_ads: 'M',
  google_ads: 'G',
  google_business: 'B',
  ga4: 'A',
  search_console: 'S',
  youtube: 'Y',
  whatsapp: 'W',
  tiktok: 'T',
  linkedin: 'in',
  snapchat: 'S',
};

export function PlatformMark({ platform }: { platform: string }) {
  const modifier = styles[`ccPlatform${toPascal(platform)}`] ?? '';
  return (
    <span className={`${styles.ccPlatform ?? ''} ${modifier}`} aria-hidden="true">
      {PLATFORM_INITIALS[platform] ?? platform.slice(0, 2).toUpperCase()}
    </span>
  );
}

function toPascal(value: string): string {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function PlatformName({ platform, label }: { platform: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <PlatformMark platform={platform} />
      <span>{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------- metric cell */

export type MetricFormat = 'currency' | 'percent' | 'number';

/**
 * Renders a sourced metric or an honest absence.
 *
 * The rule: a metric that is `null` or `undefined` renders the word "Not
 * reported" in the absent style. It never renders 0, a dash that could be read
 * as zero, or a value borrowed from a sibling metric.
 */
export function MetricCell({
  label,
  value,
  kind = 'number',
  currency = 'AED',
  note,
}: {
  label: string;
  value: Sourced<number> | null | undefined;
  kind?: MetricFormat;
  currency?: string;
  note?: string;
}) {
  const available = value != null;

  let text = 'Not reported';
  if (available) {
    const digits = kind === 'number' ? 0 : 2;
    if (kind === 'currency') {
      text = `${currency} ${value.value.toLocaleString('en-AE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (kind === 'percent') {
      text = `${value.value.toFixed(2)}%`;
    } else {
      text = value.value.toLocaleString('en-AE', { maximumFractionDigits: digits });
    }
  }

  return (
    <div className={styles.ccMetric ?? ''}>
      <span className={styles.ccMetricLabel ?? ''}>{label}</span>
      <span
        className={available ? (styles.ccMetricValue ?? '') : (styles.ccMetricValueAbsent ?? '')}
      >
        {text}
      </span>
      {available && value.origin === 'FIXTURE' ? (
        <span className={styles.ccMetricMeta ?? ''}>DEMO</span>
      ) : null}
      {available && value.origin === 'LIVE' ? (
        <span className={styles.ccMetricMeta ?? ''} title={value.evidence}>
          LIVE
        </span>
      ) : null}
      {!available && note ? <span className={styles.ccMetricMeta ?? ''}>{note}</span> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- notice */

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.ccDemo ?? ''} role="note">
      <span className={styles.ccDemoMark ?? ''}>DEMO</span>
      <span>
        {children ??
          'Non-production fixtures. No value on this screen came from a live platform API.'}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------ empty state */

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.ccEmpty ?? ''}>
      <span className={styles.ccEmptyTitle ?? ''}>{title}</span>
      {children ? <p className={styles.ccEmptyBody ?? ''}>{children}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------- pane */

export function Pane({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.ccPane ?? ''} ${className ?? ''}`}>
      {title ? <h3 className={styles.ccPaneTitle ?? ''}>{title}</h3> : null}
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- section */

export function Section({
  title,
  note,
  children,
  id,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className={styles.commandSection ?? ''} id={id}>
      <div className={styles.commandSectionHead ?? ''}>
        <h2 className={styles.commandSectionTitle ?? ''}>{title}</h2>
        {note ? <p className={styles.commandSectionNote ?? ''}>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ origin */

/**
 * Inline provenance label for a table cell. A demo cell is visibly demo at the
 * point of use, not only in a banner at the top of the page.
 */
export function OriginLabel({ origin }: { origin: DataOrigin }) {
  if (origin === 'LIVE') {
    return <span className={styles.ccOriginLive ?? ''}>LIVE</span>;
  }
  return <CodeBadge tone="demo">DEMO</CodeBadge>;
}