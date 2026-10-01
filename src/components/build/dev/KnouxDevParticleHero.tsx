'use client';

/**
 * KNOuX DEV hero field.
 *
 * Rendered with Canvas 2D, deliberately, for the same reason
 * `build/spatial/ProjectCore.tsx` is: this site already owns WebGL contexts for
 * the Living Mark and the auth scene, and a third full-screen context on a
 * modest integrated GPU is the wrong trade. The cost was measured rather than
 * assumed — this component was the only static `three` import on the route, and
 * it put a 912 KB chunk in `/build`'s initial payload, which is what pushed the
 * route over its own script budget in `e2e/performance.spec.ts`.
 *
 * The text sampling was already Canvas 2D; only the renderer was WebGL. So
 * dropping the renderer drops the dependency and nothing else about the field
 * changes: the same seeded points, the same KNOuX-to-DEV morph on hover, and the
 * same 12% of drifting noise that gives the field a body instead of reading as a
 * flat cut-out of two words.
 *
 * One `requestAnimationFrame` loop, cancelled on unmount, skipped when the
 * document is hidden or the hero is offscreen, frozen under reduced motion, DPR
 * capped, and every particle batched into a single path so a frame is one fill
 * rather than nine thousand.
 */

import { useEffect, useRef, useState } from 'react';

const PARTICLE = {
  count: 9000,
  mobileCount: 4600,
  size: 1.5,
  sizeVariation: 2.4,
  repelRadius: 5.5,
  force: 1.9,
  friction: 0.84,
  returnSpeed: 0.1,
  morphDuration: 0.55,
  driftSpeed: 0.7,
  seed: 40,
  scale: 0.91,
  color: '#d8d4d4',
};

/** DPR is capped: a field this dense is fill-rate bound above it. */
const DPR_CAP = 1.5;

/** The sampled field's extent in its own units, centred on the origin. */
const FIELD_WIDTH = 20;
const FIELD_HEIGHT = 6;

/** Deterministic: the same build always draws the same field. */
function random(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * Reads real glyph coverage from a 2D context, so the field is a reading of the
 * wordmark rather than an authored approximation of it.
 */
function sampleText(word: string): [number, number][] {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 360;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${word === 'DEV' ? 300 : 260}px Arial, Helvetica, sans-serif`;
  context.fillText(word, 600, 180);
  const pixels = context.getImageData(0, 0, 1200, 360).data;
  const points: [number, number][] = [];
  for (let y = 0; y < 360; y += 3) {
    for (let x = 0; x < 1200; x += 3) {
      if (pixels[(y * 1200 + x) * 4 + 3] > 90) points.push([(x - 600) / 60, (y - 180) / 60]);
    }
  }
  return points;
}

interface Field {
  positions: Float32Array;
  starts: Float32Array;
  ends: Float32Array;
  velocities: Float32Array;
  sizes: Float32Array;
}

/**
 * 12% of the points are noise rather than text, and those have identical start
 * and end positions — so the morph moves the wordmark and leaves the field
 * around it where it is.
 */
function buildField(count: number): Field {
  const from = sampleText('KNOuX');
  const to = sampleText('DEV');
  const rand = random(PARTICLE.seed);
  const positions = new Float32Array(count * 2);
  const starts = new Float32Array(count * 2);
  const ends = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const at = i * 2;
    sizes[i] = PARTICLE.size + rand() * PARTICLE.sizeVariation;

    if (i >= count * 0.88) {
      const x = (rand() - 0.5) * FIELD_WIDTH * 1.5;
      const y = (rand() - 0.5) * FIELD_HEIGHT * 1.2;
      starts[at] = x;
      starts[at + 1] = y;
      ends[at] = x;
      ends[at + 1] = y;
      positions[at] = x;
      positions[at + 1] = y;
      continue;
    }

    const a = from[Math.floor(rand() * from.length)] ?? [0, 0];
    const b = to[Math.floor(rand() * to.length)] ?? [0, 0];
    starts[at] = a[0] + (rand() - 0.5) * 0.17;
    starts[at + 1] = a[1] + (rand() - 0.5) * 0.15;
    ends[at] = b[0] + (rand() - 0.5) * 0.17;
    ends[at + 1] = b[1] + (rand() - 0.5) * 0.15;
    positions[at] = starts[at];
    positions[at + 1] = starts[at + 1];
  }

  return { positions, starts, ends, velocities, sizes };
}

export function KnouxDevParticleHero() {
  const area = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const element = document.getElementById('dev-particle-hero');
    if (!element) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden));
    const onVisibility = () => {
      const rect = element.getBoundingClientRect();
      setVisible(!document.hidden && rect.bottom > 0 && rect.top < window.innerHeight);
    };
    updateMotion();
    observer.observe(element);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /**
   * Hover, visibility and the motion preference are read through refs inside the
   * frame loop. Routing them through state would restart the whole effect — and
   * rebuild a nine-thousand-point field — every time the pointer crossed the
   * hero.
   */
  const hoverRef = useRef(hover);
  const runningRef = useRef(visible && !reduced);
  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);
  useEffect(() => {
    runningRef.current = visible && !reduced;
  }, [visible, reduced]);

  useEffect(() => {
    const host = area.current;
    const canvas = surface.current;
    if (!host || !canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const count = () => (window.innerWidth < 700 ? PARTICLE.mobileCount : PARTICLE.count);
    let field = buildField(count());
    let width = 0;
    let height = 0;
    let progress = 0;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      // A hero that has not been laid out yet has no field to draw into.
      if (rect.width < 8 || rect.height < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      width = rect.width;
      height = rect.height;
      const nextWidth = Math.floor(width * dpr);
      const nextHeight = Math.floor(height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onResize = () => {
      resize();
      // The mobile field is genuinely a smaller field, not the same field at
      // fewer pixels, so a width class change rebuilds rather than rescales.
      const next = count();
      if (next !== field.positions.length / 2) field = buildField(next);
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const step = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!runningRef.current) return;
      if (!width || !height) {
        resize();
        return;
      }

      const target = hoverRef.current ? 1 : 0;
      progress += (target - progress) * Math.min(1, (step / PARTICLE.morphDuration) * 4);

      const { positions, starts, ends, velocities, sizes } = field;
      // Fit the sampled field to the hero while keeping the aspect it was
      // sampled at, so the wordmark never stretches.
      const scale = Math.min(width / (FIELD_WIDTH * 1.12), height / (FIELD_HEIGHT * 1.35)) * PARTICLE.scale;
      const cx = width / 2;
      const cy = height / 2;
      const sizeScale = scale / 12;

      // The pointer is read from the hero's own hover state rather than a move
      // listener: the field is decorative, and a pointer handler over thousands
      // of points is work nobody asked for.
      const repelAt = hoverRef.current;
      const pointerX = (repelAt ? 0.5 : Number.POSITIVE_INFINITY) * FIELD_WIDTH;
      const pointerY = 0;

      context.clearRect(0, 0, width, height);
      context.beginPath();

      for (let i = 0; i < positions.length; i += 2) {
        const homeX = starts[i] + (ends[i] - starts[i]) * progress;
        const homeY = starts[i + 1] + (ends[i + 1] - starts[i + 1]) * progress;
        const dx = positions[i] - pointerX;
        const dy = positions[i + 1] - pointerY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const repel = distance < PARTICLE.repelRadius ? (1 - distance / PARTICLE.repelRadius) * PARTICLE.force * step : 0;
        velocities[i] = (velocities[i] + (homeX - positions[i]) * PARTICLE.returnSpeed + (dx / distance) * repel) * PARTICLE.friction;
        velocities[i + 1] = (velocities[i + 1] + (homeY - positions[i + 1]) * PARTICLE.returnSpeed + (dy / distance) * repel) * PARTICLE.friction;
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];

        const half = sizes[i / 2] * sizeScale * 0.5;
        const x = cx + positions[i] * scale;
        const y = cy + positions[i + 1] * scale;
        context.rect(x - half, y - half, half * 2, half * 2);
      }

      context.fillStyle = PARTICLE.color;
      context.globalAlpha = 0.91;
      context.fill();
      context.globalAlpha = 1;
    };

    resize();
    window.addEventListener('resize', onResize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section
      id="dev-particle-hero"
      className="dev-hero"
      onPointerEnter={() => setHover(window.innerWidth >= 700)}
      onPointerLeave={() => setHover(false)}
      aria-label="KNOuX DEV"
    >
      <div className="dev-hero__micro">
        <span>KN / DEV — 001</span>
        <span>DIGITAL HEADQUARTERS</span>
        <span>SCROLL TO EXPLORE ↓</span>
      </div>
      <div className="dev-hero__canvas" ref={area} aria-hidden="true">
        <canvas ref={surface} />
      </div>
      <div className="dev-hero__word" aria-hidden="true">
        KNOuX <span>DEV</span>
      </div>
      <div className="dev-hero__bottom">
        <div>
          CREATE. <span>RUN.</span> PREVIEW. <span>DEPLOY.</span>
        </div>
        <p>Build applications, services, previews, knowledge and tools in one connected workspace.</p>
      </div>
    </section>
  );
}
