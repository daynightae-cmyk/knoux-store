'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { NormalizedModel, ProviderHealth } from '@/lib/ai/types';
import { providerState, searchModels } from '@/lib/build/model-search';
import styles from './generator.module.css';

type Props = { models: NormalizedModel[]; providers: ProviderHealth[]; selected: { providerId: string; modelId: string } | null; onSelect: (model: NormalizedModel) => void; disabled?: boolean; loading: boolean; error: string | null };
export function ModelNavigator({ models, providers, selected, onSelect, disabled, loading, error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('');
  const [active, setActive] = useState(0);
  const [showAll,setShowAll]=useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const eligible=(model:NormalizedModel)=>model.modalities.text&&model.lifecycle!=='deprecated'&&model.catalog?.buildEligible!==false;
  const results = searchModels(showAll?models:models.filter(eligible), query, provider);
  const index = Math.min(active, Math.max(0, results.length - 1));
  const chosen = models.find((model) => model.modelId === selected?.modelId && model.providerId === selected.providerId);
  const facets = [...new Set([...providers.map((item) => item.providerId), ...models.map((item) => item.providerId)])];
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (model: NormalizedModel) => { if(!eligible(model))return;onSelect(model); close(); };
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive((index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length)); }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    if (event.key === 'End') { event.preventDefault(); setActive(Math.max(0, results.length - 1)); }
    if (event.key === 'Enter' && results[index]) { event.preventDefault(); choose(results[index]); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  };
  return <div ref={root} className={styles.navigator} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
    <button ref={trigger} type="button" className={styles.intelligence} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => setOpen((value) => !value)}>
      <span>INTELLIGENCE</span><strong>{chosen ? `${chosen.providerId} / ${chosen.displayName}` : 'Explore providers & models'}</strong><span aria-hidden="true">⌄</span>
    </button>
    {loading ? <p className={styles.note}>Reading canonical model metadata…</p> : error ? <p className={styles.note}>{error}</p> : null}
    {open ? <div className={styles.navigatorSurface}>
      <label className={styles.searchLabel} htmlFor={`${id}-search`}>Search intelligence</label>
      <input ref={input} id={`${id}-search`} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={results[index] ? `${id}-option-${index}` : undefined} value={query} onKeyDown={key} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Model, provider or capability" />
      <label className={styles.providerFilter}>Provider<select aria-label="Provider" value={provider} onChange={(event) => { setProvider(event.target.value); setActive(0); }}><option value="">All canonical providers</option>{facets.map((facet) => <option key={facet} value={facet}>{providers.find((item) => item.providerId === facet)?.displayName ?? facet}</option>)}</select></label>
      <label className={styles.providerFilter}><input type="checkbox" checked={showAll} onChange={event=>{setShowAll(event.target.checked);setActive(0);}}/>SHOW ALL — include catalog-only models</label>
      <ul className={styles.providerStates} aria-label="Provider runtime states">{providers.filter((item) => !provider || item.providerId === provider).map((item) => <li key={item.providerId}><span>{item.displayName}</span><small>{providerState(item)}</small></li>)}</ul>
      <p className={styles.note} role="status">{results.length} model results · metadata remains measured, declared or UNKNOWN.</p>
      <ul id={`${id}-list`} role="listbox" aria-label="Canonical models" className={styles.modelList}>
        {results.map((model, item) => <li key={`${model.providerId}/${model.modelId}`} role="presentation"><button id={`${id}-option-${item}`} type="button" role="option" aria-disabled={!eligible(model)} tabIndex={-1} aria-selected={selected?.providerId === model.providerId && selected.modelId === model.modelId} data-active={item === index} onClick={() => choose(model)}><strong>{model.displayName}</strong><span>{model.providerId} / {model.modelId}</span><small>{eligible(model)?'BUILD CANDIDATE':'CATALOG ONLY · generation unavailable'} · Context {model.contextWindow ?? 'UNKNOWN'} · output {model.maxOutputTokens ?? 'UNKNOWN'} · streaming {model.capabilities.streaming} · tools {model.capabilities.tools} · source {model.source}</small></button></li>)}
      </ul>
      {!results.length ? <p className={styles.note}>No matching discovered model. {error ?? 'Adjust the search, or inspect provider configuration.'}</p> : null}
      <button type="button" className={styles.textButton} onClick={close}>Close model navigator</button>
    </div> : null}
  </div>;
}
