'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { capabilityById, capabilities, type Capability, type CapabilityDivisionId } from '@/data/capabilities';
import { capabilityMatrixDivisions } from '@/data/navigation';
import { track } from '@/lib/analytics';

/**
 * Capability matrix.
 *
 * Capability against division. One vocabulary across the institution, so a
 * visitor can see which divisions can serve a need without learning what the
 * internal departments are called.
 */
export function CapabilityMatrix() {
  const [focus, setFocus] = useState<CapabilityDivisionId | 'all'>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return capabilities.filter((capability) => {
      if (focus !== 'all' && !capability.providedBy.includes(focus)) return false;
      if (!term) return true;
      return (
        capability.label.toLowerCase().includes(term) ||
        capability.searchTerms.some((entry) => entry.includes(term))
      );
    });
  }, [focus, query]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, Capability[]>();
    for (const capability of rows) {
      const group = capability.label.split(/[ /]/)[0];
      const bucket = buckets.get(group);
      if (bucket) bucket.push(capability);
      else buckets.set(group, [capability]);
    }
    return [...buckets.entries()];
  }, [rows]);

  return (
    <div>
      <div className="finder-controls" style={{ marginTop: 0, marginBottom: 26 }}>
        <div className="finder-chips" role="group" aria-label="Filter matrix by division">
          <button
            type="button"
            className={`tag tag--button ${focus === 'all' ? 'is-active' : ''}`}
            aria-pressed={focus === 'all'}
            onClick={() => setFocus('all')}
          >
            ALL DIVISIONS
          </button>
          {capabilityMatrixDivisions.map((division) => (
            <button
              key={division.id}
              type="button"
              className={`tag tag--button ${focus === division.id ? 'is-active' : ''}`}
              aria-pressed={focus === division.id}
              onClick={() => {
                setFocus(division.id);
                track({ type: 'registry_filtered', registry: 'capability-matrix', filter: division.id, count: 0 });
              }}
            >
              {division.label.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="command-bar" style={{ maxWidth: 260 }}>
          <span className="command-bar__icon" aria-hidden="true">
            /
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter capabilities"
            aria-label="Filter capabilities"
            type="search"
            style={{ padding: '11px 14px 11px 0', fontSize: 13 }}
          />
        </div>
      </div>

      <div className="matrix-scroll">
        <table className="matrix">
          <caption className="visually-hidden">
            Capabilities against KNOuX divisions. A filled marker means the division delivers that capability.
          </caption>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              {capabilityMatrixDivisions.map((division) => (
                <th key={division.id} scope="col">
                  {division.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, items]) => (
              <MatrixGroup key={group} group={group} items={items} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="meta-row" style={{ marginTop: 20 }}>
        <span>
          {rows.length} of {capabilities.length} CAPABILITIES
        </span>
        <span>Marker means the division delivers it, not that it is the only one who can</span>
      </p>
    </div>
  );
}

function MatrixGroup({ group, items }: { group: string; items: Capability[] }) {
  return (
    <>
      <tr className="matrix__group">
        <td colSpan={capabilityMatrixDivisions.length + 1}>{group}</td>
      </tr>
      {items.map((capability) => (
        <tr key={capability.id}>
          <th scope="row">
            {capability.label}
            <span style={{ display: 'block', fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>
              {capability.searchTerms.slice(0, 3).join(' / ')}
            </span>
          </th>
          {capabilityMatrixDivisions.map((division) => {
            const provides = capabilityById.get(capability.id)?.providedBy.includes(division.id);
            return (
              <td key={division.id}>
                <span
                  className={`matrix__cell ${provides ? '' : 'matrix__cell--off'}`}
                  role="img"
                  aria-label={provides ? `${division.label} delivers ${capability.label}` : `${division.label} does not deliver ${capability.label}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/**
 * Systems studio selector.
 *
 * Starts from the question rather than a portfolio of past work. Selecting a
 * system type reveals the disciplines and artefacts for that type of build.
 */
export function SystemsStudio({
  systems,
}: {
  systems: ReadonlyArray<{
    id: string;
    code: string;
    slug: string;
    category: string;
    title: string;
    shortName: string;
    tagline: string;
    statement: string;
    disciplines: { label: string; detail: string }[];
    artefacts: string[];
    platformNotes: string[];
    qualifiers: string[];
  }>;
}) {
  // The system selector is deep-linkable, so URL state is read on first render
  // rather than synchronised into state through an effect.
  const [selected, setSelected] = useState(() => {
    if (typeof window === 'undefined') return systems[0]?.slug ?? '';
    const fromUrl = new URLSearchParams(window.location.search).get('system');
    return fromUrl && systems.some((system) => system.slug === fromUrl) ? fromUrl : (systems[0]?.slug ?? '');
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = systems.find((system) => system.slug === selected);
    if (!current) return;
    track({ type: 'division_opened', division: 'web', route: `/web/${current.slug}` });
  }, [selected, systems]);

  const current = systems.find((system) => system.slug === selected);

  return (
    <div ref={containerRef}>
      <div className="option-grid" style={{ marginBottom: 44 }} role="group" aria-label="What are you building?">
        {systems.map((system) => (
          <button
            key={system.id}
            type="button"
            className="option"
            aria-pressed={selected === system.slug}
            onClick={() => {
              setSelected(system.slug);
              const url = new URL(window.location.href);
              url.searchParams.set('system', system.slug);
              window.history.replaceState({}, '', url);
            }}
          >
            <span className="option__title">{system.shortName}</span>
            <span className="option__sub">{system.tagline}</span>
          </button>
        ))}
      </div>

      {current ? (
        <div className="systems-panel" key={current.id}>
          <div className="systems-panel__head">
            <span className="label label--signal">
              {current.code} / {current.category.toUpperCase()}
            </span>
            <h3>{current.title}</h3>
            <p>{current.statement}</p>
            <Link href={`/web/${current.slug}`} className="action" style={{ marginTop: 22 }}>EXPLORE SYSTEM <span className="action-arrow" aria-hidden="true">↗</span></Link>
          </div>
          <div className="systems-panel__body">
            <div>
              <span className="dossier-card__label">DISCIPLINES</span>
              <dl className="systems-panel__list">
                {current.disciplines.map((discipline) => (
                  <div key={discipline.label}>
                    <dt>{discipline.label}</dt>
                    <dd>{discipline.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <span className="dossier-card__label">ARTEFACTS</span>
              <ul className="fact-list">
                {current.artefacts.map((artefact) => (
                  <li key={artefact}>{artefact}</li>
                ))}
              </ul>
              <span className="dossier-card__label" style={{ marginTop: 26 }}>
                PLATFORM CHOICE
              </span>
              <ul className="limit-list">
                {current.platformNotes.map((note) => (
                  <li key={note}>
                    <span aria-hidden="true">·</span>
                    {note}
                  </li>
                ))}
              </ul>
              <span className="dossier-card__label" style={{ marginTop: 26 }}>
                QUESTIONS THAT CHANGE THE ARCHITECTURE
              </span>
              <ul className="limit-list">
                {current.qualifiers.map((qualifier) => (
                  <li key={qualifier}>
                    <span aria-hidden="true">?</span>
                    {qualifier}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
