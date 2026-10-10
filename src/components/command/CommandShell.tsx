'use client';

/**
 * Command Center — the workspace shell.
 *
 * Composes the context bar, the left rail with the client switcher, the
 * contextual KNOuX dock, and the active screen. It owns no data of its own; the
 * client selection lives in the workspace context so every child reads the same
 * state.
 *
 * `isActive` is passed in rather than read from the router so the shell does not
 * need `usePathname`, keeping it renderable from a server component too.
 */

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { COMMAND_GROUPS, areaHref, type CommandArea } from './navigation';
import { CommandDock, type DockSurface } from './CommandDock';
import { useWorkspace } from './workspace-context';

import { CapabilityBadge, ConnectionBadge } from './primitives';
import styles from './command.module.css';

export type CommandShellProps = {
  area: CommandArea;
  children: ReactNode;
  dock: DockSurface;
  /** Small metrics shown in the context bar strip. */
  facts?: { label: string; value: string }[];
};

export function CommandShell({ area, children, dock, facts = [] }: CommandShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { records, clients, activeClient, setActiveClientId, isDemoWorkspace, demoReason } = useWorkspace();
  const connections = records.connections;
  const blocked = connections.filter((connection) => connection.state === 'BLOCKED').length;
  const needsWork = connections.filter(
    (connection) => connection.state === 'EXPIRED' || connection.state === 'PERMISSION_REQUIRED',
  ).length;

  return (
    <div className={styles.command ?? ''}>
      <header className={styles.commandBar ?? ''}>
        <div className={styles.commandIdent ?? ''}>
          <KnouxMark />
          <span className={styles.commandIdentText ?? ''}>
            <span className={styles.commandName ?? ''}>KNOuX Social Command Center</span>
            <span className={styles.commandSub ?? ''}>AI Growth &amp; Advertising Operating System</span>
          </span>
        </div>

        <div className={styles.commandStrip ?? ''} tabIndex={0} role="group" aria-label="Workspace status indicators">
          {facts.map((fact) => (
            <div key={fact.label} className={styles.commandFact ?? ''}>
              <span className={styles.commandFactLabel ?? ''}>{fact.label}</span>
              <span className={styles.commandFactValue ?? ''}>{fact.value}</span>
            </div>
          ))}
          <div className={styles.commandFact ?? ''}>
            <span className={styles.commandFactLabel ?? ''}>Connection health</span>
            <span className={styles.commandFactValue ?? ''} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isDemoWorkspace ? (
                <CapabilityBadge state="CONFIG_REQUIRED" />
              ) : (
                <CapabilityBadge state="LIVE_VERIFIED" />
              )}
              {needsWork > 0 ? <span>{needsWork} need attention</span> : null}
              {blocked > 0 ? <span>{blocked} blocked</span> : null}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.commandBody ?? ''}>
        <button className={styles.commandNavigationToggle} type="button" aria-label={`Workspace navigation for ${activeClient.name}`} aria-expanded={navigationOpen} aria-controls="command-navigation" onClick={() => setNavigationOpen((open) => !open)}>{activeClient.name}<span>{navigationOpen ? 'Close navigation −' : 'Workspace navigation +'}</span></button>
        <nav id="command-navigation" className={`${styles.commandRail ?? ''} ${navigationOpen ? '' : styles.commandRailCollapsed}`} aria-label="Command Center sections">
          <div className={styles.commandSwitch ?? ''}>
            <span className={styles.commandSwitchLabel ?? ''}>Client workspace</span>
            <div className={styles.commandSwitchRow ?? ''} role="group" aria-label="Select client">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={styles.commandClient ?? ''}
                  aria-pressed={client.id === activeClient.id}
                  onClick={() => setActiveClientId(client.id)}
                >
                  <span className={styles.commandClientDot ?? ''} aria-hidden="true" />
                  <span className={styles.commandClientName ?? ''}>{client.name}</span>
                </button>
              ))}
            </div>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--cc-ink-4)',
                margin: '10px 0 0',
                lineHeight: 1.6,
              }}
            >
              {demoReason ?? 'Authenticated stored workspace. Connection health is shown separately.'}
            </p>
          </div>

          <div className={styles.commandRailNav ?? ''}>
            {COMMAND_GROUPS.map((group) => (
              <div key={group.label} className={styles.commandRailGroup ?? ''}>
                <p className={styles.commandRailLabel ?? ''}>{group.label}</p>
                {group.areas.map((entry) => (
                  <Link
                    key={entry.slug || 'root'}
                    href={areaHref(entry.slug)}
                    className={styles.commandNavItem ?? ''}
                    aria-current={entry.slug === area.slug ? 'page' : undefined}
                  >
                    <span>{entry.label}</span>
                    <span className={styles.commandNavCode ?? ''}>{entry.code}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.commandRailGroup ?? ''}>
            <p className={styles.commandRailLabel ?? ''}>Public division</p>
            <Link href="/growth" className={styles.commandNavItem ?? ''}>
              <span>KNOuX Growth</span>
              <span className={styles.commandNavCode ?? ''}>04</span>
            </Link>
          </div>
        </nav>

        <main className={styles.commandMain ?? ''} id="main-content" tabIndex={-1}>
          <div className={styles.commandHead ?? ''}>
            <div className={styles.commandHeadText ?? ''}>
              <span className={styles.commandEyebrow ?? ''}>
                {area.code} · {activeClient.name}
              </span>
              <h1 className={styles.commandTitle ?? ''}>{area.label}</h1>
              <p className={styles.commandLede ?? ''}>{area.purpose}</p>
            </div>
            <div className={styles.commandHeadActions ?? ''}>
              {connections.slice(0, 3).map((connection) => (
                <ConnectionBadge key={connection.id} state={connection.state} />
              ))}
            </div>
          </div>

          <CommandDock surface={dock} />

          {children}

          <p className={styles.ccFoot ?? ''}>
            <strong>One intelligence.</strong> Every channel, every client. KNOuX reasons through the
            KNOuX Intelligence layer; Meta and Google are connectors, not the brain. No campaign can
            spend without a named human approving a frozen budget.
          </p>
        </main>
      </div>
    </div>
  );
}

function KnouxMark() {
  return (
    <svg className={styles.commandGlyph ?? ''} viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <path
        d="M12 1 L23 7 L23 25 L12 31 L1 25 L1 7 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
      />
      <path d="M12 1 L12 31" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <path d="M1 7 L23 25 M23 7 L1 25" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
      <circle cx="12" cy="16" r="3.2" fill="currentColor" opacity="0.82" />
    </svg>
  );
}
