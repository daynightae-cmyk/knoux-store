'use client';

import { useEffect, useRef } from 'react';

interface RepositoryTopologySceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function RepositoryTopologyScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: RepositoryTopologySceneProps) {
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

      // Draw dependency edges first (behind nodes)
      if (assembly > 0.15) {
        for (const edge of layers.edges) {
          const from = layers.nodes[edge.from];
          const to = layers.nodes[edge.to];
          if (!from || !to) continue;

          const fromAssembly = Math.max(0, Math.min(1, (assembly - from.delay * 0.5) / 0.5));
          const toAssembly = Math.max(0, Math.min(1, (assembly - to.delay * 0.5) / 0.5));
          const edgeAssembly = Math.min(fromAssembly, toAssembly);
          if (edgeAssembly < 0.1) continue;

          const eased = edgeAssembly * edgeAssembly * (3 - 2 * edgeAssembly);

          const fx = cx + (from.scatterX * (1 - fromAssembly) + from.offsetX * fromAssembly) * Math.min(width, height) * 0.4;
          const fy = cy + (from.scatterY * (1 - fromAssembly) + from.offsetY * fromAssembly) * Math.min(width, height) * 0.4;
          const tx = cx + (to.scatterX * (1 - toAssembly) + to.offsetX * toAssembly) * Math.min(width, height) * 0.4;
          const ty = cy + (to.scatterY * (1 - toAssembly) + to.offsetY * toAssembly) * Math.min(width, height) * 0.4;

          // Pointer influence on edge midpoint
          const mx = (fx + tx) * 0.5;
          const my = (fy + ty) * 0.5;
          const edx = mx - px, edy = my - py;
          const edist = Math.sqrt(edx * edx + edy * edy);
          const einfluence = pointer.active ? Math.max(0, 1 - edist / 180) * 0.15 : 0;
          const ex = mx + (edx / (edist || 1)) * einfluence * 20;
          const ey = my + (edy / (edist || 1)) * einfluence * 20;

          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.quadraticCurveTo(ex, ey, tx, ty);
          ctx.strokeStyle = `rgba(161,138,203,${0.12 * eased})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Draw nodes (repositories)
      for (const node of layers.nodes) {
        const localAssembly = Math.max(0, Math.min(1, (assembly - node.delay * 0.5) / 0.5));
        const eased = localAssembly * localAssembly * (3 - 2 * localAssembly);

        const x = cx + (node.scatterX * (1 - localAssembly) + node.offsetX * localAssembly) * Math.min(width, height) * 0.4;
        const y = cy + (node.scatterY * (1 - localAssembly) + node.offsetY * localAssembly) * Math.min(width, height) * 0.4;

        // Pointer influence
        const dx = x - px, dy = y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = pointer.active ? Math.max(0, 1 - dist / 180) * 0.4 : 0;
        const fx = x + (dx / (dist || 1)) * influence * 25;
        const fy = y + (dy / (dist || 1)) * influence * 25;

        const radius = (3 + node.size * 5) * (0.4 + eased * 0.9);
        const alpha = (0.12 + node.glow * 0.5) * eased;

        if (alpha <= 0.02) continue;

        // Node glow
        if (eased > 0.3) {
          const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, radius * 2.5);
          grad.addColorStop(0, node.violet ? `rgba(178,150,214,${0.15 * eased})` : `rgba(232,229,238,${0.1 * eased})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(fx, fy, radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.violet
          ? `rgba(178,150,214,${alpha})`
          : `rgba(232,229,238,${alpha})`;
        ctx.fill();

        // Code plane indicator
        if (eased > 0.6 && node.plane) {
          ctx.strokeStyle = `rgba(161,138,203,${0.15 * eased})`;
          ctx.lineWidth = 0.5;
          for (let p = 0; p < 3; p++) {
            const py = fy - radius * 0.8 + (p * radius * 0.8);
            ctx.beginPath();
            ctx.moveTo(fx - radius * 0.7, py);
            ctx.lineTo(fx + radius * 0.7, py);
            ctx.stroke();
          }
        }
      }

      // Central registry node
      if (assembly > 0.3) {
        const coreAssembly = Math.min(1, (assembly - 0.3) * 1.5);
        const pulse = 1 + Math.sin(t * 2) * 0.08 * coreAssembly;
        ctx.beginPath();
        ctx.arc(cx, cy, 16 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(161,138,203,${0.12 * coreAssembly})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(161,138,203,${0.3 * coreAssembly})`;
        ctx.lineWidth = 1.5;
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
  delay: number; size: number; glow: number; violet: boolean; plane: boolean;
}

interface Edge { from: number; to: number; }

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const layers: { layer: 'far' | 'mid' | 'near'; share: number; radius: number; alpha: number; twinkle: number }[] = [
    { layer: 'far', share: 0.56, radius: 0.5, alpha: 0.3, twinkle: 0.16 },
    { layer: 'mid', share: 0.33, radius: 0.85, alpha: 0.55, twinkle: 0.24 },
    { layer: 'near', share: 0.11, radius: 1.35, alpha: 0.82, twinkle: 0.3 },
  ];
  const VIOLET_RATIO = 0.05;
  const count = 100;
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
  const nodeCount = 16;
  // Create a branching topology
  const positions = [
    { x: 0, y: 0 }, // central registry
    { x: -0.6, y: -0.4 }, { x: 0.6, y: -0.4 }, // main branches
    { x: -1.0, y: -0.7 }, { x: -0.3, y: -0.7 }, { x: 0.3, y: -0.7 }, { x: 1.0, y: -0.7 }, // sub-branches
    { x: -0.6, y: 0.4 }, { x: 0.6, y: 0.4 }, // lower branches
    { x: -1.0, y: 0.7 }, { x: -0.3, y: 0.7 }, { x: 0.3, y: 0.7 }, { x: 1.0, y: 0.7 },
    { x: -0.2, y: 0.0 }, { x: 0.2, y: 0.0 }, // inline deps
  ];

  for (let i = 0; i < nodeCount; i++) {
    const pos = positions[i] ?? { x: (rand() - 0.5) * 2, y: (rand() - 0.5) * 2 };
    nodes.push({
      offsetX: pos.x,
      offsetY: pos.y,
      scatterX: (rand() - 0.5) * 2,
      scatterY: (rand() - 0.5) * 2,
      delay: rand() * 0.7,
      size: 0.4 + rand() * 0.8,
      glow: 0.2 + rand() * 0.7,
      violet: rand() < 0.08,
      plane: rand() < 0.4,
    });
  }

  const edges: Edge[] = [
    { from: 0, to: 1 }, { from: 0, to: 2 },
    { from: 1, to: 3 }, { from: 1, to: 4 }, { from: 2, to: 5 }, { from: 2, to: 6 },
    { from: 0, to: 7 }, { from: 0, to: 8 },
    { from: 7, to: 9 }, { from: 7, to: 10 }, { from: 8, to: 11 }, { from: 8, to: 12 },
    { from: 0, to: 13 }, { from: 0, to: 14 }, { from: 0, to: 15 },
  ].filter(e => e.from < nodeCount && e.to < nodeCount);

  return { stars, nodes, edges };
}