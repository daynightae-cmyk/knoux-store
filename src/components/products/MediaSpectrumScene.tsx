'use client';

import { useEffect, useRef } from 'react';

interface MediaSpectrumSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function MediaSpectrumScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: MediaSpectrumSceneProps) {
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
      const scale = Math.min(width, height) * 0.42;

      // Sparse star field
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.4;
        const sx = star.x * width + star.driftX * t * width * 500 * calm;
        const sy = star.y * height + star.driftY * t * height * 500 * calm;
        const tw = star.amplitude * Math.sin(t * star.speed + star.phase);
        const alpha = Math.max(0.01, Math.min(0.45, star.alpha + tw));
        if (alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,168,224,${alpha})`;
        ctx.fill();
      }

      // PLAYBACK RING — outer (main boundary) + inner (decode indicator)
      if (assembly > 0.12) {
        const ringA = Math.min(1, (assembly - 0.12) / 0.5);
        const eased = ringA * ringA * (3 - 2 * ringA);
        const outerR = scale * 0.36 * (0.4 + eased * 0.8);
        const innerR = scale * 0.24 * (0.4 + eased * 0.8);

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.22 * eased})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner decode ring
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.14 * eased})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Progress arc on outer ring
        if (eased > 0.4) {
          const progress = (t * 0.07) % 1;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
          ctx.strokeStyle = `rgba(169,209,142,${0.6 * eased})`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Ring markers (12 time markers on outer ring)
        if (eased > 0.55) {
          for (let m = 0; m < 12; m++) {
            const angle = (m / 12) * Math.PI * 2 - Math.PI / 2;
            const mx = cx + Math.cos(angle) * outerR;
            const my = cy + Math.sin(angle) * outerR;
            const mA = Math.max(0, Math.min(1, (eased - m * 0.04) / 0.55));
            if (mA < 0.15) continue;
            const isMajor = m % 3 === 0;
            ctx.beginPath();
            ctx.arc(mx, my, isMajor ? 2.2 : 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,229,238,${(isMajor ? 0.45 : 0.22) * mA})`;
            ctx.fill();
          }
        }
      }

      // EQUALIZER — 10-band (real EQ, not 32 random bands)
      if (assembly > 0.28) {
        const specA = Math.min(1, (assembly - 0.28) / 0.48);
        const bandCount = 10;
        const totalW = scale * 0.42;
        const bandW = totalW / bandCount;
        const maxH = scale * 0.28;
        const eqY = cy + scale * 0.18;

        for (let b = 0; b < bandCount; b++) {
          const bx = cx - totalW / 2 + b * bandW + bandW / 2;
          // Each band has a frequency characteristic (seeded, not random)
          const freq = layers.eqBands[b];
          const liveH = (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * freq + b * 0.6))) * maxH * specA;

          // Bar
          ctx.fillStyle = `rgba(161,138,203,${0.35 * specA})`;
          ctx.fillRect(bx - bandW * 0.32, eqY - liveH, bandW * 0.64, liveH);

          // Peak marker (decays slowly)
          const peakH = liveH * 1.1;
          ctx.fillStyle = `rgba(178,150,214,${0.55 * specA})`;
          ctx.fillRect(bx - bandW * 0.32, eqY - peakH - 2, bandW * 0.64, 1.5);
        }
      }

      // SUBTITLE TRACKS — below the EQ
      if (assembly > 0.55) {
        const trackA = Math.min(1, (assembly - 0.55) / 0.35);
        const trackCount = 2;
        const trackW = scale * 0.4;

        for (let tr = 0; tr < trackCount; tr++) {
          const ty = cy + scale * 0.28 + tr * 22;
          const tw = trackW * trackA;

          ctx.beginPath();
          ctx.moveTo(cx - tw, ty);
          ctx.lineTo(cx + tw, ty);
          ctx.strokeStyle = `rgba(161,138,203,${0.1 * trackA})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Subtitle segment blocks (variable width = different subtitle lengths)
          if (trackA > 0.45) {
            const segWidths = layers.subtitleSegments[tr] ?? [];
            let segX = cx - tw;
            for (let s = 0; s < segWidths.length; s++) {
              const sw = segWidths[s] * tw * 0.35;
              const segA = Math.max(0, Math.min(1, (trackA - s * 0.12) / 0.7));
              if (segA < 0.15 || segX + sw > cx + tw) break;
              ctx.beginPath();
              ctx.roundRect(segX + 3, ty - 6, sw, 12, 3);
              ctx.fillStyle = `rgba(161,138,203,${0.18 * segA})`;
              ctx.fill();
              ctx.strokeStyle = `rgba(161,138,203,${0.25 * segA})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
              segX += sw + 8;
            }
          }
        }
      }

      // Pointer influence on ring center
      if (assembly > 0.4 && pointer.active) {
        const ringA = Math.min(1, (assembly - 0.12) / 0.5);
        const outerR = scale * 0.36 * (0.4 + ringA * 0.8);
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < outerR * 1.5) {
          const parallaxX = (dx / (outerR * 1.5)) * 6;
          const parallaxY = (dy / (outerR * 1.5)) * 6;
          // Slight ring shift
          ctx.beginPath();
          ctx.arc(cx + parallaxX, cy + parallaxY, outerR * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161,138,203,${0.15 * ringA})`;
          ctx.fill();
        }
      }

      // Central playhead
      if (assembly > 0.68) {
        const cA = Math.min(1, (assembly - 0.68) * 4);
        const pulse = 1 + Math.sin(t * 3.2) * 0.07 * cA;
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(169,209,142,${0.55 * cA})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(169,209,142,${0.2 * cA})`;
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
  const count = 60;
  const VIOLET_RATIO = 0.08;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(), y: rand(),
      radius: 0.3 + rand() * 0.65,
      alpha: (rand() < VIOLET_RATIO ? 0.15 : 0.08) + rand() * 0.15,
      amplitude: 0.05 + rand() * 0.1,
      speed: 0.7 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * 0.0009,
      driftY: (rand() - 0.5) * 0.0007,
    });
  }

  // 10-band EQ — each band has a deterministic frequency characteristic
  const eqBands: number[] = [];
  for (let b = 0; b < 10; b++) {
    // Frequency increases log-like from bass to treble
    eqBands.push(0.8 + b * 0.35 + rand() * 0.3);
  }

  // Subtitle segment widths (2 tracks, variable segments)
  const subtitleSegments: number[][] = [];
  for (let tr = 0; tr < 2; tr++) {
    const segs: number[] = [];
    for (let s = 0; s < 5; s++) {
      segs.push(0.4 + rand() * 0.8);
    }
    subtitleSegments.push(segs);
  }

  return { stars, eqBands, subtitleSegments };
}