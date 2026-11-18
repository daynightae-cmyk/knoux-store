'use client';

import { useEffect, useRef } from 'react';
import { cueAtmosphere, listenAtmosphere } from './living-atmosphere';

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
      x: random(), y: random(), depth: .2 + random() * .8, phase: random() * Math.PI * 2, cadence: .34 + random() * .48,
    }));
    let width = 0, height = 0, frame = 0, previous = 0, time = 0;
    let wake = -100, nextStorm = 12 + random() * 8, storm = -100;
    let pendingWake = false, cloudX = .83, cloudY = .22, shear = 1;
    let nextTrail = 6 + random() * 5, trail = -100, trailX = .7, trailY = .13;
    let pointerX = 0, pointerY = 0, offsetX = 0, offsetY = 0;
    let bounds = stage.getBoundingClientRect();

    const draw = (now: number) => {
      frame = 0;
      if (document.hidden || !width || !height) return;
      const still = reduced || motion.matches;
      if (!still) frame = requestAnimationFrame(draw);
      if (!still && previous && now - previous < 32) return;
      if (still) { pendingWake = false; storm = -100; trail = -100; }
      else time += Math.min((now - (previous || now)) / 1000, .075);
      previous = now;
      const activationStrike = pendingWake && time >= wake + .72;
      if (!still && (activationStrike || (!pendingWake && time >= nextStorm))) {
        storm = time;
        cloudX = .63 + random() * .26;
        cloudY = .12 + random() * .24;
        shear = random() < .5 ? -1 : 1;
        pendingWake = false;
        nextStorm = time + 20 + random() * 17;
        cueAtmosphere(activationStrike ? 'activation-storm' : 'ambient-storm');
      }
      if (!still && time >= nextTrail) {
        trail = time;
        trailX = .58 + random() * .3;
        trailY = .07 + random() * .24;
        nextTrail = time + 9 + random() * 12;
      }
      const energy = still ? 0 : Math.pow(Math.max(0, 1 - (time - wake) / 4.8), 1.5);
      const elapsed = time - storm;
      const flash = still || elapsed > 1.4 ? 0 : Math.min(1, (elapsed + .025) * 11) * Math.exp(-elapsed * 2.9);
      offsetX += (pointerX - offsetX) * .1;
      offsetY += (pointerY - offsetY) * .1;
      ctx.clearRect(0, 0, width, height);
      const hazeX = width * (.77 + Math.sin(time * .09) * .055);
      const hazeY = height * (.32 + Math.cos(time * .077) * .075);
      const haze = ctx.createRadialGradient(hazeX, hazeY, 0, hazeX, hazeY, Math.max(1, Math.min(width * .47, 530)));
      haze.addColorStop(0, `rgba(138,77,210,${.07 + energy * .075 + Math.sin(time * .19) * .025})`);
      haze.addColorStop(.48, '#623b9e14');
      haze.addColorStop(1, '#623b9e00');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
      const count = width < 700 ? 48 : 120;
      for (let index = 0; index < count; index++) {
        const star = stars[index];
        const x = ((star.x + time * .00085 * star.depth) % 1) * width + (still ? 0 : offsetX * star.depth);
        const y = star.y * height + (still ? 0 : offsetY * star.depth);
        const twinkle = (.52 + Math.sin(time * star.cadence + star.phase) * .25 + Math.sin(time * 1.63 + star.phase * 2) * .13) * star.depth;
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
      const flight = time - trail;
      if (!still && flight >= 0 && flight < .65) {
        const x = width * trailX - flight * 73;
        const y = height * trailY + flight * 35;
        const trace = ctx.createLinearGradient(x + 40, y - 19, x, y);
        trace.addColorStop(0, '#b495ff00');
        trace.addColorStop(1, `rgba(225,207,255,${Math.sin(flight / .65 * Math.PI) * .7})`);
        ctx.strokeStyle = trace;
        ctx.beginPath();
        ctx.moveTo(x + 40, y - 19);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      if (flash > .02) {
        const x = width * cloudX, y = height * cloudY, radius = Math.min(width * .27, 290);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(143,100,241,${flash * .44})`);
        glow.addColorStop(.45, `rgba(108,105,241,${flash * .15})`);
        glow.addColorStop(1, '#8660ed00');
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(radius * shear, radius);
        ctx.strokeStyle = `rgba(225,213,255,${flash * .8})`;
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
        ctx.moveTo(-.28, .09);
        ctx.lineTo(-.21, .23);
        ctx.lineTo(-.32, .31);
        ctx.moveTo(.12, .27);
        ctx.lineTo(.05, .38);
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
      pendingWake = true;
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
