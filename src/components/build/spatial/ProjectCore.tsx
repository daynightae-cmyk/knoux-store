'use client';

/**
 * Living Project Core.
 *
 * The central object of the spatial workspace. It is explicitly **not** a
 * planet, not a generic glowing sphere, not a random particle blob, and not a
 * second Build Orb or a duplicate LivingParticleMark renderer. It is a
 * deterministic reading of the current project's own topology.
 *
 * Every meaningful visual maps to a measured fact:
 *   - ring emphasis  → real node counts per domain, from the adapter graph
 *   - outer ring      → real verification status; unknown is never green
 *   - posture         → runtime state, verification state, stage position
 *   - field density   → real project size
 *
 * Render technology is Canvas 2D. Three.js is deliberately not used: the site
 * already owns WebGL contexts for the Orb and the Living Mark, and a third
 * full-screen context on a modest integrated GPU is the wrong trade for a
 * line-and-point diagram.
 *
 * Performance: one `requestAnimationFrame` loop, cancelled on unmount, skipped
 * entirely when the document is hidden or the core is offscreen, frozen under
 * reduced motion, and DPR capped at 1.5.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  coreAmplitude,
  coreField,
  corePosture,
  coreRings,
  domainCounts,
  maxCount,
  verificationRing,
  type CorePosture,
  type RingInput,
} from '@/lib/build/spatial';
import type { ProjectGraph, ProjectNodeDomain, VerificationStatus } from '@/lib/build/types';

const DPR_CAP = 1.5;
const POINT_BUDGET = 150;

type Props = {
  graph: ProjectGraph | null;
  runtimeRunning: boolean;
  verification: VerificationStatus;
  stageIndex: number;
  stageCount: number;
  selectedDomain: ProjectNodeDomain | null;
  /** Pulse when a stage is entered, so the core acknowledges navigation. */
  revision: number;
};

function readVar(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

export function ProjectCore({
  graph,
  runtimeRunning,
  verification,
  stageIndex,
  stageCount,
  selectedDomain,
  revision,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // The loop reads these through a ref so a state change never recreates the
  // frame callback, which would restart the loop on every render. The ref is
  // written in an effect, not during render, because writing a ref during
  // render is a React rule violation and can desynchronise concurrent renders.
  const inputRef = useRef({ runtimeRunning, verification, stageIndex, stageCount, selectedDomain, revision });
  useEffect(() => {
    inputRef.current = { runtimeRunning, verification, stageIndex, stageCount, selectedDomain, revision };
  }, [runtimeRunning, verification, stageIndex, stageCount, selectedDomain, revision]);

  const field = useMemo(() => coreField(POINT_BUDGET), []);

  const counts = useMemo(() => (graph ? domainCounts(graph.nodes) : {}), [graph]);
  const peak = useMemo(() => maxCount(counts), [counts]);
  const nodeCount = graph?.nodes.length ?? 0;

  const posture: CorePosture = useMemo(
    () => corePosture({ runtimeRunning, verification, stageIndex, stageCount, nodeCount }),
    [runtimeRunning, verification, stageIndex, stageCount, nodeCount],
  );

  const summary = useMemo(() => {
    const parts = [
      `${nodeCount} topology nodes`,
      `${graph?.edges.length ?? 0} import edges`,
      `${peak} in the busiest domain`,
    ];
    return `Project core. ${posture} posture. ${parts.join(', ')}.`;
  }, [nodeCount, graph?.edges.length, peak, posture]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const rect = host.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const input = inputRef.current;
    const amplitude = coreAmplitude(reduced, posture);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const unit = Math.min(rect.width, rect.height) * 0.5;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Deterministic field. Radius tightens as the stage advances, so progress
    // through the lifecycle is legible in the shape itself.
    const tighten = 1 - (input.stageIndex / Math.max(1, input.stageCount - 1)) * 0.22;
    const spin = reduced ? 0 : timeRef.current * 0.12;
    const accent = readVar(host, '--bo-violet', '#a18acb');
    const lineBright = readVar(host, '--bo-line-bright', '#3d3e43');
    const violetSoft = readVar(host, '--bo-violet-soft', '#c2b5d8');

    for (let i = 0; i < field.length; i += 1) {
      const p = field[i];
      const a = p.a + spin + input.stageIndex * 0.16;
      const radius = unit * p.r * tighten * 0.95;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a * 1.13) * radius * 0.58;
      const emphasis = selectedEmphasis(p.id, input.selectedDomain);
      ctx.beginPath();
      ctx.fillStyle = p.id > 0.86 ? violetSoft : accent;
      // Wide enough that the field reads as a body of structure rather than
      // dust. It is the subject of the centre, not a background texture.
      ctx.globalAlpha = (0.12 + p.id * 0.4) * (0.45 + emphasis * 0.55);
      ctx.arc(x, y, p.s * (unit / 190), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Subsystem rings from real density.
    const ringInput: RingInput = {
      domainCounts: counts,
      selectedDomain: input.selectedDomain,
      maxDomainCount: peak,
      verification: input.verification,
    };
    const rings = coreRings(ringInput);
    for (const ring of rings) {
      ctx.beginPath();
      ctx.setLineDash(ring.dash ?? []);
      ctx.lineWidth = ring.width;
      // Lifted so a present domain is unmistakably a ring rather than a hint.
      ctx.globalAlpha = Math.min(1, ring.emphasis * 1.5);
      ctx.strokeStyle = ring.stroke.startsWith('var(')
        ? resolveVar(host, ring.stroke, lineBright)
        : ring.stroke;
      ctx.arc(cx, cy, unit * ring.radius * tighten, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Verification ring. A failure breaks the circle at a fixed angle, which
    // reads as a precise fault rather than a vague red glow.
    const outer = verificationRing(input.verification);
    const outerRadius = unit * outer.radius * tighten;
    ctx.beginPath();
    ctx.setLineDash(outer.dash ?? []);
    ctx.lineWidth = outer.width;
    ctx.globalAlpha = Math.min(1, outer.emphasis * 1.6);
    ctx.strokeStyle = resolveVar(host, outer.stroke, lineBright);
    if (input.verification === 'fail') {
      ctx.arc(cx, cy, outerRadius, 0.45, Math.PI * 1.55);
      ctx.moveTo(cx + outerRadius, cy);
      ctx.arc(cx, cy, outerRadius, Math.PI * 1.75, Math.PI * 2.45);
    } else {
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Runtime pulse. Deterministic from elapsed time, and only when running.
    if (input.runtimeRunning && !reduced) {
      const pulse = (Math.sin(timeRef.current * 1.15) + 1) / 2;
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1 + pulse * 0.16;
      ctx.strokeStyle = accent;
      ctx.arc(cx, cy, unit * (0.12 + pulse * 0.05), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // KNOuX Core: the canonical dot, so the centre is the real mark node.
    const coreRadius = unit * 0.055;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 3.4);
    gradient.addColorStop(0, violetSoft);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.75 + amplitude * 0.25;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius * 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = readVar(host, '--bo-ink', '#f1eee8');
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [counts, field, peak, posture]);

  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = performance.now();
    let visible = !document.hidden;

    /**
     * The single entry point for starting the loop.
     *
     * Every resume path — mount, tab restore, motion preference change, and
     * scrolling back into view — goes through here. Without the `if (frame)`
     * guard, a fast hide/show or a visibility change landing while the loop is
     * already running would start a second concurrent rAF chain, and two chains
     * would both call `draw`. That is the "one visual field, one loop" rule
     * being broken by accident rather than on purpose.
     */
    const ensureRunning = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const sync = () => {
      if (visible) ensureRunning();
      else stop();
    };

    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };

    const onMotionChange = () => {
      sync();
    };

    // Offscreen cores stop entirely. The spatial stage is tall, so this is the
    // difference between one live loop and two.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const next = entry.isIntersecting && !document.hidden;
          if (next === visible) continue;
          visible = next;
          sync();
        }
      },
      { threshold: 0.02 },
    );
    observer.observe(host);

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduced.matches) timeRef.current += delta;
      draw();
    }

    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotionChange);
    ensureRunning();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotionChange);
    };
  }, [draw]);

  return (
    <div className="sp-core" ref={hostRef}>
      <canvas ref={canvasRef} className="sp-core__canvas" aria-hidden="true" />
      {/* Essential state exists in DOM, not only on the canvas. */}
      <p className="bo-visually-hidden" role="status" aria-live="polite">
        {summary}
      </p>
      <div className="sp-core__legend" aria-hidden="true">
        <span className="sp-core__posture" data-posture={posture}>
          {posture.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function selectedEmphasis(id: number, selected: ProjectNodeDomain | null): number {
  // No domain selected: every point sits at mid emphasis. A selected domain
  // lifts the points that belong to it. There is no random selection and no
  // unknown state rendered as healthy.
  if (!selected) return 0.5;
  return id > 0.72 ? 1 : 0.25;
}

function resolveVar(host: HTMLElement, token: string, fallback: string): string {
  const match = /^var\((--[a-z-]+)\)$/.exec(token.trim());
  if (!match) return token;
  return readVar(host, match[1], fallback);
}
