export type AtmosphereCue = 'wake' | 'ambient-storm' | 'activation-storm' | 'ready' | 'confirm' | 'settle';

const CUE_EVENT = 'knoux:atmosphere-cue';

export function cueAtmosphere(cue: AtmosphereCue) {
  window.dispatchEvent(new CustomEvent<AtmosphereCue>(CUE_EVENT, { detail: cue }));
}

export function listenAtmosphere(onCue: (cue: AtmosphereCue) => void) {
  const listener = (event: Event) => onCue((event as CustomEvent<AtmosphereCue>).detail);
  window.addEventListener(CUE_EVENT, listener);
  return () => window.removeEventListener(CUE_EVENT, listener);
}
