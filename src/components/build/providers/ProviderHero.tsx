'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import type { ProviderDefinition } from '@/lib/ai/provider-os/types';
import { providerMark } from './provider-marks';
import s from './provider-hero.module.css';

const positions = [
  ['openai', 'OpenAI', 34.4, 34.7], ['anthropic', 'Anthropic', 49.8, 31.2],
  ['gemini', 'Google Gemini', 64.9, 34.7], ['openrouter', 'OpenRouter', 23.8, 44.6],
  ['deepseek', 'DeepSeek', 75.5, 44.6], ['groq', 'Groq', 19, 57.7],
  ['qwen', 'QwenCloud', 80.3, 57.7], ['mistral', 'Mistral', 27.6, 67.3],
  ['grok', 'Grok', 71.9, 67.3],
] as const;

export function ProviderHero({ definitions, selected, onSelect, onGetApi, onBrowse }: {
  definitions: readonly ProviderDefinition[];
  selected: string;
  onSelect: (definition: ProviderDefinition) => void;
  onGetApi: () => void;
  onBrowse: () => void;
}) {
  const hero = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    let visible = true;
    const sync = () => { element.dataset.motionActive = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);

  return (
    <section ref={hero} className={s.hero} data-paused={paused} aria-label="Universal Provider Engine">
      {/* Cosmic background from UniversalProviderEngine */}
      <div className={s.cosmicBg} aria-hidden="true" />
      <div className={s.cosmicStars} aria-hidden="true" />
      <div className={s.cosmicPlanet} aria-hidden="true" />
      <div className={s.cosmicGlow} aria-hidden="true" />

      <button type="button" className={s.motionControl} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume orbit' : 'Pause orbit'}</button>

      {/* Orbit stage: CSS rings + orbiting provider nodes connected to real state */}
      <div className={s.orbitStage}>
        <div className={s.orbitRingOuter} />
        <div className={s.orbitRingMiddle} />
        <div className={s.orbitRingInner} />

        {/* Central KNOuX core mark */}
        <div className={s.core}>
          <div className={s.coreGlow} />
          <div className={s.coreMark}>
            <svg className={s.mark} viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} aria-hidden="true">
              <defs>
                <pattern id="provider-mark-particles" width="12" height="13" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1.6" fill="#fff" />
                  <circle cx="9" cy="9" r="1" fill="#c6a4ff" />
                  <circle cx="1" cy="10" r=".7" fill="#fff" />
                  <circle cx="8" cy="2" r=".5" fill="#b486ff" />
                </pattern>
              </defs>
              {MARK_PATHS.map(({ id, d }) => (
                <path key={id} d={d} fill="url(#provider-mark-particles)" stroke="#e5caff" strokeWidth="3.5" strokeDasharray="2 3" />
              ))}
            </svg>
          </div>
          <span className={s.coreLabel}>Engine Core</span>
        </div>

        {/* Orbiting provider nodes - each connected to real provider selection */}
        {positions.map(([id, name], index) => {
          const angle = (index / positions.length) * 360;
          const d = definitions.find(p => p.id === id);
          const mark = providerMark(id);
          return (
            <button
              key={id}
              type="button"
              className={s.orbitNode}
              style={{ '--angle': `${angle}deg` } as CSSProperties}
              disabled={!d}
              aria-label={`Select ${name}`}
              aria-pressed={selected === id}
              onClick={() => d && onSelect(d)}
            >
              <div className={s.nodeMark}>
                {mark ? (
                  <Image src={`/providers/${mark}.svg`} alt="" width={24} height={24} loading="eager" className={s.markImg} style={{ filter: 'invert(1) drop-shadow(0 0 10px rgba(201,151,255,0.45))' }} />
                ) : (
                  <b data-provider={id}>{id === 'groq' ? 'groq' : '≡'}</b>
                )}
              </div>
              <span className={s.nodeName}>{name}</span>
            </button>
          );
        })}
      </div>

      {/* Header overlay */}
      <div className={s.headerOverlay}>
        <Link href="/build" className={s.brandLink}><span aria-hidden="true">•</span> <b>KNOuX</b> <span>STORE</span></Link>
        <header className={s.title}>
          <h1>Universal Provider Engine</h1>
          <p>Connect. Discover. Route.</p>
        </header>
      </div>

      {/* Left provider panel - real provider list connected to selection */}
      <div className={s.providerPanel}>
        <div className={s.panelHeader}>
          <span className={s.panelTitle}>Providers</span>
        </div>
        <nav className={s.providerList} aria-label="Provider registry">
          {positions.map(([id, name]) => {
            const d = definitions.find(p => p.id === id);
            const mark = providerMark(id);
            return (
              <button
                key={id}
                type="button"
                className={s.listItem}
                aria-current={selected === id ? 'true' : undefined}
                disabled={!d}
                onClick={() => d && onSelect(d)}
              >
                {mark ? (
                  <Image src={`/providers/${mark}.svg`} alt="" width={20} height={20} loading="eager" className={s.listMark} style={{ filter: 'invert(1) drop-shadow(0 0 10px rgba(201,151,255,0.45))' }} />
                ) : (
                  <b data-provider={id}>{id === 'groq' ? 'groq' : '≡'}</b>
                )}
                <span>{name}</span>
                <span className={s.arrow}>→</span>
                <span className={s.statusBadge}>
                  {d ? (active ? 'ACTIVE' : 'UNCONFIGURED') : '—'}
                </span>
              </button>
            );
          })}
          {!definitions.length ? <p className={s.emptyState}>Provider registry is unavailable until its status has been read.</p> : null}
        </nav>
      </div>

      <div className={s.coreLinks}>
        <button type="button" onClick={onBrowse} aria-label="Browse providers">
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 4 21 11-21 11L3 15Z M3 24l21 11 21-11 M3 33l21 11 21-11" /></svg>
        </button>
        <Link href="/build/ai/models" aria-label="Discover models">
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 3 20 11v22L24 47 4 36V14Z M4 14l20 11 20-11 M24 25v22" /></svg>
        </Link>
      </div>

      <button type="button" className={s.getApi} onClick={onGetApi}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 14 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)" /></svg>Get API
      </button>
    </section>
  );
}