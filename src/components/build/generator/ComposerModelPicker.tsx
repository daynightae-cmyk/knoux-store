'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { NormalizedModel, ProviderHealth } from '@/lib/ai/types';
import { providerState, searchModels } from '@/lib/build/model-search';
import styles from './generator.module.css';

/**
 * ComposerModelPicker — OpenCode-style model selector embedded in the composer.
 *
 * Visible from the first moment: current model (or AUTO) with a chevron.
 * Clicking opens a searchable popover with provider groups, Free/Plan badges,
 * keyboard navigation (arrow keys / Enter / Escape), and an Auto option.
 * Selecting a model switches routing to MANUAL and calls onSelect.
 */
type Props = {
  models: NormalizedModel[];
  providers: ProviderHealth[];
  selected: { providerId: string; modelId: string } | null;
  routingMode: 'auto' | 'manual';
  onSelect: (model: NormalizedModel) => void;
  onSetAuto: () => void;
  disabled?: boolean;
  loading: boolean;
  error: string | null;
};

export function ComposerModelPicker({
  models,
  providers,
  selected,
  routingMode,
  onSelect,
  onSetAuto,
  disabled = false,
  loading,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  const eligible = (model: NormalizedModel) =>
    model.modalities.text && model.lifecycle !== 'deprecated' && model.catalog?.buildEligible !== false;

  const results = searchModels(models.filter(eligible), query, providerFilter);

  const index = Math.min(active, Math.max(0, results.length - 1));
  const chosen = models.find(
    (model) => model.modelId === selected?.modelId && model.providerId === selected.providerId,
  );
  const facets = [...new Set([...providers.map((item) => item.providerId), ...models.map((item) => item.providerId)])];

  const isFree = (model: NormalizedModel) =>
    model.pricing.inputPerMillion === 0 && model.pricing.outputPerMillion === 0;

  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length));
    }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    if (event.key === 'End') { event.preventDefault(); setActive(Math.max(0, results.length - 1)); }
    if (event.key === 'Enter' && results[index]) { event.preventDefault(); choose(results[index]); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  };

  const choose = (model: NormalizedModel) => {
    if (!eligible(model)) return;
    onSelect(model);
    close();
  };

  const chooseAuto = () => {
    onSetAuto();
    close();
  };

  // Build provider-grouped result lists for sectioned rendering.
  const groups: Array<{ id: string; name: string; models: NormalizedModel[] }> = facets.map((facet) => ({
    id: facet,
    name: providers.find((item) => item.providerId === facet)?.displayName ?? facet,
    models: results.filter((model) => model.providerId === facet),
  }));

  const flatOptions: NormalizedModel[] = [];
  groups.forEach((group) => {
    flatOptions.push(...group.models);
  });

  return (
    <div ref={root} className={styles.composerPicker} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <button
        ref={trigger}
        type="button"
        className={styles.composerPickerTrigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-popover`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.composerPickerLabel}>
          {chosen ? `${chosen.providerId} / ${chosen.displayName}` : 'AUTO · eligible runtime'}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {loading && <p className={styles.note}>Reading canonical model metadata…</p>}
      {error && !loading && <p className={styles.note}>{error}</p>}

      {open ? (
        <div className={styles.composerPickerPopover} id={`${id}-popover`} role="listbox" aria-label="Choose model">
          <div className={styles.composerPickerSection}>
            <button
              type="button"
              role="option"
              aria-selected={routingMode === 'auto' && !selected}
              className={`${styles.composerPickerOption} ${routingMode === 'auto' && !selected ? styles.composerPickerOptionActive : ''}`}
              onClick={chooseAuto}
              data-active={active === -1}
            >
              <span className={styles.composerPickerOptionName}>AUTO · RouterV2 eligible</span>
              <span className={styles.composerPickerOptionMeta}>Canonical runtime selects the provider</span>
            </button>
          </div>

          <label className={styles.composerPickerSearchLabel} htmlFor={`${id}-search`}>
            Search model or provider
          </label>
          <input
            ref={input}
            id={`${id}-search`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results[index] ? `${id}-option-${index}` : undefined}
            value={query}
            onKeyDown={key}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            placeholder="Model, provider or capability…"
          />

          <label className={styles.composerPickerFilterLabel}>
            Provider
            <select aria-label="Provider" value={providerFilter} onChange={(event) => { setProviderFilter(event.target.value); setActive(0); }}>
              <option value="">All providers</option>
              {facets.map((facet) => (
                <option key={facet} value={facet}>
                  {providers.find((item) => item.providerId === facet)?.displayName ?? facet}
                </option>
              ))}
            </select>
          </label>

          <ul className={styles.composerPickerProviderStates} aria-label="Provider runtime states">
            {providers
              .filter((item) => !providerFilter || item.providerId === providerFilter)
              .map((item) => (
                <li key={item.providerId}>
                  <span>{item.displayName}</span>
                  <small>{providerState(item)}</small>
                </li>
              ))}
          </ul>

          <p className={styles.note} role="status">
            {results.length} model results · metadata remains measured, declared or UNKNOWN.
          </p>

          <ul id={`${id}-list`} role="listbox" aria-label="Canonical models" className={styles.composerPickerModelList}>
            {groups.map((group) => (
              <>
                <li className={styles.composerPickerGroupLabel} aria-hidden="true">{group.name}</li>
                {group.models.map((model, item) => {
                  const groupIndex = groups.indexOf(group);
                  const offset =
                    groups.slice(0, groupIndex).reduce((sum, g) => sum + g.models.length, 0);
                  const globalIndex = offset + item;
                  return (
                    <li key={`${model.providerId}/${model.modelId}`} role="presentation">
                      <button
                        id={`${id}-option-${globalIndex}`}
                        type="button"
                        role="option"
                        aria-disabled={!eligible(model)}
                        tabIndex={-1}
                        aria-selected={
                          selected?.providerId === model.providerId && selected.modelId === model.modelId
                        }
                        data-active={globalIndex === index}
                        className={`${styles.composerPickerOption} ${globalIndex === index ? styles.composerPickerOptionActive : ''} ${selected?.providerId === model.providerId && selected.modelId === model.modelId ? styles.composerPickerOptionSelected : ''}`}
                        onClick={() => choose(model)}
                      >
                        <strong className={styles.composerPickerOptionName}>{model.displayName}</strong>
                        <span className={styles.composerPickerOptionMeta}>
                          {model.providerId} / {model.modelId}
                        </span>
                        <div className={styles.composerPickerOptionBadges}>
                          {!eligible(model) && (
                            <span className={styles.composerPickerBadge} title="Catalog only · generation unavailable">
                              CATALOG ONLY
                            </span>
                          )}
                          {isFree(model) && <span className={styles.composerPickerBadgeFree} title="Free model">FREE</span>}
                          {!isFree(model) && eligible(model) && (
                            <span className={styles.composerPickerBadgePlan} title="Paid plan model">PLAN</span>
                          )}
                          {model.source === 'STATIC' && (
                            <span className={styles.composerPickerBadgeStatic} title="Published identity · key required">
                              CONFIG REQUIRED
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </>
            ))}
            {!results.length ? (
              <li className={styles.composerPickerEmpty}>
                <p className={styles.note}>
                  No matching discovered model. {error ?? 'Adjust the search, or inspect provider configuration.'}
                </p>
              </li>
            ) : null}
          </ul>
          <button type="button" className={styles.textButton} onClick={close}>
            Close model picker
          </button>
        </div>
      ) : null}
    </div>
  );
}
