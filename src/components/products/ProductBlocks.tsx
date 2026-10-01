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
    <section
      className="product-blocks"
      aria-label="Product details"
      data-chapter="03-capability-evidence"
      data-motif={motif}
    >
      <div className="shell">
        <div className="dossier">
          <div className="dossier__main">

            {/* Overview */}
            <div className={`dossier__section dossier__section--${motif}`}>
              <span className="label label--signal">OVERVIEW</span>
              <p className="dossier__prose" style={{ fontSize: 17, marginTop: 18, lineHeight: 1.78 }}>
                {product.statement}
              </p>
            </div>

            {/* Capabilities */}
            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>What it does</h2>
              <span className="label">AS STATED BY THE REPOSITORY</span>
              <ul className="fact-list" style={{ marginTop: 22 }}>
                {product.capabilities.map((item, index) => (
                  <li key={item}>
                    <div className="capability-card">
                      <span className="capability-card__index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="capability-card__text">{item}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stated limits */}
            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Stated limits</h2>
              <span className="label">PUBLISHED WITH THE PRODUCT</span>
              <ul className="limit-list" style={{ marginTop: 22 }}>
                {product.limitations.map((item) => (
                  <li key={item}>
                    <span className="limit-icon" aria-hidden="true">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technologies */}
            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Technologies</h2>
              <span className="label">IMPLEMENTATION STACK</span>
              <div className="tags" style={{ marginTop: 18 }}>
                {product.technologies.map((tech) => (
                  <span key={tech} className="tag">{tech}</span>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div className={`dossier__section dossier__section--${motif}`}>
              <h2>Evidence</h2>
              <span className="label">ARTEFACTS THIS PAGE IS BUILT FROM</span>
              <div className="evidence-list" style={{ marginTop: 22 }}>
                {product.evidence.map((item) => (
                  <div key={item.source} className="evidence-row">
                    <code>{item.source}</code>
                    <p>{item.note}</p>
                    <span className="evidence-row__note">Verified from public repository</span>
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

            <div className="dossier-card">
              <span className="dossier-card__label">STATUS</span>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`mark mark--${product.status}`}>
                      {product.status.replace('-', ' ')}
                    </span>
                  </dd>
                </div>
                {product.version && (
                  <div>
                    <dt>Version</dt>
                    <dd>{product.version}</dd>
                  </div>
                )}
                <div>
                  <dt>License</dt>
                  <dd>{product.license ?? 'Not declared'}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd style={{ fontSize: '10px', lineHeight: 1.5 }}>{product.platform.split('(')[0]?.trim()}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}