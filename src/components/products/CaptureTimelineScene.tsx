'use client';

import { useEffect, useRef } from 'react';

interface CaptureTimelineSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function CaptureTimelineScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: CaptureTimelineSceneProps) {
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

      assembly = Math.min(1, assembly + dt * 0.22);

      const cx = width * 0.5;
      const cy = height * 0.5;
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

      // Capture corners (framing)
      if (assembly > 0.1) {
        const frameAssembly = Math.min(1, assembly / 0.5);
        const size = Math.min(width, height) * 0.35 * (0.5 + frameAssembly * 0.5);
        const cornerSize = size * 0.12;

        const corners = [
          { x: cx - size, y: cy - size },
          { x: cx + size, y: cy - size },
          { x: cx - size, y: cy + size },
          { x: cx + size, y: cy + size },
        ];

        for (const corner of corners) {
          const alpha = 0.4 * frameAssembly;
          ctx.strokeStyle = `rgba(161,138,203,${alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y + cornerSize);
          ctx.lineTo(corner.x, corner.y);
          ctx.lineTo(corner.x + cornerSize, corner.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(corner.x + (corner.x < cx ? size : -size), corner.y);
          ctx.lineTo(corner.x + (corner.x < cx ? size : -size), corner.y + cornerSize);
          ctx.lineTo(corner.x + (corner.x < cx ? size : -size) - cornerSize * (corner.x < cx ? 1 : -1), corner.y + cornerSize);
          ctx.stroke();
        }
      }

      // Timeline lanes
      if (assembly > 0.25) {
        const laneAssembly = Math.min(1, (assembly - 0.25) / 0.5);
        const laneCount = 3;
        for (let l = 0; l < laneCount; l++) {
          const ly = cy - 40 + l * 40;
          const lw = Math.min(width, height) * 0.5 * laneAssembly;

          ctx.beginPath();
          ctx.moveTo(cx - lw, ly);
          ctx.lineTo(cx + lw, ly);
          ctx.strokeStyle = `rgba(161,138,203,${0.1 * laneAssembly})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Timeline markers
          if (laneAssembly > 0.6) {
            for (let m = 0; m < 8; m++) {
              const mx = cx - lw + (m / 7) * lw * 2;
              const markerAssembly = Math.max(0, Math.min(1, (laneAssembly - m * 0.08) / 0.8));
              if (markerAssembly < 0.2) continue;
              const alpha = 0.5 * markerAssembly;
              ctx.beginPath();
              ctx.arc(mx, ly, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(232,229,238,${alpha})`;
              ctx.fill();
            }
          }
        }
      }

      // Waveform ribbon
      if (assembly > 0.4) {
        const waveAssembly = Math.min(1, (assembly - 0.4) / 0.4);
        const waveWidth = Math.min(width, height) * 0.45;
        const amplitude = 15 * waveAssembly;

        ctx.beginPath();
        for (let x = -waveWidth; x <= waveWidth; x += 2) {
          const wx = cx + x;
          const wy = cy + Math.sin((x / waveWidth) * Math.PI * 4 + t * 2) * amplitude * waveAssembly;
          if (x === -waveWidth) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.strokeStyle = `rgba(169,209,142,${0.5 * waveAssembly})`; // signal-green for waveform
        ctx.lineWidth = 2;
        ctx.stroke();

        // Waveform glow
        ctx.strokeStyle = `rgba(169,209,142,${0.15 * waveAssembly})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // Recording indicator (central)
      if (assembly > 0.6) {
        const recAssembly = Math.min(1, (assembly - 0.6) * 3);
        const pulse = 1 + Math.sin(t * 4) * 0.15 * recAssembly;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${0.6 * recAssembly})`; // Red for recording
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = `rgba(239,68,68,${0.4 * recAssembly})`;
        ctx.lineWidth = 2;
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
  return { stars };
}