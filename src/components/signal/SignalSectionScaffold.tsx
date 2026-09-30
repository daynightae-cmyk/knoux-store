import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  signalChildren,
  signalRoute,
  signalRoutes,
  type SignalRouteId,
} from '@/data/signal';
import styles from '@/app/signal/signal.module.css';

type SignalSectionScaffoldProps = {
  routeId: SignalRouteId;
  note?: string;
  children?: ReactNode;
};

const LOCAL_IDS: readonly SignalRouteId[] = [
  'lookup',
  'my-number',
  'watchlist',
  'business',
  'settings',
];

export function SignalSectionScaffold({ routeId, note, children }: SignalSectionScaffoldProps) {
  const route = signalRoute(routeId);
  if (!route) return null;
  const childRoutes = signalChildren(routeId);
  const localRoutes = signalRoutes.filter((item) => LOCAL_IDS.includes(item.id));

  return (
    <main id="main-content" className={styles.page} data-signal-route={route.id}>
      <section className={styles.management} aria-labelledby="signal-section-title">
        <nav className={styles.localNav} aria-label="Signal">
          <Link href="/signal" className={styles.signalHomeLink}>KNOuX SIGNAL</Link>
          <div>
            {localRoutes.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                data-current={item.id === route.id || item.id === route.parent ? 'true' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <header className={styles.managementHeader}>
          <div>
            <span className={styles.kicker}>{route.code} / SIGNAL MANAGEMENT</span>
            <h1 id="signal-section-title">{route.label}</h1>
          </div>
          <p>{route.description}</p>
        </header>

        {note ? <p className={styles.managementNote}>{note}</p> : null}

        {childRoutes.length ? (
          <nav className={styles.childNav} aria-label={route.label + ' sections'}>
            {childRoutes.map((child) => (
              <Link key={child.id} href={child.href}>
                <span>{child.code}</span>
                <strong>{child.label}</strong>
              </Link>
            ))}
          </nav>
        ) : null}

        {children ? <div className={styles.managementBody}>{children}</div> : null}
      </section>
    </main>
  );
}
