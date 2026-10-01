'use client';

import Link from 'next/link';
import { useState } from 'react';
import { wordPressItems } from '@/data/wordpress';

/**
 * WordPress Library Gateway.
 *
 * The overview routes into the directories rather than trying to hold them.
 * That is a decision about weight as much as about layout: the plugin directory
 * is over a hundred thousand entries, and an overview that preloaded a
 * selection of them in order to look large would be paying a live external
 * request per card to make a claim it could make with four links.
 *
 * So the gateway does two jobs, and only two:
 *
 *   1. Route. Every category is a destination with a real, addressable
 *      directory behind it that paginates and searches server-side.
 *   2. Report. The honest counts. `wordPressItems.length` is the KNOuX release
 *      count and is rendered from the registry itself, so it reads 0 today and
 *      reads whatever it genuinely is tomorrow without a component change.
 *
 * What it does not do is fetch the ecosystem. No `queryPlugins`, no
 * `queryThemes`, nothing here touches the WordPress.org APIs. A gateway that
 * preloaded results would make the landing page heavier every time the
 * upstream changed, for data the visitor is about to request deliberately by
 * opening a directory.
 */

type Lens = {
  id: string;
  code: string;
  label: string;
  route: string;
  statement: string;
  /** How this category is genuinely presented in its directory. */
  presentation: string;
};

const LENSES: readonly Lens[] = [
  {
    id: 'plugins',
    code: 'LIB-01',
    label: 'Plugins',
    route: '/wordpress/plugins',
    statement: 'Extensions that add a capability to an install that already runs.',
    presentation: 'Metadata registry. Icon, author, rating, installs, compatibility, last update.',
  },
  {
    id: 'themes',
    code: 'LIB-02',
    label: 'Themes',
    route: '/wordpress/themes',
    statement: 'Full presentation systems, presented as the screenshots their authors publish.',
    presentation: 'Screenshot wall. Official imagery, served through this site’s own asset proxy.',
  },
  {
    id: 'blocks',
    code: 'LIB-03',
    label: 'Blocks',
    route: '/wordpress/blocks',
    statement: 'Reusable Gutenberg components editors compose layouts from.',
    presentation: 'Component directory. Icon, author, rating and install counts where the source returns them.',
  },
  {
    id: 'patterns',
    code: 'LIB-04',
    label: 'Patterns',
    route: '/wordpress/patterns',
    statement: 'Reusable block layouts from the official pattern directory.',
    presentation: 'Pattern index. Linked to source rather than rendering third-party block markup.',
  },
];

export function WordPressLibraryGateway() {
  const [active, setActive] = useState<string>(LENSES[0].id);
  const lens = LENSES.find((entry) => entry.id === active) ?? LENSES[0];
  const firstPartyCount = wordPressItems.length;

  return (
    <div className="library-gateway">
      <nav className="library-gateway__index" aria-label="WordPress library categories">
        {LENSES.map((entry) => {
          const isActive = entry.id === lens.id;
          return (
            <Link
              key={entry.id}
              href={entry.route}
              className={`library-gateway__tab ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              onMouseEnter={() => setActive(entry.id)}
              onFocus={() => setActive(entry.id)}
            >
              <span className="library-gateway__tab-code">{entry.code}</span>
              <strong>{entry.label}</strong>
              <span className="library-gateway__tab-go" aria-hidden="true">
                ↗
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="library-gateway__readout" key={lens.id}>
        <span className="label label--signal">
          {lens.code} / {lens.label.toUpperCase()}
        </span>
        <h3 className="library-gateway__readout-title">{lens.statement}</h3>

        <dl className="library-gateway__facts">
          <div>
            <dt>Presented as</dt>
            <dd>{lens.presentation}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>Official WordPress.org directory, read live on request</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>
              The full directory is reachable by search, filter and pagination. It is never loaded in one request.
            </dd>
          </div>
        </dl>

        <Link className="action action--primary" href={lens.route}>
          Open the {lens.label.toLowerCase()} directory
          <span className="action-arrow" aria-hidden="true">
            ↗
          </span>
        </Link>
      </div>

      {/*
        The institutional rail. Rendered from the registry, and deliberately
        positioned apart from the four external categories above. These are
        KNOuX files; those are other people's files read from WordPress.org.
        Keeping them in one rail rather than interleaved with the external
        lenses is what stops a visitor reading a five-item KNOuX count as a
        claim about the whole ecosystem.
      */}
      <section className="library-gateway__firstparty" aria-label="KNOuX releases">
        <div className="library-gateway__firstparty-head">
          <span className="label label--signal">KNOuX RELEASES</span>
          <p className="library-gateway__firstparty-count">
            <strong>{firstPartyCount}</strong> published
          </p>
        </div>
        <p className="library-gateway__firstparty-body">
          {firstPartyCount > 0 ? (
            <>
              The files KNOuX has actually released, listed from the KNOuX registry.
            </>
          ) : (
            <>
              KNOuX has released no WordPress files of its own, and that number is displayed rather than filled in.
              An entry appears when a repository or a verifiable download establishes a real release. Everything in
              the four directories above is third-party work, published by its own authors and attributed to them.
            </>
          )}
        </p>
        <p className="library-gateway__provenance">
          <span className="mp-badge">
            <span className="mp-badge__dot" aria-hidden="true" />
            Source: WordPress.org
          </span>
        </p>
      </section>
    </div>
  );
}
