'use client';

/**
 * One Platform — NSIS reference 82227, preserved at /build/platform.
 *
 * The whole page is the reference composition, rendered as code: nebula
 * gradients, seeded starfield (the shell's dev-cosmic-field canvas), SVG
 * orbital rings with light nodes, raised glass destinations and the Earth
 * horizon. Every glass card is a link to the live workspace surface it names,
 * carrying the door's measured capability reading from the canonical workspace
 * state — no counts, statuses or release values are invented; an unmeasured
 * surface says so.
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
  // The reference draws the routing card as a two-branch node graph.
  { id: 'routing', title: 'Model Routing', body: 'Route with policies and fallbacks.', href: '/build/ai/router', icon: 'M5 12h5m0 0V7h5m-5 5v5h5M17 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM17 15.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM5 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z' },
  { id: 'providers', title: 'Providers', body: 'Connect and manage model providers.', href: '/build/providers', icon: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0Z M12 16v5' },
  { id: 'docs', title: 'Docs & Knowledge', body: 'Project documentation and runbooks.', href: '/build/docs', icon: 'M6 3h9l4 4v14H6Z M15 3v4h4 M9 11h7M9 15h7' },
  { id: 'services', title: 'Services', body: 'Composable platform services.', href: '/build/services', icon: 'M4 6l5 6-5 6M12 18h8' },
  { id: 'deployments', title: 'Deployments', body: 'Build, test, and release across environments.', href: '/build/deployments', icon: 'M12 2l4 2.2v4.4L12 10.8 8 8.6V4.2Z M8 4.2l4 2.2 4-2.2M12 6.4v4.4 M7.5 11l4 2.2v4.4l-4 2.2-4-2.2v-4.4Z M3.5 13.2l4 2.2 4-2.2M7.5 15.4v4.4 M16.5 11l4 2.2v4.4l-4 2.2-4-2.2v-4.4Z M12.5 13.2l4 2.2 4-2.2M16.5 15.4v4.4' },
  // The reference draws Control as a solid cog silhouette.
  { id: 'control', title: 'Control', body: 'Configure, monitor, and manage your environment.', href: '/build/settings', solid: true, icon: 'M10.6 2.5h2.8l.5 2.3 1.7.7 2-1.3 2 2-1.3 2 .7 1.7 2.3.5v2.8l-2.3.5-.7 1.7 1.3 2-2 2-2-1.3-1.7.7-.5 2.3h-2.8l-.5-2.3-1.7-.7-2 1.3-2-2 1.3-2-.7-1.7-2.3-.5v-2.8l2.3-.5.7-1.7-1.3-2 2-2 2 1.3 1.7-.7Z M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z' },
] as const;

/** Light nodes on the reference orbits (viewBox 1400×620, core at 700×310). */
const NODES: ReadonlyArray<readonly [number, number]> = [
  [236, 208], [480, 128], [920, 128], [1164, 208],
  [150, 330], [1250, 330], [268, 452], [1132, 452],
  [452, 528], [948, 528], [700, 66], [700, 556],
];

export function OnePlatformPage({ onEnter }: Readonly<{ onEnter?: () => void }> = {}) {
  const { state } = useBuildWorkspace();
  const services = platformRuntime(state);
  const serviceMap = new Map(services.map((svc) => [svc.door, svc]));
  const core = (
    <>
      <ParticleMark patternId="one-platform-mark" className={s.mark} dense />
      <span className={s.coreLabel}>KNOuX <small>STORE</small></span>
    </>
  );
  return (
    <div className={s.page}>
      <div className={s.scene} data-scene="one-platform">
        <div className={s.nebula} aria-hidden="true" />
        {/* The constellation hides the workspace shell chrome, so this page
            carries its own visible navigation landmark: a keyboard user can
            always leave the scene. */}
        <nav className={s.topNav} aria-label="Build platform navigation">
          <Link href="/">Home</Link>
          <Link href="/build">Workspace</Link>
          <Link href="/build/providers">Providers</Link>
          <Link href="/build/ai/models">Models</Link>
          <Link href="/build/settings">Settings</Link>
        </nav>
        <p className={s.brand}><i aria-hidden="true" /> KNOuX <span>BUILD</span></p>
        <h1 className={s.title}>One Platform</h1>
        <p className={s.lede}>Services <b aria-hidden="true">•</b> Apps <b aria-hidden="true">•</b> Intelligence <b aria-hidden="true">•</b> Control</p>
        <div className={s.field}>
          <svg className={s.orbits} viewBox="0 0 1400 620" preserveAspectRatio="none" aria-hidden="true">
            <g fill="none" stroke="#bb8ef2" strokeWidth="1">
              <ellipse cx="700" cy="310" rx="640" ry="238" opacity=".22" />
              <ellipse cx="700" cy="310" rx="500" ry="176" opacity=".32" transform="rotate(-4 700 310)" />
              <ellipse cx="700" cy="310" rx="330" ry="106" opacity=".28" transform="rotate(5 700 310)" />
            </g>
            <g fill="none" stroke="#e2c4ff" strokeWidth="1.4" opacity=".4">
              <ellipse data-travel="a" cx="700" cy="310" rx="500" ry="176" transform="rotate(-4 700 310)" />
              <ellipse data-travel="b" cx="700" cy="310" rx="640" ry="238" />
            </g>
            <g stroke="#c9a2ff" strokeWidth="1.1" opacity=".5" fill="none">
              <path d="M700 92v92M700 436v92M236 310h132M1032 310h132" />
            </g>
            {NODES.map(([x, y], i) => (
              <g key={`${x}-${y}`} data-node="">
                {/* The reference's brightest junctions carry a four-point flare. */}
                {i % 3 === 0 && (
                  <path d={`M${x - 13} ${y}h26M${x} ${y - 13}v26`} stroke="#e9d5ff" strokeWidth=".9" opacity=".55" />
                )}
                <circle cx={x} cy={y} r="5.5" fill="#c07cff" opacity=".85" />
                <circle cx={x} cy={y} r="2.4" fill="#fff" />
              </g>
            ))}
          </svg>
          {onEnter ? (
            <button type="button" className={`${s.core} ${s.coreBtn}`} onClick={onEnter} aria-label="KNOuX STORE — enter the engineering workspace">
              {core}
            </button>
          ) : (
            <Link href="/build" className={s.core} aria-label="KNOuX STORE - open the Build welcome page">
              {core}
            </Link>
          )}
          <ul className={s.cards} aria-label="One Platform destinations">
            {CARDS.map((card) => {
              const svc = serviceMap.get(card.id);
              const value = svc?.value;
              const detail = svc?.detail ?? 'The workspace reading has not arrived in this session yet.';
              return (
                <li key={card.id} className={s[card.id]}>
                  <Link href={card.href} className={s.card}>
                    <span className={s.tile} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill={'solid' in card ? 'currentColor' : 'none'} fillRule="evenodd" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                    </span>
                    <span className={s.cardText}>
                      <strong>{card.title}</strong>
                      <small>{card.body}</small>
                      {value && <DevStatus label={value} tone={svc?.reading === 'measured' ? 'ok' : svc?.reading === 'unmeasured' ? 'none' : 'warn'} />}
                    </span>
                    <span className={s.cardDetail} title={detail}>{detail.length > 160 ? `${detail.slice(0, 160)}…` : detail}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className={s.limb} aria-hidden="true" />
      </div>
    </div>
  );
}