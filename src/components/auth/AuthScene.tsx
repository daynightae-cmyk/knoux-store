'use client';

import dynamic from 'next/dynamic';
import { formationIsAligned, type ArrivalPhase } from '@/components/auth/choreography';

const LivingParticleMark = dynamic(
  () => import('@/components/three/LivingParticleMark').then((module) => module.LivingParticleMark),
  { ssr: false, loading: () => <div className="mark-stage" aria-hidden="true" /> },
);

/**
 * The Arrival Chamber environment.
 *
 * The particle identity is the exact `LivingParticleMark` used by the homepage
 * hero, including the same Three.js shader, canonical geometry and pointer
 * interaction. This module contributes the room around them: the void,
 * the architectural planes, the restrained floor signal, and the spatial frame
 * around the canonical KNOuX mark.
 *
 * Everything here is decorative and hidden from assistive technology. The form
 * is the content.
 */
export function AuthScene({ phase }: { phase: ArrivalPhase }) {
  const aligned = formationIsAligned(phase);

  return (
    <div className="chamber" aria-hidden="true">
      <div className="chamber__void" />

      {/* EXACT shared Living Particle Mark used by the homepage hero.
          Same Three.js/R3F shader, same white particle motion, same mouse push,
          swirl, depth orbit and organic jitter. This is not a 2D approximation. */}
      <div className={`chamber__living-mark ${aligned ? 'is-aligned' : ''}`}>
        <LivingParticleMark progress={0} />
      </div>

      {/* Fine grain, so the flat black never bands across a wide gradient. */}
      <div className="chamber__grain" />

      <div className="chamber__architecture">
        <span className="chamber__horizon" />
        <span className="chamber__seam" />
        <span className="chamber__return" />
      </div>

      {/* A single restrained floor signal answers the KNOuX mark resolving.
          No character or mascot is used in the chamber. */}
      <div className={`chamber__floor ${aligned ? 'is-signalled' : ''}`}>
        <span className="chamber__floor-line" />
        <span className="chamber__floor-pulse" />
      </div>
    </div>
  );
}
