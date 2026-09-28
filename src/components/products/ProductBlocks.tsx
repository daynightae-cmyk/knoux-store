'use client';

import { visualProfileFor } from '@/data/product-visuals';
import type { SoftwareProduct } from '@/data/software';

interface ProductBlocksProps {
  product: SoftwareProduct;
}

export function ProductBlocks({ product }: ProductBlocksProps) {
  const profile = visualProfileFor(product.slug);
  const motif = profile?.motif ?? 'system-nucleus';

  return (
    <section className="product-blocks" aria-label="Product details">
      <div className="shell">
        <div className="dossier">
          <div className="dossier__main">
            <div className={`dossier__section dossier__section--${motif}`}>
              <span className="label label--signal">OVERVIEW</span>
              <p className="dossier__prose" style={{ fontSize: 18, marginTop: 16 }}>
                {product.statement}
              </p>
            </div>

            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>What it does</h2>
              <span className="label">AS STATED BY THE REPOSITORY</span>
              <ul className={`fact-list fact-list--${motif}`} style={{ marginTop: 20 }}>
                {product.capabilities.map((item, index) => (
                  <li key={item} style={{ animationDelay: `${index * 0.06}s` }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Stated limits</h2>
              <span className="label">PUBLISHED WITH THE PRODUCT</span>
              <ul className={`limit-list limit-list--${motif}`} style={{ marginTop: 20 }}>
                {product.limitations.map((item, index) => (
                  <li key={item} style={{ animationDelay: `${index * 0.06}s` }}>
                    <span aria-hidden="true">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Technologies</h2>
              <span className="label">IMPLEMENTATION STACK</span>
              <div className="tags" style={{ marginTop: 16 }}>
                {product.technologies.map((tech) => (
                  <span key={tech} className="tag">{tech}</span>
                ))}
              </div>
            </div>

            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Evidence</h2>
              <span className="label">ARTEFACTS THIS PAGE IS BUILT FROM</span>
              <div className="evidence-list" style={{ marginTop: 20 }}>
                {product.evidence.map((item) => (
                  <div key={item.source} className="evidence-row">
                    <code>{item.source}</code>
                    <p>{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="dossier__side">
            <div className="dossier-card">
              <span className="dossier-card__label">INTENT PHRASES</span>
              <div className="tags">
                {product.searchTerms.slice(0, 8).map((term) => (
                  <span key={term} className="tag tag--violet">
                    {term}
                  </span>
                ))}
              </div>
            </div>

            <div className="dossier-card">
              <span className="dossier-card__label">ACCESS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  className="action"
                  href={product.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Repository
                  <span className="action-arrow" aria-hidden="true">↗</span>
                </a>
                {product.liveUrl ? (
                  <a
                    className="action"
                    href={product.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Declared URL
                    <span className="action-arrow" aria-hidden="true">↗</span>
                  </a>
                ) : null}
                <a className="action" href="/contact">
                  Request access
                  <span className="action-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}