/**
 * KNOuX: THE AWAKENING — timeline and state machine.
 *
 * One explicit authority owns the phase, the beat, the pause origin and how
 * many real systems have been discussed. The view keeps a single timer and
 * animates the current beat in CSS; this module owns no DOM, no timer and no
 * entropy, so the conversation is data that can be executed by a test.
 *
 * The scene was designed as a rendering-layer event. Nothing here can close a
 * route, submit a form or change a cart: a phase only decides what the overlay
 * paints and which published product records are allowed into the
 * accessibility tree.
 */

import {
  AWAKENING_ACTS,
  AWAKENING_BEAT_COUNT,
  AWAKENING_DIALOGUE,
  awakeningActTotals,
  awakeningBeatAt,
  type AwakeningAct,
} from './dialogue';

/** Custom event used by the header key and the hero activation dock. */
export const AWAKENING_EVENT = 'knoux:awakening';

/** Query parameter used when a non-home header trigger routes to the stage. */
export const AWAKENING_QUERY = 'awaken';

/**
 * Every phase the experience can be in. `idle` is the closed state; `paused`,
 * `skipped` and `error` are terminal or holding states rather than frames in
 * the cinematic sequence.
 */
export const AWAKENING_PHASES = [
  'idle',
  ...AWAKENING_ACTS,
  'explore',
  'paused',
  'skipped',
  'error',
] as const;

export type AwakeningPhase = (typeof AWAKENING_PHASES)[number];

/** Phases the timeline can advance through without user input. */
export const AWAKENING_PLAYABLE_PHASES = AWAKENING_ACTS;

export type AwakeningPlayablePhase = AwakeningAct;

export const AWAKENING_SEQUENCE: readonly AwakeningPlayablePhase[] = AWAKENING_PLAYABLE_PHASES;

/**
 * Duration per act, derived from the dialogue beats. A line cannot outlive its
 * act and the total cannot drift from the script.
 */
export const AWAKENING_TIMING: Readonly<Record<AwakeningPlayablePhase, number>> =
  awakeningActTotals() as Readonly<Record<AwakeningPlayablePhase, number>>;

export const AWAKENING_TOTAL_MS = Object.values(AWAKENING_TIMING).reduce((total, ms) => total + ms, 0);

/** How many distinct real registry systems have been discussed by each act. */
function emissionTotals(): Readonly<Record<AwakeningPhase, number>> {
  const totals = {
    idle: 0,
    ignition: 0,
    awakening: 0,
    'first-emission': 0,
    cascade: 0,
    overcharge: 0,
    fracture: 0,
    revelation: 0,
    explore: 5,
    paused: 0,
    skipped: 5,
    error: 0,
  } satisfies Record<AwakeningPhase, number>;

  const discussed = new Set<string>();
  for (const act of AWAKENING_ACTS) {
    for (const beat of AWAKENING_DIALOGUE) {
      if (beat.act !== act) continue;
      if (beat.productId) discussed.add(beat.productId);
    }
    totals[act] = discussed.size;
  }
  return Object.freeze(totals);
}

export const AWAKENING_EMISSIONS: Readonly<Record<AwakeningPhase, number>> = emissionTotals();

export type AwakeningPauseSource = 'user' | 'visibility' | null;

export type AwakeningState = {
  phase: AwakeningPhase;
  /** Index into `AWAKENING_DIALOGUE`; -1 while closed, length once complete. */
  beatIndex: number;
  /** The playable phase to return to when a paused state resumes. */
  resumePhase: AwakeningPlayablePhase | null;
  pauseSource: AwakeningPauseSource;
  /** Set only by the defensive error state. */
  error: string | null;
};

export type AwakeningEvent =
  | { type: 'START'; reducedMotion?: boolean }
  | { type: 'ADVANCE' }
  | { type: 'PAUSE'; source?: Exclude<AwakeningPauseSource, null> }
  | { type: 'RESUME' }
  | { type: 'SKIP' }
  | { type: 'REPLAY'; reducedMotion?: boolean }
  | { type: 'ERROR'; message?: string }
  | { type: 'CLOSE' };

export function initialAwakeningState(): AwakeningState {
  return {
    phase: 'idle',
    beatIndex: -1,
    resumePhase: null,
    pauseSource: null,
    error: null,
  };
}

export function isAwakeningPlayable(phase: AwakeningPhase): phase is AwakeningPlayablePhase {
  return (AWAKENING_PLAYABLE_PHASES as readonly string[]).includes(phase);
}

/**
 * Phases that present the product field. `skipped` is included because a skip
 * must show the visitor the same real routes rather than a blank ending, and
 * `revelation` is the authored entrance to that field.
 */
export function isAwakeningReveal(phase: AwakeningPhase): boolean {
  return phase === 'revelation' || phase === 'explore' || phase === 'skipped';
}

export function isAwakeningOpen(state: AwakeningState): boolean {
  return state.phase !== 'idle';
}

/** The phase whose scene should be painted while paused. */
export function visualAwakeningPhase(state: AwakeningState): AwakeningPhase {
  return state.phase === 'paused' ? state.resumePhase ?? 'explore' : state.phase;
}

/** How many real systems the painted phase has discussed. */
export function emittedForPhase(phase: AwakeningPhase): number {
  return AWAKENING_EMISSIONS[phase] ?? 0;
}

export function nextAwakeningPhase(phase: AwakeningPlayablePhase): AwakeningPlayablePhase | 'explore' {
  const index = AWAKENING_SEQUENCE.indexOf(phase);
  return AWAKENING_SEQUENCE[index + 1] ?? 'explore';
}

/**
 * The complete transition table. Invalid events are ignored rather than
 * throwing: a lost click, a duplicate header event or a visibility change
 * arriving after close must never interrupt the page.
 */
export function reduceAwakening(state: AwakeningState, event: AwakeningEvent): AwakeningState {
  switch (event.type) {
    case 'START':
      if (state.phase !== 'idle') return state;
      return {
        phase: event.reducedMotion ? 'explore' : 'ignition',
        beatIndex: event.reducedMotion ? AWAKENING_BEAT_COUNT : 0,
        resumePhase: null,
        pauseSource: null,
        error: null,
      };

    case 'ADVANCE': {
      if (!isAwakeningPlayable(state.phase)) return state;
      const nextIndex = state.beatIndex + 1;
      const beat = awakeningBeatAt(nextIndex);
      if (!beat) {
        return {
          ...state,
          phase: 'explore',
          beatIndex: AWAKENING_BEAT_COUNT,
          resumePhase: null,
          pauseSource: null,
          error: null,
        };
      }
      return {
        ...state,
        phase: beat.act,
        beatIndex: nextIndex,
        resumePhase: null,
        pauseSource: null,
        error: null,
      };
    }

    case 'PAUSE':
      if (!isAwakeningPlayable(state.phase)) return state;
      return {
        phase: 'paused',
        beatIndex: state.beatIndex,
        resumePhase: state.phase,
        pauseSource: event.source ?? 'user',
        error: null,
      };

    case 'RESUME':
      if (state.phase !== 'paused' || !state.resumePhase) return state;
      return {
        phase: state.resumePhase,
        beatIndex: state.beatIndex,
        resumePhase: null,
        pauseSource: null,
        error: null,
      };

    case 'SKIP':
      if (state.phase === 'idle' || state.phase === 'error') return state;
      return {
        phase: 'skipped',
        beatIndex: AWAKENING_BEAT_COUNT,
        resumePhase: null,
        pauseSource: null,
        error: null,
      };

    case 'REPLAY':
      return {
        phase: event.reducedMotion ? 'explore' : 'ignition',
        beatIndex: event.reducedMotion ? AWAKENING_BEAT_COUNT : 0,
        resumePhase: null,
        pauseSource: null,
        error: null,
      };

    case 'ERROR':
      return {
        phase: 'error',
        beatIndex: -1,
        resumePhase: null,
        pauseSource: null,
        error: event.message ?? 'The awakening could not start.',
      };

    case 'CLOSE':
      return initialAwakeningState();

    default:
      return state;
  }
}
