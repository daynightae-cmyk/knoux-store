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
    // Disk write progress (incremental, deterministic)
    let diskProgress = 0;

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

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height);

      // Star field (very sparse)
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.55;
        const sx = star.x * width + star.driftX * t * width * 400 * calm;
        const sy = star.y * height + star.driftY * t * height * 400 * calm;
        const tw = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.01, Math.min(0.4, star.alpha + tw));
        if (alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,224,231,${alpha})`;
        ctx.fill();
      }

      // CAPTURE FRAME CORNERS — violet, the primary visual signature
      if (assembly > 0.08) {
        const frameA = Math.min(1, assembly / 0.45);
        const eased = frameA * frameA * (3 - 2 * frameA);
        const size = scale * 0.32 * (0.5 + eased * 0.5);
        const cornerLen = size * 0.18;
        const alpha = 0.55 * eased;

        const corners = [
          { x: cx - size, y: cy - size * 0.7 },
          { x: cx + size, y: cy - size * 0.7 },
          { x: cx - size, y: cy + size * 0.7 },
          { x: cx + size, y: cy + size * 0.7 },
        ];

        ctx.strokeStyle = `rgba(161,138,203,${alpha})`;
        ctx.lineWidth = 2;

        for (const c of corners) {
          const sx2 = c.x < cx ? 1 : -1;
          const sy2 = c.y < cy ? 1 : -1;

          // Vertical arm
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x, c.y + sy2 * cornerLen);
          ctx.stroke();
          // Horizontal arm
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + sx2 * cornerLen, c.y);
          ctx.stroke();
        }

        // Subtle frame boundary (very low alpha)
        ctx.beginPath();
        ctx.rect(cx - size, cy - size * 0.7, size * 2, size * 1.4);
        ctx.strokeStyle = `rgba(161,138,203,${0.06 * eased})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // TIMELINE LANES — 3 lanes, grows left-to-right as assembly proceeds
      if (assembly > 0.22) {
        const laneA = Math.min(1, (assembly - 0.22) / 0.5);
        const easedLane = laneA * laneA * (3 - 2 * laneA);
        const laneWidth = Math.min(width * 0.38, scale * 0.44) * easedLane;
        const laneCount = 3;

        for (let l = 0; l < laneCount; l++) {
          const ly = cy - 30 + l * 30;
          const alpha = (0.12 - l * 0.02) * easedLane;

          // Lane line
          ctx.beginPath();
          ctx.moveTo(cx - laneWidth, ly);
          ctx.lineTo(cx + laneWidth, ly);
          ctx.strokeStyle = `rgba(161,138,203,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Timecode markers (every 1/8 of lane width)
          if (easedLane > 0.6) {
            const markerCount = 8;
            for (let m = 0; m <= markerCount; m++) {
              const mx = cx - laneWidth + (m / markerCount) * laneWidth * 2;
              const markerA = Math.max(0, Math.min(1, (easedLane - m * 0.06) / 0.7));
              if (markerA < 0.2) continue;
              const majorMark = m % 2 === 0;
              ctx.beginPath();
              ctx.moveTo(mx, ly - (majorMark ? 4 : 2));
              ctx.lineTo(mx, ly + (majorMark ? 4 : 2));
              ctx.strokeStyle = `rgba(232,229,238,${(majorMark ? 0.4 : 0.2) * markerA})`;
              ctx.lineWidth = majorMark ? 1 : 0.6;
              ctx.stroke();
            }
          }
        }
      }

      // WAVEFORM RIBBON — 3 overlapping channels (WASAPI multi-channel audio)
      if (assembly > 0.4) {
        const waveA = Math.min(1, (assembly - 0.4) / 0.38);
        const waveWidth = scale * 0.38;
        const waveY = cy + scale * 0.06;

        const channels = [
          { freq: 4.2, amp: 18, phase: 0, alpha: 0.55, color: [161, 138, 203] },
          { freq: 7.1, amp: 11, phase: 1.1, alpha: 0.35, color: [200, 180, 230] },
          { freq: 2.8, amp: 8, phase: 2.4, alpha: 0.2, color: [232, 229, 238] },
        ];

        for (const ch of channels) {
          ctx.beginPath();
          const steps = 60;
          for (let xi = 0; xi <= steps; xi++) {
            const xFrac = xi / steps;
            const wx = cx - waveWidth + xFrac * waveWidth * 2;
            const wy = waveY + Math.sin(xFrac * Math.PI * ch.freq + t * 1.8 + ch.phase) * ch.amp * waveA;
            if (xi === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          const [cr, cg, cb] = ch.color;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ch.alpha * waveA})`;
          ctx.lineWidth = ch.amp > 15 ? 1.8 : 1;
          ctx.stroke();
        }
      }

      // DISK WRITE INDICATOR — incremental bar (references disk-backed recording)
      if (assembly > 0.6) {
        const diskA = Math.min(1, (assembly - 0.6) * 3);
        diskProgress = Math.min(1, diskProgress + dt * 0.12); // grows slowly

        const barY = cy + scale * 0.28;
        const barMaxW = scale * 0.28;
        const barH = 3;

        // Background track
        ctx.beginPath();
        ctx.roundRect(cx - barMaxW / 2, barY - barH / 2, barMaxW, barH, 1);
        ctx.fillStyle = `rgba(161,138,203,${0.08 * diskA})`;
        ctx.fill();

        // Fill
        ctx.beginPath();
        ctx.roundRect(cx - barMaxW / 2, barY - barH / 2, barMaxW * diskProgress, barH, 1);
        ctx.fillStyle = `rgba(161,138,203,${0.4 * diskA})`;
        ctx.fill();
      }

      // RECORDING INDICATOR — violet pulsing (NOT a red dot — authority says no fake status)
      if (assembly > 0.7) {
        const recA = Math.min(1, (assembly - 0.7) * 4);
        const pulse = 1 + Math.sin(t * 3.5) * 0.1 * recA;
        const rx = cx + scale * 0.3;
        const ry = cy - scale * 0.28;

        ctx.beginPath();
        ctx.arc(rx, ry, 5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(161,138,203,${0.5 * recA})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rx, ry, 10 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.2 * recA})`;
        ctx.lineWidth = 1;
        ctx.stroke();
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
    if (reduced) { assembly = 1; diskProgress = 0.6; draw(0, 0); }
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
  const count = 50;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(), y: rand(),
      radius: 0.25 + rand() * 0.5,
      alpha: 0.06 + rand() * 0.14,
      amplitude: 0.03 + rand() * 0.08,
      speed: 0.6 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * 0.0007,
      driftY: (rand() - 0.5) * 0.0005,
    });
  }
  return { stars };
}