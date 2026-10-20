'use client';

import { useId, useSyncExternalStore, type ReactNode, type CSSProperties } from 'react';
import { SHARDS } from './knoux-sentinel';
import { useSentinelPresence } from './sentinel-presence';
import { guideLanguageTag, type GuideLanguage } from '@/lib/sentinel/languages';
import {
  auraFor,
  litShards,
  sentinelCore,
  sentinelMarkGlyph,
  sentinelRegistry,
} from './sentinel-capability';
import './knoux-sentinel.css';


/** Particle budget for the canonical mark reading inside the shell. */
const GLYPH_BUDGET = 96;

const noSubscription = () => () => {};

/**
 * False on the server and through hydration, true once the client takes over.
 * Read through a store rather than an effect so the shell never triggers a
 * cascading render.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * Canonical KNOuX Sentinel.
 *
 * One global listener owns pointer following, spatial-surface variables,
 * gaze, blink, sleep and semantic colour. Native cursor stays. No React
 * state on pointermove. No second WebGL scene. Shard orbits are CSS.
 *
 * The body is not decorated. Its interior is a deterministic particle reading
 * of the canonical KNOuX mark, and the light it emits is counted from the real
 * software and lab registries, so the Sentinel reports the state of the
 * institution rather than an authored mood.
 */
/**
 * Accessible name for the mascot trigger. Urdu is a separate language with its
 * own wording; the geometry and animation below are untouched by any of this.
 */
const triggerLabel: Record<GuideLanguage, { open: string; collapse: string }> = {
  en: { open: 'Open Sentinel guide', collapse: 'Minimize Sentinel guide' },
  ar: { open: 'افتح دليل Sentinel', collapse: 'تصغير دليل Sentinel' },
  ur: { open: 'Sentinel رہنما کھولیں', collapse: 'Sentinel رہنما سمیٹیں' },
};
export function KnouxSentinel({ expanded = false, docked = false, menuPaused = false, phase = 'idle', language = 'en', onActivate, children }: { expanded?: boolean; docked?: boolean; menuPaused?: boolean; phase?: string; language?: GuideLanguage; onActivate: () => void; children?: ReactNode }) {
  const {root,eyes} = useSentinelPresence(expanded || docked);
  const uid = useId().replace(/:/g, '');

  const registry = sentinelRegistry();
  const core = sentinelCore();
  const glyph = sentinelMarkGlyph(GLYPH_BUDGET);
  const aura = auraFor(registry.shippedShare);
  const lit = litShards(registry.counts.active);

  /**
   * The mark reading is pointer-driven decoration with no meaning without a
   * pointer, so it is not serialised into the HTML or the RSC payload. The
   * shell still renders on the server, so the Sentinel is present in the
   * document before hydration and costs nothing when scripting is absent.
   */
  const hydrated = useIsHydrated();


  return (
    <span
      ref={root}
      className="knoux-sentinel"
      data-knoux-sentinel
      data-state="idle"
      data-capability="core"
      data-shards={lit}
      data-records={registry.total}
      data-shipped={registry.shippedShare.toFixed(3)}
      data-expanded={expanded}
      data-menu-paused={menuPaused}
      data-phase={phase}
      data-sentinel-launcher
      lang={guideLanguageTag(language)}
    >
      <button disabled={menuPaused} className="ks-trigger" type="button" onClick={onActivate} aria-haspopup="dialog" aria-expanded={expanded} aria-controls={expanded?'sentinel-guide-panel':undefined} aria-label={expanded ? (triggerLabel[language] ?? triggerLabel.en).collapse : (triggerLabel[language] ?? triggerLabel.en).open}>
      <svg viewBox="0 0 80 100" focusable="false" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-aura`} cx="50%" cy="40%" r="48%">
            <stop offset="0%" stopColor="white" stopOpacity={aura} />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--ks-eye)" stopOpacity="0.95" />
            <stop offset="60%" stopColor="var(--ks-accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--ks-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="ks-aura" cx="40" cy="42" rx="30" ry="32" fill={`url(#${uid}-aura)`} />
        <g className="ks-orbit">
          {SHARDS.map((shard, index) => {
            const cx = shard.x + shard.w / 2;
            const cy = shard.y + shard.h / 2;
            return (
              <g
                key={index}
                className="ks-shard"
                data-lit={index < lit ? 'true' : 'false'}
                style={
                  {
                    transformOrigin: `${cx}px ${cy}px`,
                    '--sx': `${Math.sin(shard.phase) * shard.radius * 1.15}px`,
                    '--sy': `${Math.cos(shard.phase) * shard.radius * 0.7}px`,
                    '--sr': `${shard.rot}deg`,
                    '--sd': `${(3.6 / shard.speed).toFixed(2)}s`,
                    '--sdelay': `${(-shard.phase * 1.35).toFixed(2)}s`,
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
        <g className="ks-shell">
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
          {hydrated ? (
            <g className="ks-mark">
              {glyph.map((point, index) => (
                <circle
                  key={index}
                  className={point.violet ? 'ks-mark__p ks-mark__p--violet' : 'ks-mark__p'}
                  cx={point.x}
                  cy={point.y}
                  r={point.r}
                  style={
                    { '--cd': `${point.delay.toFixed(2)}s`, '--cg': point.contour.toFixed(2) } as CSSProperties
                  }
                />
              ))}
            </g>
          ) : null}
          {hydrated ? (
            <>
              <circle className="ks-core-halo" cx={core.x} cy={core.y} r={core.r} fill={`url(#${uid}-core)`} />
              <circle className="ks-core" cx={core.x} cy={core.y} r={core.r * 0.3} />
            </>
          ) : null}
          <path className="ks-sheen" d="M26 16.5 C22 16.8 21 19 21 23 L21 30 C28 24 40 21 58 23 L58 23 C58 18.4 56.4 16.4 52 16.2 Z" />
          <g ref={eyes} className="ks-eyes">
            <path
              className="ks-eye ks-eye--l"
              d="M25.6 43.6 C27 40.6 29.4 38.8 32.4 38.8 C35.4 38.8 37.8 40.6 39.2 43.6 C37.8 46.6 35.4 48.4 32.4 48.4 C29.4 48.4 27 46.6 25.6 43.6 Z"
            />
            <path
              className="ks-eye ks-eye--r"
              d="M40.8 43.6 C42.2 40.6 44.6 38.8 47.6 38.8 C50.6 38.8 53 40.6 54.4 43.6 C53 46.6 50.6 48.4 47.6 48.4 C44.6 48.4 42.2 46.6 40.8 43.6 Z"
            />
          </g>
        </g>
      </svg>
      </button>
      {children}
    </span>
  );
}
