'use client';

import { useEffect, useRef } from 'react';

interface DiagnosticRingsSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function DiagnosticRingsScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: DiagnosticRingsSceneProps) {
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
    let scanPhase = 0;

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

      assembly = Math.min(1, assembly + dt * 0.2);
      scanPhase = (scanPhase + dt * 0.5) % (Math.PI * 2);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const px = pointer.active ? pointer.x : cx;
      const py = pointer.active ? pointer.y : cy;

      // Draw field stars
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.3;
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

      // Draw diagnostic rings
      const ringCount = 5;
      for (let r = 0; r < ringCount; r++) {
        const ringAssembly = Math.max(0, Math.min(1, (assembly - r * 0.15) / 0.7));
        if (ringAssembly <= 0) continue;

        const eased = ringAssembly * ringAssembly * (3 - 2 * ringAssembly);
        const baseRadius = 30 + r * 35;
        const radius = baseRadius * (0.3 + eased * 0.9);

        // Ring scan arc
        const scanStart = scanPhase - Math.PI / 3;
        const scanEnd = scanPhase + Math.PI / 3;
        const scanProgress = ringAssembly;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.08 * eased})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Active scan arc
        if (scanProgress > 0.3) {
          const scanAlpha = 0.4 * scanProgress * Math.abs(Math.sin(scanPhase * 2));
          ctx.beginPath();
          ctx.arc(cx, cy, radius, scanStart, scanEnd);
          ctx.strokeStyle = `rgba(169,209,142,${scanAlpha})`; // signal-green for scan
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Tool sectors on rings
        if (eased > 0.5) {
          const sectorCount = 6 + r * 2;
          for (let s = 0; s < sectorCount; s++) {
            const angle = (s / sectorCount) * Math.PI * 2;
            const sectorAssembly = Math.max(0, Math.min(1, (ringAssembly - s * 0.05) / 0.8));
            if (sectorAssembly < 0.2) continue;

            const sa = sectorAssembly * sectorAssembly;
            const sx = cx + Math.cos(angle) * radius;
            const sy = cy + Math.sin(angle) * radius;

            // Pointer influence
            const dx = sx - px, dy = sy - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influence = pointer.active ? Math.max(0, 1 - dist / 150) * 0.2 : 0;
            const fx = sx + (dx / (dist || 1)) * influence * 15;
            const fy = sy + (dy / (dist || 1)) * influence * 15;

            const sr = 3 + sectorAssembly * 4;
            ctx.beginPath();
            ctx.arc(fx, fy, sr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,229,238,${0.4 * sa})`;
            ctx.fill();
          }
        }
      }

      // Central diagnostic core
      if (assembly > 0.4) {
        const coreAssembly = Math.min(1, (assembly - 0.4) * 2);
        const pulse = 1 + Math.sin(t * 1.8) * 0.06 * coreAssembly;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(169,209,142,${0.15 * coreAssembly})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(169,209,142,${0.35 * coreAssembly})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Bounded scan arcs (outer diagnostic boundary)
      if (assembly > 0.6) {
        const outerAssembly = Math.min(1, (assembly - 0.6) * 2.5);
        for (let a = 0; a < 3; a++) {
          const arcAngle = a * Math.PI * 2 / 3 + t * 0.3;
          const arcRadius = Math.min(width, height) * 0.45;
          ctx.beginPath();
          ctx.arc(cx, cy, arcRadius, arcAngle - 0.4, arcAngle + 0.4);
          ctx.strokeStyle = `rgba(161,138,203,${0.12 * outerAssembly})`;
          ctx.lineWidth = 1.5;
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

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const layers: { layer: 'far' | 'mid' | 'near'; share: number; radius: number; alpha: number; twinkle: number }[] = [
    { layer: 'far', share: 0.56, radius: 0.5, alpha: 0.3, twinkle: 0.16 },
    { layer: 'mid', share: 0.33, radius: 0.85, alpha: 0.55, twinkle: 0.24 },
    { layer: 'near', share: 0.11, radius: 1.35, alpha: 0.82, twinkle: 0.3 },
  ];
  const VIOLET_RATIO = 0.05;
  const count = 80;
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
  return { stars };
}