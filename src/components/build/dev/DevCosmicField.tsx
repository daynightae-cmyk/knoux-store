'use client';

import { useEffect, useRef } from 'react';

/** A quiet observatory starfield with subtle depth and a soft lavender glow. */
export function DevCosmicField() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const host = element?.parentElement;
    const context = element?.getContext('2d');
    if (!element || !host || !context) return;

    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const stars = Array.from({ length: 260 }, () => ({
      x: random(),
      y: random(),
      r: random() * 1.8 + 0.6,
      alpha: random() * 0.7 + 0.18,
      twinkle: random() * 0.9 + 0.2,
      drift: random() * 0.8 + 0.2,
    }));

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let animation = 0;

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);

      const base = context.createRadialGradient(
        width * 0.68,
        height * 0.38,
        0,
        width * 0.68,
        height * 0.38,
        Math.max(width, height) * 0.8,
      );
      base.addColorStop(0, 'rgba(183,167,230,0.18)');
      base.addColorStop(0.22, 'rgba(127,111,185,0.12)');
      base.addColorStop(0.5, 'rgba(70,62,96,0.06)');
      base.addColorStop(1, 'rgba(6,8,14,0)');
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);

      const haze = context.createLinearGradient(0, 0, width, height);
      haze.addColorStop(0, 'rgba(18,20,28,0.0)');
      haze.addColorStop(0.5, 'rgba(18,20,28,0.18)');
      haze.addColorStop(1, 'rgba(14,17,25,0.24)');
      context.fillStyle = haze;
      context.fillRect(0, 0, width, height);

      const shimmer = 0.5 + Math.sin(time * 0.00105) * 0.45;
      for (const star of stars) {
        const driftX = Math.sin(time * 0.00028 * star.drift + star.y * 32) * 7;
        const driftY = Math.cos(time * 0.00031 * star.twinkle + star.x * 27) * 5;
        const x = (star.x * width + driftX + width) % width;
        const y = (star.y * height + driftY + height) % height;
        const alpha = star.alpha * (0.42 + shimmer * 0.8);
        context.fillStyle = `rgba(232, 236, 255, ${alpha})`;
        context.beginPath();
        context.arc(x, y, star.r, 0, Math.PI * 2);
        context.fill();

        if (star.r > 1.3) {
          context.fillStyle = `rgba(188, 178, 233, ${alpha * 0.32})`;
          context.beginPath();
          context.arc(x, y, star.r * 3.1, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.strokeStyle = 'rgba(190, 197, 239, 0.15)';
      context.lineWidth = 1;
      for (const [x, y] of [[0.7, 0.32], [0.83, 0.72]]) {
        const px = x * width;
        const py = y * height;
        context.beginPath();
        context.moveTo(px - 12, py);
        context.lineTo(px + 12, py);
        context.moveTo(px, py - 12);
        context.lineTo(px, py + 12);
        context.stroke();
      }
    };

    const tick = (time: number) => {
      draw(time);
      animation = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(animation);
      draw();
      if (!motion.matches && !document.hidden) {
        animation = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      element.width = Math.floor(width * dpr);
      element.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    resize();

    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return <canvas className="dev-cosmic-field" ref={canvas} aria-hidden="true" />;
}
