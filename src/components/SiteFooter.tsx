import Link from 'next/link';
import { divisions } from '@/lib/entities';
import { institutionNavigation, primaryNavigation } from '@/data/navigation';
import { growthChannelsDetail } from '@/data/growth';

/**
 * Site footer.
 *
 * The full institution is indexed here rather than in a mega-menu, so every
 * division, channel and institution page is reachable without a pointer.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top shell">
        <p className="eyebrow">THE WORK CONTINUES</p>
        <Link href="/contact" className="footer-title">
          Let&apos;s make
          <br />
          <em>what comes next.</em>
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="footer-index shell">
        <div className="footer-index__col">
          <span className="label">Divisions</span>
          <ul>
            {divisions.map((division) => (
              <li key={division.id}>
                <Link href={division.route}>
                  <span className="mono">{division.index}</span> {division.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">Growth channels</span>
          <ul>
            {growthChannelsDetail.map((channel) => (
              <li key={channel.id}>
                <Link href={`/growth/${channel.slug}`}>{channel.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/growth">Growth overview</Link>
            </li>
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">WordPress</span>
          <ul>
            {primaryNavigation
              .filter((item) => item.href === '/wordpress')
              .map((item) => (
                <li key={item.href}>
                  <Link href="/wordpress">Ecosystem overview</Link>
                </li>
              ))}
            {['themes', 'plugins', 'blocks', 'starter-sites', 'solutions'].map((slug) => (
              <li key={slug}>
                <Link href={`/wordpress/${slug}`}>{slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">Institution</span>
          <ul>
            {institutionNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom shell">
        <Link href="/" className="footer-logo">
          KNOuX<span>®</span>
        </Link>
        <nav aria-label="Footer navigation">
          {primaryNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span>ENGINEERING DIGITAL SYSTEMS</span>
      </div>
    </footer>
  );
}
