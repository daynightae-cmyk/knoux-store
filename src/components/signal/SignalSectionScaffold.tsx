import Link from 'next/link';
import type { ReactNode } from 'react';
import { signalChildren, signalRoute, type SignalRouteId } from '@/data/signal';
import styles from '@/app/signal/signal.module.css';

type SignalSectionScaffoldProps = {
  routeId: SignalRouteId;
  note?: string;
  children?: ReactNode;
};

export function SignalSectionScaffold({ routeId, note, children }: SignalSectionScaffoldProps) {
  const route = signalRoute(routeId);
  if (!route) return null;
  const childRoutes = signalChildren(routeId);

  return (
    <main id="main-content" className={styles.page} data-signal-route={route.id}>
      <section className={styles.hero} aria-labelledby="signal-section-title">
        <div className={styles.kicker}>{route.code} / KNOuX SIGNAL</div>
        <h1 id="signal-section-title">{route.label}</h1>
        <p>{route.description}</p>
        {note ? <p>{note}</p> : null}
        {childRoutes.length ? (
          <nav aria-label={route.label + ' sections'}>
            <ul>
              {childRoutes.map((child) => (
                <li key={child.id}>
                  <Link href={child.href}>
                    {child.code} · {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {children}
      </section>
    </main>
  );
}
