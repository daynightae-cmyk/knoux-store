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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = seeded(seed);
    const graph = buildGraph(rand);
    let width = 0;
    let height = 0;
    let ratio = 1;
    let running = false;
    let frame = 0;
    let time = 0;
    let assembly = 0;
    let lastTs = 0;
    // Propagation trace state (deterministic cycling)
    let traceEdgeIdx = 0;
    let traceProgress = 0;
    let traceTimer = 0;

    const layout = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 400;
      height = canvas.clientHeight || 300;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Draw a rectangular node (like a code module / repo file)
    const drawRepoNode = (
      x: number, y: number, w: number, h: number,
      alpha: number, isRegistry: boolean, hasLines: boolean
    ) => {
      const r = 3;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
      if (isRegistry) {
        ctx.fillStyle = `rgba(161,138,203,${0.14 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(161,138,203,${0.55 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(232,229,238,${0.05 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(232,229,238,${0.28 * alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Code lines inside node
      if (hasLines && alpha > 0.3) {
        const lineCount = 3;
        const lw = w * 0.6;
        const lh = h / (lineCount + 1);
        for (let i = 0; i < lineCount; i++) {
          const lineW = lw * (0.5 + 0.5 * ((i + seed) % 3) / 3);
          const ly = y - h / 2 + lh * (i + 1);
          ctx.beginPath();
          ctx.moveTo(x - lineW / 2, ly);
          ctx.lineTo(x + lineW / 2, ly);
          ctx.strokeStyle = isRegistry
            ? `rgba(178,150,214,${0.35 * alpha})`
            : `rgba(232,229,238,${0.2 * alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#08090a';
      ctx.fillRect(0, 0, width, height);

      assembly = Math.min(1, assembly + dt * 0.22);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height) * 0.38;

      // Subtle star field
      for (const star of graph.stars) {
        const calm = 1 - assembly * 0.5;
        const sx = star.x * width + star.driftX * t * width * 600 * calm;
        const sy = star.y * height + star.driftY * t * height * 600 * calm;
        const tw = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.01, Math.min(0.5, star.alpha + tw));
        if (alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,224,231,${alpha})`;
        ctx.fill();
      }

      // Compute node positions (left-to-right dag layout)
      const positions: { x: number; y: number; assembly: number }[] = [];
      for (const node of graph.nodes) {
        const localA = Math.max(0, Math.min(1, (assembly - node.delay * 0.5) / 0.55));
        const eased = localA * localA * (3 - 2 * localA);
        const finalX = cx + node.layoutX * scale;
        const finalY = cy + node.layoutY * scale;
        const startX = cx + node.scatterX * scale * 0.9;
        const startY = cy + node.scatterY * scale * 0.9;
        positions.push({
          x: startX + (finalX - startX) * eased,
          y: startY + (finalY - startY) * eased,
          assembly: eased,
        });
      }

      // Draw edges (dependency lines with arrow tip)
      if (assembly > 0.12) {
        for (let e = 0; e < graph.edges.length; e++) {
          const edge = graph.edges[e];
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) continue;
          const fromA = from.assembly;
          const toA = to.assembly;
          const edgeA = Math.min(fromA, toA);
          if (edgeA < 0.08) continue;

          const eased = edgeA * edgeA * (3 - 2 * edgeA);

          // Pointer mid influence
          const mx = (from.x + to.x) * 0.5;
          const my = (from.y + to.y) * 0.5;
          const edx = mx - (pointer.active ? pointer.x : cx);
          const edy = my - (pointer.active ? pointer.y : cy);
          const edist = Math.sqrt(edx * edx + edy * edy);
          const einfl = pointer.active ? Math.max(0, 1 - edist / 160) * 0.08 : 0;
          const ex = mx + (edx / (edist || 1)) * einfl * 12;
          const ey = my + (edy / (edist || 1)) * einfl * 12;

          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(ex, ey, to.x, to.y);
          ctx.strokeStyle = `rgba(161,138,203,${0.14 * eased})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Branch diverge visual at fork nodes
          if (edge.isBranch && eased > 0.5) {
            const bAlpha = 0.18 * eased;
            ctx.beginPath();
            ctx.arc(from.x, from.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(178,150,214,${bAlpha})`;
            ctx.fill();
          }
        }
      }

      // Trace propagation (build pipeline dot travelling edges)
      if (assembly > 0.7 && graph.edges.length > 0) {
        traceTimer += dt;
        const TRACE_DURATION = 0.9; // seconds per edge
        traceProgress = (traceTimer % TRACE_DURATION) / TRACE_DURATION;
        if (traceTimer > TRACE_DURATION) {
          traceTimer = traceTimer % TRACE_DURATION;
          traceEdgeIdx = (traceEdgeIdx + 1) % graph.traceEdges.length;
        }

        const tei = graph.traceEdges[traceEdgeIdx];
        if (tei !== undefined) {
          const edge = graph.edges[tei];
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (from && to) {
            const tp = traceProgress;
            const tx = from.x + (to.x - from.x) * tp;
            const ty = from.y + (to.y - from.y) * tp;
            const traceAlpha = Math.min(1, assembly * 2 - 1) * 0.9;

            // Glow
            const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 8);
            grad.addColorStop(0, `rgba(169,209,142,${0.8 * traceAlpha})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(169,209,142,${traceAlpha})`;
            ctx.fill();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i];
        const pos = positions[i];
        if (!pos || pos.assembly < 0.05) continue;

        const eased = pos.assembly;

        // Pointer influence
        const dx = pos.x - (pointer.active ? pointer.x : cx);
        const dy = pos.y - (pointer.active ? pointer.y : cy);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const infl = pointer.active ? Math.max(0, 1 - dist / 160) * 0.3 : 0;
        const fx = pos.x + (dx / (dist || 1)) * infl * 18;
        const fy = pos.y + (dy / (dist || 1)) * infl * 18;

        const nw = (28 + node.size * 18) * (0.4 + eased * 0.8);
        const nh = (16 + node.size * 8) * (0.4 + eased * 0.8);
        const alpha = (0.4 + node.glow * 0.5) * eased;

        // Glow for registry
        if (node.isRegistry && eased > 0.4) {
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, nw);
          g.addColorStop(0, `rgba(161,138,203,${0.15 * eased})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(fx, fy, nw, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }

        drawRepoNode(fx, fy, nw, nh, alpha, node.isRegistry, eased > 0.5);
      }

      // Central registry label ring
      if (assembly > 0.5) {
        const cA = Math.min(1, (assembly - 0.5) * 2);
        const centralPos = positions[0];
        if (centralPos) {
          const pulse = 1 + Math.sin(t * 2.2) * 0.05 * cA;
          ctx.beginPath();
          ctx.arc(centralPos.x, centralPos.y, 22 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(161,138,203,${0.3 * cA})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    const tick = (timestamp: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (timestamp - lastTs) / 1000);
      lastTs = timestamp;
      time = timestamp / 1000;
      draw(time, dt);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      lastTs = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onResize = () => { layout(); if (reduced) draw(0, 0); };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };

    layout();
    if (reduced) { assembly = 1; draw(0, 0); }
    else {
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
  violet: boolean; driftX: number; driftY: number;
}
interface RepoNode {
  layoutX: number; layoutY: number;
  scatterX: number; scatterY: number;
  delay: number; size: number; glow: number;
  isRegistry: boolean;
}
interface Edge { from: number; to: number; isBranch: boolean; }

function buildGraph(rand: () => number) {
  // Stars
  const stars: Star[] = [];
  const count = 70;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(), y: rand(),
      radius: 0.3 + rand() * 0.7,
      alpha: 0.1 + rand() * 0.25,
      amplitude: 0.06 + rand() * 0.12,
      speed: 0.7 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
      violet: false,
      driftX: (rand() - 0.5) * 0.001,
      driftY: (rand() - 0.5) * 0.0007,
    });
  }

  // DAG nodes — left-to-right dependency graph
  // Col 0: central registry (1 node)
  // Col 1: two main branches
  // Col 2: sub-branches per branch (2 each = 4)
  // Col 3: leaf nodes (3 per sub = 8 but we do 6)
  // Plus 2 inline dependency nodes near center
  const nodeLayouts = [
    // Col 0 — registry
    { x: -0.8, y: 0.0, isRegistry: true },
    // Col 1 — main branches
    { x: -0.3, y: -0.45, isRegistry: false },
    { x: -0.3, y: 0.45, isRegistry: false },
    // Col 2 — sub-branches
    { x: 0.2, y: -0.7, isRegistry: false },
    { x: 0.2, y: -0.2, isRegistry: false },
    { x: 0.2, y: 0.2, isRegistry: false },
    { x: 0.2, y: 0.7, isRegistry: false },
    // Col 3 — leaves
    { x: 0.72, y: -0.82, isRegistry: false },
    { x: 0.72, y: -0.5, isRegistry: false },
    { x: 0.72, y: -0.15, isRegistry: false },
    { x: 0.72, y: 0.15, isRegistry: false },
    { x: 0.72, y: 0.5, isRegistry: false },
    { x: 0.72, y: 0.82, isRegistry: false },
    // Inline deps (horizontal near center)
    { x: -0.55, y: 0.0, isRegistry: false },
    { x: -0.05, y: 0.0, isRegistry: false },
  ];

  const nodes: RepoNode[] = nodeLayouts.map((l) => ({
    layoutX: l.x,
    layoutY: l.y,
    scatterX: (rand() - 0.5) * 1.8,
    scatterY: (rand() - 0.5) * 1.8,
    delay: Math.abs(l.x + 0.8) * 0.6 + rand() * 0.2, // delay by column
    size: 0.4 + rand() * 0.7,
    glow: 0.3 + rand() * 0.6,
    isRegistry: l.isRegistry,
  }));

  // Edges
  const edges: Edge[] = [
    // Registry → branches
    { from: 0, to: 1, isBranch: true },
    { from: 0, to: 2, isBranch: true },
    // Branches → sub
    { from: 1, to: 3, isBranch: true },
    { from: 1, to: 4, isBranch: false },
    { from: 2, to: 5, isBranch: false },
    { from: 2, to: 6, isBranch: true },
    // Sub → leaves
    { from: 3, to: 7, isBranch: false },
    { from: 3, to: 8, isBranch: false },
    { from: 4, to: 9, isBranch: false },
    { from: 5, to: 10, isBranch: false },
    { from: 6, to: 11, isBranch: false },
    { from: 6, to: 12, isBranch: false },
    // Inline deps
    { from: 0, to: 13, isBranch: false },
    { from: 13, to: 14, isBranch: false },
    { from: 14, to: 1, isBranch: false },
  ].filter((e) => e.from < nodes.length && e.to < nodes.length);

  // Trace edges: the pipeline trace goes along the main dependency chain
  const traceEdges = [0, 2, 6, 7, 1, 4, 9].filter((i) => i < edges.length);

  return { stars, nodes, edges, traceEdges };
}