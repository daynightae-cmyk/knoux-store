'use client';

import { useEffect, useRef } from 'react';
import { buildMarkField, buildStarField, MARK_WORLD_HEIGHT, type MarkFieldParticle, type Star } from '@/lib/knouxField';

/**
 * KNOuX field.
 *
 * The shared environment layer. One Canvas 2D renderer that draws the ambient
 * particle field and, when asked, resolves the canonical KNOuX silhouette out
 * of it. The auth chamber uses it; the vocabulary is the homepage hero's, at
 * Canvas 2D cost rather than a second permanent WebGL renderer.
 *
 * Performance rules this component keeps:
 *   - exactly one animation loop, shared by stars, mark and pointer response
 *   - no React state on pointer movement; every write goes to the canvas or to a
 *     CSS custom property through a ref
 *   - the loop parks itself while the document is hidden and resumes cleanly
 *   - the loop is never created at all under reduced motion or on a coarse
 *     pointer, where a single static frame is drawn instead
 */

const MOBILE_BREAKPOINT = 760;
const PARALLAX_LIMIT = 14;
const MAX_DPR = 2;

export function KnouxField({
  className,
  density = 'full',
  /** Height in CSS pixels the resolved mark should occupy. */
  markHeight = 300,
  /** 0..1. Below 1 the particles hold their scatter. */
  resolved = 0,
  /** Pointer response, desktop fine pointers only. */
  parallax = false,
}: {
  className?: string;
  density?: 'full' | 'light';
  markHeight?: number;
  resolved?: number;
  parallax?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  // The assembly target changes as the arrival sequence advances. It is read
  // through a ref so advancing the sequence does not tear down and rebuild the
  // canvas, the field and the animation loop on every phase change. The ref is
  // written from an effect, never during render.
  const resolvedRef = useRef(resolved);
  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');

    let stars: Star[] = [];
    let mark: MarkFieldParticle[] = [];
    let width = 0;
    let height = 0;
    let ratio = 1;
    let compact = false;
    let frame = 0;
    let running = false;

    // Eased pointer position, held outside React.
    let targetX = 0;
    let targetY = 0;
    let easedX = 0;
    let easedY = 0;
    let pointerActive = false;

    // How far the mark has assembled, damped toward the requested value.
    let assembly = resolvedRef.current >= 1 ? 1 : 0;

    /** Marks the silhouette, converted to pixels for this viewport. */
    let markScale = 1;
    let markCentreX = 0;
    let markCentreY = 0;

    const layout = () => {
      ratio = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      compact = width <= MOBILE_BREAKPOINT;
      const light = density === 'light' || compact;
      stars = buildStarField(light ? 58 : 170);
      mark = buildMarkField(light ? 170 : 420);

      const target = light ? Math.min(markHeight * 0.58, height * 0.24) : Math.min(markHeight, height * 0.52);
      markScale = target / MARK_WORLD_HEIGHT;
      // The canonical mark owns the negative-space side of the auth chamber.
      // There is deliberately no character/mascot competing with it: the same
      // particle identity used by KNOuX becomes the sole cinematic subject.
      markCentreX = compact ? width * 0.5 : Math.min(width * 0.33, 560);
      // On phones the mark remains a compact identity band above the form; on
      // desktop it sits optically centred against the auth panel.
      markCentreY = compact ? height * 0.19 : height * 0.47;
    };

    const drawStars = (seconds: number) => {
      for (const star of stars) {
        // Depth is the layer: near points move furthest and read largest.
        const depth = star.layer === 'near' ? 1 : star.layer === 'mid' ? 0.5 : 0.18;
        // Once the mark has assembled the surrounding field settles, so the
        // identity is the stillest thing in the room.
        const calm = 1 - assembly * 0.72;

        const x = star.x * width + star.driftX * seconds * width * 1000 * calm + easedX * depth * -1;
        const y =
          star.y * height +
          star.driftY * seconds * height * 1000 * calm +
          Math.sin(seconds * 0.06 + star.phase) * 2.2 * depth * calm +
          easedY * depth * -1;

        const twinkle = star.amplitude * Math.sin(seconds * star.speed + star.phase);
        const alpha = Math.max(0.02, Math.min(1, star.alpha + twinkle));
        if (alpha <= 0.035) continue;

        context.beginPath();
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fillStyle = star.violet ? `rgba(190,168,224,${alpha})` : `rgba(226,224,231,${alpha})`;
        context.fill();
      }
    };

    const drawMark = () => {
      if (assembly <= 0.001) return;
      for (const particle of mark) {
        // Each particle is released on its own order, so the silhouette resolves
        // from its contour inward rather than fading up as one shape.
        const local = Math.max(0, Math.min(1, (assembly - particle.order * 0.55) / 0.45));
        const eased = local * local * (3 - 2 * local);

        const x = markCentreX + (particle.scatterX + particle.offsetX * eased) * markScale + easedX * -0.4;
        const y = markCentreY + (particle.scatterY + particle.offsetY * eased) * markScale + easedY * -0.4;
        const radius = Math.max(0.32, particle.radius * markScale * (0.72 + eased * 0.6));
        // Faint, but present enough that the silhouette is legible as the mark
        // rather than as a smudge. The contour term is what makes the outline
        // resolve first and hold the shape.
        const alpha = (0.1 + particle.glow * 0.5) * eased;

        if (alpha <= 0.02) continue;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = particle.violet ? `rgba(178,150,214,${alpha})` : `rgba(232,229,238,${alpha})`;
        context.fill();
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      drawStars(time / 1000);
      drawMark();
    };

    const tick = (time: number) => {
      if (parallax && fine.matches) {
        if (pointerActive) {
          easedX += (targetX - easedX) * 0.08;
          easedY += (targetY - easedY) * 0.08;
        } else {
          easedX += (0 - easedX) * 0.06;
          easedY += (0 - easedY) * 0.06;
        }
      }

      if (planeRef.current) {
        planeRef.current.style.setProperty('--chamber-x', `${easedX.toFixed(2)}px`);
        planeRef.current.style.setProperty('--chamber-y', `${easedY.toFixed(2)}px`);
      }

      // Assembly is damped rather than snapped, so the mark resolves at the
      // pace of the arrival beat instead of jumping. The rate is chosen so the
      // silhouette is legible by the time the panel has finished rising, rather
      // than still condensing behind a finished form.
      const target = resolvedRef.current;
      if (assembly !== target) {
        assembly += (target - assembly) * 0.085;
        if (Math.abs(target - assembly) < 0.002) assembly = target;
      }

      draw(time);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced.matches) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    const onPointer = (event: PointerEvent) => {
      if (!parallax || !fine.matches || compact) return;
      pointerActive = true;
      targetX = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1)) * PARALLAX_LIMIT;
      targetY = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1)) * PARALLAX_LIMIT;
    };

    const onPointerLeave = () => {
      pointerActive = false;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onResize = () => {
      layout();
      if (reduced.matches) draw(0);
    };

    layout();

    if (reduced.matches) {
      // One static frame. No loop is ever created, so a reduced-motion visitor
      // pays for a single paint.
      assembly = resolvedRef.current;
      draw(0);
    } else {
      window.addEventListener('resize', onResize);
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('visibilitychange', onVisibility);
      start();
    }

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density, markHeight, parallax]);

  return (
    <div className={className} ref={planeRef} aria-hidden="true">
      <canvas className="chamber__field" ref={canvasRef} />
    </div>
  );
}
