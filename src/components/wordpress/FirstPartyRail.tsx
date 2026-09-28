import Link from 'next/link';
import { wordPressItems, type WordPressItemType } from '@/data/wordpress';

/**
 * KNOuX first-party release rail.
 *
 * This is the only place `wordPressItems` is rendered. It stays at zero until a
 * KNOuX release genuinely exists, and it is always shown next to the external
 * directory so the two layers are never confused. The external marketplace
 * makes the division useful without making the first-party count untrue.
 */

export function FirstPartyRail({
  type,
  label,
}: {
  type: WordPressItemType;
  /** Singular noun, e.g. "plugin". The count is pluralised from it. */
  label: string;
}) {
  const items = wordPressItems.filter((item) => item.type === type);
  const count = items.length;
  const plural = count === 1 ? label : `${label}s`;

  return (
    <section className="mp-firstparty" aria-label={`KNOuX ${label.toLowerCase()} releases`}>
      <div className="block-head">
        <div>
          <span className="label label--signal">KNOuX RELEASES</span>
          <h2 className="block-head__title">Published by KNOuX.</h2>
        </div>
        <p className="block-head__aside">
          This is the KNOuX-owned registry. It lists only files KNOuX has actually released, and it is not the
          same thing as the WordPress.org directory below.
        </p>
      </div>

      {count > 0 ? (
        <ul className="registry" style={{ marginTop: 26 }}>
          {items.map((item) => (
            <li key={item.id} className="registry-row">
              <span className="registry-row__id">{item.id.toUpperCase()}</span>
              <span className="registry-row__name">
                {item.name}
                {item.version ? <small>Version {item.version}</small> : null}
              </span>
              <span className="registry-row__purpose">{item.summary}</span>
              <span className="registry-row__compat">{item.status}</span>
              <span />
              <span />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mp-firstparty__empty">
          <p className="mp-firstparty__count">
            <strong>{count}</strong> {plural} published by KNOuX
          </p>
          <p>
            Nothing has been released, so nothing is listed. An entry appears here when a repository or a
            verifiable download establishes a real KNOuX release — not before, and not to make the page look
            fuller. The WordPress.org directory below is live in the meantime.
          </p>
        </div>
      )}

      <p className="mp-firstparty__links">
        <Link href="/wordpress#catalogues">All KNOuX WordPress routes</Link>
        <span aria-hidden="true">·</span>
        <Link href="/wordpress#operate">KNOuX operating services</Link>
      </p>
    </section>
  );
}
