'use client';

import { useEffect, useRef } from 'react';

interface SystemNucleusSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function SystemNucleusScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: SystemNucleusSceneProps) {
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

      assembly = Math.min(1, assembly + dt * 0.3);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const px = pointer.active ? pointer.x : cx;
      const py = pointer.active ? pointer.y : cy;

      // Draw field stars
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.5;
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

      // Draw modular nodes (system nucleus)
      for (const node of layers.nodes) {
        const localAssembly = Math.max(0, Math.min(1, (assembly - node.delay * 0.6) / 0.5));
        const eased = localAssembly * localAssembly * (3 - 2 * localAssembly);

        const scatterX = cx + (node.scatterX * (1 - eased) + node.offsetX * eased) * Math.min(width, height) * 0.35;
        const scatterY = cy + (node.scatterY * (1 - eased) + node.offsetY * eased) * Math.min(width, height) * 0.35;

        // Pointer influence
        let dx = scatterX - px;
        let dy = scatterY - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = pointer.active ? Math.max(0, 1 - dist / 200) * 0.3 : 0;
        if (influence > 0) {
          dx = dx / dist;
          dy = dy / dist;
        }

        const x = scatterX + dx * influence * 30;
        const y = scatterY + dy * influence * 30;

        const radius = (4 + node.size * 6) * (0.5 + eased * 0.8);
        const alpha = (0.15 + node.glow * 0.6) * eased;

        if (alpha <= 0.02) continue;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        const color = node.violet
          ? `rgba(178,150,214,${alpha})`
          : `rgba(232,229,238,${alpha})`;
        ctx.fillStyle = color;
        ctx.fill();

        // Connection lines to center for service shells
        if (eased > 0.3 && node.shell) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `rgba(161,138,203,${0.08 * eased})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Central nucleus
      if (assembly > 0.2) {
        const coreAlpha = Math.min(1, (assembly - 0.2) * 2);
        const pulse = 1 + Math.sin(t * 1.5) * 0.05 * coreAlpha;
        ctx.beginPath();
        ctx.arc(cx, cy, 12 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(161,138,203,${0.15 * coreAlpha})`;
        ctx.fill();

        // Core ring
        ctx.beginPath();
        ctx.arc(cx, cy, 24 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.25 * coreAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
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

interface Node {
  offsetX: number; offsetY: number;
  scatterX: number; scatterY: number;
  delay: number; size: number; glow: number; violet: boolean; shell: boolean;
}

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const layers: { layer: 'far' | 'mid' | 'near'; share: number; radius: number; alpha: number; twinkle: number }[] = [
    { layer: 'far', share: 0.56, radius: 0.5, alpha: 0.3, twinkle: 0.16 },
    { layer: 'mid', share: 0.33, radius: 0.85, alpha: 0.55, twinkle: 0.24 },
    { layer: 'near', share: 0.11, radius: 1.35, alpha: 0.82, twinkle: 0.3 },
  ];
  const VIOLET_RATIO = 0.05;
  const count = 120;
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

  const nodes: Node[] = [];
  const nodeCount = 19; // 19 modules for KNOUX ONE
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const ring = 0.3 + (i % 3) * 0.25;
    const offsetX = Math.cos(angle) * ring;
    const offsetY = Math.sin(angle) * ring;
    nodes.push({
      offsetX, offsetY,
      scatterX: (rand() - 0.5) * 2,
      scatterY: (rand() - 0.5) * 2,
      delay: rand() * 0.8,
      size: 0.5 + rand() * 0.8,
      glow: 0.2 + rand() * 0.7,
      violet: rand() < 0.08,
      shell: i < 6, // Inner shells connect to center
    });
  }

  return { stars, nodes };
}