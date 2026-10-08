'use client';

import { useEffect, useRef } from 'react';

/** One continuous night sky across routes; independent, slow stellar scintillation. */
export function StoreStarfield() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    let seed = 719;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    // A stable bounded pool: resize and navigation never regenerate the sky.
    const stars = Array.from({ length: 240 }, () => ({
      x: random(), y: random(),
      radius: 0.4 + random() ** 3 * 1.1,
      brightness: 0.13 + random() * 0.31,
      period: 6 + random() * 14,
      phase: random() * Math.PI * 2,
      depth: 0.3 + random() * 0.7,
      warm: random() > 0.8,
    }));
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let count = 0;
    let animation = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let lastPaint = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (let index = 0; index < count; index++) {
        const star = stars[index];
        const phase = elapsed * Math.PI * 2 / star.period + star.phase;
        // Smooth independent dimming, with long quiet troughs and no hard flashes.
        const glow = ((Math.sin(phase) + 1) / 2) ** 2;
        const alpha = star.brightness * (0.07 + glow * 0.93);
        const drift = motion.matches ? 0 : Math.sin(elapsed * 0.045 + star.phase) * star.depth * 2;
        const x = star.x * width + drift;
        const y = star.y * height + drift * 0.45;
        const colour = star.warm ? '244, 228, 205' : '218, 224, 246';
        if (star.radius > 1) {
          const halo = context.createRadialGradient(x, y, 0, x, y, star.radius * 4);
          halo.addColorStop(0, `rgba(${colour}, ${alpha * 0.28})`);
          halo.addColorStop(1, `rgba(${colour}, 0)`);
          context.fillStyle = halo;
          context.fillRect(x - star.radius * 4, y - star.radius * 4, star.radius * 8, star.radius * 8);
        }
        context.fillStyle = `rgba(${colour}, ${alpha})`;
        context.beginPath();
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const tick = (time: number) => {
      if (lastFrame) elapsed += Math.min(time - lastFrame, 100) / 1000;
      lastFrame = time;
      // Slow light needs only 30 paints per second; no React renders in the loop.
      if (time - lastPaint >= 1000 / 30) { draw(); lastPaint = time; }
      animation = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(animation);
      lastFrame = 0;
      lastPaint = 0;
      if (document.hidden) { element.dataset.motion = 'paused'; return; }
      draw();
      element.dataset.motion = motion.matches ? 'static' : 'animated';
      if (!motion.matches) animation = requestAnimationFrame(tick);
    };
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      count = Math.min(stars.length, Math.max(55, Math.round(width * height / 7000)));
      const dpr = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
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

  return <canvas ref={canvas} className="store-starfield" aria-hidden="true" />;
}
