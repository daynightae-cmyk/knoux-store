import { formatCount, formatOfficialDate } from '@/lib/wordpress/external';
import type { ExternalItem } from '@/lib/wordpress/external';

/**
 * One external marketplace item.
 *
 * Every card carries its provenance. A WordPress.org item is never presented
 * as KNOuX work, never receives a KNOuX ownership badge, and never has its
 * official icon or screenshot recoloured to match the KNOuX palette. The
 * official asset is requested through the site's own image proxy so the
 * browser never hotlinks a third-party domain.
 */

const KIND_LABEL: Record<ExternalItem['kind'], string> = {
  plugin: 'Plugin',
  theme: 'Theme',
  block: 'Block',
  pattern: 'Pattern',
};

export function ProvenanceBadge() {
  return (
    <span className="mp-badge" title="Sourced from the official WordPress.org directory">
      <span className="mp-badge__dot" aria-hidden="true" />
      Source: WordPress.org
    </span>
  );
}

function proxySrc(url: string): string {
  return `/api/wp-image?u=${encodeURIComponent(url)}`;
}

function MetaLine({ item }: { item: ExternalItem }) {
  const facts: string[] = [];
  const installs = formatCount(item.activeInstalls);
  if (installs) facts.push(`${installs} active installs`);
  const downloads = formatCount(item.downloaded);
  if (!installs && downloads) facts.push(`${downloads} downloads`);
  if (item.rating) facts.push(`${item.rating}% rated by ${formatCount(item.ratingCount) ?? 'users'}`);
  const updated = formatOfficialDate(item.lastUpdated);
  if (updated) facts.push(`Updated ${updated}`);
  if (item.version) facts.push(`Version ${item.version}`);
  if (item.requiresWp) facts.push(`Requires WordPress ${item.requiresWp}`);
  if (item.testedWp) facts.push(`Tested up to ${item.testedWp}`);
  if (item.requiresPhp) facts.push(`PHP ${item.requiresPhp}`);

  if (!facts.length) return null;

  return (
    <p className="mp-card__meta">
      {facts.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </p>
  );
}

function OfficialVisual({ item, priority }: { item: ExternalItem; priority: boolean }) {
  if (item.screenshotUrl) {
    return (
      <div className="mp-card__shot">
        {/* The screenshot is the product here, so the first row is fetched
            eagerly: lazy-loading the largest above-the-fold image delays the
            paint of the thing the visitor came to see. Everything below the
            fold stays lazy. Served through the site's own allowlisted proxy,
            so the official asset is never hotlinked or recoloured. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- official WordPress asset served through the site's own host-allowlisted proxy */}
        <img
          src={proxySrc(item.screenshotUrl)}
          alt={`${item.name} theme screenshot as published on WordPress.org`}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          width={1200}
          height={900}
        />
      </div>
    );
  }

  if (item.iconUrl) {
    return (
      <div className="mp-card__icon">
        {/* eslint-disable-next-line @next/next/no-img-element -- official WordPress asset served through the site's own host-allowlisted proxy */}
        <img
          src={proxySrc(item.iconUrl)}
          alt={`${item.name} icon as published on WordPress.org`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          width={128}
          height={128}
        />
      </div>
    );
  }

  // A neutral placeholder, used only when the source publishes no artwork.
  // It is deliberately not a brand mark and not a KNOuX element.
  return (
    <div className="mp-card__icon mp-card__icon--empty" aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <rect x="6" y="9" width="36" height="30" rx="3" />
        <path d="M6 18h36M16 9v9M32 9v9" />
      </svg>
    </div>
  );
}

export function ExternalItemCard({ item, index = 0 }: { item: ExternalItem; index?: number }) {
  // The first row is treated as above the fold.
  const priority = index < 3;

  return (
    <article className={`mp-card mp-card--${item.kind}`}>
      <div className="mp-card__head">
        <OfficialVisual item={item} priority={priority} />
        <div className="mp-card__identity">
          <span className="mp-card__kind">{KIND_LABEL[item.kind]}</span>
          <h3 className="mp-card__name">{item.name}</h3>
          <p className="mp-card__author">{item.author}</p>
        </div>
        <ProvenanceBadge />
      </div>

      <p className="mp-card__description">{item.shortDescription}</p>

      <MetaLine item={item} />

      {item.tags.length > 0 ? (
        <ul className="mp-card__tags">
          {item.tags.slice(0, 5).map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      <div className="mp-card__actions">
        <a
          className="mp-card__source"
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open on WordPress.org
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <p className="mp-card__disclaimer">
        Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
      </p>
    </article>
  );
}
