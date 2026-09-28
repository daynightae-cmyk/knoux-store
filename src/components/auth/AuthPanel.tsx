'use client';

import type { ReactNode } from 'react';
import { panelShouldRise, type ArrivalPhase } from '@/components/auth/choreography';

/**
 * The auth surface.
 *
 * It does not fade in. It rises: the chamber resolves around the visitor, and
 * then the interface arrives from below and settles into place, which reads as
 * architecture being built rather than a card being revealed.
 *
 * Internally the fields resolve in order, each rising a short distance. The
 * stagger is expressed as `transition-delay` through `data-stagger` in CSS
 * rather than as a keyframe per element, so the order is declared once in the
 * stylesheet and each form can choose which of its own rows is which step.
 */

export function AuthPanel({
  phase,
  children,
  labelledBy,
}: {
  phase: ArrivalPhase;
  children: ReactNode;
  labelledBy: string;
}) {
  const risen = panelShouldRise(phase);

  return (
    <div className="chamber__panel-dock">
      <div
        className={`auth-panel ${risen ? 'is-risen' : ''}`}
        data-phase={phase}
        // The whole panel is the landmark a screen reader lands on, and the
        // visible heading inside it names the panel.
        role="group"
        aria-labelledby={labelledBy}
      >
        {/* Restrained silver-to-violet signal along the top edge, lit on rise. */}
        <span className="auth-panel__signal" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
