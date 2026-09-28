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
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });
  const canvasRef = useRef<HTMLDivElement>(null);

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
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setPointer({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      });
    };

    const onLeave = () => {
      setPointer({ x: 0, y: 0, active: false });
    };

    const canvas = canvasRef.current;
    canvas?.addEventListener('pointermove', onMove);
    canvas?.addEventListener('pointerleave', onLeave);
    return () => {
      canvas?.removeEventListener('pointermove', onMove);
      canvas?.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={canvasRef}
      className={`product-scene ${className ?? ''}`}
      style={{ height, width: '100%' }}
      aria-hidden="true"
      data-motif={motif}
    >
      {renderScene(motif, seed, reduced, pointer)}
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