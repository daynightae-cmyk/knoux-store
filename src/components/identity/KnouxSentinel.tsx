'use client';

import { useEffect, useId, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import {
  BODY_DAMP,
  EYE_DAMP,
  EYE_TRAVEL,
  OFFSET_FAR,
  OFFSET_NEAR,
  SENTINEL_HEIGHT,
  SENTINEL_SIZE,
  SHELL_TILT,
  SHARDS,
  SLEEP_AFTER_MS,
  BLINK_MS,
  blinkGap,
  classifyTarget,
  isDoubleBlink,
  resolveVisual,
  type SentinelMood,
  type SentinelVisual,
} from './knoux-sentinel';
import {
  auraFor,
  capabilityFor,
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
export function KnouxSentinel() {
  const root = useRef<HTMLSpanElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const timeouts = useRef<number[]>([]);
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

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const coarse = window.matchMedia('(pointer: coarse)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const canFollow = () => !reduced.matches && !coarse.matches;
    let enabled = canFollow();
    let frame = 0;
    let sleepTimer = 0;
    let scrollTimer = 0;
    let targetX = -140;
    let targetY = -140;
    let x = -140;
    let y = -140;
    let ox = OFFSET_NEAR;
    let oy = 20;
    let tilt = 0;
    let eyeX = 0;
    let eyeY = 0;
    let gazeX = 0;
    let gazeY = 0;
    let hoveringForm = false;
    let mood: SentinelMood = 'idle';
    let visual: SentinelVisual = 'idle';
    let blinking = false;
    let blinkIndex = 0;
    let sleeping = false;
    let current: HTMLElement | null = null;
    let lastScrollY = window.scrollY;
    let lastScrollT = performance.now();
    let ready = false;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timeouts.current = timeouts.current.filter((item) => item !== id);
        fn();
      }, ms);
      timeouts.current.push(id);
      return id;
    };

    const clearLater = () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const setVisual = (next: SentinelVisual) => {
      if (visual === next) return;
      visual = next;
      node.dataset.state = next;
      node.dataset.capability = capabilityFor(next === 'sleep' ? 'sleep' : mood);
    };

    const paintVisual = () => {
      setVisual(resolveVisual({ mood: sleeping ? 'sleep' : mood, gazeX, gazeY, blinking }));
    };

    const armSleep = () => {
      window.clearTimeout(sleepTimer);
      sleepTimer = window.setTimeout(() => {
        sleeping = true;
        mood = 'sleep';
        blinking = false;
        clearLater();
        setVisual('sleep');
      }, SLEEP_AFTER_MS);
    };

    const armBlink = () => {
      if (!enabled || sleeping) return;
      later(() => {
        if (sleeping || !enabled) {
          armBlink();
          return;
        }
        blinking = true;
        paintVisual();
        later(() => {
          blinking = false;
          paintVisual();
          if (isDoubleBlink(blinkIndex)) {
            later(() => {
              blinking = true;
              paintVisual();
              later(() => {
                blinking = false;
                paintVisual();
              }, BLINK_MS);
            }, 80);
          }
          blinkIndex += 1;
          armBlink();
        }, BLINK_MS);
      }, blinkGap(blinkIndex));
    };

    const wake = () => {
      if (sleeping) {
        sleeping = false;
        if (mood === 'sleep') mood = 'observe';
        armBlink();
        paintVisual();
      }
      armSleep();
    };

    const applySpatial = (clientX: number, clientY: number) => {
      if (!current) return;
      const box = current.getBoundingClientRect();
      if (!box.width || !box.height) return;
      current.style.setProperty('--local-x', `${((clientX - box.left) / box.width) * 100}%`);
      current.style.setProperty('--local-y', `${((clientY - box.top) / box.height) * 100}%`);
      current.style.setProperty('--depth-px-x', `${((clientX - box.left) / box.width - 0.5) * 18}px`);
      current.style.setProperty('--depth-px-y', `${((clientY - box.top) / box.height - 0.5) * 18}px`);
    };

    const tick = () => {
      frame = 0;
      if (!enabled || document.hidden) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let wantX = hoveringForm ? OFFSET_FAR + 10 : OFFSET_NEAR;
      let wantY = hoveringForm ? OFFSET_FAR : 20;
      if (targetX > vw - 140) wantX = -(SENTINEL_SIZE + OFFSET_NEAR);
      if (targetY > vh - 160) wantY = -(SENTINEL_HEIGHT + 10);
      ox += (wantX - ox) * 0.12;
      oy += (wantY - oy) * 0.12;

      const nx = Math.max(6, Math.min(vw - SENTINEL_SIZE - 6, targetX + ox));
      const ny = Math.max(6, Math.min(vh - SENTINEL_HEIGHT - 6, targetY + oy));
      x += (nx - x) * BODY_DAMP;
      y += (ny - y) * BODY_DAMP;

      const centerX = x + SENTINEL_SIZE / 2;
      const centerY = y + SENTINEL_HEIGHT / 2;
      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const dist = Math.hypot(dx, dy) || 1;
      gazeX = Math.max(-1, Math.min(1, dx / 90));
      gazeY = Math.max(-1, Math.min(1, dy / 90));
      eyeX += (gazeX * EYE_TRAVEL - eyeX) * EYE_DAMP;
      eyeY += (gazeY * EYE_TRAVEL * 0.7 - eyeY) * EYE_DAMP;

      const wantTilt = Math.max(-SHELL_TILT, Math.min(SHELL_TILT, gazeX * SHELL_TILT));
      tilt += (wantTilt - tilt) * 0.1;
      const scale = sleeping ? 0.98 : hoveringForm ? 0.99 : 1 + Math.min(0.02, dist / 2600);

      node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      if (eyes.current) {
        eyes.current.style.transform = `translate(${eyeX.toFixed(2)}px, ${eyeY.toFixed(2)}px)`;
      }

      paintVisual();

      if (!ready && targetX > 0) {
        ready = true;
        node.dataset.ready = 'true';
      }

      const settled =
        Math.abs(nx - x) < 0.18 &&
        Math.abs(ny - y) < 0.18 &&
        Math.abs(wantTilt - tilt) < 0.04 &&
        Math.abs(gazeX * EYE_TRAVEL - eyeX) < 0.05 &&
        Math.abs(wantX - ox) < 0.3;
      if (!settled) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!enabled || frame) return;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (!enabled || document.hidden) return;
      if (event.pointerType && event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      wake();
      const surface = (event.target as Element | null)?.closest?.('[data-spatial]') as HTMLElement | null;
      if (current !== surface) {
        current?.removeAttribute('data-pointer-inside');
        current = surface;
        current?.setAttribute('data-pointer-inside', '');
      }
      applySpatial(event.clientX, event.clientY);
      const hit = classifyTarget(event.target as Element | null);
      hoveringForm = hit.formCalm;
      if (!sleeping) mood = hit.mood;
      start();
    };

    const onLeave = () => {
      targetX = -140;
      targetY = -140;
      mood = 'idle';
      hoveringForm = false;
      ready = false;
      node.dataset.ready = 'false';
      current?.removeAttribute('data-pointer-inside');
      current = null;
      stop();
    };

    const onScroll = () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastScrollY);
      const dt = Math.max(16, now - lastScrollT);
      lastScrollY = window.scrollY;
      lastScrollT = now;
      wake();
      if (dy / dt > 0.35) node.dataset.scroll = 'fast';
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        delete node.dataset.scroll;
      }, 220);
    };

    const onKey = () => wake();
    const onTouch = () => wake();

    const onFocusIn = (event: FocusEvent) => {
      wake();
      const hit = classifyTarget(event.target as Element | null);
      hoveringForm = hit.formCalm;
      if (hit.formCalm && !sleeping) {
        mood = hit.mood;
        paintVisual();
        start();
      }
    };

    const sync = () => {
      enabled = canFollow();
      if (!enabled) {
        onLeave();
        stop();
        clearLater();
        window.clearTimeout(sleepTimer);
        node.dataset.ready = reduced.matches ? 'true' : 'false';
        node.dataset.state = 'idle';
      } else if (!frame) {
        start();
        armBlink();
        armSleep();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        node.dataset.ready = 'false';
      } else if (enabled) {
        wake();
        start();
      }
    };

    if (enabled) {
      armBlink();
      armSleep();
    } else if (reduced.matches && !coarse.matches) {
      node.dataset.ready = 'true';
      node.dataset.state = 'idle';
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('touchstart', onTouch, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    coarse.addEventListener('change', sync);
    reduced.addEventListener('change', sync);

    return () => {
      stop();
      clearLater();
      window.clearTimeout(sleepTimer);
      window.clearTimeout(scrollTimer);
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('touchstart', onTouch);
      document.removeEventListener('visibilitychange', onVisibility);
      coarse.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      current?.removeAttribute('data-pointer-inside');
    };
  }, []);

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
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 100" focusable="false">
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
    </span>
  );
}
