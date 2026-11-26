'use client';

import { useSiteLanguage } from '@/lib/i18n/use-language';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { softwareEntities, softwareProducts, type SoftwareProduct } from '@/data/software';
import { resolveProductLogo } from '@/data/product-visuals';
import { scoreEntity } from '@/lib/entities';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import { track } from '@/lib/analytics';
import styles from './ProductUniverse.module.css';

/**
 * KNOuX Software Universe.
 *
 * A technical topology, not a solar system. Products are positioned from a
 * deterministic coordinate derived from their own metadata, connected to the
 * KNOuX core by signal paths, and cross-linked where the registry says two
 * products are related.
 *
 * Selecting a node lights its paths and moves related nodes along their
 * orbits. The exhibit and compact picker use the same selection so readers
 * can inspect any product without relying on the map.
 */

const CORE = { x: 50, y: 50 };
const ORBIT_RADIUS: Record<1 | 2 | 3, number> = { 1: 23, 2: 36, 3: 47 };
const exhibitCopy = {
  en: { pick: 'Select a product', features: 'Documented features', version: 'Version' },
  ar: { pick: 'اختَر منتجًا', features: 'الميزات الموثّقة', version: 'الإصدار' },
  ur: { pick: 'ایک پروڈکٹ منتخب کریں', features: 'دستاویزی خصوصیات', version: 'ورژن' },
};

type Point = { x: number; y: number };

function pointFor(product: SoftwareProduct): Point {
  const { orbit, angleDeg } = product.topology;
  const radius = ORBIT_RADIUS[orbit];
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: CORE.x + radius * Math.sin(radians),
    y: CORE.y - radius * Math.cos(radians),
  };
}

/** Small tangential nudge applied to related nodes while a node is engaged. */
function displacement(from: Point, to: Point): Point {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const length = Math.hypot(dx, dy) || 1;
  const amount = 2.6;
  return { x: (dx / length) * amount, y: (dy / length) * amount };
}

export function ProductUniverse() {
  const language = useSiteLanguage(), t = (text: string) => translatedSiteCopy(text, language);
  const copy = exhibitCopy[language];
  const router = useRouter();
  const params = useSearchParams();
  const queryParam = params.get('q') ?? '';
  // URL state is the source of truth for the query, read on first render so the
  // field is deep-linkable without a state-sync effect.
  const [query, setQuery] = useState(queryParam);
  const [family, setFamily] = useState<string>('all');
  const [activeId, setActiveId] = useState(softwareProducts[0].id);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!queryParam) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [queryParam]);

  const families = useMemo(
    () => ['all', ...new Set(softwareProducts.map((product) => product.family))],
    [],
  );

  const entities = useMemo(() => softwareEntities(), []);

  const visible = useMemo(() => {
    const byFamily = family === 'all' ? softwareProducts : softwareProducts.filter((p) => p.family === family);
    if (!query.trim()) return byFamily;
    const byId = new Map(entities.map((entity) => [entity.id, entity]));
    return byFamily
      .map((product) => {
        const entity = byId.get(product.id);
        return { product, score: entity ? scoreEntity(entity, query) : 0 };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);
  }, [family, query, entities]);

  const base = useMemo(() => {
    const map = new Map<string, Point>();
    for (const product of softwareProducts) map.set(product.id, pointFor(product));
    return map;
  }, []);

  const active = softwareProducts.find((product) => product.id === activeId) ?? softwareProducts[0];
  const logo = resolveProductLogo(active.slug);

  const layout = useMemo(() => {
    const positions = new Map<string, Point>();
    for (const [id, point] of base) {
      let next = point;
      if (active) {
        if (id === active.id) {
          // Pull the engaged node a little towards the core.
          const dx = CORE.x - point.x;
          const dy = CORE.y - point.y;
          const length = Math.hypot(dx, dy) || 1;
          next = { x: point.x + (dx / length) * 1.6, y: point.y + (dy / length) * 1.6 };
        } else if (active.relatedIds.includes(id)) {
          const offset = displacement(point, base.get(active.id) ?? point);
          next = { x: point.x + offset.x, y: point.y + offset.y };
        }
      }
      positions.set(id, next);
    }
    return positions;
  }, [active, base]);

  const relatedEdges = useMemo(() => {
    const edges: { from: string; to: string; key: string }[] = [];
    const seen = new Set<string>();
    for (const product of softwareProducts) {
      for (const otherId of product.relatedIds) {
        if (!base.has(otherId)) continue;
        const key = [product.id, otherId].sort().join('::');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: product.id, to: otherId, key });
      }
    }
    return edges;
  }, [base]);

  const commitQuery = useCallback(
    (value: string) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value.trim()) next.set('q', value.trim());
      else next.delete('q');
      router.replace(next.size ? `/products?${next.toString()}` : '/products', { scroll: false });
    },
    [params, router],
  );

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      commitQuery(value);
    },
    [commitQuery],
  );

  const filtered = query.trim().length > 0 || family !== 'all';

  return (
    <section className="shell" aria-label={t("KNOuX software universe")}>
      {/* Product Finder */}
      <div className="finder" style={{ paddingTop: 40 }}>
        <div className="finder__head">
          <span className="label label--signal">{t("FIND A KNOuX SYSTEM")}</span>
          <p className="finder__note">
            {t('Search by product, capability, platform or the job you need done. Results come from the audited repository registry.')}
          </p>
        </div>
        <div className="command-bar">
          <span className="command-bar__icon" aria-hidden="true">
            /
          </span>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("repair windows, record screen, organize files, clipboard")}
            aria-label={t("Search KNOuX products")}
            aria-describedby="finder-count"
            type="search"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="icon-button" onClick={() => onQueryChange('')}>
              CLEAR
            </button>
          ) : null}
        </div>
        <div className="finder-controls">
          <div className="finder-chips" role="group" aria-label={t("Filter by family")}>
            {families.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`tag tag--button ${family === entry ? 'is-active' : ''}`}
                aria-pressed={family === entry}
                onClick={() => {
                  setFamily(entry);
                  track({ type: 'registry_filtered', registry: 'software', filter: entry, count: visible.length });
                }}
              >
                {t(entry === 'all' ? 'ALL FAMILIES' : entry.toUpperCase())}
              </button>
            ))}
          </div>
          <p className="finder-count" id="finder-count" role="status">
            {String(visible.length).padStart(2, '0')} / {String(softwareProducts.length).padStart(2, '0')} SYSTEMS
            {filtered ? ' MATCHED' : ''}
          </p>
        </div>
      </div>

      {/* Constellation */}
      {!filtered ? (
        <div className={`constellation-wrap ${styles.exhibition}`}>
          <div className={`constellation spatial-surface ${styles.map}`} data-spatial>
            <div className="constellation__grid" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation">
                {[12, 24, 36, 47, 58].map((r) => (
                  <circle
                    key={r}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#1b1c21"
                    strokeWidth="0.12"
                    strokeDasharray="0.6 1.1"
                  />
                ))}
                <line x1="2" y1="50" x2="98" y2="50" stroke="#17181c" strokeWidth="0.1" />
                <line x1="50" y1="2" x2="50" y2="98" stroke="#17181c" strokeWidth="0.1" />
                {relatedEdges.map((edge) => {
                  const a = layout.get(edge.from);
                  const b = layout.get(edge.to);
                  if (!a || !b) return null;
                  const lit = activeId === edge.from || activeId === edge.to;
                  return (
                    <line
                      key={edge.key}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={lit ? '#a18acb' : '#23242a'}
                      strokeWidth={lit ? 0.22 : 0.1}
                      style={{ transition: 'stroke 260ms, stroke-width 260ms' }}
                    />
                  );
                })}
                {softwareProducts.map((product) => {
                  const point = layout.get(product.id);
                  if (!point) return null;
                  const dimmed = activeId !== product.id && !active.relatedIds.includes(product.id);
                  return (
                    <line
                      key={`core-${product.id}`}
                      x1={CORE.x}
                      y1={CORE.y}
                      x2={point.x}
                      y2={point.y}
                      stroke={activeId === product.id ? '#a18acb' : '#1d1e23'}
                      strokeWidth={activeId === product.id ? 0.24 : 0.1}
                      opacity={dimmed ? 0.3 : 1}
                      style={{ transition: 'stroke 260ms, stroke-width 260ms, opacity 260ms' }}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="constellation__core" aria-hidden="true">
              <svg className={styles.mark} viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}>
                {MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}
              </svg>
            </div>

            {softwareProducts.map((product) => {
              const point = layout.get(product.id) ?? pointFor(product);
              const productLogo = resolveProductLogo(product.slug);
              return (
                <button
                  key={product.id}
                  type="button"
                  aria-pressed={activeId === product.id}
                  aria-controls="product-exhibit"
                  className={`constellation__node ${styles.planet} ${activeId === product.id ? 'is-active' : ''}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  onClick={() => setActiveId(product.id)}
                >
                  {productLogo && <Image src={productLogo} width={46} height={46} alt="" unoptimized />}
                  <span className="constellation__node-name">{product.shortName}</span>
                </button>
              );
            })}
          </div>

          <label className={styles.compactPicker}>
            {copy.pick}
            <select value={activeId} onChange={(event) => setActiveId(event.target.value)} aria-controls="product-exhibit">
              {softwareProducts.map((product) => <option key={product.id} value={product.id}>{product.shortName}</option>)}
            </select>
          </label>
          <aside className={`constellation__readout ${styles.exhibit}`} id="product-exhibit" aria-labelledby="product-exhibit-title">
                <div className={styles.gallery}>
                  {logo && <Image src={logo} width={180} height={180} alt="" unoptimized />}
                </div>
                <div className="constellation__readout-head">
                  <span>{active.code}</span>
                  <span className={`mark mark--${active.status}`}>{active.status.replace('-', ' ')}</span>
                </div>
                <h2 id="product-exhibit-title" aria-live="polite">{active.name}</h2>
                <p>{active.tagline}</p>
                <dl>
                  <div>
                    <dt>{t("Family")}</dt>
                    <dd>{active.family}</dd>
                  </div>
                  <div>
                    <dt>{t("Platform")}</dt>
                    <dd>{active.platform}</dd>
                  </div>
                  <div>
                    <dt>{t("Repository")}</dt>
                    <dd><a href={active.repository}>{active.repository.split('/').pop()}</a></dd>
                  </div>
                  {active.version && <div><dt>{copy.version}</dt><dd>{active.version}</dd></div>}
                </dl>
                <details key={active.id}>
                  <summary>{copy.features}</summary>
                  <ul>{active.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
                </details>
                <Link href={`/products/${active.slug}`} className="action" onClick={() => track({ type: 'product_opened', id: active.id, slug: active.slug })}>
                  Open dossier
                  <span className="action-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
          </aside>
        </div>
      ) : null}

      {/* Focused node stream, also the narrow-viewport composition */}
      <div className={filtered ? '' : 'node-stream'} style={filtered ? { marginTop: 30 } : undefined}>
        {!filtered ? <p className="label" style={{ padding: '20px 0 12px' }}>{t("NODES")}</p> : null}
        {visible.length === 0 ? (
          <div className="finder-empty">
            <strong>No system matches &ldquo;{query.trim()}&rdquo;.</strong>
            <p>
              The finder only returns audited repositories. Try a product name, or a task such as
              &ldquo;repair windows&rdquo;, &ldquo;record screen&rdquo;, &ldquo;organize files&rdquo; or
              &ldquo;clipboard&rdquo;.
            </p>
          </div>
        ) : (
          <div className="node-stream" style={{ display: 'flex' }}>
            {visible.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="node-stream__row"
                onClick={() => track({ type: 'product_opened', id: product.id, slug: product.slug })}
              >
                <span className="node-stream__code">{product.code}</span>
                <span className="node-stream__name">
                  {product.name}
                  <small className="mono" style={{ display: 'block', fontSize: 12, color: 'var(--dim)', letterSpacing: 0, marginTop: 3 }}>
                    {product.tagline}
                  </small>
                </span>
                <span className="node-stream__status">{product.status.replace('-', ' ')}</span>
                <span className="node-stream__arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
