'use client';

import { useEffect, useState } from 'react';
import { motionAllowed } from '@/lib/motion';

/**
 * Arrival choreography.
 *
 * One state machine drives both the environment and the auth panel, so the
 * formation cannot finish after the form has already appeared. The order is the
 * one the reference teaches, compressed to the pace this site can afford:
 *
 *   void → field → figure travels → figure stops → signal → panel rises → ready
 *
 * The reference waits roughly three seconds before it shows the login. That is
 * too long to ask of a returning visitor, so travel, signal and rise are each
 * held to a few hundred milliseconds and the whole chamber is usable inside
 * about a second and a half.
 */

export type ArrivalPhase = 'field' | 'travelling' | 'settled' | 'signalled' | 'ready';

export const ARRIVAL_TIMING = {
  /** Figure walks in from off-screen left. */
  travel: 780,
  /** The beat where the figure stops and its signal node lights. */
  settle: 180,
  /** Floor pulse, particle alignment, and the start of the panel rise. */
  signal: 200,
  /** Panel rise itself. */
  rise: 520,
  /** A second visit in the same session skips the walk. */
  returning: 130,
} as const;

const SEEN_KEY = 'knoux.arrival.seen';

function readSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private browsing modes can refuse storage. The worst case is a full
    // arrival sequence, which is a cosmetic regression, never a broken page.
    return false;
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* see readSeen */
  }
}

/**
 * Drives the arrival sequence.
 *
 * Reduced motion, coarse pointers under load, and any failure to animate all
 * resolve to `ready` on the first commit, which renders the finished chamber
 * with the figure already standing. Function never depends on the sequence.
 */
export function useArrivalChoreography(): ArrivalPhase {
  const [phase, setPhase] = useState<ArrivalPhase>('field');

  useEffect(() => {
    if (!motionAllowed()) {
      // Scheduled rather than set inline. The boot marker has already rendered
      // the finished chamber for this visitor, so this only settles the phase
      // the scene reads from; it goes through the same callback path as every
      // other transition instead of cascading a render during the effect.
      const settle = setTimeout(() => setPhase('ready'), 0);
      return () => clearTimeout(settle);
    }

    const returning = readSeen();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (delay: number, next: ArrivalPhase) => timers.push(setTimeout(() => setPhase(next), delay));

    if (returning) {
      at(ARRIVAL_TIMING.returning, 'signalled');
    } else {
      at(0, 'travelling');
      at(ARRIVAL_TIMING.travel, 'settled');
      at(ARRIVAL_TIMING.travel + ARRIVAL_TIMING.settle, 'signalled');
    }

    // `ready` is the end of the sequence, and is reached whether or not the
    // walk was skipped. It exists so the chamber has a settled state to be in
    // rather than a sequence that never terminates.
    at(ARRIVAL_TIMING.travel + ARRIVAL_TIMING.settle + ARRIVAL_TIMING.rise, 'ready');

    markSeen();

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);

  return phase;
}

/** True once the panel should be mounting, i.e. the environment has answered. */
export function panelShouldRise(phase: ArrivalPhase): boolean {
  return phase === 'signalled' || phase === 'ready';
}

/** True once the gateway formation has locked into its aligned state. */
export function formationIsAligned(phase: ArrivalPhase): boolean {
  return phase === 'signalled' || phase === 'ready';
}
