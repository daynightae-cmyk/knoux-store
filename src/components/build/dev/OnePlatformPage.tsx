'use client';

/**
 * One Platform — NSIS reference 82227 / 82236.
 *
 * The reference constellation, rendered as real navigation with measured
 * capability readings: every glass card is a link to the live workspace
 * surface and displays its actual capability state from the canonical
 * workspace state. No counts, statuses or release values are invented.
 */
import Link from 'next/link';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { platformRuntime } from '@/lib/build/platform-runtime';
import { ParticleMark } from '@/components/brand/ParticleMark';
import { DevStatus } from './DevUI';
import s from './one-platform.module.css';

const CARDS = [
  { id: 'apps', title: 'Apps', body: 'Build and operate applications.', href: '/build/apps', icon: 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16' },
  { id: 'discovery', title: 'Model Discovery', body: 'Find and evaluate models.', href: '/build/ai/models', icon: 'm12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5' },
  { id: 'routing', title: 'Model Routing', body: 'Route with policies and fallbacks.', href: '/build/ai/router', icon: 'M6 4v6a4 4 0 0 0 4 4h8 M6 4a2 2 0 1 0 0 .01 M18 14a2 2 0 1 0 0 .01 M18 14v6 M18 20a2 2 0 1 0 0 .01 M12 14v6' },
  { id: 'providers', title: 'Providers', body: 'Connect and manage model providers.', href: '/build/providers', icon: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0Z M12 16v5' },
  { id: 'docs', title: 'Docs & Knowledge', body: 'Project documentation and runbooks.', href: '/build/docs', icon: 'M6 3h9l4 4v14H6Z M15 3v4h4 M9 11h7M9 15h7' },
  { id: 'services', title: 'Services', body: 'Composable platform services.', href: '/build/services', icon: 'M4 6l5 6-5 6M12 18h8' },
  { id: 'deployments', title: 'Deployments', body: 'Build, test, and release across environments.', href: '/build/deployments', icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Z M12 12l8-4.5M12 12v9M12 12 4 7.5' },
  { id: 'control', title: 'Control', body: 'Configure, monitor, and manage your environment.', href: '/build/settings', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1' },
] as const;

export function OnePlatformPage() {
  const { state } = useBuildWorkspace();
  const services = platformRuntime(state);
  const serviceMap = new Map(services.map((svc) => [svc.door, svc]));

  return (
    <div className={s.page}>
      <div className={s.scene}>
        <p className={s.brand}><i aria-hidden="true" /> KNOuX <span>BUILD</span></p>
        <h1 className={s.title}>One Platform</h1>
        <p className={s.lede}>Services <b>•</b> Apps <b>•</b> Intelligence <b>•</b> Control</p>
        <svg className={s.orbits} viewBox="0 0 1200 640" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#bb8ef2" strokeWidth="1.1">
            <ellipse cx="600" cy="330" rx="560" ry="180" opacity=".4" />
            <ellipse cx="600" cy="330" rx="420" ry="120" opacity=".55" transform="rotate(-4 600 330)" />
            <ellipse cx="600" cy="330" rx="250" ry="70" opacity=".4" transform="rotate(5 600 330)" />
          </g>
          {[[180,250],[420,180],[780,180],[1020,250],[240,430],[960,430],[600,510],[360,330],[840,330]].map(([x, y]) => (
            <g key={`${x}-${y}`}><circle cx={x} cy={y} r="5" fill="#c07cff" opacity=".85" /><circle cx={x} cy={y} r="2.2" fill="#fff" /></g>
          ))}
          <g stroke="#c9a2ff" strokeWidth="1" opacity=".5">
            <path d="M600 120v60M600 480v60M240 330h110M850 330h110" fill="none" />
          </g>
        </svg>
        <div className={s.core}>
          <ParticleMark patternId="one-platform-mark" className={s.mark} dense />
          <span className={s.coreLabel}>KNOuX <small>STORE</small></span>
        </div>
        <nav className={s.cards} aria-label="One Platform destinations">
          {CARDS.map((card) => {
            const svc = serviceMap.get(card.id as typeof services[number]['door']);
            const reading = svc?.reading ?? 'unmeasured';
            const value = svc?.value;
            const detail = svc?.detail ?? 'The workspace reading has not arrived in this session yet.';
            return (
              <Link key={card.id} href={card.href} className={`${s.card} ${s[card.id]}`}>
                <span className={s.tile} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                </span>
                <span className={s.cardText}>
                  <strong>{card.title}</strong>
                  <small>{card.body}</small>
                  {value && <DevStatus label={value} tone={reading === 'measured' ? 'ok' : reading === 'unmeasured' ? 'none' : 'warn'} />}
                </span>
                {detail && <span className={s.cardDetail} title={detail}>{detail.slice(0, 160)}{detail.length > 160 ? '…' : ''}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={s.limb} aria-hidden="true" />
      </div>
    </div>
  );
}
