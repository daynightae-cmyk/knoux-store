'use client';

import { useState } from 'react';
import { ProductArrival } from './ProductArrival';
import { ProductHero } from './ProductHero';
import { ProductSystemAnatomy } from './anatomy/ProductSystemAnatomy';
import { ProductBlocks } from './ProductBlocks';
import { RelatedSystems } from './RelatedSystems';
import { ProductPager } from './ProductPager';
import { TrackOnView } from '@/components/TrackOnView';
import type { SoftwareProduct } from '@/data/software';

interface ProductExperienceProps {
  product: SoftwareProduct;
  previous?: SoftwareProduct;
  next?: SoftwareProduct;
  related: SoftwareProduct[];
}

export function ProductExperience({
  product,
  previous,
  next,
  related,
}: ProductExperienceProps) {
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const [showArrival, setShowArrival] = useState(true);

  const handleArrivalComplete = () => {
    setArrivalComplete(true);
    // Keep arrival overlay for a brief moment then fade out
    setTimeout(() => {
      setShowArrival(false);
    }, 300);
  };

  return (
    <main id="main-content" tabIndex={-1}>
      <TrackOnView event={{ type: 'product_opened', id: product.id, slug: product.slug }} />

      {/* 00 / ARRIVAL */}
      {showArrival && (
        <ProductArrival product={product} onComplete={handleArrivalComplete} />
      )}

      {/* 01 / PRODUCT */}
      <div data-chapter="01-product">
        <ProductHero product={product} arrivalComplete={arrivalComplete} />
      </div>

      {/* 02 / SYSTEM REVEAL */}
      <div data-chapter="02-system-reveal">
        <ProductSystemAnatomy key={product.id} product={product} />
      </div>

      {/* 03 / CAPABILITY FLOW + 04 / EVIDENCE SURFACE */}
      <ProductBlocks product={product} />

      {/* 05 / CONTINUE */}
      <div data-chapter="05-continue">
        <RelatedSystems related={related} />
        <ProductPager previous={previous} next={next} />
      </div>
    </main>
  );
}
