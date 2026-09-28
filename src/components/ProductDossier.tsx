import Link from 'next/link';
import type { SoftwareProduct } from '@/data/software';

/**
 * Product dossier.
 *
 * Evidence first. A KNOuX product page leads with what the repository
 * establishes, publishes the product's own stated limitations next to its
 * capabilities, and cites the artefacts each claim comes from.
 */

export function ProductDossier({
  product,
  previous,
  next,
  related,
}: {
  product: SoftwareProduct;
  previous?: SoftwareProduct;
  next?: SoftwareProduct;
  related: SoftwareProduct[];
}) {
  return (
    <>
      <section className="shell" style={{ paddingTop: 148 }}>
        <nav className="page-crumb" aria-label="Breadcrumb">
          <Link href="/">KNOuX</Link>
          <span aria-hidden="true">/</span>
          <Link href="/products">Software</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="detail-hero-meta" style={{ marginTop: 34 }}>
          <span className="label label--signal">
            {product.code} / {product.family.toUpperCase()}
          </span>
          <span className={`mark mark--${product.status}`}>{product.status.replace('-', ' ')}</span>
        </div>

        <h1 className="detail-title" style={{ maxWidth: '16ch' }}>
          {product.name}
        </h1>
        <p className="detail-tagline">{product.tagline}</p>

        <dl className="telemetry-strip">
          <div>
            <dt>Platform</dt>
            <dd>{product.platform}</dd>
          </div>
          {product.version ? (
            <div>
              <dt>Version</dt>
              <dd>
                {product.version}
                {product.versionSource ? <span style={{ color: '#6d6e70' }}> · {product.versionSource}</span> : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Discipline</dt>
            <dd>{product.discipline}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{product.license ?? 'Not declared'}</dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd>
              <a
                href={product.repository}
                rel="noreferrer noopener"
                target="_blank"
                style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                {product.repository.split('/').pop()}
              </a>
            </dd>
          </div>
          {product.liveUrl ? (
            <div>
              <dt>Declared URL</dt>
              <dd>
                <a
                  href={product.liveUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                  style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {new URL(product.liveUrl).host}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(72px, 8vw, 130px)' }}>
        <div className="dossier">
          <div className="dossier__main">
            <div className="dossier__section">
              <span className="label label--signal">OVERVIEW</span>
              <p className="dossier__prose" style={{ fontSize: 18, marginTop: 16 }}>
                {product.statement}
              </p>
            </div>

            <div className="dossier__section">
              <h2>What it does</h2>
              <span className="label">AS STATED BY THE REPOSITORY</span>
              <ul className="fact-list" style={{ marginTop: 20 }}>
                {product.capabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="dossier__section">
              <h2>Stated limits</h2>
              <span className="label">PUBLISHED WITH THE PRODUCT</span>
              <ul className="limit-list" style={{ marginTop: 20 }}>
                {product.limitations.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="dossier__section">
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
              <span className="dossier-card__label">STACK</span>
              <div className="tags">
                {product.technologies.map((tech) => (
                  <span key={tech} className="tag">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="dossier-card">
              <span className="dossier-card__label">INTENT PHRASES</span>
              <div className="tags">
                {product.searchTerms.slice(0, 6).map((term) => (
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
                  <span className="action-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
                {product.liveUrl ? (
                  <a
                    className="action"
                    href={product.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Declared URL
                    <span className="action-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                ) : null}
                <Link className="action" href="/contact">
                  Request access
                  <span className="action-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="shell" style={{ paddingBottom: 'clamp(64px, 7vw, 110px)' }} aria-label="Related systems">
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
      ) : null}

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
    </>
  );
}
