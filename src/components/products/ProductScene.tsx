'use client';

import { useEffect, useRef, useState } from 'react';
import { SystemNucleusScene } from './SystemNucleusScene';
import { RepositoryTopologyScene } from './RepositoryTopologyScene';
import { DiagnosticRingsScene } from './DiagnosticRingsScene';
import { FileClustersScene } from './FileClustersScene';
import { CaptureTimelineScene } from './CaptureTimelineScene';
import { MediaSpectrumScene } from './MediaSpectrumScene';
import { GuardedClipboardScene } from './GuardedClipboardScene';
import { visualProfileFor } from '@/data/product-visuals';
import type { SoftwareProduct } from '@/data/software';
import type { ProductVisualMotif } from '@/data/product-visuals';

interface ProductSceneProps {
  product: SoftwareProduct;
  className?: string;
  /** Height in CSS pixels */
  height?: number;
}

export function ProductScene({ product, className, height = 400 }: ProductSceneProps) {
  const profile = visualProfileFor(product.slug);
  const motif = profile?.motif ?? 'system-nucleus';
  const seed = slugToSeed(product.slug);

  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Stable mutable pointer ref — avoids setState (and React re-renders) on mousemove.
  // Scenes receive the stable object reference and read live coordinates inside their RAF loop.
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia('(pointer: fine)');
    if (!fine.matches) return;

    const onMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
      pointerRef.current.active = true;
    };

    const onEnter = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
      pointerRef.current.active = true;
    };

    const onLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
      pointerRef.current.active = false;
    };

    const el = containerRef.current;
    el?.addEventListener('pointermove', onMove, { passive: true });
    el?.addEventListener('pointerenter', onEnter);
    el?.addEventListener('pointerleave', onLeave);
    return () => {
      el?.removeEventListener('pointermove', onMove);
      el?.removeEventListener('pointerenter', onEnter);
      el?.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      className={`product-scene ${className ?? ''}`}
      style={{ height, width: '100%' }}
      aria-hidden="true"
      data-motif={motif}
    >
      {/* eslint-disable-next-line react-hooks/refs */}
      {renderScene(motif, seed, reduced, pointerRef.current)}
    </div>
  );
}

function slugToSeed(slug: string): number {
  let hash = 0x4b4e4f58;
  for (let i = 0; i < slug.length; i++) {
    hash = Math.imul(hash ^ slug.charCodeAt(i), 0x51ed);
  }
  return hash >>> 0;
}

function renderScene(
  motif: ProductVisualMotif,
  seed: number,
  reduced: boolean,
  pointer: { x: number; y: number; active: boolean },
) {
  const props = { seed, reduced, pointer, className: 'product-scene__canvas' };
  switch (motif) {
    case 'repository-topology':
      return <RepositoryTopologyScene {...props} />;
    case 'diagnostic-rings':
      return <DiagnosticRingsScene {...props} />;
    case 'file-clusters':
      return <FileClustersScene {...props} />;
    case 'capture-timeline':
      return <CaptureTimelineScene {...props} />;
    case 'media-spectrum':
      return <MediaSpectrumScene {...props} />;
    case 'guarded-clipboard':
      return <GuardedClipboardScene {...props} />;
    case 'system-nucleus':
    default:
      return <SystemNucleusScene {...props} />;
  }
}