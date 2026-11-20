export type AtmosphereCue = 'wake' | 'ambient-storm' | 'activation-storm' | 'ready' | 'confirm' | 'settle'
  | 'generation-start' | 'success' | 'error' | 'cancel' | 'provider-authenticated';

const CUE_EVENT = 'knoux:atmosphere-cue';
export const ACTIVATION_DURATION_MS = 4800;
let lastActivation = -Infinity;

/** Coalesce rapid activation gestures for both the sky and sound, never the operation. */
export function cueAtmosphere(cue: AtmosphereCue) {
  if (cue === 'wake') {
    const now = performance.now();
    if (now - lastActivation < ACTIVATION_DURATION_MS) return;
    lastActivation = now;
  }
  window.dispatchEvent(new CustomEvent<AtmosphereCue>(CUE_EVENT, { detail: cue }));
}

export function engineeringCue(stage: string): AtmosphereCue | null {
  if (stage === 'RESOLVING') return 'wake';
  if (stage === 'GENERATING') return 'generation-start';
  if (stage === 'PLANNED' || stage === 'COMPLETE') return 'success';
  if (stage === 'CANCELLED') return 'cancel';
  if (['AUTH_REQUIRED', 'CONFIG_REQUIRED', 'PROVIDER_BLOCKED', 'AGENT_UNAVAILABLE', 'EXECUTOR_NOT_CONNECTED'].includes(stage)) return 'error';
  return null;
}

export type ActivationPhase = 'prepare' | 'gather' | 'discharge' | 'settle';
export function activationPhase(elapsedMs: number): ActivationPhase | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= ACTIVATION_DURATION_MS) return null;
  if (elapsedMs < 250) return 'prepare';
  if (elapsedMs < 700) return 'gather';
  if (elapsedMs < 1500) return 'discharge';
  return 'settle';
}

export function seededRandom(initial = 39172) {
  let seed = initial;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export type LightningPoint = readonly [number, number];
/** A bounded new branching path per event, rather than a repeating bolt stencil. */
export function lightningBranches(random: () => number): LightningPoint[][] {
  const trunk: LightningPoint[] = Array.from({ length: 7 }, (_, index) => [
    -.5 + index * .16 + (random() - .5) * .12,
    -.22 + index * .065 + (random() - .5) * .15,
  ]);
  const branches = [trunk];
  for (const index of [2, 3, 5]) {
    const origin = trunk[index];
    const direction = random() < .5 ? -1 : 1;
    branches.push([origin, [origin[0] + direction * .08, origin[1] + .13],
      [origin[0] + direction * (.13 + random() * .1), origin[1] + .24 + random() * .1]]);
  }
  return branches;
}

export function listenAtmosphere(onCue: (cue: AtmosphereCue) => void) {
  const listener = (event: Event) => onCue((event as CustomEvent<AtmosphereCue>).detail);
  window.addEventListener(CUE_EVENT, listener);
  return () => window.removeEventListener(CUE_EVENT, listener);
}
