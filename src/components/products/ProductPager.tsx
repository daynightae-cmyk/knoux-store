'use client';

import Link from 'next/link';
import type { SoftwareProduct } from '@/data/software';

interface ProductPagerProps {
  previous?: SoftwareProduct;
  next?: SoftwareProduct;
}

export function ProductPager({ previous, next }: ProductPagerProps) {
  return (
    <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 140px)' }}>
      <div className="pager">
        {previous ? (
          <Link href={`/products/${previous.slug}`} className="pager__link pager__link--prev">
            <span className="label">PREVIOUS</span>
            <strong>{previous.shortName}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/products/${next.slug}`} className="pager__link pager__link--next">
            <span className="label">NEXT</span>
            <strong>{next.shortName}</strong>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}