'use client';

import type { ReactNode } from 'react';
import { AuthScene } from '@/components/auth/AuthScene';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { ChamberBoot } from '@/components/auth/ChamberBoot';
import { useArrivalChoreography } from '@/components/auth/choreography';

/**
 * The Arrival Chamber shell.
 *
 * One frame for all three auth routes. The environment and the panel are
 * siblings inside a single positioned root so the stylesheet can relate them
 * with `:has()`: focusing any field stabilises the gateway formation without a
 * single line of JavaScript, and the chamber is a landmark in its own right.
 *
 * The scene is decorative and hidden from assistive technology; the form is the
 * content. Both sit inside `main` so the site's existing skip link lands on
 * them.
 */
export function AuthShell({
  children,
  route,
  labelledBy,
}: {
  children: ReactNode;
  route: string;
  labelledBy: string;
}) {
  const phase = useArrivalChoreography();

  return (
    <main id="main-content" className="chamber-page" data-route={route} data-phase={phase}>
      <ChamberBoot />
      <AuthScene phase={phase} />

      {/* Micro labels in the site's metadata style, occupying the negative
          space the scene leaves rather than competing with the form. */}
      <div className="chamber-page__meta" aria-hidden="true">
        <span className="chamber-page__meta-line">KNOuX — DIGITAL HEADQUARTERS</span>
        <span className="chamber-page__meta-line chamber-page__meta-line--dim">
          ARRIVAL CHAMBER / {route.replace('/', '').toUpperCase()}
        </span>
      </div>

      <div className="chamber-page__stage">
        <AuthPanel phase={phase} labelledBy={labelledBy}>
          {children}
        </AuthPanel>
      </div>
    </main>
  );
}
