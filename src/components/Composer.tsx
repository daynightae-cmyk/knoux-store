'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  composerDisclosure,
  composerFallbacks,
  composerPresets,
  evaluateComposer,
} from '@/data/composer-rules';
import { divisionLabel, divisionRoute, type DivisionId, type DiscoverableEntity } from '@/lib/entities';
import { track } from '@/lib/analytics';
import { deriveOrbModel } from '@/components/build/orb-layout';
import type { ComposerOrbNode } from '@/components/build/orb-types';

/**
 * KNOuX Composer.
 *
 * A deterministic intent engine, not a language model. The visitor's sentence
 * is tokenised and matched against capability labels, search terms and category
 * phrases; the matched capabilities are resolved to real entities in the KNOuX
 * registries. Anything that cannot be resolved is not shown, and the module
 * states plainly that it does not estimate price, duration or outcome.
 */

type Selected = { entity: DiscoverableEntity; reason: string };

const DIVISION_ORDER: DivisionId[] = ['solutions', 'software', 'wordpress', 'web', 'growth', 'creative'];

const BuildComposerOrbCanvas = dynamic(
  () => import('@/components/build/BuildComposerOrb').then((module) => module.BuildComposerOrbCanvas),
  {
    ssr: false,
    loading: () => <div className="build-composer-orb__loading" aria-hidden="true" />,
  },
);

export function Composer() {
  const router = useRouter();
  const params = useSearchParams();
  const presetParam = params.get('preset');

  const [input, setInput] = useState('');
  const [evaluated, setEvaluated] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedOrbId, setSelectedOrbId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const started = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (presetParam && !started.current) {
      started.current = true;
      setInput(presetParam);
      setEvaluated(presetParam);
      setRemoved([]);
      setExtra([]);
      setSelectedOrbId(null);
      track({ type: 'composer_started', preset: presetParam.slice(0, 40) });
    }
  }, [presetParam]);

  const result = useMemo(() => (evaluated === null ? null : evaluateComposer(evaluated)), [evaluated]);

  const stack = useMemo<{ division: DivisionId; items: Selected[] }[]>(() => {
    if (!result) return [];
    const reasons = new Map<string, string>();
    for (const match of result.matches) {
      for (const id of match.entityIds) {
        if (!reasons.has(id)) reasons.set(id, match.reason);
      }
    }
    const selected: Selected[] = [];
    for (const id of result.entityIds) {
      if (removed.includes(id)) continue;
      const entity = result.stack.flatMap((group) => group.items).find((item) => item.id === id);
      if (entity) selected.push({ entity, reason: reasons.get(id) ?? entity.summary });
    }
    for (const id of extra) {
      if (selected.some((entry) => entry.entity.id === id)) continue;
      const entity = FALLBACK_LOOKUP(id);
      if (entity) selected.push({ entity, reason: 'Added manually' });
    }
    const groups = new Map<DivisionId, Selected[]>();
    for (const entry of selected) {
      const bucket = groups.get(entry.entity.division);
      if (bucket) bucket.push(entry);
      else groups.set(entry.entity.division, [entry]);
    }
    return DIVISION_ORDER.filter((division) => groups.has(division)).map((division) => ({
      division,
      items: groups.get(division)!,
    }));
  }, [result, removed, extra]);

  const typing = input.trim().length > 0 && input !== (evaluated ?? '');
  const orbModel = useMemo(
    () => deriveOrbModel(stack, selectedOrbId, evaluated, typing),
    [stack, selectedOrbId, evaluated, typing],
  );
  const selectedOrbNode = useMemo(
    () => [orbModel.nucleus, ...orbModel.divisions, ...orbModel.entities].find((node) => node.id === selectedOrbId) ?? null,
    [orbModel, selectedOrbId],
  );

  const selectOrbNode = useCallback((node: ComposerOrbNode | null) => {
    setSelectedOrbId(node?.id ?? null);
  }, []);

  const activateOrbNode = useCallback((node: ComposerOrbNode) => {
    setSelectedOrbId(node.id);
  }, []);

  const run = useCallback(() => {
    setEvaluated(input);
    setRemoved([]);
    setExtra([]);
    setSelectedOrbId(null);
    if (!started.current) {
      started.current = true;
      track({ type: 'composer_started' });
    }
  }, [input]);

  const clear = useCallback(() => {
    setInput('');
    setEvaluated(null);
    setRemoved([]);
    setExtra([]);
    setSelectedOrbId(null);
    textareaRef.current?.focus();
  }, []);

  const add = useCallback((entity: DiscoverableEntity) => {
    setRemoved((current) => current.filter((id) => id !== entity.id));
    setExtra((current) => (current.includes(entity.id) ? current : [...current, entity.id]));
    setSelectedOrbId(entity.id);
    track({ type: 'composer_item_added', id: entity.id, division: entity.division });
  }, []);

  const drop = useCallback((entity: DiscoverableEntity) => {
    setExtra((current) => current.filter((id) => id !== entity.id));
    setRemoved((current) => (current.includes(entity.id) ? current : [...current, entity.id]));
    setSelectedOrbId((current) => (current === entity.id ? null : current));
    track({ type: 'composer_item_removed', id: entity.id, division: entity.division });
  }, []);

  const total = stack.reduce((count, group) => count + group.items.length, 0);

  return (
    <div className="composer-stage">
      <div className="composer-input">
        <label className="composer-input__label" htmlFor="composer-field">
          TELL US WHAT YOU NEED
        </label>
        <textarea
          id="composer-field"
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              run();
            }
          }}
          placeholder="I have a new restaurant and need a website, Instagram and ads."
          rows={3}
          aria-describedby="composer-hint"
        />
        <div className="composer-input__foot">
          <div className="composer-presets">
            <span>TRY</span>
            {composerPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="tag tag--button"
                onClick={() => {
                  setInput(preset.prompt);
                  setEvaluated(preset.prompt);
                  setRemoved([]);
                  setExtra([]);
                  setSelectedOrbId(null);
                  track({ type: 'composer_started', preset: preset.id });
                }}
              >
                {preset.label.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {evaluated !== null ? (
              <button type="button" className="action" onClick={clear}>
                Clear
              </button>
            ) : null}
            <button type="button" className="action action--primary" onClick={run} disabled={!input.trim()}>
              Assemble
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          </div>
        </div>
        <p className="meta-row" id="composer-hint" style={{ marginTop: 16 }}>
          <span>Ctrl + Enter to assemble</span>
          <span>Deterministic matching against KNOuX registries</span>
        </p>
      </div>

      <section className="composer-intelligence" aria-labelledby="composer-intelligence-title">
        <div className="composer-intelligence__head">
          <div>
            <span className="composer-intelligence__eyebrow">BUILD INTELLIGENCE / LIVE TOPOLOGY</span>
            <h2 id="composer-intelligence-title">KNOuX / Composer</h2>
          </div>
          <span className="composer-intelligence__state">
            {orbModel.resolved
              ? `${orbModel.divisions.length} DIV / ${orbModel.entities.length} ENT`
              : 'IDLE / AWAITING INPUT'}
          </span>
        </div>

        <BuildComposerOrbCanvas
          model={orbModel}
          onSelect={selectOrbNode}
          onActivate={activateOrbNode}
          reducedMotion={reducedMotion}
        />

        <div className="composer-intelligence__detail" aria-live="polite">
          {selectedOrbNode ? (
            <>
              <div>
                <span>{selectedOrbNode.code} / {selectedOrbNode.kind.toUpperCase()}</span>
                <strong>{selectedOrbNode.label}</strong>
              </div>
              <p>{selectedOrbNode.summary}</p>
              {selectedOrbNode.reason ? <p className="mono">MATCH: {selectedOrbNode.reason}</p> : null}
              {selectedOrbNode.route ? (
                <a className="action action--ghost" href={selectedOrbNode.route}>
                  Open verified route <span className="action-arrow" aria-hidden="true">↗</span>
                </a>
              ) : null}
              <button type="button" className="icon-button" onClick={() => setSelectedOrbId(null)}>
                CLEAR SELECTION
              </button>
            </>
          ) : (
            <p>
              {orbModel.resolved
                ? 'Select a real division or entity in the spatial model or semantic index to inspect it.'
                : 'The nucleus stays quiet until the deterministic Composer resolves a real registry-backed stack.'}
            </p>
          )}
        </div>
      </section>

      {result === null ? (
        <div className="composer-empty" style={{ border: '1px solid var(--line)', borderTop: 0, background: '#0b0c0e' }}>
          <h2>Your KNOuX stack.</h2>
          <p>
            Describe the situation in a sentence. The Composer matches what you said against KNOuX software,
            WordPress services, web systems, growth modules, creative capabilities and solutions, then returns the
            matching stack. You can add, remove and inspect anything it returns.
          </p>
          <ul className="composer-disclosure">
            {composerDisclosure.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : result.empty && total === 0 ? (
        <div className="composer-empty" style={{ border: '1px solid var(--line)', borderTop: 0, background: '#0b0c0e' }}>
          <h2>Nothing matched that description.</h2>
          <p>
            The Composer only returns entities that exist in a KNOuX registry, so an unmatched sentence produces no
            invented recommendation. Try naming the thing directly — &ldquo;restaurant website&rdquo;, &ldquo;Google
            ads&rdquo;, &ldquo;repair windows&rdquo;, &ldquo;customer portal&rdquo; — or start from one of these.
          </p>
          <div className="index-rows">
            {composerFallbacks().map((entity) => (
              <div key={entity.id} className="index-row">
                <span className="index-row__index">{entity.code}</span>
                <span className="index-row__name">{entity.name}</span>
                <span className="index-row__meta">
                  <span>{entity.summary}</span>
                </span>
                <button type="button" className="icon-button" onClick={() => add(entity)}>
                  ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="composer-readout">
            <div className="composer-readout__head">
              <h2>YOUR KNOuX STACK — {total} ITEM{total === 1 ? '' : 'S'}</h2>
              <span className="meta-row">
                <span>
                  {result.matches.length} PHRASE{result.matches.length === 1 ? '' : 'S'} MATCHED
                </span>
                <span>{result.capabilityIds.length} CAPABILITIES</span>
              </span>
            </div>

            <div className="composer-readout__body">
              <div className="composer-readout__stack">
                <div className="assembly">
                  {stack.map((group) => (
                    <div key={group.division} className="assembly__group">
                      <div className="assembly__key">
                        {divisionLabel(group.division).toUpperCase()}
                        <span>{group.items.length} ITEM{group.items.length === 1 ? '' : 'S'}</span>
                      </div>
                      <div className="assembly__items">
                        {group.items.map((entry) => (
                          <div key={entry.entity.id} className="assembly__item">
                            <div>
                              <p className="assembly__item-name">
                                {entry.entity.route ? (
                                  <a href={entry.entity.route}>{entry.entity.name}</a>
                                ) : (
                                  entry.entity.name
                                )}
                              </p>
                              <p className="assembly__item-note">
                                {entry.entity.summary}
                                <span className="mono" style={{ display: 'block', color: '#6d6e70', fontSize: 9.5, marginTop: 4, letterSpacing: '0.1em' }}>
                                  MATCH: {entry.reason.toUpperCase()}
                                </span>
                              </p>
                            </div>
                            <div className="assembly__item-actions">
                              {entry.entity.route ? (
                                <button type="button" className="icon-button" onClick={() => add(entry.entity)} disabled>
                                  VIEW
                                </button>
                              ) : null}
                              <button type="button" className="icon-button" onClick={() => drop(entry.entity)}>
                                REMOVE
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="composer-readout__side">
                <div>
                  <h3>ADD FROM THE REGISTRY</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {composerFallbacks()
                      .filter((entity) => !stack.some((group) => group.items.some((item) => item.entity.id === entity.id)))
                      .slice(0, 4)
                      .map((entity) => (
                        <button key={entity.id} type="button" className="icon-button" style={{ textAlign: 'left' }} onClick={() => add(entity)}>
                          + {entity.name}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <h3>BUILD REQUEST</h3>
                  <p>
                    Sends the selected items as one structured enquiry. No price, date or outcome is attached to it.
                  </p>
                  <button
                    type="button"
                    className="action action--primary"
                    style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                    disabled={busy || total === 0}
                    onClick={() => {
                      setBusy(true);
                      track({ type: 'request_started', requestType: 'composer', entryRoute: '/build' });
                      const items = stack.flatMap((group) => group.items.map((item) => item.entity.name));
                      router.push(`/contact?requestType=composer&items=${encodeURIComponent(items.join(', '))}&input=${encodeURIComponent(result.input)}`);
                    }}
                  >
                    Build request
                    <span className="action-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </div>

                <div>
                  <h3>NOT ESTIMATED</h3>
                  <ul className="composer-disclosure">
                    {composerDisclosure.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            {result.matches.length > 0 ? (
              <div className="composer-trace">
                <span className="label" style={{ marginBottom: 10 }}>
                  WHAT WAS MATCHED
                </span>
                <ol>
                  {result.matches.map((match) => (
                    <li key={match.phrase}>
                      <b>{match.phrase}</b> → {match.reason}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24, alignItems: 'center' }}>
            <a className="action" href={divisionRoute('solutions')}>
              Browse solutions instead
            </a>
            <a className="action action--ghost" href="/contact">
              Skip to contact
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/** Local lookup so manually added items can be resolved without a store. */
function FALLBACK_LOOKUP(id: string): DiscoverableEntity | null {
  return composerFallbacks().find((entity) => entity.id === id) ?? null;
}
