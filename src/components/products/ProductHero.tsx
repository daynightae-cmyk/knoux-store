'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ProductScene } from './ProductScene';
import { OneSystemTopology } from './OneSystemTopology';
import { resolveProductLogo } from '@/data/product-visuals';
import type { SoftwareProduct } from '@/data/software';

interface ProductHeroProps {
  product: SoftwareProduct;
  arrivalComplete: boolean;
}

export function ProductHero({ product, arrivalComplete }: ProductHeroProps) {
  const logoPath = resolveProductLogo(product.slug);
  const hasLiveUrl = Boolean(product.liveUrl);

  return (
    <section className={`product-hero${product.slug === 'knoux-one' ? ' product-hero--one' : ''}`} aria-labelledby="product-title">
      <nav className="page-crumb" aria-label="Breadcrumb">
        <Link href="/">KNOuX</Link>
        <span aria-hidden="true">/</span>
        <Link href="/products">Software</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-hero__grid">
        <div className="product-hero__identity">
          <div className="product-hero__meta" style={{ opacity: arrivalComplete ? 1 : 0, transform: arrivalComplete ? 'none' : 'translateY(20px)', transition: 'opacity 0.8s ease, transform 0.9s cubic-bezier(0.16,0.84,0.34,1)' }}>
            <span className="label label--signal">{product.code} / {product.family.toUpperCase()}</span>
            <span className={`mark mark--${product.status}`}>{product.status.replace('-', ' ')}</span>
          </div>

          <h1 id="product-title" className="product-hero__title" style={{ opacity: arrivalComplete ? 1 : 0, transform: arrivalComplete ? 'none' : 'translateY(20px)', transition: 'opacity 0.8s ease 0.1s, transform 0.9s cubic-bezier(0.16,0.84,0.34,1) 0.1s' }}>
            {logoPath ? (
              <>
                <Image
                  src={logoPath}
                  alt={`${product.name} logo`}
                  className="product-hero__logo"
                  width={48}
                  height={48}
                  unoptimized
                />
                {product.slug === 'knoux-one' ? <span className="one-wordmark"><span>KNOuX</span> ONE</span> : product.shortName}
              </>
            ) : (
              <>
                <svg className="product-hero__mark" viewBox="0 0 312 532" aria-hidden="true" focusable="false">
                  <path d="M 5 39 L 1 53 L 1 73 L 4 85 L 10 97 L 17 106 L 73 157 L 124 106 L 135 99 L 149 94 L 171 93 L 186 97 L 198 103 L 212 116 L 105 17 L 96 10 L 86 5 L 71 1 L 55 1 L 37 6 L 24 14 L 14 24 Z" />
                  <path d="M 200 104 L 199 105 L 187 98 L 172 94 L 154 94 L 139 98 L 125 106 L 20 211 L 9 228 L 5 242 L 4 254 L 5 264 L 9 277 L 17 291 L 28 302 L 41 310 L 59 315 L 80 314 L 100 306 L 108 300 L 210 198 L 218 187 L 222 178 L 225 167 L 226 152 L 224 140 L 217 123 L 213 119 L 213 117 L 200 106 Z" />
                  <path d="M 242 210 L 241 211 L 233 213 L 229 216 L 224 218 L 219 223 L 218 223 L 210 232 L 209 235 L 207 237 L 204 243 L 203 249 L 201 253 L 201 262 L 201 263 L 201 265 L 201 275 L 202 276 L 204 284 L 209 294 L 212 297 L 212 298 L 225 310 L 230 312 L 234 315 L 237 315 L 244 318 L 251 318 L 252 319 L 267 318 L 274 315 L 277 315 L 279 313 L 286 310 L 289 307 L 290 307 L 302 294 L 307 284 L 307 282 L 309 278 L 309 275 L 310 274 L 310 265 L 310 264 L 310 262 L 310 254 L 309 253 L 309 250 L 307 246 L 307 243 L 305 239 L 303 237 L 301 232 L 296 227 L 296 226 L 287 218 L 280 215 L 278 213 L 276 213 L 269 210 L 265 210 L 264 209 L 247 209 L 246 210 Z" />
                  <path d="M 204 325 L 186 314 L 169 310 L 150 311 L 130 319 L 123 324 L 19 428 L 9 444 L 5 458 L 4 470 L 5 480 L 9 493 L 18 508 L 28 518 L 39 525 L 60 531 L 80 530 L 100 522 L 109 515 L 209 415 L 216 406 L 223 391 L 225 382 L 225 363 L 219 344 L 211 332 Z" />
                </svg>
                {product.name}
              </>
            )}
          </h1>

          <p className="product-hero__tagline" style={{ opacity: arrivalComplete ? 1 : 0, transform: arrivalComplete ? 'none' : 'translateY(20px)', transition: 'opacity 0.8s ease 0.2s, transform 0.9s cubic-bezier(0.16,0.84,0.34,1) 0.2s' }}>
            {product.tagline}
          </p>

          <dl className="product-hero__telemetry" style={{ opacity: arrivalComplete ? 1 : 0, transform: arrivalComplete ? 'none' : 'translateY(20px)', transition: 'opacity 0.8s ease 0.3s, transform 0.9s cubic-bezier(0.16,0.84,0.34,1) 0.3s' }}>
            <div>
              <dt>Platform</dt>
              <dd>{product.platform}</dd>
            </div>
            {product.version ? (
              <div>
                <dt>Version</dt>
                <dd>
                  {product.version}
                  {product.versionSource && <span style={{ color: 'var(--dim)' }}> · {product.versionSource}</span>}
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
          </dl>

          <div className="product-hero__actions" style={{ opacity: arrivalComplete ? 1 : 0, transform: arrivalComplete ? 'none' : 'translateY(20px)', transition: 'opacity 0.8s ease 0.4s, transform 0.9s cubic-bezier(0.16,0.84,0.34,1) 0.4s' }}>
            <a
              className="action"
              href={product.repository}
              target="_blank"
              rel="noreferrer noopener"
            >
              Repository
              <span className="action-arrow" aria-hidden="true">↗</span>
            </a>
            {hasLiveUrl && (
              <a
                className="action"
                href={product.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Declared URL
                <span className="action-arrow" aria-hidden="true">↗</span>
              </a>
            )}
            <Link className="action" href="/contact">
              Request access
              <span className="action-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <div className="product-hero__scene">
          {product.slug === 'knoux-one' ? <OneSystemTopology product={product} /> : <ProductScene product={product} height={520} />}
        </div>
      </div>
    </section>
  );
}
