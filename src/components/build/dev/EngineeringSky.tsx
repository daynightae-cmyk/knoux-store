'use client';

import { useEffect, useRef } from 'react';

export function EngineeringSky({ reducedMotion }: { reducedMotion: boolean }) {
  const skyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sky = skyRef.current;
    const stage = sky?.parentElement;
    if (!sky || !stage || reducedMotion) return;

    const motion = matchMedia('(min-width: 761px) and (any-hover: hover) and (prefers-reduced-motion: no-preference)');
    let frame = 0;

    function reset() {
      cancelAnimationFrame(frame);
      if (!sky) return;
      delete sky.dataset.illuminated;
      sky.style.removeProperty('--figure-x');
      sky.style.removeProperty('--figure-y');
    }

    function follow(event: PointerEvent) {
      if (!motion.matches || event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!stage || !sky) return;
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;

        if (x < .63 || y < .12 || y > .86) {
          reset();
          return;
        }

        sky.style.setProperty('--figure-x', `${(x - .81) * 84}px`);
        sky.style.setProperty('--figure-y', `${(y - .46) * 38}px`);
        sky.dataset.illuminated = '';
      });
    }

    stage.addEventListener('pointermove', follow, { passive: true });
    stage.addEventListener('pointerleave', reset);
    motion.addEventListener('change', reset);
    return () => {
      reset();
      stage.removeEventListener('pointermove', follow);
      stage.removeEventListener('pointerleave', reset);
      motion.removeEventListener('change', reset);
    };
  }, [reducedMotion]);

  return (
    <div ref={skyRef} className="dev-operational-sky" data-reduced={reducedMotion ? '' : undefined} aria-hidden="true">
      <div className="dev-engineering-figure" />
      <svg className="dev-constellations" viewBox="0 0 320 260" fill="none">
        <path d="M28 44l38 18 26-30 40 22 M196 96l30 26-14 40 44 18 M64 176l42 14 22 38" stroke="#b9a8d2" strokeOpacity=".4" strokeWidth=".7" />
        <path d="M28 44h.01 M66 62h.01 M92 32h.01 M132 54h.01 M196 96h.01 M226 122h.01 M212 162h.01 M256 180h.01 M64 176h.01 M106 190h.01 M128 228h.01" stroke="#e6dcf6" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
