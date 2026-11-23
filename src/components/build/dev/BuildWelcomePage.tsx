'use client';

/**
 * Build entry - NSIS reference 82231 ("Welcome to KNOUX STORE").
 *
 * The whole viewport is the reference composition rendered as code: the
 * living atmosphere canvas supplies stars, drifting worlds and the occasional
 * meteor; this scene supplies the nebula banks, the orbital navigation, the
 * canonical KNOuX mark (filled from `MARK_PATHS`, never a raster), the
 * raised-glass destinations and the Earth limb.
 *
 * The five destinations are real routes. Build opens the engineering
 * workspace through the caller's `onEnter`; the other four navigate to the
 * live Build surfaces they name. No counts, statuses or release values are
 * invented here.
 */
import Link from 'next/link';
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import s from './build-welcome.module.css';

type NodeId = 'build' | 'providers' | 'models' | 'terminal' | 'deployments';

const NODE_ICONS: Record<NodeId, string> = {
  build: 'M12 3.4 21 8l-9 4.6L3 8l9-4.6Z M3 12.1l9 4.6 9-4.6 M3 16.2l9 4.6 9-4.6',
  providers: 'M9 3.2v5 M15 3.2v5 M7 8.2h10v2.9a5 5 0 0 1-10 0Z M12 16.1v4.7',
  models: 'M12 3.2 21 8l-9 4.8L3 8l9-4.8Z M3 12l9 4.8 9-4.8 M3 16l9 4.8 9-4.8',
  terminal: 'M4 6.4 9.6 12 4 17.6 M12.4 18h7.6',
  // The reference draws Deployments as a launch rocket, not a map pin.
  deployments: 'M12 15.2 8.8 12a21 21 0 0 1 2-3.9A12.6 12.6 0 0 1 21.6 2.4c0 2.7-.8 7.4-6 10.9a21 21 0 0 1-3.6 1.9Z M8.8 12H4.2s.5-2.9 1.9-3.8c1.5-1 4.7 0 4.7 0 M12 15.2v4.6s2.9-.5 3.8-1.9c1-1.5 0-4.7 0-4.7 M4.6 16.6c-1.4 1.2-1.9 4.8-1.9 4.8s3.6-.5 4.8-1.9c.7-.8.6-2-.1-2.8a2.1 2.1 0 0 0-2.8-.1Z',
};

/**
 * Light junctions measured against reference 82231 (fractions of the orbit
 * field). The first five sit at the pills; the rest travel the two rings.
 */
const ORBIT_NODES: ReadonlyArray<Readonly<{ x: number; y: number; anchor?: boolean; size?: 'sm' }>> = [
  { x: 35.9, y: 19.5 },
  { x: 64, y: 19.3 },
  { x: 15.7, y: 46.4, size: 'sm' },
  { x: 84.1, y: 46.4, size: 'sm' },
  { x: 39.6, y: 96.5 },
  { x: 60.8, y: 96.1 },
  { x: 67.6, y: 48.3, anchor: true },
  { x: 31.7, y: 55.6, size: 'sm' },
];

function NodeIcon({ id }: Readonly<{ id: NodeId }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={NODE_ICONS[id]} />
      {id === 'models' ? <path d="M12 13.2 3 8" opacity=".55" /> : null}
      {id === 'deployments' ? <circle cx="15.4" cy="8.6" r="1.35" /> : null}
    </svg>
  );
}

function Mark({ uid }: Readonly<{ uid: string }>) {
  const bodyId = `kw-welcome-body-${uid}`;
  const dotId = `kw-welcome-dot-${uid}`;
  const rimId = `kw-welcome-rim-${uid}`;
  const sheenId = `kw-welcome-sheen-${uid}`;
  const coreId = `kw-welcome-core-${uid}`;
  const grainId = `kw-welcome-grain-${uid}`;
  const clipId = `kw-welcome-clip-${uid}`;
  const glowId = `kw-welcome-glow-${uid}`;
  return (
    <svg className={s.mark} viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} role="img" aria-label="KNOuX particle mark">
      <defs>
        <linearGradient id={bodyId} x1="0.08" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f7efff" />
          <stop offset="0.08" stopColor="#d8b4fe" />
          <stop offset="0.22" stopColor="#a855f7" />
          <stop offset="0.4" stopColor="#7c3aed" />
          <stop offset="0.6" stopColor="#5b21b6" />
          <stop offset="0.8" stopColor="#3b0764" />
          <stop offset="1" stopColor="#1e0b3a" />
        </linearGradient>
        <radialGradient id={dotId} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#f3e8ff" />
          <stop offset="0.58" stopColor="#c084fc" />
          <stop offset="0.82" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4c1d95" />
        </radialGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.38" stopColor="#f1e2ff" />
          <stop offset="0.7" stopColor="#c99bff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="0.14" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="0.34" stopColor="#7c3aed" stopOpacity="0" />
          <stop offset="0.56" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.72" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id={coreId}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#fbf5ff" stopOpacity="0.98" />
          <stop offset="0.44" stopColor="#e9d5ff" stopOpacity="0.72" />
          <stop offset="0.72" stopColor="#c084fc" stopOpacity="0.28" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <pattern id={grainId} width="23" height="29" patternUnits="userSpaceOnUse" patternTransform="rotate(7)">
          <circle cx="2.5" cy="4" r="2.2" fill="#ffffff" opacity="0.95" />
          <circle cx="11" cy="9" r="1.5" fill="#f5e8ff" opacity="0.8" />
          <circle cx="19" cy="3" r="1.1" fill="#ffffff" opacity="0.65" />
          <circle cx="6" cy="16" r="1.8" fill="#ffffff" opacity="0.85" />
          <circle cx="16" cy="20" r="1.2" fill="#e9d5ff" opacity="0.7" />
          <circle cx="21" cy="13" r="0.8" fill="#ffffff" opacity="0.55" />
          <circle cx="3" cy="25" r="1.3" fill="#ffffff" opacity="0.7" />
          <circle cx="12" cy="27" r="0.9" fill="#f5e8ff" opacity="0.6" />
          <circle cx="19" cy="26" r="1.6" fill="#ffffff" opacity="0.8" />
        </pattern>
        <clipPath id={clipId}>
          {MARK_PATHS.map(({ id, d }) => <path key={id} d={d} />)}
        </clipPath>
        <filter id={glowId} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      {/* The bloom is a blurred copy of the same geometry, not a drop shadow:
          it keeps the silhouette exact at every size. The dot carries its own
          tighter halo, as in the reference. */}
      <circle cx="256" cy="264" r="78" fill={`url(#${coreId})`} opacity="0.5" />
      <g filter={`url(#${glowId})`} opacity="0.52">
        {MARK_PATHS.map(({ id, d }) => <path key={id} d={d} fill="#a855f7" />)}
      </g>
      <g>
        {MARK_PATHS.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            fill={`url(#${id === 'dot' ? dotId : bodyId})`}
            stroke="#3b0764"
            strokeOpacity="0.72"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g clipPath={`url(#${clipId})`}>
        <rect width={MARK_VIEW_BOX.width} height={MARK_VIEW_BOX.height} fill={`url(#${grainId})`} opacity="0.96" />
        <rect width={MARK_VIEW_BOX.width} height={MARK_VIEW_BOX.height} fill={`url(#${sheenId})`} opacity="0.5" />
        <ellipse cx="118" cy="190" rx="150" ry="88" fill="#ffffff" opacity="0.06" transform="rotate(-34 118 190)" />
      </g>
      <g fill="none" strokeLinejoin="round">
        {MARK_PATHS.map(({ id, d }) => (
          <path key={id} d={d} stroke={`url(#${rimId})`} strokeWidth="2.1" strokeOpacity="0.9" />
        ))}
        {MARK_PATHS.map(({ id, d }) => (
          <path key={`${id}-hair`} d={d} stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.55" />
        ))}
      </g>
      <g className={s.star}>
        <circle cx="212" cy="300" r="58" fill={`url(#${coreId})`} />
        <path d="M212 172v256M84 300h256" stroke="#e9d5ff" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M212 232v136M144 300h136" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.92" />
        <circle cx="212" cy="300" r="5" fill="#ffffff" />
        <circle cx="212" cy="300" r="2" fill="#ffffff" />
      </g>
    </svg>
  );
}

export function BuildWelcomePage({ onEnter }: Readonly<{ onEnter?: () => void }> = {}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = useRef<HTMLDivElement>(null);
  const ringId = `kw-welcome-ring-${uid}`;
  const ringBId = `kw-welcome-ring-b-${uid}`;
  const dustAId = `kw-welcome-dust-a-${uid}`;
  const dustBId = `kw-welcome-dust-b-${uid}`;

  // A shallow pointer parallax on the dust banks. The atmosphere canvas
  // already parallaxes the stars; this only moves the painted nebula so the
  // scene has two believable depth planes. Reduced motion disables it.
  useEffect(() => {
    const element = scene.current;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2));
        const y = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2));
        element.style.setProperty('--px', x.toFixed(3));
        element.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const build = onEnter ? (
    <button type="button" className={`${s.node} ${s.build}`} onClick={onEnter}>
      <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="build" /></span>
      <span>Build</span>
      <span className={s.pin} aria-hidden="true" />
    </button>
  ) : (
    <Link href="/build/pipeline" className={`${s.node} ${s.build}`}>
      <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="build" /></span>
      <span>Build</span>
      <span className={s.pin} aria-hidden="true" />
    </Link>
  );

  return (
    <div className={s.page}>
      <section ref={scene} className={s.scene} aria-labelledby="build-welcome-title" data-scene="build-welcome">
        <div className={s.nebula} aria-hidden="true" />
        {/* Fractal dust: seeded turbulence, masked to the nebula banks, so the
            clouds read as grain instead of painted blobs. Two octaves of
            violet grain plus a finer lavender pass; static render, the drift
            animation lives on the wrapper. */}
        <svg className={s.dust} viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id={dustAId} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="4" seed="17" result="t" />
              <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.28  0 0 0 0 0.92  .85 .35 0 0 0" />
            </filter>
            <filter id={dustBId} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="3" seed="41" result="t" />
              <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.82  0 0 0 0 0.62  0 0 0 0 1  0 0 .7 0 0" />
            </filter>
          </defs>
          <rect width="1200" height="800" filter={`url(#${dustAId})`} />
          <rect width="1200" height="800" filter={`url(#${dustBId})`} className={s.dustFine} />
        </svg>
        <span className={s.planetA} aria-hidden="true" />
        <span className={s.planetB} aria-hidden="true" />

        <header className={s.header}>
          <Link href="/" className={s.brand} aria-label="KNOuX Store home">
            <i aria-hidden="true" />KNOuX <span>STORE</span>
          </Link>
          <h1 id="build-welcome-title" className={s.title}>Welcome to KNOUX STORE</h1>
          <nav className={s.platformLinks} aria-label="Build platform">
            <Link href="/build/platform">One Platform</Link>
            <Link href="/build/pipeline">Verification pipeline</Link>
          </nav>
        </header>

        <div className={s.field}>
          <svg className={s.rings} viewBox="0 0 1200 640" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#a678e8" stopOpacity="0.12" />
                <stop offset="0.24" stopColor="#e2c4ff" stopOpacity="0.5" />
                <stop offset="0.5" stopColor="#fbf5ff" stopOpacity="0.62" />
                <stop offset="0.76" stopColor="#c9a2ff" stopOpacity="0.46" />
                <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.14" />
              </linearGradient>
              <linearGradient id={ringBId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#b98cf0" stopOpacity="0.12" />
                <stop offset="0.5" stopColor="#f3e8ff" stopOpacity="0.42" />
                <stop offset="1" stopColor="#9d6be8" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <ellipse cx="600" cy="368" rx="374" ry="282" fill="none" stroke="#a855f7" strokeOpacity="0.12" strokeWidth="6" vectorEffect="non-scaling-stroke" />
            <g fill="none" vectorEffect="non-scaling-stroke">
              <ellipse cx="600" cy="368" rx="364" ry="272" stroke={`url(#${ringId})`} strokeWidth="1.05" />
              <ellipse cx="600" cy="332" rx="223" ry="90" transform="rotate(-7 600 332)" stroke={`url(#${ringBId})`} strokeWidth="0.85" />
              <ellipse cx="600" cy="332" rx="252" ry="108" transform="rotate(-7 600 332)" stroke="#c9a2ff" strokeOpacity="0.1" strokeWidth="0.7" />
            </g>
            <path d="M600 96v110" stroke="#e2c4ff" strokeOpacity="0.2" strokeWidth="0.9" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
            <ellipse className={s.travelA} cx="600" cy="368" rx="364" ry="272" fill="none" stroke="#f8f1ff" strokeWidth="1.35" strokeDasharray="2 998" strokeLinecap="round" pathLength="1000" vectorEffect="non-scaling-stroke" />
            <ellipse className={s.travelB} cx="600" cy="332" rx="223" ry="90" transform="rotate(-7 600 332)" fill="none" stroke="#f3e8ff" strokeWidth="1.1" strokeDasharray="1.4 998.6" strokeLinecap="round" pathLength="1000" vectorEffect="non-scaling-stroke" />
          </svg>

          <div className={s.nodeField} aria-hidden="true">
            {ORBIT_NODES.map((node, index) => (
              <span
                key={`${node.x}-${node.y}`}
                className={`${s.orbitNode}${node.anchor ? ` ${s.orbitAnchor}` : ''}${node.size === 'sm' ? ` ${s.orbitNodeSm}` : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${(index * -0.73).toFixed(2)}s` } as CSSProperties}
              />
            ))}
          </div>

          {onEnter ? (
            <button type="button" className={s.core} onClick={onEnter} aria-label="KNOuX STORE — enter the engineering workspace">
              <span className={s.coreHalo} aria-hidden="true" />
              <Mark uid={uid} />
            </button>
          ) : (
            <Link href="/build" className={s.core} aria-label="KNOuX STORE - open the Build welcome page">
              <span className={s.coreHalo} aria-hidden="true" />
              <Mark uid={uid} />
            </Link>
          )}

          <nav className={s.nodes} aria-label="Build destinations">
            {build}
            <Link href="/build/providers" className={`${s.node} ${s.providers}`}>
              <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="providers" /></span>
              <span>Providers</span>
              <span className={s.pin} aria-hidden="true" />
            </Link>
            <Link href="/build/ai/models" className={`${s.node} ${s.models}`}>
              <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="models" /></span>
              <span>Models</span>
              <span className={s.pin} aria-hidden="true" />
            </Link>
            <Link href="/build/terminal" className={`${s.node} ${s.terminal}`}>
              <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="terminal" /></span>
              <span>Terminal</span>
              <span className={s.pin} aria-hidden="true" />
            </Link>
            <Link href="/build/deployments" className={`${s.node} ${s.deployments}`}>
              <span className={s.nodeIcon} aria-hidden="true"><NodeIcon id="deployments" /></span>
              <span>Deployments</span>
              <span className={s.pin} aria-hidden="true" />
            </Link>
          </nav>
        </div>

        <div className={s.limb} aria-hidden="true" />
      </section>
    </div>
  );
}
