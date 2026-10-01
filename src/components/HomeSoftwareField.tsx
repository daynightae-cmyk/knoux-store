'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { softwareProducts } from '@/data/software';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

// ─── types ───────────────────────────────────────────────────────────────────

type State = {
  /** Index into softwareProducts, or -1 for none. */
  active: number;
  /** Whether the current active was set by pointer/keyboard vs scroll. */
  engaged: boolean;
};

type Action =
  | { type: 'engage'; index: number }
  | { type: 'disengage' }
  | { type: 'scroll'; index: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'engage':
      return { active: action.index, engaged: true };
    case 'disengage':
      return { active: state.active, engaged: false };
    case 'scroll':
      // Don't override a deliberate engagement from pointer/keyboard.
      if (state.engaged) return state;
      return { active: action.index, engaged: false };
  }
}

// ─── geometry helpers ─────────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 560;
const CX = SVG_W / 2;
const CY = SVG_H / 2;

/** Orbit radii in SVG units (matching orbit tiers 1/2). */
const ORBIT_R: Record<1 | 2 | 3, number> = { 1: 158, 2: 226, 3: 290 };

/** Convert polar topology coords to Cartesian SVG coords. */
function toXY(orbit: 1 | 2 | 3, angleDeg: number): { x: number; y: number } {
  const r = ORBIT_R[orbit];
  // Offset by -90° so 0° is at top; angleDeg is counter-clockwise in data.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

/** Quadratic Bézier path from core (cx, cy) to a node, curving gently. */
function bezierPath(nx: number, ny: number): string {
  const mx = (CX + nx) / 2;
  const my = (CY + ny) / 2;
  // Control point nudged perpendicular to the chord.
  const dx = ny - CY;
  const dy = CX - nx;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const bend = 0.18;
  const qx = mx + (dx / len) * len * bend;
  const qy = my + (dy / len) * len * bend;
  return `M ${CX} ${CY} Q ${qx} ${qy} ${nx} ${ny}`;
}

// ─── pre-compute product positions ───────────────────────────────────────────

const POSITIONS = softwareProducts.map((p) => toXY(p.topology.orbit, p.topology.angleDeg));
const PATHS = softwareProducts.map((_, i) => bezierPath(POSITIONS[i].x, POSITIONS[i].y));

/**
 * Returns true if product at index `b` is directly related to product at `a`.
 */
function areRelated(a: number, b: number): boolean {
  const pa = softwareProducts[a];
  const pb = softwareProducts[b];
  return pa.relatedIds.includes(pb.id) || pb.relatedIds.includes(pa.id);
}

// ─── SVG field ────────────────────────────────────────────────────────────────

function SystemFieldSVG({
  active,
  onEngage,
  onDisengage,
}: {
  active: number;
  onEngage: (i: number) => void;
  onDisengage: () => void;
}) {
  const router = useRouter();
  const hasActive = active >= 0;

  return (
    <svg
      className="sys-field__svg"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sfCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c5a2e4" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c5a2e4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sfCoreFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1826" />
          <stop offset="100%" stopColor="#0e0d12" />
        </radialGradient>
        <filter id="sfGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip the mark to the core circle */}
        <clipPath id="sfMarkClip">
          <circle cx={CX} cy={CY} r={38} />
        </clipPath>
      </defs>

      {/* Orbit ring guides */}
      {([1, 2] as const).map((tier) => (
        <circle
          key={tier}
          cx={CX}
          cy={CY}
          r={ORBIT_R[tier]}
          className="sys-field__orbit-ring"
        />
      ))}

      {/* Signal paths — core to each node */}
      {softwareProducts.map((_, i) => {
        const isActive = hasActive && active === i;
        const isRelated = hasActive && active !== i && areRelated(active, i);
        const isReceded = hasActive && !isActive && !isRelated;
        return (
          <path
            key={i}
            d={PATHS[i]}
            className={[
              'sys-field__path',
              isActive ? 'sys-field__path--active' : '',
              isRelated ? 'sys-field__path--related' : '',
              isReceded ? 'sys-field__path--receded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        );
      })}

      {/* Core glow halo */}
      <circle cx={CX} cy={CY} r={72} fill="url(#sfCoreGlow)" />

      {/* Core body */}
      <circle cx={CX} cy={CY} r={40} fill="url(#sfCoreFill)" />
      <circle cx={CX} cy={CY} r={40} className="sys-field__core-ring" />

      {/* Canonical KNOuX mark — clipped to core */}
      <g clipPath="url(#sfMarkClip)">
        <svg
          x={CX - 38}
          y={CY - 38}
          width={76}
          height={76}
          viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}
        >
          {MARK_PATHS.map((path) => (
            <path
              key={path.id}
              d={path.d}
              className="sys-field__core-mark"
            />
          ))}
        </svg>
      </g>

      {/* System nodes */}
      {softwareProducts.map((product, i) => {
        const { x, y } = POSITIONS[i];
        const isActive = hasActive && active === i;
        const isRelated = hasActive && active !== i && areRelated(active, i);
        const isReceded = hasActive && !isActive && !isRelated;

        return (
          <g
            key={product.id}
            transform={`translate(${x},${y})`}
            className={[
              'sys-field__node',
              isActive ? 'sys-field__node--active' : '',
              isRelated ? 'sys-field__node--related' : '',
              isReceded ? 'sys-field__node--receded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseEnter={() => onEngage(i)}
            onMouseLeave={onDisengage}
            onClick={() => {
              if (active === i) {
                router.push(`/products/${product.slug}`);
              } else {
                onEngage(i);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Hit area (invisible, larger than visible node) */}
            <circle r={32} fill="transparent" />

            {/* Node ring */}
            <circle r={9} className="sys-field__node-ring" />
            {/* Active pulse ring */}
            {isActive && (
              <circle r={15} className="sys-field__node-pulse" />
            )}

            {/* Label — positioned above/below based on angle */}
            <text
              dy={POSITIONS[i].y < CY - 20 ? -20 : POSITIONS[i].y > CY + 20 ? 22 : 14}
              textAnchor="middle"
              className="sys-field__node-label"
            >
              {product.shortName}
            </text>
            <text
              dy={POSITIONS[i].y < CY - 20 ? -30 : POSITIONS[i].y > CY + 20 ? 33 : -8}
              textAnchor="middle"
              className="sys-field__node-code"
            >
              {product.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── dossier panel ────────────────────────────────────────────────────────────

function SystemDossier({ active }: { active: number }) {
  const product = active >= 0 ? (softwareProducts[active] ?? softwareProducts[0]) : softwareProducts[0];
  const hasActive = active >= 0;

  return (
    <div className={`sys-field__dossier ${hasActive ? 'sys-field__dossier--visible' : ''}`} aria-live="polite" aria-atomic="true">
      <div className="sys-field__dossier-top">
        <span className="sys-field__dossier-index">
          {product.index} / {product.status.replace(/-/g, ' ').toUpperCase()}
        </span>
        <span className="sys-field__dossier-code">{product.code}</span>
      </div>
      <h3 className="sys-field__dossier-name">{product.name}</h3>
      <p className="sys-field__dossier-tagline">{product.tagline}</p>
      <dl className="sys-field__dossier-facts">
        <div>
          <dt>STATUS</dt>
          <dd>{product.status.toUpperCase()}</dd>
        </div>
        <div>
          <dt>FAMILY</dt>
          <dd>{product.family}</dd>
        </div>
        <div>
          <dt>DISCIPLINE</dt>
          <dd>{product.discipline.toUpperCase()}</dd>
        </div>
      </dl>
      <Link
        href={`/products/${product.slug}`}
        className="sys-field__dossier-link"
        tabIndex={hasActive ? 0 : -1}
      >
        OPEN {product.shortName.toUpperCase()} <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

/**
 * KNOuX SYSTEM FIELD
 *
 * A spatial, scroll-synchronized navigator for the verified KNOuX software
 * registry. Uses SVG + CSS only — no additional WebGL context. The Hero
 * already owns the WebGL budget for this page.
 *
 * Layout: left identity (SVG topology field + dossier) / right scrollable
 * record list (keyboard reachable, scroll-driven auto-selection).
 */
export function HomeSoftwareField() {
  const [state, dispatch] = useReducer(reducer, { active: 0, engaged: false });
  const hostRef = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLDivElement>(null);

  // ── Scroll-driven auto-selection ────────────────────────────────────────────
  useEffect(() => {
    const records = recordsRef.current;
    if (!records || typeof IntersectionObserver === 'undefined') return;
    const rows = Array.from(
      records.querySelectorAll<HTMLElement>('[data-software-index]'),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          dispatch({
            type: 'scroll',
            index: Number((best.target as HTMLElement).dataset.softwareIndex),
          });
        }
      },
      { rootMargin: '-18% 0px -22% 0px', threshold: [0.2, 0.55, 0.85] },
    );
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  // ── Keyboard: Escape restores field ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'disengage' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleEngage = useCallback((i: number) => {
    dispatch({ type: 'engage', index: i });
  }, []);

  const handleDisengage = useCallback(() => {
    dispatch({ type: 'disengage' });
  }, []);

  const handleRecordEnter = useCallback((i: number) => {
    dispatch({ type: 'engage', index: i });
  }, []);

  const handleRecordLeave = useCallback(() => {
    dispatch({ type: 'disengage' });
  }, []);

  return (
    <div
      ref={hostRef}
      className={`sys-field ${state.active >= 0 ? 'sys-field--active' : ''}`}
    >
      {/* ─── Left: spatial topology field ─────────────────────────────────── */}
      <aside className="sys-field__identity" aria-label="KNOuX System Field topology">
        {/* HUD header */}
        <div className="sys-field__hud">
          <span>KN / SYSTEM FIELD</span>
          <span>{String(softwareProducts.length).padStart(2, '0')} SYSTEMS</span>
        </div>

        {/* Topology SVG */}
        <div className="sys-field__canvas">
          <SystemFieldSVG
            active={state.active}
            onEngage={handleEngage}
            onDisengage={handleDisengage}
          />
        </div>

        {/* Dossier — updates on focus/hover/scroll */}
        <SystemDossier active={state.active} />
      </aside>

      {/* ─── Right: scrollable records ──────────────────────────────────────── */}
      <div
        ref={recordsRef}
        className="sys-field__records"
        aria-label="Verified KNOuX software systems"
      >
        {softwareProducts.map((product, index) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="sys-field__record"
            data-software-index={index}
            data-serial={product.index}
            data-active={state.active === index ? 'true' : 'false'}
            onMouseEnter={() => handleRecordEnter(index)}
            onMouseLeave={handleRecordLeave}
            onFocus={() => handleRecordEnter(index)}
            onBlur={handleRecordLeave}
          >
            <span className="sys-field__record-index">
              {product.index} / {product.code}
            </span>
            <strong className="sys-field__record-name">{product.name}</strong>
            <span className="sys-field__record-meta">
              {product.discipline.toUpperCase()} / {product.family}
            </span>
            <span className="sys-field__record-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
        <p className="sys-field__source">
          Every record resolves to its current registry dossier and repository evidence.
        </p>
      </div>
    </div>
  );
}
