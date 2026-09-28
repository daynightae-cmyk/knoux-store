import Link from 'next/link';
import { primaryNavigation } from '@/data/navigation';

export default function NotFound() {
  return (
    <main className="not-found-wrap" id="main-content">
      <span className="label label--signal">SYSTEM / 404</span>
      <h1>
        Not in the
        <br />
        <em>registry.</em>
      </h1>
      <p>
        That route does not exist. The command palette searches everything this site publishes, so it is usually
        faster than guessing at a URL.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/" className="action action--primary">
          Headquarters
          <span className="action-arrow" aria-hidden="true">↗</span>
        </Link>
        <Link href="/build" className="action">
          Composer
        </Link>
      </div>
      <nav className="not-found-links" aria-label="Division shortcuts">
        {primaryNavigation.map((item) => (
          <Link key={item.href} href={item.href} className="action">
            <span className="mono" style={{ color: 'var(--violet)' }}>
              {item.code}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
