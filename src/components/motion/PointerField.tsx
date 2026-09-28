'use client';

import { useEffect, useRef } from 'react';

/** One pointer loop for the public spatial surfaces. No React render per movement. */
export function PointerField() {
  const nucleus = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    let targetX = -100;
    let targetY = -100;
    let x = -100;
    let y = -100;
    let frame = 0;
    let current: HTMLElement | null = null;
    let hovering = false;

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const surface = (event.target as Element | null)?.closest?.('[data-spatial]') as HTMLElement | null;
      if (current !== surface) {
        current?.removeAttribute('data-pointer-inside');
        current = surface;
        current?.setAttribute('data-pointer-inside', '');
      }
      hovering = Boolean((event.target as Element | null)?.closest?.('a,button,input,select,textarea,[role="button"]'));
      if (current) {
        const box = current.getBoundingClientRect();
        current.style.setProperty('--local-x', `${((targetX - box.left) / box.width) * 100}%`);
        current.style.setProperty('--local-y', `${((targetY - box.top) / box.height) * 100}%`);
        current.style.setProperty('--depth-px-x', `${(((targetX - box.left) / box.width) - 0.5) * 18}px`);
        current.style.setProperty('--depth-px-y', `${(((targetY - box.top) / box.height) - 0.5) * 18}px`);
      }
    };
    const onLeave = () => {
      targetX = -100;
      targetY = -100;
      current?.removeAttribute('data-pointer-inside');
      current = null;
    };
    const tick = () => {
      if (!document.hidden) {
        x += (targetX - x) * 0.19;
        y += (targetY - y) * 0.19;
        if (nucleus.current) {
          nucleus.current.style.transform = `translate3d(${x}px,${y}px,0) scale(${hovering ? 1.7 : 1})`;
          nucleus.current.style.opacity = targetX < 0 ? '0' : '1';
        }
      }
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      current?.removeAttribute('data-pointer-inside');
    };
  }, []);

  return <span ref={nucleus} className="pointer-nucleus" aria-hidden="true" />;
}
