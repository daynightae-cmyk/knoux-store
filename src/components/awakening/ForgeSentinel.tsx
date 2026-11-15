'use client';

import { useId, type CSSProperties } from 'react';
import { SHARDS } from '@/components/identity/knoux-sentinel';
import { sentinelCore, sentinelMarkGlyph, litShards, sentinelRegistry } from '@/components/identity/sentinel-capability';
import type { AwakeningPhase } from '@/lib/awakening/machine';
import '@/components/identity/knoux-sentinel.css';
import './knoux-awakening-identity.css';

/**
 * The canonical Sentinel, staged.
 *
 * This is the same character — the same shell paths, seven authored shards,
 * canonical mark reading, core and eyes — drawn for the Awakening scene. It is
 * presentation only: no pointer owner, no second interactive Sentinel and no
 * navigation. The single interactive instance still lives in
 * `SentinelGuideLauncher`.
 *
 * The one addition is the geometric aperture: a diamond lens below the eyes
 * from which the registry's real systems are emitted. It is a drawing, not a
 * DOM portal, and it holds no product data of its own.
 */
export type ForgeExpression =
  | 'idle'
  | 'listen'
  | 'speak'
  | 'charge'
  | 'annoyed'
  | 'angry'
  | 'furious'
  | 'shout'
  | 'dizzy';

export type ForgeFacing = 'left' | 'right' | 'center';

export function ForgeSentinel({
  phase,
  compact = false,
  expression = 'idle',
  speaking = false,
  facing = 'center',
}: {
  phase: AwakeningPhase;
  compact?: boolean;
  expression?: ForgeExpression;
  speaking?: boolean;
  facing?: ForgeFacing;
}) {
  const uid = useId().replace(/:/g, '');
  const glyph = sentinelMarkGlyph(compact ? 22 : 54);
  const core = sentinelCore();
  const lit = litShards(sentinelRegistry().counts.active);

  return (
    <span
      className={`forge-sentinel${compact ? ' forge-sentinel--compact' : ''}`}
      data-phase={phase}
      data-expression={expression}
      data-speaking={speaking ? 'true' : 'false'}
      data-facing={facing}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 100" focusable="false">
        <defs>
          <radialGradient id={`${uid}-aura`} cx="50%" cy="42%" r="52%">
            <stop offset="0%" stopColor="var(--forge-accent)" stopOpacity="0.46" />
            <stop offset="100%" stopColor="var(--forge-accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--forge-eye)" stopOpacity="0.96" />
            <stop offset="55%" stopColor="var(--forge-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--forge-accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-aperture`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff8ec" />
            <stop offset="48%" stopColor="var(--forge-accent)" />
            <stop offset="100%" stopColor="#5e4b80" stopOpacity="0.35" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.15" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse className="forge-aura" cx="40" cy="46" rx="34" ry="42" fill={`url(#${uid}-aura)`} />

        {!compact ? (
          <g className="ks-orbit forge-orbit">
            {SHARDS.map((shard, index) => {
              const cx = shard.x + shard.w / 2;
              const cy = shard.y + shard.h / 2;
              return (
                <g
                  key={index}
                  className="ks-shard forge-shard"
                  data-lit={index < lit ? 'true' : 'false'}
                  style={
                    {
                      transformOrigin: `${cx}px ${cy}px`,
                      '--sx': `${Math.sin(shard.phase) * shard.radius * 1.6}px`,
                      '--sy': `${Math.cos(shard.phase) * shard.radius * 0.9}px`,
                      '--sr': `${shard.rot}deg`,
                      '--sd': `${(4.8 / shard.speed).toFixed(2)}s`,
                      '--sdelay': `${(-shard.phase * 1.4).toFixed(2)}s`,
                    } as CSSProperties
                  }
                >
                  <polygon
                    points={`${shard.x},${shard.y + shard.h} ${shard.x + shard.w * 0.5},${shard.y} ${shard.x + shard.w},${shard.y + shard.h * 0.62}`}
                  />
                </g>
              );
            })}
          </g>
        ) : null}

        <g className="ks-shell forge-shell">
          <path className="ks-crystal" d="M32 62 L40 96 L48 62 Z" />
          <path
            className="ks-frame"
            d="M22 11 C15.5 11 13 15 13 22 L13 50 C13 57 18 62 26 66 L40 74 L54 66 C62 62 67 57 67 50 L67 22 C67 15 64.5 11 58 11 Z"
          />
          <path
            className="ks-rim"
            d="M23.6 13.4 C18.2 13.4 16 16.4 16 22.2 L16 49.4 C16 55.6 20.4 60.2 27.4 64 L40 71.2 L52.6 64 C59.6 60.2 64 55.6 64 49.4 L64 22.2 C64 16.4 61.8 13.4 56.4 13.4 Z"
          />
          <path
            className="ks-face"
            d="M24.4 14.8 C19.4 14.8 17.6 17.6 17.6 23 L17.6 49 C17.6 55.2 21.8 59.6 28.6 63.4 L40 70 L51.4 63.4 C58.2 59.6 62.4 55.2 62.4 49 L62.4 23 C62.4 17.6 60.6 14.8 55.6 14.8 Z"
          />

          <g className="ks-mark forge-mark">
            {glyph.map((particle, index) => (
              <circle
                key={index}
                className={particle.violet ? 'ks-mark__p ks-mark__p--violet' : 'ks-mark__p'}
                cx={particle.x}
                cy={particle.y}
                r={particle.r}
                style={
                  {
                    '--cd': `${particle.delay.toFixed(2)}s`,
                    '--cg': particle.contour.toFixed(2),
                  } as CSSProperties
                }
              />
            ))}
          </g>

          <circle className="ks-core-halo forge-core-halo" cx={core.x} cy={core.y} r={core.r} fill={`url(#${uid}-core)`} />
          <circle className="ks-core forge-core" cx={core.x} cy={core.y} r={core.r * 0.3} />
          <path className="ks-sheen" d="M26 16.5 C22 16.8 21 19 21 23 L21 30 C28 24 40 21 58 23 L58 23 C58 18.4 56.4 16.4 52 16.2 Z" />

          <g className="ks-eyes forge-eyes">
            <path
              className="ks-eye ks-eye--l"
              d="M25.6 43.6 C27 40.6 29.4 38.8 32.4 38.8 C35.4 38.8 37.8 40.6 39.2 43.6 C37.8 46.6 35.4 48.4 32.4 48.4 C29.4 48.4 27 46.6 25.6 43.6 Z"
            />
            <path
              className="ks-eye ks-eye--r"
              d="M40.8 43.6 C42.2 40.6 44.6 38.8 47.6 38.8 C50.6 38.8 53 40.6 54.4 43.6 C53 46.6 50.6 48.4 47.6 48.4 C44.6 48.4 42.2 46.6 40.8 43.6 Z"
            />
          </g>

          {expression !== 'idle' ? (
            <g className="forge-expression" data-expression={expression}>
              {expression !== 'dizzy' ? (
                <g className="forge-brows">
                  <path d="M24.2 35.2 L34.8 38.2" />
                  <path d="M55.8 35.2 L45.2 38.2" />
                </g>
              ) : null}
              <g className="forge-mouth">
                <ellipse className="forge-mouth__lip" cx="40" cy="57.8" rx="8.2" ry="7.4" />
                <ellipse className="forge-mouth__throat" cx="40" cy="57.8" rx="6.9" ry="6.2" />
                <ellipse className="forge-mouth__glow" cx="40" cy="60.4" rx="3.9" ry="2.3" />
                <ellipse className="forge-mouth__rim" cx="40" cy="57.8" rx="6.9" ry="6.2" />
              </g>
            </g>
          ) : null}

          <g className="forge-aperture" filter={`url(#${uid}-glow)`}>
            <ellipse className="forge-aperture__ring" cx="40" cy="81.5" rx="5.2" ry="6.4" />
            <ellipse className="forge-aperture__ring forge-aperture__ring--inner" cx="40" cy="81.5" rx="3.4" ry="4.3" />
            <path className="forge-aperture__lens" d="M40 76.4 L42.1 81.5 L40 86.6 L37.9 81.5 Z" fill={`url(#${uid}-aperture)`} />
            <circle className="forge-aperture__core" cx="40" cy="81.5" r="1.05" />
            <path className="forge-aperture__ray" d="M40 70.6V74.2" />
            <path className="forge-aperture__ray" d="M40 88.8V92.4" />
          </g>
        </g>
      </svg>
    </span>
  );
}
