import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * KNOuX DEV presentation primitives.
 *
 * These encode the reference screen grammar only: a page header with an icon
 * tile, a tab bar, a toolbar, bordered cards and an explicit empty state. They
 * never supply data. Every value rendered here comes from a registry, the
 * adapter contract or the verification snapshot.
 */

export function DevPageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="dev-head">
      <span className="dev-head__tile" aria-hidden="true">
        {icon}
      </span>
      <div className="dev-head__text">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="dev-head__actions">{actions}</div> : null}
    </header>
  );
}

export function DevTabs<T extends string>({
  tabs,
  active,
  onSelect,
  label,
}: {
  tabs: readonly { id: T; label: string; disabled?: boolean; reason?: string }[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
}) {
  return (
    <div className="dev-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`dev-tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls="dev-tabpanel"
          className="dev-tab"
          disabled={tab.disabled}
          title={tab.reason}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DevCard({
  title,
  icon,
  meta,
  more,
  moreHref,
  children,
  flush,
  headingLevel,
}: {
  title: string;
  icon?: string;
  meta?: string;
  more?: string;
  moreHref?: string;
  children: ReactNode;
  flush?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className="dev-card">
      <header className="dev-card__head">
        {icon ? (
          <span className="dev-card__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <Heading>{title}</Heading>
        {meta ? <span className="dev-mono">{meta}</span> : null}
        {more && moreHref ? (
          <Link className="dev-card__more" href={moreHref}>
            {more} →
          </Link>
        ) : more ? (
          <span className="dev-card__more">{more}</span>
        ) : null}
      </header>
      <div className={flush ? 'dev-card__body dev-card__body--flush' : 'dev-card__body'}>{children}</div>
    </section>
  );
}

export type DevTone = 'ok' | 'warn' | 'bad' | 'violet' | 'none';

export function DevStatus({ label, tone = 'none' }: { label: string; tone?: DevTone }) {
  return (
    <span className="dev-tag" data-tone={tone === 'none' ? undefined : tone}>
      {label}
    </span>
  );
}

export function DevDot({ tone = 'none' }: { tone?: DevTone }) {
  return <span className="dev-dot-state" data-tone={tone === 'none' ? undefined : tone} />;
}

export function DevKV({ rows, stack }: { rows: { k: string; v: ReactNode }[]; stack?: boolean }) {
  return (
    <dl className={stack ? 'dev-kv dev-kv--stack' : 'dev-kv'}>
      {rows.map((row) => (
        <div key={row.k} style={{ display: 'contents' }}>
          <dt>{row.k}</dt>
          <dd>{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DevEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="dev-empty" role="note">
      <span className="dev-empty__glyph" aria-hidden="true">
        ◇
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function DevSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="dev-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function DevStat({
  icon,
  label,
  value,
  tone,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: DevTone | 'unmeasured';
  detail?: string;
}) {
  return (
    <div className="dev-stat">
      <span className="dev-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="dev-stat__label">{label}</div>
        <div className="dev-stat__value" data-tone={tone === 'unmeasured' ? 'unmeasured' : undefined}>
          {value}
        </div>
        {detail ? <div className="dev-mono" style={{ color: 'var(--dim)', marginTop: 3 }}>{detail}</div> : null}
      </div>
    </div>
  );
}

export function DevField({
  value,
  onChange,
  placeholder,
  id,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  id: string;
  label: string;
}) {
  return (
    <div className="dev-field">
      <span className="dev-field__icon" aria-hidden="true">
        ⌕
      </span>
      <label htmlFor={id} className="dev-visually-hidden">
        {label}
      </label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

/**
 * Maps a capability status onto a presentation tone. Capability vocabulary is
 * the adapter's, never the UI's: an unconfigured provider is not an offline one.
 */
export function toneForStatus(status: string | null | undefined): DevTone {
  switch (status) {
    case 'available':
    case 'pass':
    case 'active':
    case 'success':
      return 'ok';
    case 'blocked':
    case 'fail':
    case 'running':
      return status === 'fail' ? 'bad' : 'violet';
    case 'unconfigured':
    case 'not-run':
    case 'release-candidate':
      return 'warn';
    default:
      return 'none';
  }
}

export function labelForStatus(status: string | null | undefined): string {
  if (!status) return 'UNKNOWN';
  return status.replace(/-/g, ' ').toUpperCase();
}

/** Route primitives shared by the DEV workspace pages. */
export function DevPageHeading({ eyebrow, title, description, detail }: { eyebrow: string; title: string; description: string; detail?: string }) {
  return <header className="dev-page-heading"><span className="dev-mini-label">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{detail ? <span className="dev-page-heading__detail">{detail}</span> : null}</header>;
}

export function DevPanel({ title, children, href, className = '' }: { title: string; children: ReactNode; href?: string; className?: string }) {
  return <section className={`dev-panel ${className}`}><header className="dev-panel__head"><h2><span>✣</span>{title}</h2>{href ? <Link href={href}>OPEN ↗</Link> : null}</header><div className="dev-panel__body">{children}</div></section>;
}
