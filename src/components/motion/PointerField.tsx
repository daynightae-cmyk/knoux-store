'use client';

import { useEffect, useRef } from 'react';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

/** A tiny canonical signature and the existing local spatial response share one pointer listener. */
export function KnouxLivingCompanion() {
  const companion = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = fine.matches && !reduced.matches;
    let targetX = -100;
    let targetY = -100;
    let x = -100;
    let y = -100;
    let frame = 0;
    let idleTimer = 0;
    let current: HTMLElement | null = null;
    let hovering = false;

    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const hide = () => { if (companion.current) companion.current.style.opacity = '0'; };
    const tick = () => {
      frame = 0;
      if (!enabled || document.hidden) return;
      if (current) {
        const box = current.getBoundingClientRect();
        if (box.width && box.height) {
          const localX = (targetX - box.left) / box.width;
          const localY = (targetY - box.top) / box.height;
          current.style.setProperty('--local-x', `${localX * 100}%`);
          current.style.setProperty('--local-y', `${localY * 100}%`);
          current.style.setProperty('--depth-px-x', `${(localX - 0.5) * 18}px`);
          current.style.setProperty('--depth-px-y', `${(localY - 0.5) * 18}px`);
        }
      }
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      if (companion.current) {
        companion.current.style.transform = `translate3d(${x + 28}px,${y + 24}px,0) scale(${hovering ? 0.76 : 1})`;
        companion.current.style.opacity = hovering || targetX < 0 ? '0' : '0.82';
      }
      if (Math.abs(x - targetX) > 0.2 || Math.abs(y - targetY) > 0.2) frame = requestAnimationFrame(tick);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };

    const onMove = (event: PointerEvent) => {
      if (!enabled || document.hidden || event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      const surface = (event.target as Element | null)?.closest?.('[data-spatial]') as HTMLElement | null;
      if (current !== surface) {
        current?.removeAttribute('data-pointer-inside');
        current = surface;
        current?.setAttribute('data-pointer-inside', '');
      }
      hovering = Boolean((event.target as Element | null)?.closest?.('a,button,input,select,textarea,label,[role="button"]'));
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(hide, 2600);
      schedule();
    };
    const onLeave = () => {
      targetX = -100;
      targetY = -100;
      window.clearTimeout(idleTimer);
      hide();
      stop();
      current?.removeAttribute('data-pointer-inside');
      current = null;
    };
    const sync = () => {
      enabled = fine.matches && !reduced.matches;
      if (!enabled) onLeave();
    };
    const onVisibility = () => { if (document.hidden) onLeave(); };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', hide, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      stop();
      window.clearTimeout(idleTimer);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', hide);
      document.removeEventListener('visibilitychange', onVisibility);
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      current?.removeAttribute('data-pointer-inside');
    };
  }, []);

  return <span ref={companion} className="knoux-companion" aria-hidden="true"><svg viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} focusable="false">{MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}</svg><i /></span>;
}
