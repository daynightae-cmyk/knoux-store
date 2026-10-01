'use client';

import { useEffect, useRef } from 'react';

interface FileClustersSceneProps {
  seed: number;
  reduced: boolean;
  pointer?: { x: number; y: number; active: boolean };
  className?: string;
}

export function FileClustersScene({
  seed,
  reduced,
  pointer = { x: 0, y: 0, active: false },
  className,
}: FileClustersSceneProps) {
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

    const drawFileTile = (
      x: number, y: number, size: number, alpha: number,
      isFolder: boolean, isDuplicate: boolean
    ) => {
      const r = isFolder ? 4 : 2;
      if (isFolder) {
        // Folder: wider, with a tab at top
        const fw = size * 1.4;
        const fh = size;
        ctx.beginPath();
        ctx.roundRect(x - fw / 2, y - fh / 2, fw, fh, r);
        ctx.fillStyle = `rgba(161,138,203,${0.08 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(161,138,203,${0.45 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Folder tab
        ctx.beginPath();
        ctx.roundRect(x - fw * 0.35, y - fh / 2 - 4, fw * 0.4, 5, [2, 2, 0, 0]);
        ctx.fillStyle = `rgba(161,138,203,${0.25 * alpha})`;
        ctx.fill();
      } else {
        // File: rectangular
        const fw = size;
        const fh = size * 1.3;
        ctx.beginPath();
        ctx.roundRect(x - fw / 2, y - fh / 2, fw, fh, r);
        if (isDuplicate) {
          ctx.fillStyle = `rgba(161,138,203,${0.06 * alpha})`;
          ctx.fill();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = `rgba(161,138,203,${0.3 * alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = `rgba(232,229,238,${0.06 * alpha})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(232,229,238,${0.3 * alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        // File content lines
        if (alpha > 0.3) {
          for (let l = 0; l < 3; l++) {
            const lw = fw * (0.4 + 0.3 * ((l + seed) % 3) / 3);
            const ly = y - fh / 2 + fh * 0.25 + l * (fh * 0.22);
            ctx.beginPath();
            ctx.moveTo(x - lw / 2, ly);
            ctx.lineTo(x + lw / 2, ly);
            ctx.strokeStyle = `rgba(232,229,238,${0.15 * alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
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

      // Sparse star field
      for (const star of layers.stars) {
        const calm = 1 - assembly * 0.6;
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

      // Storage band guides (3 horizontal zones)
      if (assembly > 0.45) {
        const bandA = Math.min(1, (assembly - 0.45) / 0.4);
        const zones = [
          { y: -0.55, label: 'DOCS' },
          { y: 0.0, label: 'SYSTEM' },
          { y: 0.55, label: 'MEDIA' },
        ];
        for (const zone of zones) {
          const zy = cy + zone.y * scale * 0.85;
          const bw = scale * 0.9 * bandA;
          ctx.beginPath();
          ctx.moveTo(cx - bw, zy);
          ctx.lineTo(cx + bw, zy);
          ctx.strokeStyle = `rgba(161,138,203,${0.06 * bandA})`;
          ctx.lineWidth = 16;
          ctx.stroke();
          // Label line
          ctx.beginPath();
          ctx.moveTo(cx - bw, zy);
          ctx.lineTo(cx + bw, zy);
          ctx.strokeStyle = `rgba(161,138,203,${0.12 * bandA})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Cluster connection lines (between duplicate pairs)
      if (assembly > 0.55) {
        const connA = Math.min(1, (assembly - 0.55) / 0.35);
        for (const dup of layers.duplicatePairs) {
          const tileA = layers.tiles[dup.a];
          const tileB = layers.tiles[dup.b];
          if (!tileA || !tileB) continue;

          const aA = Math.max(0, Math.min(1, (assembly - tileA.delay * 0.45) / 0.6));
          const bA = Math.max(0, Math.min(1, (assembly - tileB.delay * 0.45) / 0.6));
          if (aA < 0.3 || bA < 0.3) continue;

          const aEased = aA * aA * (3 - 2 * aA);
          const bEased = bA * bA * (3 - 2 * bA);

          const axp = cx + (tileA.scatterX * (1 - aEased) + tileA.clusterX * aEased) * scale;
          const ayp = cy + (tileA.scatterY * (1 - aEased) + tileA.clusterY * aEased) * scale;
          const bxp = cx + (tileB.scatterX * (1 - bEased) + tileB.clusterX * bEased) * scale;
          const byp = cy + (tileB.scatterY * (1 - bEased) + tileB.clusterY * bEased) * scale;

          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.moveTo(axp, ayp);
          ctx.lineTo(bxp, byp);
          ctx.strokeStyle = `rgba(161,138,203,${0.2 * connA})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // File tiles
      for (const tile of layers.tiles) {
        const localA = Math.max(0, Math.min(1, (assembly - tile.delay * 0.42) / 0.58));
        const eased = localA * localA * (3 - 2 * localA);
        if (eased < 0.04) continue;

        const tx = cx + (tile.scatterX * (1 - eased) + tile.clusterX * eased) * scale;
        const ty = cy + (tile.scatterY * (1 - eased) + tile.clusterY * eased) * scale;

        // Pointer influence
        const dx = tx - (pointer.active ? pointer.x : cx);
        const dy = ty - (pointer.active ? pointer.y : cy);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const infl = pointer.active ? Math.max(0, 1 - dist / 110) * 0.2 : 0;
        const fx = tx + (dx / (dist || 1)) * infl * 14;
        const fy = ty + (dy / (dist || 1)) * infl * 14;

        const size = (10 + tile.size * 10) * (0.3 + eased * 0.85);
        const alpha = (0.3 + tile.glow * 0.6) * eased;

        drawFileTile(fx, fy, size, alpha, tile.isFolder, tile.isDuplicate);
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

interface FileTile {
  clusterX: number; clusterY: number;
  scatterX: number; scatterY: number;
  delay: number; size: number; glow: number;
  isFolder: boolean; isDuplicate: boolean;
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

  // Cluster zones
  const zones = [
    { cx: -0.5, cy: -0.5 },  // DOCS cluster
    { cx: 0.0, cy: 0.0 },    // SYSTEM cluster
    { cx: 0.5, cy: 0.5 },    // MEDIA cluster
  ];

  const tiles: FileTile[] = [];
  const tileCount = 28;
  for (let i = 0; i < tileCount; i++) {
    const zone = zones[i % zones.length];
    const isFolder = i < 6;
    const isDuplicate = !isFolder && i > 18;
    // Position within cluster zone
    const clusterX = zone.cx + (rand() - 0.5) * 0.45;
    const clusterY = zone.cy + (rand() - 0.5) * 0.45;
    tiles.push({
      clusterX,
      clusterY,
      scatterX: (rand() - 0.5) * 2.2,
      scatterY: (rand() - 0.5) * 2.2,
      delay: rand() * 0.7,
      size: 0.4 + rand() * 0.7,
      glow: 0.2 + rand() * 0.6,
      isFolder,
      isDuplicate,
    });
  }

  // Duplicate pairs (connect overlapping items)
  const duplicatePairs: { a: number; b: number }[] = [];
  const dupIndices = tiles.map((t, i) => t.isDuplicate ? i : -1).filter((i) => i >= 0);
  for (let i = 0; i + 1 < dupIndices.length; i += 2) {
    duplicatePairs.push({ a: dupIndices[i], b: dupIndices[i + 1] });
  }

  return { stars, tiles, duplicatePairs };
}