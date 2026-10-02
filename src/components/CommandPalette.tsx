'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allEntities } from '@/data/composer-rules';
import { divisionLabel, searchEntities, type DiscoverableEntity } from '@/lib/entities';
import { track } from '@/lib/analytics';

/**
 * Global KNOuX command interface.
 *
 * One search surface over the whole institution: software, WordPress items,
 * services, solutions, divisions and routes. It resolves against the same
 * entity index the division pages render from, so nothing can be findable here
 * that is not published somewhere on the site.
 */

const GROUP_ORDER = ['solutions', 'web', 'growth', 'creative', 'wordpress', 'software', 'labs', 'institution'] as const;

const GROUP_LABEL: Record<string, string> = {
  solutions: 'Solutions',
  web: 'Web engineering',
  growth: 'Growth',
  creative: 'Creative',
  wordpress: 'WordPress',
  software: 'Software',
  labs: 'Labs',
  institution: 'Institution',
};

export const OPEN_EVENT = 'knoux:open-command';

function groupLabel(entity: DiscoverableEntity): string {
  if (entity.kind === 'route') return 'Routes';
  return GROUP_LABEL[entity.division] ?? divisionLabel(entity.division);
}

function rank(division: string): number {
  const index = GROUP_ORDER.indexOf(division as (typeof GROUP_ORDER)[number]);
  return index === -1 ? GROUP_ORDER.length : index;
}

/** Group ordering follows division order, with routes last. */
function rankFor(label: string): number {
  if (label === 'Routes') return GROUP_ORDER.length + 1;
  const key = Object.keys(GROUP_LABEL).find((name) => GROUP_LABEL[name] === label);
  return key ? rank(key) : GROUP_ORDER.length;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) {
      // With no query, offer the entry points that orient a new visitor.
      return allEntities
        .filter((entity) => entity.kind === 'solution' || entity.kind === 'route' || entity.code.startsWith('SW'))
        .slice(0, 10);
    }
    return searchEntities(allEntities, query, 24).map((match) => match.entity);
  }, [query]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, { rank: number; entities: DiscoverableEntity[] }>();
    for (const entity of results) {
      const key = groupLabel(entity);
      const existing = buckets.get(key);
      if (existing) {
        existing.entities.push(entity);
        continue;
      }
      buckets.set(key, { rank: rank(entity.division), entities: [entity] });
    }
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, entities: value.entities }))
      .sort((a, b) => rankFor(a.label) - rankFor(b.label));
  }, [results]);
  const orderedResults = useMemo(() => grouped.flatMap((group) => group.entities), [grouped]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    restoreFocus.current?.focus?.();
  }, []);  const go = useCallback(
    (entity: DiscoverableEntity) => {
      track({ type: 'search_result_opened', id: entity.id, kind: entity.kind, division: entity.division });
      setOpen(false);
      setQuery('');
      setActive(0);
      if (entity.route) router.push(entity.route);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !isTypingTarget(event.target);
      // The Build workspace owns Ctrl+K inside /build so only one modal can open.
      if (combo && pathname.startsWith('/build')) return;
      if (combo || slash) {
        event.preventDefault();
        setOpen((current) => {
          if (!current) restoreFocus.current = document.activeElement as HTMLElement;
          return !current;
        });
        return;
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
      }
    };
    const onRequest = () => {
      restoreFocus.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onRequest);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onRequest);
    };
  }, [open, close, pathname]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const activeNode = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    activeNode?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  let flatIndex = -1;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (orderedResults.length ? (current + 1) % orderedResults.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (orderedResults.length ? (current - 1 + orderedResults.length) % orderedResults.length : 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(Math.max(orderedResults.length - 1, 0));
    } else if (event.key === 'Enter') {
      const entity = orderedResults[active];
      if (entity) {
        event.preventDefault();
        go(entity);
      }
      return;
    } else if (event.key === 'Tab') {
      // The dialog holds one input and a list of buttons; keep focus inside.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input, button, a[href]');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search KNOuX"
        onKeyDown={onKeyDown}
      >
        <div className="palette__field">
          <span aria-hidden="true">/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              track({
                type: 'search_performed',
                query: event.target.value,
                resultCount: searchEntities(allEntities, event.target.value, 24).length,
                surface: 'command',
              });
            }}
            placeholder="Search software, services, solutions, routes"
            aria-label="Search KNOuX"
            aria-controls="command-results"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="palette__esc" onClick={close} aria-label="Close search">
            ESC
          </button>
        </div>

        <div className="palette__results" id="command-results" role="listbox" aria-label="Search results" ref={listRef}>
          {results.length === 0 ? (
            <p className="palette__empty">
              <strong>No entry matches &ldquo;{query.trim()}&rdquo;.</strong>
              The index only contains items that are published on this site. Try a product name, a capability
              such as &ldquo;booking&rdquo; or &ldquo;seo&rdquo;, or a service such as &ldquo;repair windows&rdquo;.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <p className="palette__group">{group.label}</p>
                {group.entities.map((entity) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  return (
                    <button
                      key={entity.id}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      className="palette__result"
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(entity)}
                    >
                      <code>{entity.code}</code>
                      <span>
                        <strong>{entity.name}</strong>
                        <small>{entity.summary}</small>
                      </span>
                      <em>{entity.kind.toUpperCase()}</em>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="palette__foot">
          <span>
            <b>↑↓</b> MOVE
          </span>
          <span>
            <b>ENTER</b> OPEN
          </span>
          <span>
            <b>ESC</b> CLOSE
          </span>
          <span>{results.length} of {allEntities.length} ENTRIES</span>
        </div>
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
