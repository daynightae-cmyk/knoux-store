import Link from 'next/link';
import { breadcrumbFor, subnavFor } from '@/data/navigation';
import type { DivisionId } from '@/lib/entities';

/**
 * Division shell.
 *
 * Breadcrumb, division subrail and an id-anchored main region. Every division
 * page renders through this so the same information architecture is felt on
 * every screen without repeating markup.
 */

export function Breadcrumb({ path }: { path: string }) {
  const trail = breadcrumbFor(path);
  return (
    <nav className="page-crumb" aria-label="Breadcrumb">
      {trail.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} style={{ display: 'contents' }}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {crumb.href && index < trail.length - 1 ? (
            <Link href={crumb.href}>{crumb.label}</Link>
          ) : (
            <span aria-current={index === trail.length - 1 ? 'page' : undefined}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SignalRail({ division, path }: { division: DivisionId; path: string }) {
  const items = subnavFor(division);
  if (items.length === 0) return null;
  return (
    <nav className="signal-rail" aria-label={`${division} sections`}>
      <div className="shell signal-rail__inner">
        <span className="signal-rail__label">INDEX</span>
        {items.map((item) => {
          const current = path === item.href || (item.href.includes('#') && path === item.href.split('#')[0]);
          const hash = item.href.includes('#') ? ' (section)' : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? 'page' : undefined}
              aria-label={hash ? `${item.label}${hash}` : undefined}
            >
              <em>{item.code}</em>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Empty-catalog state. Used wherever a registry currently publishes nothing. */
export function DevState({
  title,
  children,
  detail,
  mark = 'IN DEVELOPMENT',
}: {
  title: string;
  children: React.ReactNode;
  detail?: { heading: string; body: string }[];
  mark?: string;
}) {
  return (
    <div className="dev-state" data-reveal>
      <p className="dev-state__mark">
        <span className="dev-state__pulse" aria-hidden="true" />
        <span className="label label--signal">{mark}</span>
      </p>
      <h2>{title}</h2>
      {children}
      {detail && detail.length > 0 ? (
        <div className="dev-state__detail">
          {detail.map((entry) => (
            <div key={entry.heading}>
              <h3>{entry.heading}</h3>
              <p>{entry.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
