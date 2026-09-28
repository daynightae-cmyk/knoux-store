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

      assembly = Math.min(1, assembly + dt * 0.2);

      const cx = width * 0.5;
      const cy = height * 0.5;
      // Draw field stars
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.3;
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

      // Playback ring
      if (assembly > 0.15) {
        const ringAssembly = Math.min(1, (assembly - 0.15) / 0.5);
        const radius = Math.min(width, height) * 0.22 * (0.4 + ringAssembly * 0.8);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,138,203,${0.25 * ringAssembly})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Progress arc
        if (ringAssembly > 0.4) {
          const progress = (t * 0.08) % 1;
          const progressEnd = Math.PI * 2 * progress;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progressEnd);
          ctx.strokeStyle = `rgba(169,209,142,${0.6 * ringAssembly})`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Ring markers (time markers)
        if (ringAssembly > 0.6) {
          for (let m = 0; m < 12; m++) {
            const angle = (m / 12) * Math.PI * 2 - Math.PI / 2;
            const mx = cx + Math.cos(angle) * radius;
            const my = cy + Math.sin(angle) * radius;
            const markerAssembly = Math.max(0, Math.min(1, (ringAssembly - m * 0.05) / 0.6));
            if (markerAssembly < 0.2) continue;
            ctx.beginPath();
            ctx.arc(mx, my, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,229,238,${0.5 * markerAssembly})`;
            ctx.fill();
          }
        }
      }

      // Spectral bands (equalizer-style)
      if (assembly > 0.3) {
        const specAssembly = Math.min(1, (assembly - 0.3) / 0.5);
        const bandCount = 32;
        const bandWidth = (Math.min(width, height) * 0.5) / bandCount;
        const maxHeight = Math.min(width, height) * 0.35;

        for (let b = 0; b < bandCount; b++) {
          const bx = cx - (bandCount / 2) * bandWidth + b * bandWidth + bandWidth / 2;
          const bandPhase = b * 0.4 + t * 1.5;
          const height = (0.2 + 0.8 * (0.5 + 0.5 * Math.sin(bandPhase))) * maxHeight * specAssembly;
          const by = cy + Math.min(width, height) * 0.15;

          const alpha = 0.3 + 0.5 * Math.sin(bandPhase);
          const hue = 270 + (b / bandCount) * 60; // Violet to blue spectrum
          ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${0.4 * alpha * specAssembly})`;
          ctx.fillRect(bx - bandWidth * 0.35, by - height, bandWidth * 0.7, height);
        }
      }

      // Subtitle/time tracks (lower area)
      if (assembly > 0.55) {
        const trackAssembly = Math.min(1, (assembly - 0.55) / 0.35);
        const trackCount = 2;
        for (let tr = 0; tr < trackCount; tr++) {
          const ty = cy + Math.min(width, height) * 0.2 + tr * 25;
          const tw = Math.min(width, height) * 0.45 * trackAssembly;

          ctx.beginPath();
          ctx.moveTo(cx - tw, ty);
          ctx.lineTo(cx + tw, ty);
          ctx.strokeStyle = `rgba(161,138,203,${0.15 * trackAssembly})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Subtitle segments
          if (trackAssembly > 0.5) {
            for (let s = 0; s < 6; s++) {
              const sx = cx - tw + (s / 5) * tw * 2;
              const segAssembly = Math.max(0, Math.min(1, (trackAssembly - s * 0.1) / 0.7));
              if (segAssembly < 0.2) continue;
              ctx.beginPath();
              ctx.roundRect(sx - 15, ty - 8, 30, 16, 4);
              ctx.fillStyle = `rgba(232,229,238,${0.25 * segAssembly})`;
              ctx.fill();
            }
          }
        }
      }

      // Central playhead indicator
      if (assembly > 0.7) {
        const centerAssembly = Math.min(1, (assembly - 0.7) * 4);
        const pulse = 1 + Math.sin(t * 3) * 0.08 * centerAssembly;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(169,209,142,${0.5 * centerAssembly})`;
        ctx.fill();
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
  const VIOLET_RATIO = 0.08;
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
  return { stars };
}