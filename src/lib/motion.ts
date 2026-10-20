/**
 * Motion grammar.
 *
 * The site animates on purpose and rarely. One table of durations and easings
 * is referenced by CSS custom properties and by the few components that drive
 * motion in script, so a transition on the Composer feels identical to one on
 * a product dossier. `prefers-reduced-motion` is honoured in CSS and by
 * `motionAllowed()` for scripted animation.
 */

export const motion = {
  /** Hover, focus and state changes. */
  response: 180,
  /** Drawer, sheet and disclosure panels. */
  drawer: 320,
  /** Command palette open and close. */
  search: 220,
  /** Section entrance and scroll reveal. */
  reveal: 620,
  /** Division and product route transitions. */
  route: 460,
  /** Deliberate, self-playing ambient motion such as signal paths. */
  ambient: 9000,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  entrance: 'cubic-bezier(0.16, 0.84, 0.34, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export function motionTokens(): Record<string, string> {
  return {
    '--motion-response': `${motion.response}ms`,
    '--motion-drawer': `${motion.drawer}ms`,
    '--motion-search': `${motion.search}ms`,
    '--motion-reveal': `${motion.reveal}ms`,
    '--motion-route': `${motion.route}ms`,
    '--ease-standard': easing.standard,
    '--ease-entrance': easing.entrance,
    '--ease-exit': easing.exit,
  };
}

/** True when scripted animation is appropriate for this visitor and device. */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  // Coarse pointers and low core counts get the static composition instead.
  if (window.matchMedia('(pointer: coarse)').matches && (navigator.hardwareConcurrency ?? 8) <= 4) {
    return false;
  }
  return true;
}

/** Section reveal that degrades to "already visible" without IntersectionObserver. */
export function observeReveal(
  root: HTMLElement,
  onEnter: (element: Element) => void,
): () => void {
  const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (typeof IntersectionObserver === 'undefined' || !motionAllowed()) {
    targets.forEach(onEnter);
    return () => {};
  }
  const pending = new Set(targets);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        onEnter(entry.target);
        pending.delete(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  targets.forEach((target) => observer.observe(target));

  // An IntersectionObserver reports the geometry it evaluates, not the path the
  // visitor took to get there. A fast scroll, or a scroll that happens before
  // this observer exists, can carry a block past the viewport without the
  // observer ever seeing it intersect, and a block at `opacity: 0` that is never
  // seen stays invisible for good. Anything already at or above the fold is
  // therefore revealed on demand rather than waited for.
  const sweep = () => {
    for (const target of pending) {
      if (target.getBoundingClientRect().top >= window.innerHeight) continue;
      onEnter(target);
      pending.delete(target);
      observer.unobserve(target);
    }
    if (!pending.size) window.removeEventListener('scroll', sweep);
  };
  window.addEventListener('scroll', sweep, { passive: true });
  sweep();

  return () => {
    window.removeEventListener('scroll', sweep);
    observer.disconnect();
  };
}
