'use client';

import { useEffect, useRef } from 'react';

/** The existing particle system's Canvas 2D approach, at observatory density.
 * No WebGL context. One draw at reduced motion; pause when the tab is hidden. */
export function DevCosmicField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const host = element?.parentElement;
    const context = element?.getContext('2d');
    if (!element || !host || !context) return;
    let seed = 40;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const stars = Array.from({ length: 240 }, () => ({ x: random(), y: random(), size: random() * 1.1 + .3, alpha: random() * .4 + .13 }));
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let animation = 0;
    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const y = (star.y * height + time * .0006 * star.size) % height;
        context.fillStyle = `rgba(212,216,235,${star.alpha})`;
        context.beginPath(); context.arc(star.x * width, y, star.size, 0, Math.PI * 2); context.fill();
      }
      context.strokeStyle = 'rgba(180,185,220,.22)';
      for (const [x, y] of [[.79, .33], [.9, .71]]) {
        context.beginPath(); context.moveTo(x * width - 5, y * height); context.lineTo(x * width + 5, y * height); context.moveTo(x * width, y * height - 5); context.lineTo(x * width, y * height + 5); context.stroke();
      }
    };
    const tick = (time: number) => { draw(time); animation = requestAnimationFrame(tick); };
    const sync = () => { cancelAnimationFrame(animation); draw(); if (!motion.matches && !document.hidden) animation = requestAnimationFrame(tick); };
    const resize = () => {
      width = host.clientWidth; height = host.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      element.width = Math.floor(width * dpr); element.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0); sync();
    };
    const observer = new ResizeObserver(resize); observer.observe(host);
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); resize();
    return () => { cancelAnimationFrame(animation); observer.disconnect(); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return <canvas className="dev-cosmic-field" ref={canvas} aria-hidden="true" />;
}
