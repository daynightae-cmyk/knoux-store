'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { observeReveal } from '@/lib/motion';

/**
 * Section reveal.
 *
 * Deliberately scarce. One wrapper applies the shared entrance to the blocks
 * a page nominates, so motion stays a grammar rather than an effect that fires
 * on every element.
 */
export function RevealGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return observeReveal(ref.current, (element) => element.classList.add('is-visible'));
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Document-wide reveal.
 *
 * `[data-reveal]` renders at opacity 0, so whatever adds `is-visible` is what
 * makes the block exist at all. Only `RevealGroup` used to do that, which meant
 * a reveal block authored outside a group — a `DevState`, a `bridge`, a
 * `next-link` — stayed invisible for the life of the page rather than merely
 * un-animated. Declaring the animation is opting into being observed, so the
 * observer belongs to the document, not to one wrapper.
 *
 * It re-scans on navigation because the root layout outlives a client-side
 * route change and the new page's blocks arrive after it has already run.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    return observeReveal(document.body, (element) => element.classList.add('is-visible'));
  }, [pathname]);
  return null;
}

/** Block A: System Index. Large typography over thin indexed rows. */
export function SystemIndex({
  eyebrow,
  title,
  statement,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  statement?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="block-index shell">
      <div className="block-index__head">
        <div>
          <span className="label label--signal">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {statement ? <p className="block-index__statement">{statement}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function IndexRow({
  index,
  name,
  href,
  meta,
  metaSecondary,
  arrow = '↗',
}: {
  index: string;
  name: string;
  href?: string;
  meta?: string;
  metaSecondary?: string;
  arrow?: string;
}) {
  const body = (
    <>
      <span className="index-row__index">{index}</span>
      <span className="index-row__name">{name}</span>
      <span className="index-row__meta">
        {meta ? <span>{meta}</span> : null}
        {metaSecondary ? <span className="mono">{metaSecondary}</span> : null}
      </span>
      <span className="index-row__arrow" aria-hidden="true">
        {arrow}
      </span>
    </>
  );
  if (!href) {
    return (
      <div className="index-row" data-reveal>
        {body}
      </div>
    );
  }
  return (
    <Link className="index-row" href={href} data-reveal>
      {body}
    </Link>
  );
}

/** Block head. Used instead of a section title repeated verbatim. */
export function BlockHead({
  code,
  title,
  aside,
}: {
  code: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="block-head" data-reveal>
      <div>
        <span className="label label--signal">{code}</span>
        <h2 className="block-head__title">{title}</h2>
      </div>
      {aside ? <p className="block-head__aside">{aside}</p> : null}
    </div>
  );
}

/**
 * Block: Contextual bridge.
 *
 * Cross-navigation between divisions, stated as an offer rather than a pitch.
 */
export function DivisionBridge({
  label,
  title,
  body,
  href,
  action,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <aside className="bridge" data-reveal>
      <div>
        <span className="bridge__label">{label}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <Link href={href} className="action">
        {action}
        <span className="action-arrow" aria-hidden="true">
          ↗
        </span>
      </Link>
    </aside>
  );
}

/** Next-entry navigation. Ends a page with somewhere to go, never a dead end. */
export function NextLink({ label, name, href }: { label: string; name: string; href: string }) {
  return (
    <div className="next-link" data-reveal>
      <div>
        <span className="next-link__label">{label}</span>
        <Link href={href} className="next-link__name">
          {name}
        </Link>
      </div>
      <span className="index-row__arrow" aria-hidden="true" style={{ fontSize: 28 }}>
        ↗
      </span>
    </div>
  );
}
