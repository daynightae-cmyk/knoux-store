'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './universal-provider-engine.module.css';


const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', mark: 'openai' },
  { id: 'anthropic', name: 'Anthropic', mark: 'anthropic' },
  { id: 'gemini', name: 'Google Gemini', mark: 'gemini' },
  { id: 'deepseek', name: 'DeepSeek', mark: 'deepseek' },
  { id: 'qwen', name: 'QwenCloud', mark: 'qwen' },
  { id: 'grok', name: 'Grok', mark: 'grok' },
  { id: 'mistral', name: 'Mistral', mark: 'mistral' },
  { id: 'groq', name: 'Groq', mark: 'groq' },
  { id: 'openrouter', name: 'OpenRouter', mark: 'openrouter' },
] as const;

export default function UniversalProviderEngine() {
  const [hovered, setHovered] = useState<string>('');

  return (
    <div className={styles.engine} aria-label="Universal Provider Engine">
      {/* Cosmic background */}
      <div className={styles.bg}>
        <div className={styles.stars} aria-hidden="true" />
        <div className={styles.planet} aria-hidden="true" />
        <div className={styles.glow} aria-hidden="true" />
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.dot} aria-hidden="true">•</span>
          <span className={styles.store}>KNOUX STORE</span>
        </div>
        <h1 className={styles.title}>Universal Provider Engine</h1>
        <p className={styles.subtitle}>Connect. Discover. Route.</p>
      </header>

      {/* Main orbit stage */}
      <main className={styles.stage} role="region" aria-label="Provider orbit">
        {/* Left panel: Providers */}
        <aside className={styles.panel} aria-label="Providers">
          <div className={styles.panelHeader}>
            <svg className={styles.panelIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            <span className={styles.panelTitle}>Providers</span>
          </div>
          <nav className={styles.providerList} aria-label="Provider list">
            {PROVIDERS.map((p) => (
              <Link
                key={p.id}
                href={`/build/providers?provider=${p.id}`}
                className={`${styles.listItem} ${hovered === p.id ? styles.active : ''}`}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered('')}
              >
                <ProviderMark mark={p.mark} size={20} />
                <span>{p.name}</span>
                <span className={styles.arrow}>→</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Center: orbiting providers around KNOuX mark */}
        <div className={styles.orbit} aria-label="Provider constellation">
          {/* Orbit rings */}
          <div className={`${styles.ring} ${styles.outer}`} aria-hidden="true" />
          <div className={`${styles.ring} ${styles.middle}`} aria-hidden="true" />
          <div className={`${styles.ring} ${styles.inner}`} aria-hidden="true" />

          {/* Central KNOuX mark */}
          <div className={styles.core}>
            <div className={styles.coreGlow} aria-hidden="true" />
            <div className={styles.coreMark}>
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                  <linearGradient id="upe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c997ff" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 20 C145 20 180 55 180 100 C180 145 145 180 100 180 C55 180 20 145 20 100 C20 55 55 20 100 20 Z"
                  fill="url(#upe-grad)"
                />
                <path
                  d="M100 40 Q130 70 160 100 Q130 130 100 160 Q70 130 40 100 Q70 70 100 40 Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                <text x="100" y="115" fontFamily="monospace" fontSize="10" fill="white" textAnchor="middle" letterSpacing="2" opacity="0.7">K N O U X</text>
              </svg>
            </div>
            <span className={styles.coreLabel}>Engine Core</span>
          </div>

          {/* Orbiting provider nodes */}
          {PROVIDERS.map((p, i) => {
            const angle = (i / PROVIDERS.length) * 360;
            return (
              <Link
                key={p.id}
                href={`/build/providers?provider=${p.id}`}
                className={`${styles.node} ${hovered === p.id ? styles.active : ''}`}
                style={{ '--angle': `${angle}deg` } as React.CSSProperties}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered('')}
                aria-label={p.name}
              >
                <div className={styles.nodeMark}>
                  <ProviderMark mark={p.mark} size={32} />
                </div>
                <span className={styles.nodeName}>{p.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right panel: Model Discovery */}
        <aside className={styles.panel} aria-label="Model Discovery">
          <div className={styles.panelHeader}>
            <svg className={styles.panelIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 12-4 3v3c0 1.88-1.08 3.52-2.78 4.16" />
            </svg>
            <span className={styles.panelTitle}>Model Discovery</span>
          </div>
          <div className={styles.discoveryGrid} role="grid" aria-label="Discovered models">
            {['Gemini 2.5 Pro', 'Claude 3.7 Sonnet', 'GPT-4o', 'Grok 3', 'DeepSeek V3', 'Qwen 2.5 Max'].map((model) => (
              <div key={model} className={styles.discoveryCard} role="gridcell">
                <span className={styles.dotBadge} aria-hidden="true"></span>
                <span>{model}</span>
              </div>
            ))}
          </div>
          <p className={styles.discoveryNote}>Real-time model availability across connected providers.</p>
        </aside>
      </main>

      {/* CTA bar */}
      <footer className={styles.cta}>
        <Link href="/build/providers" className={styles.btnGetApi}>
          <svg className={styles.linkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-.707-7.07l-1.72-1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 .707 7.07l1.71 1.71" />
          </svg>
          Get API
        </Link>
        <p className={styles.ctaNote}>Keys are write-only — paste the full key, typing is not required.</p>
      </footer>
    </div>
  );
}

interface ProviderMarkProps {
  mark: string;
  size?: number;
}

function ProviderMark({ mark, size = 28 }: ProviderMarkProps) {
  return (
    <Image
      src={`/providers/${mark}.svg`}
      alt=""
      width={size}
      height={size}
      loading="eager"
      className={styles.markImg}
      style={{ filter: 'invert(1) drop-shadow(0 0 10px rgba(201,151,255,0.45))' }}
    />
  );
}
