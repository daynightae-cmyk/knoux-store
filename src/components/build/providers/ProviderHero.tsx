'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ParticleMark } from '@/components/brand/ParticleMark';
import type { ProviderDefinition } from '@/lib/ai/provider-os/types';
import { providerMark } from './provider-marks';
import s from './provider-hero.module.css';

// Providers arranged around a centered elliptical orbit (angle in degrees, 0 = top).
const orbitSlots = [
  ['openai', 'OpenAI', -10], ['anthropic', 'Anthropic', 30],
  ['gemini', 'Google Gemini', 70], ['openrouter', 'OpenRouter', 110],
  ['deepseek', 'DeepSeek', 150], ['groq', 'Groq', 190],
  ['qwen', 'QwenCloud', 230], ['mistral', 'Mistral', 270], ['grok', 'Grok', 310],
] as const;

// Set of provider IDs that have orbit nodes — used to gate the contextual panel
// so it only appears for providers that actually orbit, avoiding overlap with
// the default selected provider (OpenCode Console V2) which has no orbit node.
const orbitProviderIds = new Set<string>(orbitSlots.map(([id]) => id));

export function ProviderHero({ definitions, selected, connection, discoveredModels, onSelect, onGetApi, onBrowse, onInspect }: {
  definitions: readonly ProviderDefinition[];
  selected: string;
  connection: string | null;
  discoveredModels: number | null;
  onSelect: (definition: ProviderDefinition) => void;
  onGetApi: () => void;
  onBrowse: () => void;
  onInspect: () => void;
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
  const current = definitions.find(definition => definition.id === selected);
  const currentMark = current ? providerMark(current.id) : null;

  // Elliptical orbit position for a given angle (degrees), centered at 53.5% of
  // the viewport so the upper arc clears the title band while the lower nodes
  // stay below the central instrument.
  const orbitPosition = (angleDeg: number, rx: number, ry: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * rx;
    const y = 53.5 + Math.sin(rad) * ry;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <section ref={hero} className={s.hero} data-paused={paused} aria-label="Provider Constellation">
      <button type="button" className={s.motionControl} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
        {paused ? 'Resume orbit' : 'Pause orbit'}
      </button>
      {/* Deep sky: nebula banks, starfield, planetary horizon — all code, no photograph. */}
      <div className={s.sky} aria-hidden="true" />
      <div className={s.limb} aria-hidden="true" />
      <div className={s.horizon} aria-hidden="true" />
      {/* Centered KNOX identity — owns the top of the viewport. */}
      <Link href="/build" className={s.brand}><i aria-hidden="true" /> <b>KNOuX</b> <span>STORE</span></Link>
      <header className={s.title}>
        <h1>Provider Constellation</h1>
        <p>Connect, orchestrate, and route AI and compute providers across your workspace.</p>
      </header>
      {/* Orbital paths drawn around the central instrument. */}
      <svg className={s.orbits} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="provider-orbit-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <g fill="none" stroke="#b88bf3" strokeWidth="1.2" opacity=".5">
          <ellipse cx="500" cy="375" rx="360" ry="150" />
          <ellipse cx="500" cy="375" rx="260" ry="95" opacity=".6" />
          <ellipse cx="500" cy="375" rx="150" ry="48" opacity=".35" />
        </g>
        {/* Luminous orbital particles between the rings. */}
        <g stroke="#f4ebff" fill="none">
          {[45, 105, 165, 225, 285, 345].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 500 + Math.cos(rad) * 310;
            const y = 375 + Math.sin(rad) * 130;
            return (
              <g key={angle} data-flare="" opacity=".85">
                <circle cx={x} cy={y} r="2.5" fill="#fff" />
                <circle cx={x} cy={y} r="7" fill="none" stroke="#bd76ff" strokeWidth=".6" />
              </g>
            );
          })}
        </g>
      </svg>
      {/* Provider nodes on the elliptical orbit around the center. */}
      {orbitSlots.map(([id, name, angle], index) => {
        const d = definitions.find((p) => p.id === id);
        const mark = providerMark(id);
        const pos = orbitPosition(angle, 44, 21.5);
        const phase = ((index / orbitSlots.length) * 100).toFixed(2);
        return (
          <div
            key={id}
            className={s.nodeWrapper}
            style={{ '--x': pos.x, '--y': pos.y, '--phase': phase + '%' } as CSSProperties}
          >
            <button
              type="button"
              className={s.node}
              disabled={!d}
              aria-label={'Select ' + name}
              aria-pressed={selected === id}
              onClick={() => { if (d) { document.title = 'SELECT:' + d.id; onSelect(d); } }}
            >
              <span className={s.sphere} aria-hidden="true">
                {mark ? <Image src={`/providers/${mark}.svg`} alt="" width={40} height={40} loading="eager" /> : <b data-provider={id} />}
              </span>
              <span>{name}</span>
            </button>
          </div>
        );
      })}
      {/* Dominant central provider instrument — the heart of the constellation.
          Rendered only when a provider is selected so it never intercepts
          orbit-node clicks on the unselected constellation. */}
      {current && (
        <div className={s.instrument} aria-hidden={!current}>
          <div className={s.instrumentMark} aria-hidden="true">
            {currentMark ? <Image src={`/providers/${currentMark}.svg`} alt="" width={72} height={72} /> : <ParticleMark patternId="provider-mark-particles" className={s.seal} />}
          </div>
          <div className={s.instrumentBody}>
            <div className={s.instrumentLabel}>
              <span>{current.class.replaceAll('_', ' ')}</span>
              <h2 className={s.instrumentName}>{current.name}</h2>
              <strong className={s.instrumentStatus}>{connection?.replaceAll('_', ' ') ?? 'Not configured'}</strong>
            </div>
            <dl className={s.instrumentFacts}>
              <div><dt>Transport</dt><dd>{current.transport}</dd></div>
              <div><dt>Discovered models</dt><dd>{discoveredModels ?? 'Not reported'}</dd></div>
            </dl>
            <div className={s.instrumentActions}>
              <button type="button" className={s.instrumentBtn} onClick={onInspect}>Provider details</button>
              <button type="button" className={s.instrumentBtn} onClick={onBrowse}>Browse catalog</button>
            </div>
          </div>
        </div>
      )}
      {/* Contextual panel — populated when a provider is selected, otherwise empty. */}
      {current && orbitProviderIds.has(current.id) && (
        <aside className={s.contextPanel} aria-label={current.name + ' details'}>
          <header className={s.contextHead}>
            <span className={s.contextEyebrow}>{current.class.replaceAll('_', ' ')} / {current.transport}</span>
            <h3 className={s.contextTitle}>{current.name}</h3>
          </header>
          <p className={s.contextLine}>{connection ? 'Connection: ' + connection : 'No profile bound.'}</p>
          <div className={s.contextActions}>
            <button type="button" className={s.contextBtn} onClick={onInspect}>Configure provider</button>
            <button type="button" className={s.contextBtn} onClick={onGetApi}>API key</button>
          </div>
          <p className={s.contextNote}>Connection testing checks authentication and discovery only; it does not generate content.</p>
        </aside>
      )}
      {/* Primary action — always visible, centered at the bottom, never clipped. */}
      <button type="button" className={s.getApi} onClick={onGetApi}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 14 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)" /></svg>
        Get API
      </button>
    </section>
  );
}