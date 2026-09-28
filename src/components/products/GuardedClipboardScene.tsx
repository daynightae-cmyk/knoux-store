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
    let itemPhase = 0;

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
      itemPhase += dt * 0.3;

      const cx = width * 0.5;
      const cy = height * 0.5;
      const boundaryHeight = Math.min(width, height) * 0.35;
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

      // Guard boundary (central privacy barrier)
      if (assembly > 0.2) {
        const boundaryAssembly = Math.min(1, (assembly - 0.2) / 0.6);
        const boundaryWidth = Math.min(width, height) * 0.5;

        // Outer boundary frame
        ctx.strokeStyle = `rgba(161,138,203,${0.2 * boundaryAssembly})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - boundaryWidth / 2, cy - boundaryHeight / 2, boundaryWidth, boundaryHeight, 8);
        ctx.stroke();

        // Inner scan line
        if (boundaryAssembly > 0.4) {
          const scanY = cy - boundaryHeight / 2 + (boundaryHeight * ((Math.sin(t * 2) + 1) / 2)) * boundaryAssembly;
          ctx.beginPath();
          ctx.moveTo(cx - boundaryWidth / 2 + 10, scanY);
          ctx.lineTo(cx + boundaryWidth / 2 - 10, scanY);
          ctx.strokeStyle = `rgba(169,209,142,${0.4 * boundaryAssembly})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Clipboard cards (items entering from top, passing through guard)
      if (assembly > 0.3) {
        const cardAssembly = Math.min(1, (assembly - 0.3) / 0.5);

        for (const card of layers.cards) {
          const localPhase = itemPhase + card.phaseOffset;
          const cardProgress = (localPhase * 0.15) % 1.5 - 0.25; // -0.25 to 1.25
          const delayedProgress = Math.max(0, Math.min(1, (cardProgress + card.delay * 0.5) / 1.0)) * cardAssembly;

          if (delayedProgress <= 0) continue;

          // Card moves from top to center (through guard) then to bottom
          let cx_card = cx + card.offsetX * Math.min(width, height) * 0.2;
          let cy_card = cy - Math.min(width, height) * 0.5 + cardProgress * Math.min(width, height) * 1.2;

          // Apply guard boundary effect
          const inBoundary = cy_card > cy - boundaryHeight / 2 && cy_card < cy + boundaryHeight / 2;
          const passed = cardProgress > 0.7;

          // Pointer influence
          const dx = cx_card - px, dy = cy_card - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = pointer.active ? Math.max(0, 1 - dist / 140) * 0.15 : 0;
          cx_card += (dx / (dist || 1)) * influence * 20;
          cy_card += (dy / (dist || 1)) * influence * 20;

          const cardWidth = 60;
          const cardHeight = 40;
          const alpha = 0.6 * delayedProgress;

          // Card background
          ctx.beginPath();
          ctx.roundRect(cx_card - cardWidth / 2, cy_card - cardHeight / 2, cardWidth, cardHeight, 4);
          const cardColor = passed
            ? `rgba(169,209,142,${0.3 * alpha})` // Green for allowed
            : inBoundary
              ? `rgba(239,68,68,${0.25 * alpha})` // Red for blocked/scanning
              : `rgba(232,229,238,${alpha})`;
          ctx.fillStyle = cardColor;
          ctx.fill();

          // Card border
          ctx.strokeStyle = passed
            ? `rgba(169,209,142,${0.6 * alpha})`
            : inBoundary
              ? `rgba(239,68,68,${0.5 * alpha})`
              : `rgba(161,138,203,${0.3 * alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Card content lines
          if (delayedProgress > 0.5) {
            const lineCount = 3;
            for (let l = 0; l < lineCount; l++) {
              const ly = cy_card - cardHeight / 2 + 10 + l * 10;
              const lw = cardWidth * 0.6 * (0.5 + 0.5 * Math.sin(card.phaseOffset + l));
              ctx.beginPath();
              ctx.moveTo(cx_card - lw / 2, ly);
              ctx.lineTo(cx_card + lw / 2, ly);
              ctx.strokeStyle = passed
                ? `rgba(169,209,142,${0.4 * alpha})`
                : `rgba(232,229,238,${0.4 * alpha})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }
        }
      }

      // Inspection gates (visual checkpoints on boundary)
      if (assembly > 0.6) {
        const gateAssembly = Math.min(1, (assembly - 0.6) / 0.4);
        const gateCount = 4;
        for (let g = 0; g < gateCount; g++) {
          const angle = (g / gateCount) * Math.PI * 2;
          const gx = cx + Math.cos(angle) * Math.min(width, height) * 0.25;
          const gy = cy + Math.sin(angle) * Math.min(width, height) * 0.25;

          const pulse = 1 + Math.sin(t * 3 + g) * 0.15 * gateAssembly;
          ctx.beginPath();
          ctx.arc(gx, gy, 5 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161,138,203,${0.3 * gateAssembly})`;
          ctx.fill();

          ctx.strokeStyle = `rgba(161,138,203,${0.5 * gateAssembly})`;
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

interface Card {
  offsetX: number;
  delay: number;
  phaseOffset: number;
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

  const cards: Card[] = [];
  const cardCount = 8;
  for (let i = 0; i < cardCount; i++) {
    cards.push({
      offsetX: (rand() - 0.5) * 1.5,
      delay: rand() * 0.8,
      phaseOffset: rand() * Math.PI * 2,
    });
  }

  return { stars, cards };
}
