'use client';

import { useEffect, useRef } from 'react';

interface ProductSceneBaseProps {
  motif: string;
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

/**
 * Base product scene using Canvas 2D.
 * Each specific scene extends this with its own draw logic.
 */
export function ProductSceneBase({
  motif,
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: ProductSceneBaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let running = false;
    let frame = 0;
    let time = 0;

    const layout = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 400;
      height = canvas.clientHeight || 300;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const tick = (timestamp: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (timestamp - time) / 1000);
      time = timestamp;

      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, width, height, timestamp / 1000, dt, pointer);

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
      if (reduced) drawScene(ctx, width, height, 0, 0, pointer);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    layout();
    if (reduced) {
      drawScene(ctx, width, height, 0, 0, pointer);
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
  }, [motif, seed, reduced, pointer]);

  return <canvas className={className} ref={canvasRef} aria-hidden="true" />;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _time: number,
  _dt: number,
  _pointer: { x: number; y: number; active: boolean }
) {
  // Base implementation - overridden by specific scenes
  ctx.fillStyle = '#08090a';
  ctx.fillRect(0, 0, width, height);
}