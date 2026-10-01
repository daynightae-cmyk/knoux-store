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
    let lastTs = 0;
    // Which ring the scan is on (cycles 0 → 2 → 0)
    let scanRingIdx = 0;
    let scanAngle = 0;

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

      assembly = Math.min(1, assembly + dt * 0.18);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height) * 0.42;

      // Star field (very sparse for this dense scene)
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.5;
        const sx = star.x * width + star.driftX * t * width * 500 * calm;
        const sy = star.y * height + star.driftY * t * height * 500 * calm;
        const tw = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.01, Math.min(0.4, star.alpha + tw));
        if (alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,224,231,${alpha})`;
        ctx.fill();
      }

      // Update scan sweep (per ring, cycles through rings)
      if (assembly > 0.3) {
        const SWEEP_SPEED = 1.8; // radians/sec
        scanAngle += dt * SWEEP_SPEED;
        if (scanAngle >= Math.PI * 2) {
          scanAngle -= Math.PI * 2;
          scanRingIdx = (scanRingIdx + 1) % 3;
        }
      }

      // Three diagnostic rings — each represents a risk class
      // Ring 0 (inner): READ_ONLY tools
      // Ring 1 (mid): SAFE_CLEANUP tools
      // Ring 2 (outer): SYSTEM_REPAIR tools
      const ringDefs = [
        { radiusFactor: 0.24, sectorCount: 8, color: [161, 138, 203], label: 'READ_ONLY', alpha: 0.1 },
        { radiusFactor: 0.46, sectorCount: 12, color: [169, 209, 142], label: 'SAFE_CLEANUP', alpha: 0.08 },
        { radiusFactor: 0.72, sectorCount: 18, color: [161, 138, 203], label: 'SYSTEM_REPAIR', alpha: 0.06 },
      ];

      for (let r = 0; r < 3; r++) {
        const ringAssembly = Math.max(0, Math.min(1, (assembly - r * 0.2) / 0.65));
        if (ringAssembly <= 0) continue;

        const eased = ringAssembly * ringAssembly * (3 - 2 * ringAssembly);
        const def = ringDefs[r];
        const [cr, cg, cb] = def.color;
        const radius = scale * def.radiusFactor * (0.3 + eased * 0.9);

        // Base ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${def.alpha * eased})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Sector dots on ring
        if (eased > 0.4) {
          for (let s = 0; s < def.sectorCount; s++) {
            const angle = (s / def.sectorCount) * Math.PI * 2;
            const sAssembly = Math.max(0, Math.min(1, (eased - s * (0.7 / def.sectorCount)) / 0.6));
            if (sAssembly < 0.1) continue;

            const sx2 = cx + Math.cos(angle) * radius;
            const sy2 = cy + Math.sin(angle) * radius;

            // Pointer influence
            const dx = sx2 - (pointer.active ? pointer.x : cx);
            const dy = sy2 - (pointer.active ? pointer.y : cy);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const infl = pointer.active ? Math.max(0, 1 - dist / 140) * 0.15 : 0;
            const fx = sx2 + (dx / (dist || 1)) * infl * 10;
            const fy = sy2 + (dy / (dist || 1)) * infl * 10;

            // Fault sector: sectors 2-3 on ring 1 (SAFE_CLEANUP) = amber
            const isFault = r === 1 && (s === 2 || s === 3);
            const isResolved = isFault && assembly > 0.75;

            let dotColor: string;
            if (isResolved) {
              dotColor = `rgba(169,209,142,${0.55 * sAssembly})`;
            } else if (isFault) {
              const faultPulse = 0.3 + 0.3 * Math.sin(t * 4 + s);
              dotColor = `rgba(200,170,100,${faultPulse * sAssembly})`;
            } else {
              dotColor = `rgba(${cr},${cg},${cb},${0.35 * sAssembly})`;
            }

            const dotR = 2.5 + sAssembly * 1.5;
            ctx.beginPath();
            ctx.arc(fx, fy, dotR, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();
          }
        }

        // Scan arc — only on the active scan ring
        if (scanRingIdx === r && assembly > 0.3) {
          const sweepSpan = Math.PI / 2.5;
          const arcA = Math.min(1, (assembly - 0.3) * 2);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, scanAngle - sweepSpan / 2, scanAngle + sweepSpan / 2);
          const [scr, scg, scb] = def.color;
          ctx.strokeStyle = `rgba(${scr},${scg},${scb},${0.45 * arcA * eased})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Scan head glow
          const hx = cx + Math.cos(scanAngle) * radius;
          const hy = cy + Math.sin(scanAngle) * radius;
          const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12);
          grad.addColorStop(0, `rgba(${scr},${scg},${scb},${0.5 * arcA})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(hx, hy, 12, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // Outer boundary arcs (3 rotating partial arcs = DESTRUCTIVE boundary)
      if (assembly > 0.65) {
        const outerA = Math.min(1, (assembly - 0.65) * 3);
        const outerRadius = scale * 0.9;
        for (let a = 0; a < 3; a++) {
          const arcAngle = (a / 3) * Math.PI * 2 + t * 0.18;
          ctx.beginPath();
          ctx.arc(cx, cy, outerRadius, arcAngle, arcAngle + 0.5);
          ctx.strokeStyle = `rgba(161,138,203,${0.1 * outerA})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Central diagnostic core — 18 micro rings (service categories)
      if (assembly > 0.2) {
        const coreA = Math.min(1, (assembly - 0.2) * 2);
        const pulse = 1 + Math.sin(t * 2.2) * 0.05 * coreA;
        const coreR = 10 * pulse;

        // Inner fill
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(169,209,142,${0.12 * coreA})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(169,209,142,${0.4 * coreA})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Micro concentric rings representing 18 service categories
        for (let i = 0; i < 4; i++) {
          const mr = coreR * (1.5 + i * 0.6);
          const ma = Math.max(0, coreA - i * 0.18);
          ctx.beginPath();
          ctx.arc(cx, cy, mr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(161,138,203,${0.12 * ma})`;
          ctx.lineWidth = 0.5;
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

    const stop = () => { running = false; cancelAnimationFrame(frame); };
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
  driftX: number; driftY: number;
}

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const count = 55;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(), y: rand(),
      radius: 0.3 + rand() * 0.55,
      alpha: 0.08 + rand() * 0.18,
      amplitude: 0.04 + rand() * 0.1,
      speed: 0.6 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * 0.0008,
      driftY: (rand() - 0.5) * 0.0006,
    });
  }
  return { stars };
}