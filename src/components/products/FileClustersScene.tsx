'use client';

import { useEffect, useRef } from 'react';

interface FileClustersSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function FileClustersScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: FileClustersSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const randomRef = useRef(() => seeded(seed));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = randomRef.current();
    const layers = buildLayers(rand);
    let width = 0;
    let height = 0;
    let ratio = 1;
    let running = false;
    let frame = 0;
    let time = 0;
    let assembly = 0;

    const layout = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 400;
      height = canvas.clientHeight || 300;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#08090a';
      ctx.fillRect(0, 0, width, height);

      assembly = Math.min(1, assembly + dt * 0.25);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const px = pointer.active ? pointer.x : cx;
      const py = pointer.active ? pointer.y : cy;

      // Draw field stars
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.4;
        const x = star.x * width + star.driftX * t * width * 1000 * calm;
        const y = star.y * height + star.driftY * t * height * 1000 * calm;
        const twinkle = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.02, Math.min(1, star.alpha + twinkle));
        if (alpha <= 0.03) continue;

        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.violet
          ? `rgba(190,168,224,${alpha})`
          : `rgba(226,224,231,${alpha})`;
        ctx.fill();
      }

      // Draw file tiles
      for (const tile of layers.tiles) {
        const localAssembly = Math.max(0, Math.min(1, (assembly - tile.delay * 0.4) / 0.6));
        const eased = localAssembly * localAssembly * (3 - 2 * localAssembly);

        const tx = cx + (tile.scatterX * (1 - localAssembly) + tile.offsetX * localAssembly) * Math.min(width, height) * 0.35;
        const ty = cy + (tile.scatterY * (1 - localAssembly) + tile.offsetY * localAssembly) * Math.min(width, height) * 0.35;

        // Pointer influence
        const dx = tx - px, dy = ty - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = pointer.active ? Math.max(0, 1 - dist / 120) * 0.25 : 0;
        const fx = tx + (dx / (dist || 1)) * influence * 18;
        const fy = ty + (dy / (dist || 1)) * influence * 18;

        const size = (12 + tile.size * 10) * (0.3 + eased * 0.8);
        const alpha = (0.15 + tile.glow * 0.5) * eased;

        if (alpha <= 0.02) continue;

        // File tile (rounded rect)
        const r = 3;
        ctx.beginPath();
        ctx.roundRect(fx - size / 2, fy - size / 2, size, size, r);
        ctx.fillStyle = tile.folder
          ? `rgba(161,138,203,${0.18 * alpha})`
          : `rgba(232,229,238,${alpha})`;
        ctx.fill();

        // Folder indicator
        if (tile.folder && eased > 0.5) {
          ctx.beginPath();
          ctx.moveTo(fx - size * 0.25, fy - size * 0.15);
          ctx.lineTo(fx - size * 0.1, fy - size * 0.35);
          ctx.lineTo(fx + size * 0.1, fy - size * 0.35);
          ctx.lineTo(fx + size * 0.25, fy - size * 0.15);
          ctx.strokeStyle = `rgba(161,138,203,${0.4 * alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Storage bands (horizontal bands representing storage volumes)
      if (assembly > 0.5) {
        const bandAssembly = Math.min(1, (assembly - 0.5) * 2);
        const bandCount = 3;
        for (let b = 0; b < bandCount; b++) {
          const by = cy + (b - 1) * 70;
          const bw = Math.min(width, height) * 0.5 * (0.4 + bandAssembly * 0.6);
          ctx.beginPath();
          ctx.roundRect(cx - bw / 2, by - 8, bw, 16, 4);
          ctx.fillStyle = `rgba(161,138,203,${0.06 * bandAssembly})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(161,138,203,${0.15 * bandAssembly})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    };

    const tick = (timestamp: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (timestamp - time) / 1000);
      time = timestamp;
      draw(time, dt);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      time = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onResize = () => {
      layout();
      if (reduced) draw(0, 0);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    layout();
    if (reduced) {
      draw(0, 0);
    } else {
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);
      start();
    }

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [seed, reduced, pointer.x, pointer.y, pointer.active]);

  return <canvas className={className} ref={canvasRef} aria-hidden="true" />;
}

function seeded(seed: number) {
  let state = (seed + 0x6d2b79f5) | 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number; y: number; radius: number; alpha: number;
  amplitude: number; speed: number; phase: number;
  layer: 'far' | 'mid' | 'near'; violet: boolean;
  driftX: number; driftY: number;
}

interface Tile {
  offsetX: number; offsetY: number;
  scatterX: number; scatterY: number;
  delay: number; size: number; glow: number; folder: boolean;
}

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const layers: { layer: 'far' | 'mid' | 'near'; share: number; radius: number; alpha: number; twinkle: number }[] = [
    { layer: 'far', share: 0.56, radius: 0.5, alpha: 0.3, twinkle: 0.16 },
    { layer: 'mid', share: 0.33, radius: 0.85, alpha: 0.55, twinkle: 0.24 },
    { layer: 'near', share: 0.11, radius: 1.35, alpha: 0.82, twinkle: 0.3 },
  ];
  const VIOLET_RATIO = 0.05;
  const count = 90;
  for (const plan of layers) {
    const total = Math.max(1, Math.round(count * plan.share));
    for (let i = 0; i < total; i++) {
      stars.push({
        x: rand(), y: Math.sqrt(rand()),
        radius: (plan.radius * (0.7 + rand() * 0.6)) / 1.6,
        alpha: plan.alpha * (0.6 + rand() * 0.4),
        amplitude: plan.twinkle * (0.5 + rand()),
        speed: 0.9 + rand() * 0.95,
        phase: rand() * Math.PI * 2,
        layer: plan.layer,
        violet: rand() < VIOLET_RATIO,
        driftX: (rand() - 0.5) * 0.0016,
        driftY: (rand() - 0.5) * 0.0011,
      });
    }
  }

  const tiles: Tile[] = [];
  const tileCount = 24;
  for (let i = 0; i < tileCount; i++) {
    const isFolder = i < 6 || rand() < 0.2;
    const angle = (i / tileCount) * Math.PI * 2 * 1.618; // Golden angle for organic distribution
    const ring = 0.2 + (i % 4) * 0.2;
    tiles.push({
      offsetX: Math.cos(angle) * ring,
      offsetY: Math.sin(angle) * ring,
      scatterX: (rand() - 0.5) * 2.5,
      scatterY: (rand() - 0.5) * 2.5,
      delay: rand() * 0.6,
      size: 0.4 + rand() * 0.7,
      glow: 0.2 + rand() * 0.7,
      folder: isFolder,
    });
  }

  return { stars, tiles };
}