'use client';

/**
 * NSIS 82234 — Local Engineering Runtime hero.
 *
 * The reference's tilted glass terminal, rendered with measured state: the
 * window lines report what this workspace actually knows (source, bridge,
 * session) and never a simulated shell. The three doors are real navigation.
 */
import Link from 'next/link';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import s from './runtime-hero.module.css';

export function RuntimeHero({ active, bridgeLine, sessionLive, compact = false }: {
  active: 'engineering' | 'terminal' | 'powershell';
  bridgeLine: { text: string; tone: 'ok' | 'warn' | 'comment' };
  sessionLive: boolean;
  /** Workspace routes keep the runtime identity but yield the viewport to the live session. */
  compact?: boolean;
}) {
  const { state } = useBuildWorkspace();
  const doors = [
    { id: 'engineering', label: 'Engineering', href: '/build/engineering', icon: 'm12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5' },
    { id: 'terminal', label: 'Terminal', href: '/build/terminal', icon: 'M4 6l5 6-5 6M12 18h8' },
    { id: 'powershell', label: 'PowerShell', href: '/build/powershell', icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M8 9l3 3-3 3M13 15h3' },
  ] as const;
  return (
    <header className={s.scene} data-compact={compact ? '' : undefined}>
      <p className={s.brand}><i aria-hidden="true" /> KNOUX <span>STORE</span></p>
      <h1 className={s.title}>Local Engineering Runtime</h1>
      <p className={s.lede}>Terminal <b>•</b> PowerShell <b>•</b> Bridge</p>
      <div className={s.window}>
        <div className={s.windowBar}>KNOUX <em>›</em> <small>Engineering</small><span className={s.windowDots} aria-hidden="true"><i /><i /><i /></span></div>
        <div className={s.windowBody}>
          <nav className={s.rail} aria-label="Runtime surfaces">
            {doors.map((door) => <Link key={door.id} href={door.href} aria-current={active === door.id ? 'page' : undefined} aria-label={door.label}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={door.icon} /></svg></Link>)}
          </nav>
          <div className={s.code} aria-label="Measured runtime state">
            <ol>
              <li><span className={s.comment}># KNOUX Engineering Runtime — measured state</span></li>
              <li><span>source {state.git?.headSha ? state.git.headSha.slice(0, 12) : 'UNVERIFIED'}</span></li>
              <li><span>bridge {state.adapter.environment.toUpperCase()}</span></li>
              <li><span className={s[bridgeLine.tone]}>{bridgeLine.tone === 'ok' ? '✓ ' : ''}{bridgeLine.text}</span></li>
              <li><span>&gt;_ {sessionLive ? 'session live' : 'no session'} <i className={s.cursor} aria-hidden="true" /></span></li>
            </ol>
          </div>
        </div>
      </div>
      <nav className={s.doors} aria-label="Local runtime doors">
        {doors.map((door) => <Link key={door.id} href={door.href} className={s.door} aria-current={active === door.id ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={door.icon} /></svg>{door.label}</Link>)}
      </nav>
      <svg className={s.rings} viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="#bb8ef2" strokeWidth="1.1">
          <ellipse cx="600" cy="180" rx="560" ry="100" opacity=".45" />
          <ellipse cx="600" cy="200" rx="380" ry="60" opacity=".35" transform="rotate(-3 600 200)" />
        </g>
        {[[140,150],[420,110],[780,110],[1060,150],[300,240],[900,240]].map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="4.5" fill="#c07cff" opacity=".85" /><circle cx={x} cy={y} r="2" fill="#fff" /></g>)}
      </svg>
      <div className={s.limb} aria-hidden="true" />
    </header>
  );
}
