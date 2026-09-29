'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductAnatomyPanel } from './ProductAnatomyPanel';
import { ProductAnatomyIndex } from './ProductAnatomyIndex';
import { deriveProductAnatomy, deriveProductAnatomyEdges } from '@/data/product-anatomy-data';
import { computeProductAnatomyLayout } from '@/data/product-anatomy-layout';
import { visualProfileFor } from '@/data/product-visuals';
import type { SoftwareProduct } from '@/data/software';

/**
 * The 3D scene is a lazy boundary, not a static import.
 *
 * This route is linked from the home page, the work archive and the product
 * index, and Next.js prefetches a linked route's client bundle on viewport
 * entry. With a static import, three.js — a 905 KB chunk — was fetched by
 * anyone who merely scrolled a page containing a product link, on a route that
 * renders no 3D at all. That is the F-13 finding in its real form: not that the
 * bundle is large, but that it arrives at visitors who will never see a canvas.
 *
 * The scene already waits for `visible`, driven by an IntersectionObserver, so
 * it was never painted before it was in view. Loading it on the same condition
 * costs nothing a visitor could see and removes the weight from every prefetch.
 */
const ProductAnatomyScene = dynamic(
  () => import('./ProductAnatomyScene').then((module) => module.ProductAnatomyScene),
  {
    ssr: false,
    loading: () => <div className="product-anatomy-scene__fallback" role="status">Loading the interactive view…</div>,
  },
);

export function ProductSystemAnatomy({ product }: { product: SoftwareProduct }) {
  const profile = visualProfileFor(product.slug);
  const nodes = useMemo(() => deriveProductAnatomy(product), [product]);
  const edges = useMemo(() => deriveProductAnatomyEdges(nodes), [nodes]);
  const layout = useMemo(() => profile ? computeProductAnatomyLayout(nodes, edges, profile.motif) : null, [nodes, edges, profile]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    media.addEventListener('change', sync);
    const timer = window.setTimeout(sync, 0);
    return () => { media.removeEventListener('change', sync); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let intersecting = false;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); }, { rootMargin: '120px' });
    observer.observe(root);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  const clear = useCallback(() => { setSelectedNodeId(null); setHoveredNodeId(null); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedNodeId) { event.preventDefault(); clear(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedNodeId, clear]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const quality = reduced ? 'reduced' as const : 'balanced' as const;

  return <section ref={rootRef} className="product-system-anatomy" aria-labelledby="product-anatomy-heading">
    <div className="shell">
      <div className="product-anatomy-header">
        <div className="product-anatomy-header__left">
          <span className="label label--signal">PRODUCT SYSTEM</span>
          <h2 className="product-anatomy-header__title" id="product-anatomy-heading">System anatomy</h2>
          <p>Explore verified capabilities, implementation, limits, evidence and related systems.</p>
        </div>
        <div className="product-anatomy-header__right">
          {profile ? <span className="product-anatomy-motif-badge">{profile.sceneLabel}</span> : null}
          {selectedNodeId ? <button className="action action--ghost product-anatomy-clear" onClick={clear}>Clear selection</button> : null}
        </div>
      </div>
      <div className="product-anatomy__grid">
        <div className="product-anatomy__scene" role="region" aria-label="Interactive system constellation">
          {layout ? <ProductAnatomyScene layout={layout} selectedNodeId={selectedNodeId} hoveredNodeId={hoveredNodeId}
            onNodeHover={setHoveredNodeId} onNodeSelect={setSelectedNodeId} reduced={reduced} visible={visible} quality={quality} />
            : <div className="product-anatomy-scene__fallback" role="status">Interactive view unavailable. Explore the verified node index below.</div>}
        </div>
        <div className="product-anatomy__panel"><ProductAnatomyPanel node={selectedNode} onClear={clear} /></div>
      </div>
      <div className="product-anatomy__index"><ProductAnatomyIndex nodes={nodes} selectedNodeId={selectedNodeId}
        hoveredNodeId={hoveredNodeId} onNodeHover={setHoveredNodeId} onNodeSelect={setSelectedNodeId} onClear={clear} /></div>
    </div>
  </section>;
}
