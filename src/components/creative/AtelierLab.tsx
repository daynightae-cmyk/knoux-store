'use client';

/**
 * AtelierLab — KNOuX Creative / Digital Atelier V2
 *
 * Three-column atelier instrument:
 *   LEFT   — numbered discipline index (keyboard-reachable buttons)
 *   CENTER — deterministic Canvas 2D material field (no Three.js, no GSAP)
 *   RIGHT  — real specification: statement, deliverables, principles, route
 *
 * Material rules:
 *   - Seeded from the discipline code string, deterministic output
 *   - No Math.random() in production visual state
 *   - RAF only while visible and motion is allowed
 *   - RAF stops on: document hidden, intersection exit, reduced-motion
 *   - Pointer tracking mutates a ref in-place — zero React re-renders per frame
 *   - DPR capped at 2
 *
 * Data rules:
 *   - Only uses real creativeDisciplines from @/data/services
 *   - No fake projects, clients, metrics or gallery content
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { creativeDisciplines } from '@/data/services';

/* ─── Seeded pseudo-random (deterministic, no Math.random) ──────────────── */

function seededRng(seed: number) {
  let s = (seed ^ 0x4b4e4f58) >>> 0;
  return function next(): number {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    return (s >>> 0) / 0x100000000;
  };
}

function codeToSeed(code: string): number {
  let h = 0x4b4e4f58;
  for (let i = 0; i < code.length; i++) {
    h = Math.imul(h ^ code.charCodeAt(i), 0x51ed) >>> 0;
  }
  return h;
}

/* ─── Material field grammar — one per discipline ───────────────────────── */

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: number;
}

interface LineEdge {
  a: number;
  b: number;
}

interface MaterialGrammar {
  /** 0–7: maps to a visual archetype */
  archetype: number;
  points: Point[];
  edges: LineEdge[];
  gridFreq: number;
  /** base alpha multiplier 0–1 */
  density: number;
}

function buildGrammar(seed: number, index: number): MaterialGrammar {
  const rng = seededRng(seed + index * 997);
  const archetype = index % 8;
  const pointCount = 18 + (archetype % 4) * 6; // 18–36 pts

  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    const a = rng() * Math.PI * 2;
    const dist = 0.12 + rng() * 0.36;
    points.push({
      x: 0.5 + Math.cos(a) * dist,
      y: 0.5 + Math.sin(a) * dist,
      vx: (rng() - 0.5) * 0.00008,
      vy: (rng() - 0.5) * 0.00008,
      r: 1 + rng() * 2.5,
      alpha: 0.25 + rng() * 0.55,
      phase: rng() * Math.PI * 2,
    });
  }

  // Build sparse edges — connect nearby points only
  const edges: LineEdge[] = [];
  const threshold = 0.22 + (archetype % 3) * 0.06;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        edges.push({ a: i, b: j });
      }
    }
  }

  return {
    archetype,
    points,
    edges,
    gridFreq: 6 + (archetype % 3) * 2,
    density: 0.55 + (index % 3) * 0.15,
  };
}

/* ─── Canvas renderer ────────────────────────────────────────────────────── */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  g: MaterialGrammar,
  t: number,
  pointer: { x: number; y: number; active: boolean },
  reduced: boolean,
): void {
  ctx.clearRect(0, 0, w, h);

  const pts = g.points;
  const violet = 'rgba(161,138,203,';
  const silver = 'rgba(200,196,210,';
  const dim = 'rgba(120,115,130,';

  // Subtle background grid — architectural texture
  if (!reduced) {
    ctx.save();
    const gStep = w / g.gridFreq;
    ctx.strokeStyle = `${dim}0.06)`;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += gStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Thin horizontal rule — editorial pacing from Vanta reference
  ctx.save();
  ctx.strokeStyle = `${violet}0.18)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.5);
  ctx.lineTo(w * 0.92, h * 0.5);
  ctx.stroke();
  ctx.restore();

  // Compute live positions
  const liveX = pts.map((p) => {
    if (reduced) return p.x * w;
    const drift = Math.sin(t * 0.3 + p.phase) * 4;
    return p.x * w + drift;
  });
  const liveY = pts.map((p) => {
    if (reduced) return p.y * h;
    const drift = Math.cos(t * 0.22 + p.phase + 1.1) * 3;
    return p.y * h + drift;
  });

  // Pointer influence (read from stable mutable ref — no React state)
  if (pointer.active && !reduced) {
    for (let i = 0; i < pts.length; i++) {
      const dx = liveX[i] - pointer.x;
      const dy = liveY[i] - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        const push = (1 - dist / 90) * 12;
        liveX[i] += (dx / (dist || 1)) * push;
        liveY[i] += (dy / (dist || 1)) * push;
      }
    }
  }

  // Draw edges
  ctx.save();
  for (const e of g.edges) {
    const ax = liveX[e.a];
    const ay = liveY[e.a];
    const bx = liveX[e.b];
    const by = liveY[e.b];
    const midAlpha = ((pts[e.a].alpha + pts[e.b].alpha) / 2) * g.density * 0.45;
    ctx.strokeStyle = `${violet}${midAlpha.toFixed(3)})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();

  // Draw points
  ctx.save();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const x = liveX[i];
    const y = liveY[i];
    const pulse = reduced ? 1 : 1 + Math.sin(t * 0.8 + p.phase) * 0.15;
    const r = p.r * pulse;
    const a = p.alpha * g.density;

    // outer ring (silver / platinum)
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = `${silver}${(a * 0.12).toFixed(3)})`;
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // core dot
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `${violet}${(a * 0.9).toFixed(3)})`;
    ctx.fill();
  }
  ctx.restore();

  // Archetype-specific accent geometry — numbered collection rhythm
  const archetype = g.archetype;
  ctx.save();
  ctx.strokeStyle = `${violet}0.09)`;
  ctx.lineWidth = 0.6;

  if (archetype === 0) {
    // Concentric rings — Identity
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, (w * 0.18) * ring * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (archetype === 1) {
    // Grid-of-4 — Interface architecture
    const sx = w * 0.3;
    const sy = h * 0.3;
    ctx.strokeRect(sx, sy, w * 0.4, h * 0.4);
    ctx.moveTo(w * 0.5, sy); ctx.lineTo(w * 0.5, sy + h * 0.4);
    ctx.moveTo(sx, h * 0.5); ctx.lineTo(sx + w * 0.4, h * 0.5);
    ctx.stroke();
  } else if (archetype === 2) {
    // Diagonal slash — Art direction
    ctx.lineWidth = 0.5;
    for (let d = 0; d < 5; d++) {
      const off = (d / 4) * w * 0.3;
      ctx.beginPath();
      ctx.moveTo(w * 0.2 + off, h * 0.1);
      ctx.lineTo(w * 0.5 + off, h * 0.9);
      ctx.stroke();
    }
  } else if (archetype === 3) {
    // Variant axis — Campaign
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `${violet}0.07)`;
    for (let v = 0; v < 3; v++) {
      const y = h * (0.28 + v * 0.22);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, y);
      ctx.lineTo(w * 0.9, y);
      ctx.stroke();
    }
    ctx.strokeStyle = `${silver}0.08)`;
    ctx.beginPath();
    ctx.rect(w * 0.15, h * 0.2, w * 0.7, h * 0.6);
    ctx.stroke();
  } else if (archetype === 4) {
    // Timeline rhythm — Social/publishing cadence
    const steps = 7;
    ctx.strokeStyle = `${violet}0.1)`;
    for (let s = 0; s < steps; s++) {
      const x = w * (0.1 + (s / (steps - 1)) * 0.8);
      const barH = h * (0.15 + (s % 3) * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.7);
      ctx.lineTo(x, h * 0.7 - barH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, h * 0.7 - barH, 2, 0, Math.PI * 2);
      ctx.fillStyle = `${violet}0.3)`;
      ctx.fill();
    }
  } else if (archetype === 5) {
    // Easing curve — Motion
    ctx.strokeStyle = `${violet}0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.75);
    ctx.bezierCurveTo(w * 0.25, h * 0.75, w * 0.4, h * 0.25, w * 0.9, h * 0.25);
    ctx.stroke();
    // tick marks
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `${silver}0.12)`;
    for (let i = 0; i <= 4; i++) {
      const tx = w * (0.1 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(tx, h * 0.78);
      ctx.lineTo(tx, h * 0.72);
      ctx.stroke();
    }
  } else if (archetype === 6) {
    // Framing corners — Product visuals
    const margin = 0.14;
    const cs = 0.08;
    const corners = [
      [margin, margin], [1 - margin, margin],
      [margin, 1 - margin], [1 - margin, 1 - margin],
    ] as const;
    ctx.strokeStyle = `${silver}0.18)`;
    ctx.lineWidth = 0.7;
    for (const [cx, cy] of corners) {
      const sx = w * cx;
      const sy = h * cy;
      const dx = cx < 0.5 ? 1 : -1;
      const dy = cy < 0.5 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(sx + dx * w * cs, sy);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx, sy + dy * h * cs);
      ctx.stroke();
    }
  } else {
    // Page-type grid — Presentation
    ctx.strokeStyle = `${violet}0.07)`;
    ctx.lineWidth = 0.5;
    const cols = 3;
    const rows = 2;
    const padX = w * 0.1;
    const padY = h * 0.15;
    const cellW = (w - padX * 2) / cols;
    const cellH = (h - padY * 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * cellW;
        const y = padY + r * cellH;
        ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);
        // header line
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 16);
        ctx.lineTo(x + cellW - 9, y + 16);
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  // Discipline code watermark — top-right corner, editorial rhythm
  ctx.save();
  ctx.font = `500 10px var(--mono, monospace)`;
  ctx.fillStyle = `${violet}0.22)`;
  ctx.letterSpacing = '0.14em';
  ctx.textAlign = 'right';
  ctx.fillText(g.archetype === 0 ? 'CR-01' : `CR-0${g.archetype + 1}`, w - 14, 22);
  ctx.restore();
}

/* ─── Canvas hook ────────────────────────────────────────────────────────── */

function useAtelierCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  grammar: MaterialGrammar,
  reduced: boolean,
) {
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const rafRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = false;
    let lastTs = 0;

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || 400;
      const h = canvas.clientHeight || 400;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const tick = (ts: number) => {
      if (!running) return;
      const t = ts / 1000;
      if (ts - lastTs > 100) lastTs = ts - 16; // handle tab sleep
      const w = canvas.clientWidth || 400;
      const h = canvas.clientHeight || 400;
      drawFrame(ctx, w, h, grammar, t, pointerRef.current, reduced);
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = performance.now();
      rafRef.current = requestAnimationFrame(tick);
      startedRef.current = true;
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };

    layout();

    // Draw a single static frame immediately (visible in reduced-motion mode too)
    drawFrame(ctx, canvas.clientWidth || 400, canvas.clientHeight || 400, grammar, 0, pointerRef.current, true);

    if (!reduced) {
      // Intersection observer — only animate when visible
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) start();
          else stop();
        },
        { threshold: 0.1 },
      );
      io.observe(canvas);

      // Visibility API
      const onVis = () => { if (document.hidden) stop(); else if (startedRef.current) start(); };
      document.addEventListener('visibilitychange', onVis);

      // Resize
      const ro = new ResizeObserver(() => { layout(); });
      ro.observe(canvas);

      // Pointer — mutate ref in-place, zero React re-renders
      const container = canvas.parentElement;
      const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        pointerRef.current.x = e.clientX - rect.left;
        pointerRef.current.y = e.clientY - rect.top;
        pointerRef.current.active = true;
      };
      const onLeave = () => {
        pointerRef.current.active = false;
      };
      container?.addEventListener('pointermove', onMove, { passive: true });
      container?.addEventListener('pointerleave', onLeave);

      return () => {
        stop();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        container?.removeEventListener('pointermove', onMove);
        container?.removeEventListener('pointerleave', onLeave);
      };
    } else {
      // Reduced motion — one static frame only, resize support
      const ro = new ResizeObserver(() => {
        layout();
        drawFrame(ctx, canvas.clientWidth || 400, canvas.clientHeight || 400, grammar, 0, pointerRef.current, true);
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }
  }, [canvasRef, grammar, reduced]);
}

/* ─── AtelierLab component ───────────────────────────────────────────────── */

const GRAMMARS = creativeDisciplines.map((d, i) => buildGrammar(codeToSeed(d.code), i));

export function AtelierLab() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const discipline = creativeDisciplines[active];
  const grammar = GRAMMARS[active];

  // Track reduced-motion preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useAtelierCanvas(canvasRef, grammar, reduced);

  const selectDiscipline = useCallback((index: number) => {
    setActive(index);
  }, []);

  return (
    <div
      className="atelier-lab"
      data-scene={discipline.slug}
      data-active={active}
    >
      {/* LEFT — material index */}
      <nav
        className="atelier-lab__index"
        aria-label="Creative disciplines"
      >
        <span className="atelier-lab__index-label" aria-hidden="true">
          MATERIAL INDEX
        </span>
        {creativeDisciplines.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={`atelier-lab__item${active === index ? ' is-active' : ''}`}
            onClick={() => selectDiscipline(index)}
            onFocus={() => selectDiscipline(index)}
            aria-pressed={active === index}
            aria-label={`Select ${entry.title}`}
          >
            <small>{entry.code}</small>
            <span>{entry.title}</span>
          </button>
        ))}
      </nav>

      {/* CENTER — Canvas 2D material field */}
      <div className="atelier-lab__field" aria-hidden="true">
        <canvas
          ref={canvasRef}
          className="atelier-lab__canvas"
          role="img"
          aria-hidden="true"
        />
        <span className="atelier-lab__field-label">
          K / MATERIAL STUDY
        </span>
      </div>

      {/* RIGHT — specification */}
      <div className="atelier-lab__spec" key={discipline.id}>
        <span className="label label--signal">
          MATERIAL {String(active + 1).padStart(2, '0')} / {discipline.code}
        </span>
        <h3>{discipline.title}</h3>
        <p className="atelier-lab__statement">{discipline.statement}</p>

        <div className="atelier-lab__section">
          <h4>DELIVERABLES</h4>
          <ul>
            {discipline.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="atelier-lab__section">
          <h4>PRINCIPLES</h4>
          <ul>
            {discipline.principles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <Link href={`/creative/${discipline.slug}`} className="action" style={{ marginTop: 20 }}>
          EXPLORE DISCIPLINE <span className="action-arrow" aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
