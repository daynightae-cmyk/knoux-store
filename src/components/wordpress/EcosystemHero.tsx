import Link from 'next/link';
import { ParticleMark } from '@/components/brand/ParticleMark';
import type { ExternalQueryState } from '@/lib/wordpress/external';
import { wordPressItems, wordPressServices } from '@/data/wordpress';

/**
 * 01 — Arrival Experience (reference 83380.png).
 *
 * The gateway composition: compact sub-navigation, the numbered arrival
 * heading with its Arabic subtitle, a luminous circular gateway carrying the
 * canonical particle mark, a product panel on the left, a studio-status panel
 * on the right, the Enter CTA on the light floor, and the lower value rail.
 *
 * Everything decorative is CSS or inline SVG marked aria-hidden — no canvas,
 * no rAF loop, no scroll listener. Every panel value is real: the directory
 * state is the observed outcome of the server-side WordPress.org query, and
 * the counts come from the registries. The reference's invented product,
 * creator and uptime figures are deliberately not reproduced.
 */

const SUBNAV = [
  { label: 'Store', href: '/products' },
  { label: 'Studio', href: '#studio' },
  { label: 'Resources', href: '#library' },
  { label: 'Support', href: '/contact' },
] as const;

const PRODUCTS = [
  { label: 'Official Themes', href: '/wordpress/themes', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4.5 5 2.6 8 1.9-5.4L11 8h2l2.6 8 2-8' },
  { label: 'Official Plugins', href: '/wordpress/plugins', icon: 'M9 4h6v3a2 2 0 1 0 2 2h3v6h-3a2 2 0 1 1-2 2v3H9v-3a2 2 0 1 0-2-2H4V9h3a2 2 0 1 1 2-2Z' },
  { label: 'Studio Resources', href: '#library', icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5' },
  { label: 'Creative Assets', href: '/creative', icon: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18' },
] as const;

const VALUES = [
  { label: 'Discover', note: 'Explore the Collection', href: '/wordpress/themes', icon: 'M13 2 4 14h6l-1 8 9-12h-6Z' },
  { label: 'Build', note: 'Powerful WordPress Sites', href: '#launch', icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5' },
  { label: 'Accelerate', note: 'Your Creative Workflow', href: '/wordpress/solutions', icon: 'M12 2c4 3 6 7 6 11l3 4-5-1-4 4-4-4-5 1 3-4c0-4 2-8 6-11Zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' },
  { label: 'Go Premium', note: 'Studio-Grade Solutions', href: '/contact?requestType=wordpress&items=Studio-grade%20WordPress%20engagement', icon: 'M6 3h12l4 6-10 12L2 9Zm-4 6h20M9 3l3 6 3-6m-3 6v12' },
] as const;

const DIRECTORY_LABEL: Record<ExternalQueryState, string> = {
  ok: 'Directory online',
  empty: 'Directory empty',
  unavailable: 'Unavailable',
};

export function EcosystemHero({ directoryState, themesLoaded }: {
  directoryState: ExternalQueryState;
  themesLoaded: number;
}) {
  return (
    <section className="eco-hero eco-hero--arrival" aria-label="Arrival experience">
      {/* Ambient cosmic depth. Pure paint, never data. */}
      <div className="eco-hero__sky" aria-hidden="true" />
      <div className="eco-hero__horizon" aria-hidden="true" />

      <div className="eco-hero__inner">
        <nav className="eco-hero__subnav" aria-label="WordPress studio sections">
          <div className="eco-hero__subnav-links">
            {SUBNAV.map((entry) => (
              <Link key={entry.label} href={entry.href} aria-current={entry.label === 'Studio' ? 'page' : undefined}>
                {entry.label}
              </Link>
            ))}
          </div>
          <p className="eco-hero__wordmark">
            <b>KNOUX <span>STORE</span></b>
            <small>Digital Headquarters</small>
          </p>
          <nav className="page-crumb eco-hero__crumb" aria-label="Breadcrumb">
            <Link href="/">KNOuX</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">WordPress</span>
          </nav>
        </nav>

        <header className="eco-hero__heading">
          <h1 className="eco-hero__title">
            <span className="eco-hero__code">01</span>
            <span className="eco-hero__rule" aria-hidden="true" />
            Arrival Experience
          </h1>
          <p className="eco-hero__arabic" lang="ar" dir="rtl">بوابة الدخول إلى الاستوديو</p>
          <p className="eco-hero__eyebrow">
            <span className="eco-hero__pulse" aria-hidden="true" />
            KNOUX WordPress Studio
          </p>
        </header>

        <div className="eco-hero__stage">
          {/* Orbital geometry behind the gateway. */}
          <svg className="eco-hero__orbits" viewBox="0 0 1536 620" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="eco-orbit-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <g fill="none" stroke="#b88bf3" strokeWidth="1.3">
              <ellipse cx="768" cy="300" rx="640" ry="150" opacity=".3" />
              <ellipse cx="768" cy="285" rx="470" ry="190" opacity=".55" transform="rotate(-4 768 285)" />
              <ellipse cx="768" cy="330" rx="330" ry="80" opacity=".35" transform="rotate(5 768 330)" />
            </g>
            {[[180, 250], [420, 150], [1120, 160], [1360, 260], [540, 430], [1010, 440], [768, 90]].map(([x, y]) => (
              <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r="6" fill="#bd76ff" filter="url(#eco-orbit-glow)" />
                <circle cx={x} cy={y} r="2.6" fill="#fff" />
              </g>
            ))}
          </svg>

          {/* Flanking WordPress banners, as in the original. */}
          <div className="eco-hero__banner eco-hero__banner--left" aria-hidden="true"><span>W</span></div>
          <div className="eco-hero__banner eco-hero__banner--right" aria-hidden="true"><span>W</span></div>

          <aside className="eco-hero__panel eco-hero__panel--products" aria-label="WordPress studio destinations">
            <p className="eco-hero__panel-brand"><b>KNOuX</b> <span>STORE</span></p>
            <p className="eco-hero__panel-sub">Digital Products for WordPress</p>
            <ul>
              {PRODUCTS.map((entry) => (
                <li key={entry.label}>
                  <Link href={entry.href}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={entry.icon} /></svg>
                    <span>{entry.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className="eco-hero__gateway">
            <div className="eco-hero__gate" aria-hidden="true">
              <div className="eco-hero__gate-ring" />
              <div className="eco-hero__gate-ring eco-hero__gate-ring--inner" />
              <ParticleMark patternId="eco-mark-particles" className="eco-hero__mark" dense />
              <div className="eco-hero__gate-flare" />
            </div>
            <div className="eco-hero__steps" aria-hidden="true" />
          </div>

          <aside className="eco-hero__panel eco-hero__panel--status" aria-label="Studio status">
            <p className="eco-hero__status-head">
              <span>Studio Status</span>
              <span className="eco-hero__status-pill" data-state={directoryState}>{DIRECTORY_LABEL[directoryState]}</span>
            </p>
            <div className="eco-hero__status-map" aria-hidden="true" />
            <dl className="eco-hero__stats">
              <div>
                <dt>Themes loaded</dt>
                <dd>{themesLoaded}</dd>
              </div>
              <div>
                <dt>KNOuX releases</dt>
                <dd>{wordPressItems.length}</dd>
              </div>
              <div>
                <dt>Services</dt>
                <dd>{wordPressServices.length}</dd>
              </div>
            </dl>
            <p className="eco-hero__status-note">Observed at page render · WordPress.org</p>
            <div className="eco-hero__equalizer" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${22 + ((index * 37) % 60)}%` }} />)}
            </div>
          </aside>
        </div>

        <div className="eco-hero__floor" aria-hidden="true" />

        <p className="eco-hero__enter">
          <Link className="eco-hero__enter-link" href="#studio">
            Enter WordPress Studio <span aria-hidden="true">→</span>
          </Link>
        </p>

        <div className="eco-hero__stack">
          <ul className="eco-hero__values" aria-label="What the studio does">
            {VALUES.map((entry) => (
              <li key={entry.label}>
                <Link href={entry.href}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={entry.icon} /></svg>
                  <span>
                    <b>{entry.label}</b>
                    <small>{entry.note}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="eco-hero__beam" aria-hidden="true" />
        </div>
      </div>

      <p className="eco-hero__foot meta-row">
        <span>KN / WORDPRESS ECOSYSTEM</span>
        <span>REAL WORDPRESS.ORG DATA</span>
        <span>NO INVENTED AVAILABILITY</span>
        <a className="eco-hero__scroll" href="#domain">
          Scroll to the ecosystem
          <span aria-hidden="true">↓</span>
        </a>
      </p>
    </section>
  );
}
