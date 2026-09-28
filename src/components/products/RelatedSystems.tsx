'use client';

import Link from 'next/link';
import type { SoftwareProduct } from '@/data/software';

interface RelatedSystemsProps {
  related: SoftwareProduct[];
}

export function RelatedSystems({ related }: RelatedSystemsProps) {
  if (related.length === 0) return null;

  return (
    <section className="shell related-systems" aria-label="Related systems" style={{ paddingBottom: 'clamp(64px, 7vw, 110px)' }}>
      <span className="label label--signal">RELATED SYSTEMS</span>
      <div className="related" style={{ marginTop: 22 }}>
        {related.map((item) => (
          <Link key={item.id} href={`/products/${item.slug}`} className="related-card">
            <span className="related-card__code">{item.code}</span>
            <h3>{item.name}</h3>
            <p>{item.tagline}</p>
            <span className="related-card__cta">OPEN DOSSIER ↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}