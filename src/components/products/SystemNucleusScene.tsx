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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = seeded(seed);
    const layers = buildLayers(rand);
    let width = 0;
    let height = 0;
    let ratio = 1;
    let running = false;
    let frame = 0;
    let time = 0;
    let assembly = 0;
    let lastTimestamp = 0;

    const layout = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 400;
      height = canvas.clientHeight || 300;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawHexTile = (x: number, y: number, r: number, alpha: number, isViolet: boolean, isCore: boolean) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      if (isCore) {
        ctx.fillStyle = `rgba(161,138,203,${0.18 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(161,138,203,${0.6 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isViolet) {
        ctx.fillStyle = `rgba(161,138,203,${0.1 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(178,150,214,${0.4 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(232,229,238,${0.06 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(232,229,238,${0.25 * alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);


      assembly = Math.min(1, assembly + dt * 0.28);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height) * 0.42;

      // Draw orbital ring guides
      const rings = [
        { radius: 0.28, alpha: 0.06, dashLen: 4, dashGap: 6 },
        { radius: 0.55, alpha: 0.05, dashLen: 3, dashGap: 8 },
        { radius: 0.85, alpha: 0.035, dashLen: 2, dashGap: 10 },
      ];

      if (assembly > 0.15) {
        const ringAlpha = Math.min(1, (assembly - 0.15) / 0.5);
        for (const ring of rings) {
          ctx.beginPath();
          ctx.setLineDash([ring.dashLen, ring.dashGap]);
          ctx.arc(cx, cy, scale * ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(161,138,203,${ring.alpha * ringAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Outer ring slow rotation angle
      const outerRotation = t * 0.04;

      // Draw mesh connections between same-ring modules
      if (assembly > 0.35) {
        const meshAlpha = Math.min(1, (assembly - 0.35) / 0.5);
        for (const conn of layers.meshConnections) {
          const moduleA = layers.modules[conn.a];
          const moduleB = layers.modules[conn.b];
          if (!moduleA || !moduleB) continue;

          const rotA = moduleA.ring === 2 ? outerRotation : 0;
          const rotB = moduleB.ring === 2 ? outerRotation : 0;
          const aAssembly = Math.max(0, Math.min(1, (assembly - moduleA.delay * 0.5) / 0.55));
          const bAssembly = Math.max(0, Math.min(1, (assembly - moduleB.delay * 0.5) / 0.55));
          const edgeA = aAssembly * aAssembly * (3 - 2 * aAssembly);
          const edgeB = bAssembly * bAssembly * (3 - 2 * bAssembly);
          if (edgeA < 0.2 || edgeB < 0.2) continue;

          const angleA = moduleA.angle + rotA;
          const angleB = moduleB.angle + rotB;
          const ax = cx + Math.cos(angleA) * scale * moduleA.ringRadius;
          const ay = cy + Math.sin(angleA) * scale * moduleA.ringRadius;
          const bx = cx + Math.cos(angleB) * scale * moduleB.ringRadius;
          const by = cy + Math.sin(angleB) * scale * moduleB.ringRadius;

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          const edgeWeight = Math.min(edgeA, edgeB) * meshAlpha;
          ctx.strokeStyle = conn.isSpoke
            ? `rgba(161,138,203,${0.12 * edgeWeight})`
            : `rgba(161,138,203,${0.06 * edgeWeight})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw modules
      for (const mod of layers.modules) {
        const localAssembly = Math.max(0, Math.min(1, (assembly - mod.delay * 0.55) / 0.5));
        const eased = localAssembly * localAssembly * (3 - 2 * localAssembly);
        if (eased < 0.01) continue;

        const rot = mod.ring === 2 ? outerRotation : 0;
        const angle = mod.angle + rot;

        const scatterAngle = mod.scatterAngle;
        const scatterRadius = mod.scatterRadius;
        const finalX = cx + Math.cos(angle) * scale * mod.ringRadius;
        const finalY = cy + Math.sin(angle) * scale * mod.ringRadius;
        const scatterX = cx + Math.cos(scatterAngle) * scatterRadius * scale * 0.9;
        const scatterY = cy + Math.sin(scatterAngle) * scatterRadius * scale * 0.9;

        const mx = scatterX + (finalX - scatterX) * eased;
        const my = scatterY + (finalY - scatterY) * eased;

        // Pointer influence
        const dx = mx - (pointer.active ? pointer.x : cx);
        const dy = my - (pointer.active ? pointer.y : cy);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const infl = pointer.active ? Math.max(0, 1 - dist / 180) * 0.25 : 0;
        const fx = mx + (dx / (dist || 1)) * infl * 22;
        const fy = my + (dy / (dist || 1)) * infl * 22;

        const tileR = (6 + mod.size * 7) * (0.4 + eased * 0.85);
        const tileAlpha = (0.4 + mod.glow * 0.6) * eased;

        drawHexTile(fx, fy, tileR, tileAlpha, mod.isViolet, mod.ring === 0);

        // Planned modules (ring 2, lower alpha, dashed border)
        if (mod.ring === 2 && eased > 0.5) {
          ctx.beginPath();
          ctx.setLineDash([2, 3]);
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const px = fx + Math.cos(a) * (tileR * 1.4);
            const py = fy + Math.sin(a) * (tileR * 1.4);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(161,138,203,${0.08 * eased})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Central nucleus — K-mark cross geometry
      if (assembly > 0.25) {
        const coreA = Math.min(1, (assembly - 0.25) * 2);
        const pulse = 1 + Math.sin(t * 1.8) * 0.04 * coreA;
        const cr = 18 * pulse;

        // Inner hex
        drawHexTile(cx, cy, cr, coreA, true, true);

        // Core glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 3);
        grad.addColorStop(0, `rgba(161,138,203,${0.2 * coreA})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Pulse ring
        const pRad = 36 * pulse;
        ctx.beginPath();
        ctx.arc(cx, cy, pRad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.2 * coreA * (0.5 + 0.5 * Math.sin(t * 2.5))})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const tick = (timestamp: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      time = timestamp / 1000;
      draw(time, dt);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      lastTimestamp = performance.now();
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
      assembly = 1;
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


interface Module {
  angle: number;
  ringRadius: number;
  ring: 0 | 1 | 2; // 0=core, 1=service, 2=planned
  scatterAngle: number;
  scatterRadius: number;
  delay: number;
  size: number;
  glow: number;
  isViolet: boolean;
}

interface MeshConnection {
  a: number;
  b: number;
  isSpoke: boolean; // spoke = center to module, false = ring mesh
}

function buildLayers(rand: () => number) {
  // KNOUX ONE: 19 modules across 3 rings
  // Ring 0 (core): 1 center hex (handled separately)
  // Ring 1 (service): 6 modules — the implemented service categories
  // Ring 2 (extended): 12 modules — planned/partial modules
  // But we represent as 3+6+10 for 19 total
  const modules: Module[] = [];
  const meshConnections: MeshConnection[] = [];

  // Ring 0: inner core modules (3 verified service areas at close radius)
  const ring0Count = 3;
  for (let i = 0; i < ring0Count; i++) {
    const angle = (i / ring0Count) * Math.PI * 2 + Math.PI / 6;
    modules.push({
      angle,
      ringRadius: 0.24,
      ring: 0,
      scatterAngle: rand() * Math.PI * 2,
      scatterRadius: rand() * 0.8 + 0.4,
      delay: rand() * 0.3,
      size: 0.7 + rand() * 0.5,
      glow: 0.6 + rand() * 0.4,
      isViolet: true,
    });
  }

  // Ring 1: service shells (6 active modules at mid radius)
  const ring1Count = 6;
  for (let i = 0; i < ring1Count; i++) {
    const angle = (i / ring1Count) * Math.PI * 2 - Math.PI / 8;
    modules.push({
      angle,
      ringRadius: 0.52,
      ring: 1,
      scatterAngle: rand() * Math.PI * 2,
      scatterRadius: rand() * 1.0 + 0.4,
      delay: 0.15 + rand() * 0.45,
      size: 0.5 + rand() * 0.6,
      glow: 0.4 + rand() * 0.4,
      isViolet: rand() < 0.25,
    });
  }

  // Ring 2: outer planned modules (10 modules, planned/partial — lower glow)
  const ring2Count = 10;
  for (let i = 0; i < ring2Count; i++) {
    const angle = (i / ring2Count) * Math.PI * 2 + Math.PI / 5;
    modules.push({
      angle,
      ringRadius: 0.82,
      ring: 2,
      scatterAngle: rand() * Math.PI * 2,
      scatterRadius: rand() * 1.2 + 0.5,
      delay: 0.4 + rand() * 0.6,
      size: 0.3 + rand() * 0.4,
      glow: 0.15 + rand() * 0.2,
      isViolet: false,
    });
  }

  // Mesh: spokes from center (idx -1 means nucleus) to ring0
  for (let i = 0; i < ring0Count; i++) {
    meshConnections.push({ a: i, b: ring0Count + (i % ring1Count), isSpoke: true });
  }
  // Ring0 interconnects
  for (let i = 0; i < ring0Count; i++) {
    meshConnections.push({ a: i, b: (i + 1) % ring0Count, isSpoke: false });
  }
  // Ring0 to Ring1 spokes
  for (let i = 0; i < ring1Count; i++) {
    const coreIdx = i % ring0Count;
    meshConnections.push({ a: coreIdx, b: ring0Count + i, isSpoke: true });
  }
  // Ring1 interconnects
  for (let i = 0; i < ring1Count; i++) {
    meshConnections.push({ a: ring0Count + i, b: ring0Count + ((i + 1) % ring1Count), isSpoke: false });
  }
  // Ring1 to Ring2 spokes
  for (let i = 0; i < ring2Count; i++) {
    const serviceIdx = ring0Count + (i % ring1Count);
    meshConnections.push({ a: serviceIdx, b: ring0Count + ring1Count + i, isSpoke: true });
  }

  return { modules, meshConnections };
}