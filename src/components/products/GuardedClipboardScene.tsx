'use client';

import { useEffect, useRef } from 'react';

interface GuardedClipboardSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function GuardedClipboardScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: GuardedClipboardSceneProps) {
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
    let itemPhase = 0;

    const layout = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 400;
      height = canvas.clientHeight || 300;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Draw a lock/shield icon in canvas (guard indicator)
    const drawShieldLines = (x: number, y: number, size: number, alpha: number) => {
      // Simple shield: a vertical line + two short horizontal lines (representing blocked)
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.5);
      ctx.lineTo(x, y + size * 0.5);
      ctx.strokeStyle = `rgba(239,68,68,${0.6 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - size * 0.4, y - size * 0.1);
      ctx.lineTo(x + size * 0.4, y - size * 0.1);
      ctx.stroke();
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#08090a';
      ctx.fillRect(0, 0, width, height);

      assembly = Math.min(1, assembly + dt * 0.18);
      itemPhase += dt * 0.28;

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height) * 0.4;

      // Sparse stars
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.5;
        const sx = star.x * width + star.driftX * t * width * 400 * calm;
        const sy = star.y * height + star.driftY * t * height * 400 * calm;
        const tw = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.01, Math.min(0.35, star.alpha + tw));
        if (alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,224,231,${alpha})`;
        ctx.fill();
      }

      // PRE-TRANSPORT SCAN — horizontal sweep above the boundary
      if (assembly > 0.15 && assembly < 0.9) {
        const scanA = Math.min(1, (assembly - 0.15) / 0.35);
        const scanY = cy - scale * 0.52 + ((t * 0.4) % 1) * scale * 0.3 * scanA;
        const scanW = scale * 0.38 * scanA;
        ctx.beginPath();
        ctx.moveTo(cx - scanW, scanY);
        ctx.lineTo(cx + scanW, scanY);
        ctx.strokeStyle = `rgba(161,138,203,${0.25 * scanA})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Scan glow
        const scanGrad = ctx.createLinearGradient(cx - scanW, scanY, cx + scanW, scanY);
        scanGrad.addColorStop(0, 'rgba(161,138,203,0)');
        scanGrad.addColorStop(0.5, `rgba(161,138,203,${0.08 * scanA})`);
        scanGrad.addColorStop(1, 'rgba(161,138,203,0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(cx - scanW, scanY - 8, scanW * 2, 16);
      }

      // GUARD BOUNDARY — the central privacy inspection zone
      if (assembly > 0.18) {
        const boundaryA = Math.min(1, (assembly - 0.18) / 0.55);
        const bw = scale * 0.5;
        const bh = scale * 0.36;

        // Outer frame
        ctx.beginPath();
        ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 6);
        ctx.strokeStyle = `rgba(161,138,203,${0.22 * boundaryA})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Corner pulse indicators
        if (boundaryA > 0.5) {
          const corners2 = [
            { x: cx - bw / 2, y: cy - bh / 2 },
            { x: cx + bw / 2, y: cy - bh / 2 },
            { x: cx - bw / 2, y: cy + bh / 2 },
            { x: cx + bw / 2, y: cy + bh / 2 },
          ];
          for (const c of corners2) {
            const pulse = 1 + Math.sin(t * 3.5 + c.x * 0.01) * 0.2 * boundaryA;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 3 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(161,138,203,${0.4 * boundaryA})`;
            ctx.fill();
          }
        }

        // Inner scan line
        if (boundaryA > 0.38) {
          const scanY = cy - bh / 2 + (bh * ((Math.sin(t * 2.2) + 1) / 2)) * boundaryA;
          ctx.beginPath();
          ctx.moveTo(cx - bw / 2 + 8, scanY);
          ctx.lineTo(cx + bw / 2 - 8, scanY);
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = `rgba(169,209,142,${0.35 * boundaryA})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // CLIPBOARD CARDS — items flowing top → guard → bottom
      if (assembly > 0.28) {
        const cardA = Math.min(1, (assembly - 0.28) / 0.5);
        const bh = scale * 0.36;

        for (const card of layers.cards) {
          const localPhase = (itemPhase + card.phaseOffset) * 0.14;
          const cardProgress = localPhase % 1.4 - 0.2; // -0.2 to 1.2
          if (cardProgress <= 0 || cardProgress > 1.2) continue;

          const delayedP = Math.max(0, Math.min(1, cardProgress / 1.0)) * cardA;
          if (delayedP < 0.04) continue;

          const cxCard = cx + card.offsetX * scale * 0.18;
          const cyCard = cy - scale * 0.52 + cardProgress * scale * 1.15;

          // Pointer repulsion
          const dx = cxCard - (pointer.active ? pointer.x : cx);
          const dy = cyCard - (pointer.active ? pointer.y : cy);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const infl = pointer.active ? Math.max(0, 1 - dist / 130) * 0.12 : 0;
          const fx = cxCard + (dx / (dist || 1)) * infl * 14;
          const fy = cyCard + (dy / (dist || 1)) * infl * 14;

          const inBoundary = fy > cy - bh / 2 && fy < cy + bh / 2;
          const passed = cardProgress > 0.72;

          const cardW = 52;
          const cardH = 32;
          const alpha = 0.65 * delayedP;

          // Card
          ctx.beginPath();
          ctx.roundRect(fx - cardW / 2, fy - cardH / 2, cardW, cardH, 4);

          let cardFill: string;
          let cardBorder: string;
          if (passed) {
            cardFill = `rgba(169,209,142,${0.22 * alpha})`;
            cardBorder = `rgba(169,209,142,${0.55 * alpha})`;
          } else if (inBoundary && card.isSensitive) {
            // Blocked/sensitive — brief red tint only when explicitly blocked
            cardFill = `rgba(200,60,60,${0.15 * alpha})`;
            cardBorder = `rgba(200,60,60,${0.45 * alpha})`;
          } else if (inBoundary) {
            cardFill = `rgba(161,138,203,${0.12 * alpha})`;
            cardBorder = `rgba(161,138,203,${0.5 * alpha})`;
          } else {
            cardFill = `rgba(232,229,238,${0.07 * alpha})`;
            cardBorder = `rgba(161,138,203,${0.28 * alpha})`;
          }

          ctx.fillStyle = cardFill;
          ctx.fill();
          ctx.strokeStyle = cardBorder;
          ctx.lineWidth = 0.9;
          ctx.stroke();

          // Card content lines
          if (delayedP > 0.45) {
            for (let l = 0; l < 2; l++) {
              const lw = cardW * (0.45 + 0.35 * ((l + card.phaseOffset) % 1));
              const ly = fy - cardH / 2 + 10 + l * 9;
              ctx.beginPath();
              ctx.moveTo(fx - lw / 2, ly);
              ctx.lineTo(fx + lw / 2, ly);
              ctx.strokeStyle = passed
                ? `rgba(169,209,142,${0.4 * alpha})`
                : `rgba(232,229,238,${0.25 * alpha})`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }

          // Blocked indicator on sensitive cards in boundary
          if (inBoundary && card.isSensitive && !passed) {
            drawShieldLines(fx + cardW * 0.3, fy, 6, alpha * 0.7);
          }
        }
      }

      // INSPECTION GATES (4 boundary checkpoints)
      if (assembly > 0.62) {
        const gateA = Math.min(1, (assembly - 0.62) / 0.38);
        const bw = scale * 0.5;
        const bh = scale * 0.36;
        const gates = [
          { x: cx - bw / 2, y: cy },
          { x: cx + bw / 2, y: cy },
          { x: cx, y: cy - bh / 2 },
          { x: cx, y: cy + bh / 2 },
        ];
        for (let g = 0; g < gates.length; g++) {
          const gt = gates[g];
          const pulse = 1 + Math.sin(t * 3 + g * 1.5) * 0.18 * gateA;
          ctx.beginPath();
          ctx.arc(gt.x, gt.y, 4 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161,138,203,${0.35 * gateA})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(161,138,203,${0.55 * gateA})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // AES-256 vault indicator (center, subtle)
      if (assembly > 0.5) {
        const vaultA = Math.min(1, (assembly - 0.5) * 2.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.3 * vaultA})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Keyhole shape (simple representation)
        ctx.beginPath();
        ctx.arc(cx, cy - 1, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(161,138,203,${0.25 * vaultA})`;
        ctx.fill();
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

interface Card {
  offsetX: number;
  phaseOffset: number;
  isSensitive: boolean; // true = gets blocked in boundary
}

function buildLayers(rand: () => number) {
  const stars: Star[] = [];
  const count = 55;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(), y: rand(),
      radius: 0.25 + rand() * 0.5,
      alpha: 0.05 + rand() * 0.12,
      amplitude: 0.03 + rand() * 0.07,
      speed: 0.5 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * 0.0007,
      driftY: (rand() - 0.5) * 0.0005,
    });
  }

  const cards: Card[] = [];
  const cardCount = 10;
  for (let i = 0; i < cardCount; i++) {
    cards.push({
      offsetX: (rand() - 0.5) * 1.2,
      phaseOffset: rand() * 9, // spread across the cycle
      isSensitive: rand() < 0.25, // 25% of cards are sensitive and get blocked
    });
  }

  return { stars, cards };
}
