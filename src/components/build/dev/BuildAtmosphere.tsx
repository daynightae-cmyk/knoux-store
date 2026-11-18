'use client';

import { useEffect, useRef } from 'react';
import { listenAtmosphere } from './living-atmosphere';

export function BuildAtmosphere({ reduced }: { reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const stage = surface?.parentElement;
    const ctx = surface?.getContext('2d');
    if (!surface || !stage || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let seed = 39172;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const stars = Array.from({ length: 120 }, () => ({
      x: random(), y: random(), depth: .2 + random() * .8, phase: random() * Math.PI * 2,
    }));
    let width = 0, height = 0, frame = 0, previous = 0, time = 0;
    let wake = -100, nextStorm = 24, storm = -100;
    let pointerX = 0, pointerY = 0, offsetX = 0, offsetY = 0;
    let bounds = stage.getBoundingClientRect();

    const draw = (now: number) => {
      frame = 0;
      if (document.hidden || !width || !height) return;
      const still = reduced || motion.matches;
      if (!still) frame = requestAnimationFrame(draw);
      if (!still && previous && now - previous < 32) return;
      time = still ? 0 : time + Math.min((now - (previous || now)) / 1000, .075);
      previous = now;
      if (time >= nextStorm) { storm = time; nextStorm = time + 23; }
      const energy = still ? 0 : Math.max(0, 1 - (time - wake) / 4.8);
      const elapsed = time - Math.max(storm, wake + .62);
      const flash = still || elapsed < 0 || elapsed > 1.2 ? 0 : Math.min(1, elapsed * 7) * Math.exp(-elapsed * 3.8);
      offsetX += (pointerX - offsetX) * .1;
      offsetY += (pointerY - offsetY) * .1;
      ctx.clearRect(0, 0, width, height);
      const count = width < 700 ? 48 : 120;
      for (let index = 0; index < count; index++) {
        const star = stars[index];
        const x = ((star.x + time * .00085 * star.depth) % 1) * width + (still ? 0 : offsetX * star.depth);
        const y = star.y * height + (still ? 0 : offsetY * star.depth);
        const twinkle = (.56 + Math.sin(time * (.9 + star.depth) + star.phase) * .33) * star.depth;
        ctx.fillStyle = `rgba(223,203,255,${Math.min(.93, twinkle + energy * .28)})`;
        ctx.fillRect(x, y, star.depth > .8 ? 1.7 : 1, star.depth > .8 ? 1.7 : 1);
        const other = stars[index + 1];
        if (index % 5 === 0 && other && Math.hypot(other.x - star.x, other.y - star.y) < .22) {
          ctx.strokeStyle = `rgba(185,147,251,${twinkle * (.13 + energy * .3)})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(((other.x + time * .00085 * other.depth) % 1) * width + (still ? 0 : offsetX * other.depth), other.y * height + (still ? 0 : offsetY * other.depth));
          ctx.stroke();
        }
      }
      if (flash > .02) {
        const x = width * .86, y = height * .18, radius = Math.min(width * .23, 260);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(143,100,241,${flash * .26})`);
        glow.addColorStop(1, '#8660ed00');
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(radius, radius);
        ctx.strokeStyle = `rgba(225,213,255,${flash * .58})`;
        ctx.lineWidth = 1 / radius;
        ctx.beginPath();
        ctx.moveTo(-.53, -.29);
        ctx.lineTo(-.2, -.07);
        ctx.lineTo(-.04, -.11);
        ctx.lineTo(.06, .12);
        ctx.lineTo(.39, .19);
        ctx.moveTo(-.2, -.07);
        ctx.lineTo(-.28, .09);
        ctx.lineTo(-.47, .14);
        ctx.moveTo(.06, .12);
        ctx.lineTo(.12, .27);
        ctx.lineTo(.29, .38);
        ctx.stroke();
        ctx.restore();
      }
    };

    function refresh() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (document.hidden) return;
      frame = requestAnimationFrame(draw);
    }
    const resize = () => {
      bounds = stage.getBoundingClientRect();
      width = surface.clientWidth;
      height = surface.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      refresh();
    };
    const follow = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX = ((event.clientX - bounds.left) / Math.max(1, width) - .5) * 14;
      pointerY = ((event.clientY - bounds.top) / Math.max(1, height) - .5) * 10;
    };
    const settle = () => { pointerX = 0; pointerY = 0; };
    let decay: number | undefined;
    const unsubscribe = listenAtmosphere((cue) => {
      if (cue !== 'wake' || reduced || motion.matches || document.hidden || time - wake < 5) return;
      wake = time;
      stage.dataset.cosmicEnergy = 'active';
      window.clearTimeout(decay);
      decay = window.setTimeout(() => { delete stage.dataset.cosmicEnergy; }, 4800);
    });
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    motion.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    stage.addEventListener('pointermove', follow, { passive: true });
    stage.addEventListener('pointerleave', settle);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(decay);
      delete stage.dataset.cosmicEnergy;
      unsubscribe();
      observer.disconnect();
      motion.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh);
      stage.removeEventListener('pointermove', follow);
      stage.removeEventListener('pointerleave', settle);
    };
  }, [reduced]);
  return <canvas ref={canvas} className="dev-cosmic-field" aria-hidden="true" />;
}
