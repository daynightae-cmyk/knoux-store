'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import {
  AWAKENING_EVENT,
  AWAKENING_QUERY,
  AWAKENING_TIMING,
  initialAwakeningState,
  isAwakeningOpen,
  isAwakeningPlayable,
  isAwakeningReveal,
  reduceAwakening,
  visualAwakeningPhase,
  type AwakeningPhase,
} from '@/lib/awakening/machine';
import {
  AWAKENING_BEAT_COUNT,
  AWAKENING_THREADS,
  FINAL_NARRATION,
  SENTINEL_IDENTITY,
  THREAD_ARCHIVE_LIMIT,
  THREAD_SEATS,
  awakeningBeatAt,
  awakeningThreadAt,
  awakenedThreadsBefore,
  type AwakeningBeat,
  type DialogueMood,
} from '@/lib/awakening/dialogue';
import {
  awakeningProducts,
  awakeningProductsAreComplete,
  AWAKENING_PRODUCT_COUNT,
} from '@/lib/awakening/products';
import { SHOUT_ORBS, SHOUT_SPARKS } from '@/lib/awakening/shout';
import { AwakeningAudio } from '@/lib/awakening/audio';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import { siteDirection, siteLanguageTag, speechLocale } from '@/lib/i18n/languages';
import { ForgeSentinel, type ForgeExpression, type ForgeFacing } from './ForgeSentinel';
import { FractureSurface } from './FractureSurface';
import { HeatSurface } from './HeatSurface';
import './knoux-awakening-stage.css';
import './knoux-awakening-dialogue.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

const ACT_LABEL: Record<
  'ignition' | 'awakening' | 'first-emission' | 'cascade' | 'overcharge' | 'fracture' | 'revelation',
  string
> = {
  ignition: 'Ignition',
  awakening: 'Awakening',
  'first-emission': 'First emission',
  cascade: 'Cascade',
  overcharge: 'Overcharge',
  fracture: 'Fracture',
  revelation: 'Revelation',
};

const MOOD_EXPRESSION: Record<DialogueMood, ForgeExpression> = {
  calm: 'speak',
  measured: 'speak',
  sharp: 'annoyed',
  angry: 'angry',
  furious: 'furious',
};

const PRODUCT_BY_ID = new Map(awakeningProducts.map((product) => [product.id, product]));

function productFor(id?: string) {
  return id ? PRODUCT_BY_ID.get(id) ?? null : null;
}

/** Small inline icons, so the bar never depends on a font having a glyph. */
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M2 6h2.4L8 3.2v9.6L4.4 10H2z" fill="currentColor" />
      {muted ? (
        <path
          d="M10.6 6.2l3 3.6M13.6 6.2l-3 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M10.2 6.1a2.6 2.6 0 0 1 0 3.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M12 4.6a5 5 0 0 1 0 6.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3 3.4l6.4 4.6L3 12.6z" fill="currentColor" />
      <path d="M11.8 3.4v9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M12.6 8a4.8 4.8 0 1 1-1.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M12.9 2.4v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null && element.getAttribute('aria-hidden') !== 'true',
  );
}

function speakerLabel(beat: AwakeningBeat | null, t: (text: string) => string): string {
  if (!beat) return '';
  if (beat.speaker === 'visitor') return beat.author?.name ?? t('Visitor');
  if (beat.speaker === 'narrator') return t('AI writer / narration');
  return SENTINEL_IDENTITY.name;
}

/**
 * KNOuX: THE AWAKENING.
 *
 * A page-level performance, not a settings panel. The Sentinel wakes, the
 * registry answers real questions in complete sentences, the crowd gets
 * louder, the glass breaks, and the founder is revealed before the published
 * routes. Everything is CSS and SVG on a single timer; no frame loop writes
 * React state and no product, claim or route is authored here.
 */
export function AwakeningStage() {
  const language = useSiteLanguage();
  const t = (text: string) => translatedSiteCopy(text, language);
  const [state, dispatch] = useReducer(reduceAwakening, undefined, initialAwakeningState);
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(false);
  const hiddenPauseRef = useRef(false);
  const audioRef = useRef<AwakeningAudio | null>(null);
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const remainingRef = useRef(0);
  const lastCueRef = useRef<AwakeningPhase>('idle');

  const open = isAwakeningOpen(state);
  const visualPhase = visualAwakeningPhase(state);
  const showReveal = isAwakeningReveal(visualPhase);
  const paused = state.phase === 'paused';
  const fractureMode = visualPhase === 'fracture' ? 'break' : showReveal ? 'drift' : 'off';
  // The heat opens with the break and keeps breathing under the reveal. It is
  // the same authored geometry in both cases, so the light under the final
  // image is the light the glass released rather than a second, unrelated glow.
  const heatMode = visualPhase === 'fracture' ? 'flare' : showReveal ? 'settle' : 'off';
  const activeBeat = showReveal ? null : awakeningBeatAt(state.beatIndex);
  const activeThread = activeBeat ? awakeningThreadAt(state.beatIndex) : null;
  const activeProduct = productFor(activeThread?.productId);
  const archivedThreads = awakenedThreadsBefore(state.beatIndex).slice(-THREAD_ARCHIVE_LIMIT);
  const isFracture = visualPhase === 'fracture';
  const isAnswer = activeBeat?.kind === 'answer' || activeBeat?.kind === 'outburst';
  const isQuestion = activeBeat?.kind === 'question';
  const mood: DialogueMood = activeBeat?.mood ?? 'calm';
  const expression: ForgeExpression = showReveal
    ? 'dizzy'
    : isQuestion
      ? 'listen'
      : MOOD_EXPRESSION[mood];
  const facing: ForgeFacing = isFracture || showReveal ? 'center' : activeBeat?.side ?? 'center';
  const speaking = Boolean(isAnswer && !isFracture);
  const progress = Math.max(
    0,
    Math.min(1, state.beatIndex < 0 ? 0 : (state.beatIndex + 1) / AWAKENING_BEAT_COUNT),
  );
  const sequenceIndex = Math.max(0, Math.min(state.beatIndex, AWAKENING_BEAT_COUNT - 1));
  const activeActLabel = isAwakeningPlayable(visualPhase) ? t(ACT_LABEL[visualPhase]) : t('Cinematic phase');
  const liveLine = paused
    ? t('The shout holds its breath.')
    : activeBeat
      ? `${speakerLabel(activeBeat, t)}: ${t(activeBeat.text)}`
      : '';
  const replyingTo = activeThread?.author.handle ?? '';

  const discussedProductIds = new Set(
    awakenedThreadsBefore(state.beatIndex)
      .map((thread) => thread.productId)
      .filter((id): id is string => Boolean(id)),
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const begin = useCallback((reducedMotion = reducedRef.current) => {
    if (!awakeningProductsAreComplete()) {
      dispatch({ type: 'ERROR' });
      return;
    }
    try {
      if (!audioRef.current) audioRef.current = new AwakeningAudio();
      audioRef.current.unlock();
    } catch {
      // Sound is optional. A blocked context must not block the performance.
    }
    dispatch({ type: 'START', reducedMotion });
  }, []);

  const close = useCallback(() => {
    clearTimer();
    remainingRef.current = 0;
    lastCueRef.current = 'idle';
    audioRef.current?.dispose();
    audioRef.current = null;
    dispatch({ type: 'CLOSE' });
  }, [clearTimer]);

  const pause = useCallback(
    (source: 'user' | 'visibility' = 'user') => {
      if (timerRef.current !== null) {
        remainingRef.current = Math.max(120, deadlineRef.current - performance.now());
        clearTimer();
      }
      audioRef.current?.stopSpeaking();
      dispatch({ type: 'PAUSE', source });
    },
    [clearTimer],
  );

  const skip = useCallback(() => {
    clearTimer();
    remainingRef.current = 0;
    audioRef.current?.stopSpeaking();
    dispatch({ type: 'SKIP' });
  }, [clearTimer]);

  const replay = useCallback(() => {
    if (!awakeningProductsAreComplete()) {
      dispatch({ type: 'ERROR' });
      return;
    }
    clearTimer();
    remainingRef.current = 0;
    lastCueRef.current = 'idle';
    try {
      if (!audioRef.current) audioRef.current = new AwakeningAudio();
      audioRef.current.stopSpeaking();
      audioRef.current.unlock();
      audioRef.current.setMuted(muted);
    } catch {
      // Optional.
    }
    dispatch({ type: 'REPLAY', reducedMotion: reducedRef.current });
  }, [clearTimer, muted]);

  const toggleMuted = useCallback(() => {
    const next = !muted;
    try {
      if (!audioRef.current) audioRef.current = new AwakeningAudio();
      audioRef.current.unlock();
      audioRef.current.setMuted(next);
    } catch {
      // The control still changes state; the platform simply stays silent.
    }
    setMuted(next);
  }, [muted]);

  // Reduced motion is the finished thought, not a faster shout.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = media.matches;
      setReduced(media.matches);
      if (media.matches) {
        clearTimer();
        remainingRef.current = 0;
        dispatch({ type: 'SKIP' });
      }
    };
    reducedRef.current = media.matches;
    setReduced(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [clearTimer]);

  // The hero key, the header key and the mobile panel share one event.
  useEffect(() => {
    const onAwaken = () => {
      if (open) return;
      begin();
    };
    window.addEventListener(AWAKENING_EVENT, onAwaken);
    return () => window.removeEventListener(AWAKENING_EVENT, onAwaken);
  }, [begin, open]);

  // A non-home header trigger hands the visitor to `/?awaken=1`. The parameter
  // is consumed once and removed from the address bar without a navigation.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(AWAKENING_QUERY) !== '1') return;
    url.searchParams.delete(AWAKENING_QUERY);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    begin();
  }, [begin]);

  // One timer at a time. A paused beat keeps its unspent duration; every beat
  // gets its own authored duration from the dialogue script.
  useEffect(() => {
    if (!isAwakeningPlayable(state.phase)) {
      clearTimer();
      return;
    }
    const beat = awakeningBeatAt(state.beatIndex);
    const duration =
      remainingRef.current > 0
        ? remainingRef.current
        : beat?.duration ?? AWAKENING_TIMING[state.phase];
    remainingRef.current = 0;
    deadlineRef.current = performance.now() + duration;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      deadlineRef.current = 0;
      dispatch({ type: 'ADVANCE' });
    }, duration);
    return clearTimer;
  }, [clearTimer, state.phase, state.beatIndex]);

  // A hidden tab must not burn through the sequence. A browser pause is
  // released on return; a manual pause is never auto-resumed.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (isAwakeningPlayable(stateRef.current.phase)) {
          hiddenPauseRef.current = true;
          pause('visibility');
        }
        return;
      }
      if (hiddenPauseRef.current) {
        hiddenPauseRef.current = false;
        dispatch({ type: 'RESUME' });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pause]);

  // Audio follows acts, never frames. A resumed act is not re-cued.
  useEffect(() => {
    if (!open || reduced || !isAwakeningPlayable(state.phase)) return;
    if (lastCueRef.current === state.phase) return;
    lastCueRef.current = state.phase;
    audioRef.current?.cue(state.phase);
  }, [open, reduced, state.phase]);

  // The Sentinel speaks only its own lines; the visitors are read as captions.
  // Each line cancels the previous one, so a long answer cannot bleed into the
  // next question. Pausing or closing stops the platform voice immediately.
  const speechBeat = awakeningBeatAt(state.beatIndex);
  const speechText = speechBeat ? t(speechBeat.text) : '';
  const speechSpeaker = speechBeat?.speaker ?? null;
  useEffect(() => {
    const voice = audioRef.current;
    if (!open || reduced || muted || paused || !voice || !speechBeat || speechSpeaker === 'visitor') {
      voice?.stopSpeaking();
      return;
    }
    voice.speak(speechText, speechLocale(language), {
      pitch: speechSpeaker === 'narrator' ? 0.94 : 0.74,
      rate: speechSpeaker === 'narrator' ? 1 : 1.04,
    });
    return () => voice.stopSpeaking();
  }, [open, reduced, muted, paused, language, speechBeat, speechSpeaker, speechText]);

  // Scroll lock, focus ownership, Escape and a real focus trap.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = stageRef.current;
      const order = focusables(root);
      if (!root || order.length === 0) {
        event.preventDefault();
        root?.focus();
        return;
      }
      const first = order[0];
      const last = order[order.length - 1];
      if (!root.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      const restore = previousFocus.current;
      if (restore?.isConnected) {
        try {
          restore.focus({ preventScroll: true });
        } catch {
          // The originating control may have unmounted during navigation.
        }
      }
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) {
      delete document.documentElement.dataset.awakening;
      delete document.documentElement.dataset.awakeningPhase;
      return;
    }
    document.documentElement.dataset.awakening = 'open';
    document.documentElement.dataset.awakeningPhase = visualPhase;
    return () => {
      delete document.documentElement.dataset.awakening;
      delete document.documentElement.dataset.awakeningPhase;
    };
  }, [open, visualPhase]);

  useEffect(
    () => () => {
      clearTimer();
      audioRef.current?.dispose();
      audioRef.current = null;
    },
    [clearTimer],
  );

  if (!open) return null;

  return (
    <div
      ref={stageRef}
      className="awakening-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="awakening-title"
      data-phase={visualPhase}
      data-state={state.phase}
      data-beat={state.beatIndex}
      data-mood={mood}
      data-revealed={showReveal}
      data-reduced={reduced}
      dir={siteDirection(language)}
      lang={siteLanguageTag(language)}
      tabIndex={-1}
      onPointerDown={() => audioRef.current?.unlock()}
      onKeyDown={() => audioRef.current?.unlock()}
    >
      <div className="awakening-stage__grain" aria-hidden="true" />
      <div className="awakening-stage__vignette" aria-hidden="true" />
      <div className="shout-backdrop" aria-hidden="true" />

      <FractureSurface mode={fractureMode} />
      <HeatSurface mode={heatMode} reduced={reduced} />

      {isFracture ? (
        <div className="shout-words" aria-hidden="true">
          <span className="shout-word shout-word--break" style={{ '--wd': '0.02s' } as CSSProperties}>
            {t('BREAK!')}
          </span>
        </div>
      ) : null}

      <header className="shout-bar">
        <span className="shout-bar__brand">
          <span className="shout-bar__dot" aria-hidden="true" />
          <span className="shout-bar__name">KNOuX</span>
          <span className="shout-bar__slash" aria-hidden="true">
            /
          </span>
          <span className="shout-bar__title">{t('The Awakening')}</span>
        </span>

        <span className="shout-bar__live" aria-hidden="true">
          <span className="shout-bar__pulse" />
          {showReveal ? t('Sequence complete') : activeActLabel}
        </span>

        <div className="shout-bar__controls">
          <button
            type="button"
            className="shout-control"
            onClick={toggleMuted}
            aria-label={t(muted ? 'Unmute sound' : 'Mute sound')}
          >
            <SoundIcon muted={muted} />
            <em>{t(muted ? 'Unmute sound' : 'Mute sound')}</em>
          </button>
          {!showReveal ? (
            <button
              type="button"
              className="shout-control"
              onClick={skip}
              aria-label={t('Skip to the reveal')}
            >
              <SkipIcon />
              <em>{t('Skip intro')}</em>
            </button>
          ) : (
            <button
              type="button"
              className="shout-control"
              onClick={replay}
              aria-label={t('Replay the awakening')}
            >
              <ReplayIcon />
              <em>{t('Replay')}</em>
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            className="shout-control shout-control--close"
            onClick={close}
            aria-label={t('Close experience')}
          >
            <CloseIcon />
            <em>{t('Close experience')}</em>
          </button>
        </div>
      </header>

      {state.phase === 'error' ? (
        <section className="shout-error" role="alert">
          <p className="shout-kicker">ERR / 00</p>
          <h2 id="awakening-title">{t('The awakening could not start.')}</h2>
          <p>
            {t('The published software registry is unavailable, so no product was invented to fill the scene.')}
          </p>
          <div className="shout-actions">
            <button type="button" className="shout-action" onClick={replay}>
              {t('Try again')}
            </button>
            <button type="button" className="shout-action shout-action--quiet" onClick={close}>
              {t('Close experience')}
            </button>
          </div>
        </section>
      ) : showReveal ? (
        <section className="shout-final" aria-labelledby="awakening-title">
          <div className="shout-final__portrait" aria-hidden="true">
            <span className="shout-final__portrait-frame" />
            <Image
              src="/founder/sadek-elgazar.jpg"
              alt=""
              width={460}
              height={460}
              unoptimized
              className="shout-final__portrait-image"
            />
            <span className="shout-final__portrait-tag">
              KNOuX / SIGNATURE 05
            </span>
          </div>

          <div className="shout-final__copy">
            <p className="shout-kicker">
              {t('Founder reveal')} <span aria-hidden="true">/</span> {t('Registry')}
            </p>
            <p className="shout-final__tagline">{t('THE UNIVERSE COMES ALIVE.')}</p>
            <h2 id="awakening-title" className="shout-final__name" aria-label="Eng Sadek elgazar">
              <span className="shout-final__eng" aria-hidden="true">
                Eng
              </span>
              <strong className="shout-final__sadek" aria-hidden="true">
                Sadek
              </strong>
              <em className="shout-final__elgazar" aria-hidden="true">
                elgazar
              </em>
            </h2>
            <p className="shout-final__role">{t('Founder & Software Developer, KNOuX')}</p>

            <figure className="final-narration">
              <figcaption>
                <span className="final-narration__ai" aria-hidden="true">
                  AI
                </span>
                {t('AI writer / narration')}
              </figcaption>
              <blockquote>{t(FINAL_NARRATION)}</blockquote>
            </figure>

            <div className="shout-final__actions">
              <Link href="/products" className="shout-action">
                {t('Explore the Universe')} <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/build" className="shout-action shout-action--quiet">
                {t('Tell us what you need')} <span aria-hidden="true">↗</span>
              </Link>
              <button type="button" className="shout-action shout-action--quiet" onClick={replay}>
                {t('Play it again')} <span aria-hidden="true">↺</span>
              </button>
            </div>
          </div>

          <ul className="shout-final__products" aria-label={t('Verified systems from the registry')}>
            {awakeningProducts.map((product) => (
              <li key={product.id}>
                <Link href={product.route} data-product-id={product.id}>
                  <span className="shout-final__logo">
                    <Image src={product.logoSrc} alt="" width={64} height={64} unoptimized />
                  </span>
                  <span className="shout-final__id">
                    <strong>{product.name}</strong>
                    <span>
                      {product.code} / {product.status.toUpperCase()}
                    </span>
                  </span>
                  <span className="shout-final__arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="shout-final__foot">
            {String(AWAKENING_PRODUCT_COUNT).padStart(2, '0')} {t('Verified systems from the registry')}
            <span aria-hidden="true"> / </span>
            {t('Independent digital engineering')}
          </p>

          {reduced ? (
            <p className="shout-reduced-note">
              {t('Reduce motion is on. The reveal is shown directly.')}
            </p>
          ) : null}
        </section>
      ) : (
        <section
          className="shout-scene dialogue-scene"
          data-kind={activeBeat?.kind ?? 'question'}
          data-mood={mood}
          data-facing={facing}
          aria-labelledby="awakening-title"
        >
          <h2 id="awakening-title" className="visually-hidden">
            {t('The Awakening')}
          </h2>

          <div className="shout-scene__aura" aria-hidden="true" />
          <div className="shout-scene__rays" aria-hidden="true" />

          {activeProduct && !isFracture ? (
            <div className="dialogue-watermark" aria-hidden="true">
              {activeProduct.name}
            </div>
          ) : null}

          <div className="dialogue-archive" aria-hidden="true">
            {archivedThreads.map((thread) => {
              const seat = THREAD_SEATS[AWAKENING_THREADS.indexOf(thread) % THREAD_SEATS.length];
              const product = productFor(thread.productId);
              return (
                <article
                  key={thread.id}
                  className="dialogue-echo"
                  data-side={thread.side}
                  style={
                    {
                      '--echo-x': `${seat.x}%`,
                      '--echo-y': `${seat.y}%`,
                      '--echo-rot': `${seat.rotate}deg`,
                      '--echo-scale': seat.scale,
                    } as CSSProperties
                  }
                >
                  <span className="dialogue-echo__author" data-tone={thread.author.tone}>
                    {thread.author.initials}
                  </span>
                  <p>{t(thread.question)}</p>
                  <span className="dialogue-echo__meta">
                    {product ? `${product.code} / ${product.shortName}` : SENTINEL_IDENTITY.name}
                  </span>
                </article>
              );
            })}
          </div>

          {activeThread && !isFracture ? (
            <article
              key={activeThread.id}
              className="dialogue-question"
              data-state={isQuestion ? 'pending' : 'answered'}
              data-side={activeThread.side}
            >
              <header>
                <span className="dialogue-avatar" data-tone={activeThread.author.tone}>
                  {activeThread.author.initials}
                </span>
                <span className="dialogue-question__who">
                  <strong>{activeThread.author.name}</strong>
                  <span>{activeThread.author.handle}</span>
                </span>
                <span className="dialogue-question__label">{t('Question from the floor')}</span>
              </header>
              <p>{t(activeThread.question)}</p>
              <footer>
                {activeProduct ? (
                  <>
                    {activeProduct.name} <span>{activeProduct.code}</span>
                  </>
                ) : (
                  <>{SENTINEL_IDENTITY.name}</>
                )}
              </footer>
            </article>
          ) : null}

          <div className="shout-orbs" aria-hidden="true">
            {SHOUT_ORBS.map((orb, index) => (
              <span
                key={index}
                className="shout-orb"
                style={
                  {
                    '--ox': `${orb.x}%`,
                    '--oy': `${orb.y}%`,
                    '--os': `${orb.size}vw`,
                    '--odelay': `${orb.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="shout-waves" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="shout-sparks" aria-hidden="true">
            {SHOUT_SPARKS.map((spark, index) => (
              <span
                key={index}
                className={spark.hot ? 'shout-spark shout-spark--hot' : 'shout-spark'}
                style={
                  {
                    '--sx': `${spark.x}vw`,
                    '--sy': `${spark.y}vh`,
                    '--ss': `${spark.size}px`,
                    '--sd': `${spark.duration}s`,
                    '--sdelay': `${spark.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className={`shout-figure dialogue-figure${speaking ? ' is-speaking' : ''}`} data-facing={facing}>
            <ForgeSentinel
              phase={visualPhase}
              expression={expression}
              speaking={speaking}
              facing={facing}
            />
            {speaking ? (
              <span className="dialogue-voice" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            ) : null}
          </div>

          {isAnswer && !isFracture && activeBeat ? (
            <article key={activeBeat.id} className="dialogue-reply" data-mood={mood} data-side={facing}>
              <span className="dialogue-reply__tail" aria-hidden="true" />
              <header>
                <span className="dialogue-reply__sigil" aria-hidden="true">
                  K
                </span>
                <span className="dialogue-reply__who">
                  <strong>{SENTINEL_IDENTITY.name}</strong>
                  <span>{SENTINEL_IDENTITY.handle}</span>
                </span>
                <span className="dialogue-reply__context">
                  {t('replying to')} <b>{replyingTo}</b>
                </span>
                <span className="dialogue-reply__live">
                  <span aria-hidden="true" /> {t('Live reply')}
                </span>
              </header>
              <p className="dialogue-reply__text">{t(activeBeat.text)}</p>
              {activeProduct ? (
                <div className="dialogue-product">
                  <span className="dialogue-product__logo">
                    <Image src={activeProduct.logoSrc} alt="" width={40} height={40} unoptimized />
                  </span>
                  <span className="dialogue-product__id">
                    <strong>{activeProduct.name}</strong>
                    <span>
                      {activeProduct.code} / {activeProduct.family}
                    </span>
                  </span>
                  <span className="dialogue-product__verified">
                    <span aria-hidden="true">✓</span> {t('Registry verified')}
                  </span>
                </div>
              ) : null}
            </article>
          ) : null}

          {!isFracture ? (
            <ol className="dialogue-registry" aria-label={t('Registry progress')}>
              {awakeningProducts.map((product) => {
                const discussed = discussedProductIds.has(product.id);
                return (
                  <li
                    key={product.id}
                    data-active={activeProduct?.id === product.id}
                    data-discussed={discussed}
                  >
                    <span className="dialogue-registry__logo">
                      <Image src={product.logoSrc} alt="" width={32} height={32} unoptimized />
                    </span>
                    <span className="dialogue-registry__name">{product.shortName}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <div className="shout-flash" aria-hidden="true" />

          <p className="visually-hidden" aria-live="polite" aria-atomic="true">
            {liveLine}
          </p>
        </section>
      )}

      <footer className="shout-foot" aria-hidden="true">
        <span className="shout-foot__rail">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="shout-foot__meta">
          <span>
            {showReveal
              ? `${String(AWAKENING_BEAT_COUNT).padStart(2, '0')} / ${String(AWAKENING_BEAT_COUNT).padStart(2, '0')}`
              : `${String(sequenceIndex + 1).padStart(2, '0')} / ${String(AWAKENING_BEAT_COUNT).padStart(2, '0')}`}
          </span>
          <span>KNOuX / THE AWAKENING — 2026</span>
        </span>
      </footer>
    </div>
  );
}
