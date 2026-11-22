'use client';

import { useEffect, useRef } from 'react';
import { ACTIVATION_DURATION_MS, activationPhase, cueAtmosphere, lightningBranches, listenAtmosphere, seededRandom, type ActivationPhase, type LightningPoint } from './living-atmosphere';

type Star = { x: number; y: number; depth: number; phase: number; cadence: number };
type Planet = { x: number; y: number; depth: number; radius: number; tone: [number, number, number]; ring: boolean; drift: number; phase: number };
type Sky = {
  width: number; height: number; time: number; storm: number; nextStorm: number;
  pendingWake: boolean; cloudX: number; cloudY: number; branches: LightningPoint[][];
  trail: number; nextTrail: number; trailX: number; trailY: number; offsetX: number; offsetY: number;
};

function nebula(ctx: CanvasRenderingContext2D, sky: Sky, energy: number) {
  const { width, height, time } = sky;
  const x = width * (.77 + Math.sin(time * .09) * .055);
  const y = height * (.32 + Math.cos(time * .077) * .075);
  const haze = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, Math.min(width * .47, 530)));
  haze.addColorStop(0, `rgba(138,77,210,${.07 + energy * .075 + Math.sin(time * .19) * .025})`);
  haze.addColorStop(.48, '#623b9e14');
  haze.addColorStop(1, '#623b9e00');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
}

function starPosition(star: Star, sky: Sky, still: boolean): LightningPoint {
  return [((star.x + sky.time * .00085 * star.depth) % 1) * sky.width + (still ? 0 : sky.offsetX * star.depth),
    star.y * sky.height + (still ? 0 : sky.offsetY * star.depth)];
}

function starfield(ctx: CanvasRenderingContext2D, sky: Sky, stars: Star[], energy: number, still: boolean) {
  const count = sky.width < 700 ? 48 : stars.length;
  for (let index = 0; index < count; index++) {
    const star = stars[index];
    const [x, y] = starPosition(star, sky, still);
    const twinkle = (.52 + Math.sin(sky.time * star.cadence + star.phase) * .25 + Math.sin(sky.time * 1.63 + star.phase * 2) * .13) * star.depth;
    const size = star.depth > .8 ? 1.7 : 1;
    ctx.fillStyle = `rgba(223,203,255,${Math.min(.93, twinkle + energy * .28)})`;
    ctx.fillRect(x, y, size, size);
    const other = stars[index + 1];
    if (index % 5 !== 0 || !other || Math.hypot(other.x - star.x, other.y - star.y) >= .22) continue;
    const [endX, endY] = starPosition(other, sky, still);
    ctx.strokeStyle = `rgba(185,147,251,${twinkle * (.13 + energy * .3)})`;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();
  }
}

function planets(ctx: CanvasRenderingContext2D, sky: Sky, planets: Planet[], still: boolean) {
  // Small drifting worlds: a lit sphere, a night-side falloff and — for one —
  // a thin ring. Three gradient fills per frame; cheap enough for phones.
  const count = sky.width < 700 ? 2 : planets.length;
  for (let index = 0; index < count; index++) {
    const planet = planets[index];
    const drift = still ? 0 : sky.time * planet.drift;
    const bob = still ? 0 : Math.sin(sky.time * .11 + planet.phase) * 6;
    const x = ((planet.x + drift * .001) % 1.1) * sky.width - sky.width * .05 + (still ? 0 : sky.offsetX * planet.depth * 1.6);
    const y = planet.y * sky.height + bob + (still ? 0 : sky.offsetY * planet.depth * 1.6);
    const radius = planet.radius * Math.min(1, sky.width / 1100 + .45);
    const [r, g, b] = planet.tone;
    const body = ctx.createRadialGradient(x - radius * .4, y - radius * .45, radius * .1, x, y, radius);
    body.addColorStop(0, `rgba(${r + 70},${g + 60},${b + 40},.85)`);
    body.addColorStop(.55, `rgba(${r},${g},${b},.6)`);
    body.addColorStop(1, `rgba(${Math.max(0, r - 60)},${Math.max(0, g - 60)},${Math.max(0, b - 40)},.28)`);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    const glow = ctx.createRadialGradient(x, y, radius * .8, x, y, radius * 2.4);
    glow.addColorStop(0, `rgba(${r},${g},${b},.12)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2); ctx.fill();
    if (planet.ring) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.35);
      ctx.strokeStyle = `rgba(${r + 40},${g + 30},${b + 60},.34)`; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.9, radius * .55, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

function shootingStar(ctx: CanvasRenderingContext2D, sky: Sky) {
  const flight = sky.time - sky.trail;
  if (flight < 0 || flight >= .65) return;
  const x = sky.width * sky.trailX - flight * 73, y = sky.height * sky.trailY + flight * 35;
  const trace = ctx.createLinearGradient(x + 40, y - 19, x, y);
  trace.addColorStop(0, '#b495ff00');
  trace.addColorStop(1, `rgba(225,207,255,${Math.sin(flight / .65 * Math.PI) * .7})`);
  ctx.strokeStyle = trace;
  ctx.beginPath(); ctx.moveTo(x + 40, y - 19); ctx.lineTo(x, y); ctx.stroke();
}

function lightning(ctx: CanvasRenderingContext2D, sky: Sky, visibleSeconds: number) {
  const elapsed = visibleSeconds - sky.storm;
  if (elapsed < 0 || elapsed > 1.4) return;
  const flash = Math.min(1, (elapsed + .025) * 11) * Math.exp(-elapsed * 2.9);
  if (flash <= .02) return;
  const x = sky.width * sky.cloudX, y = sky.height * sky.cloudY, radius = Math.min(sky.width * .27, 290);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(143,100,241,${flash * .44})`);
  glow.addColorStop(.45, `rgba(108,105,241,${flash * .15})`);
  glow.addColorStop(1, '#8660ed00');
  ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
  ctx.save(); ctx.translate(x, y); ctx.scale(radius, radius); ctx.lineWidth = 1 / radius;
  for (const [index, branch] of sky.branches.entries()) {
    const color = index === 0 ? '225,213,255' : '155,150,255';
    ctx.strokeStyle = `rgba(${color},${flash * .8})`;
    ctx.beginPath(); ctx.moveTo(...branch[0]);
    for (const point of branch.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
  }
  ctx.restore();
}

function activation(ctx: CanvasRenderingContext2D, sky: Sky, phase: ActivationPhase | null, energy: number) {
  if (!phase || phase === 'prepare') return;
  const x = sky.width * .52, y = sky.height * .36;
  const radius = Math.min(sky.width * .42, 430);
  ctx.save(); ctx.strokeStyle = `rgba(200,164,255,${energy * .12})`;
  ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .18, -.12, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

function advanceEvents(sky: Sky, random: () => number, visibleSeconds: number, wakeElapsed: number) {
  const activationStrike = sky.pendingWake && wakeElapsed >= 700 && wakeElapsed < ACTIVATION_DURATION_MS;
  if (activationStrike || (!sky.pendingWake && visibleSeconds >= sky.nextStorm)) {
    sky.storm = visibleSeconds; sky.cloudX = .63 + random() * .26; sky.cloudY = .12 + random() * .24;
    sky.branches = lightningBranches(random); sky.pendingWake = false;
    sky.nextStorm = visibleSeconds + 18 + random() * 23;
    // The same event paints the bolt and starts its thunder. No audio storm timer exists.
    cueAtmosphere(activationStrike ? 'activation-storm' : 'ambient-storm');
  }
  if (sky.time < sky.nextTrail) return;
  sky.trail = sky.time; sky.trailX = .58 + random() * .3; sky.trailY = .07 + random() * .24;
  sky.nextTrail = sky.time + 9 + random() * 12;
}

export function BuildAtmosphere({ reduced }: Readonly<{ reduced: boolean }>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current, stage = surface?.parentElement, ctx = surface?.getContext('2d');
    if (!surface || !stage || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), random = seededRandom();
    const stars = Array.from({ length: 120 }, () => ({ x: random(), y: random(), depth: .2 + random() * .8, phase: random() * Math.PI * 2, cadence: .34 + random() * .48 }));
    const worlds: Planet[] = [
      { x: .13, y: .18, depth: .85, radius: 9, tone: [150, 96, 220], ring: true, drift: .55, phase: random() * 6 },
      { x: .86, y: .12, depth: .6, radius: 6, tone: [96, 120, 220], ring: false, drift: .8, phase: random() * 6 },
      { x: .68, y: .52, depth: .4, radius: 4.5, tone: [190, 120, 180], ring: false, drift: 1.1, phase: random() * 6 },
    ];
    const sky: Sky = { width: 0, height: 0, time: 0, storm: -100, nextStorm: 12 + random() * 8,
      pendingWake: false, cloudX: .83, cloudY: .22, branches: [], trail: -100, nextTrail: 6 + random() * 5,
      trailX: .7, trailY: .13, offsetX: 0, offsetY: 0 };
    let frame = 0, previous = 0, pointerX = 0, pointerY = 0, decay: number | undefined;
    let wakeStarted = -Infinity, paints = 0, paintTotal = 0;
    let accumulatedVisibleMs = 0, visibleSince: number | null = null;
    let bounds = stage.getBoundingClientRect();

    function clearActivation() {
      wakeStarted = -Infinity;
      sky.pendingWake = false; sky.storm = -100; sky.trail = -100;
      window.clearTimeout(decay); delete stage!.dataset.cosmicEnergy; delete stage!.dataset.cosmicPhase;
    }
    function draw(now: number) {
      frame = 0;
      if (document.hidden || !sky.width || !sky.height) return;
      const still = reduced || motion.matches;
      if (!still) frame = requestAnimationFrame(draw);
      if (!still && previous && now - previous < 32) return;
      // A frame's timestamp can precede a wake gesture queued in that frame.
      const frameStarted = performance.now();
      const wakeElapsed = Math.max(0, frameStarted - wakeStarted);
      const visibleSeconds = (accumulatedVisibleMs + (visibleSince === null ? 0 : frameStarted - visibleSince)) / 1000;
      if (!still) {
        // Smooth star movement uses a bounded step; storms use visible elapsed time.
        sky.time += Math.min((now - (previous || now)) / 1000, .075);
        advanceEvents(sky, random, visibleSeconds, wakeElapsed);
      }
      previous = now;
      sky.offsetX += (pointerX - sky.offsetX) * .1; sky.offsetY += (pointerY - sky.offsetY) * .1;
      const phase = still ? null : activationPhase(wakeElapsed);
      // A frame gap longer than a phase window must not silently skip that
      // phase: emit every boundary crossed since the last painted phase so
      // observers see the full sequence even on a loaded host.
      if (phase) {
        const order: ActivationPhase[] = ['prepare', 'gather', 'discharge', 'settle'];
        const last = stage!.dataset.cosmicPhase as ActivationPhase | undefined;
        const from = last && order.includes(last) ? order.indexOf(last) + 1 : order.indexOf(phase);
        for (let i = from; i <= order.indexOf(phase); i++) stage!.dataset.cosmicPhase = order[i];
      } else delete stage!.dataset.cosmicPhase;
      const energy = phase ? Math.pow(1 - wakeElapsed / ACTIVATION_DURATION_MS, 1.5) : 0;
      const renderStarted = performance.now();
      ctx!.clearRect(0, 0, sky.width, sky.height);
      nebula(ctx!, sky, energy); starfield(ctx!, sky, stars, energy, still); planets(ctx!, sky, worlds, still);
      if (!still) { shootingStar(ctx!, sky); lightning(ctx!, sky, visibleSeconds); activation(ctx!, sky, phase, energy); }
      paintTotal += performance.now() - renderStarted; paints++;
      surface!.dataset.motion = still ? 'stable' : 'animated';
      surface!.dataset.stars = String(sky.width < 700 ? 48 : stars.length);
      surface!.dataset.planets = String(sky.width < 700 ? 2 : worlds.length);
      surface!.dataset.paints = String(paints);
      surface!.dataset.meanPaintMs = (paintTotal / paints).toFixed(3);
    }
    function refresh() {
      cancelAnimationFrame(frame); previous = 0;
      const now = performance.now();
      if (document.hidden || reduced || motion.matches || !sky.width || !sky.height) {
        if (visibleSince !== null) accumulatedVisibleMs += now - visibleSince;
        visibleSince = null;
        clearActivation();
      } else visibleSince ??= now;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    }
    function resize() {
      bounds = stage!.getBoundingClientRect(); sky.width = surface!.clientWidth; sky.height = surface!.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface!.width = Math.round(sky.width * dpr); surface!.height = Math.round(sky.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); refresh();
    }
    function follow(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      pointerX = ((event.clientX - bounds.left) / Math.max(1, sky.width) - .5) * 14;
      pointerY = ((event.clientY - bounds.top) / Math.max(1, sky.height) - .5) * 10;
    }
    const settle = () => { pointerX = 0; pointerY = 0; };
    const unsubscribe = listenAtmosphere((cue) => {
      if (cue !== 'wake' || reduced || motion.matches || document.hidden) return;
      wakeStarted = performance.now(); sky.pendingWake = true;
      stage.dataset.cosmicEnergy = 'active'; stage.dataset.cosmicPhase = 'prepare';
      window.clearTimeout(decay); decay = window.setTimeout(clearActivation, ACTIVATION_DURATION_MS);
    });
    const observer = new ResizeObserver(resize); observer.observe(stage);
    motion.addEventListener('change', refresh); document.addEventListener('visibilitychange', refresh);
    stage.addEventListener('pointermove', follow, { passive: true }); stage.addEventListener('pointerleave', settle); resize();
    return () => {
      cancelAnimationFrame(frame); clearActivation(); unsubscribe(); observer.disconnect();
      motion.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh);
      stage.removeEventListener('pointermove', follow); stage.removeEventListener('pointerleave', settle);
    };
  }, [reduced]);
  // Eight visual layers share one bounded canvas: two star depths, links, nebula, drifting planets, trails, bolts and activation energy.
  return <canvas ref={canvas} className="dev-cosmic-field" aria-hidden="true" />;
}
