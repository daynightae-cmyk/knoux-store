import Link from 'next/link';
import { pageMetadata } from '@/lib/metadata';
import { divisions } from '@/lib/entities';
import { softwareProducts, repositoryLedger, softwareAuditDate } from '@/data/software';
import { wordPressServices } from '@/data/wordpress';
import { webSystems, creativeDisciplines } from '@/data/services';
import { growthChannelsDetail, growthModules } from '@/data/growth';
import { solutions } from '@/data/solutions';
import { capabilities } from '@/data/capabilities';
import { AboutOriginRoom } from '@/components/AboutOriginRoom';

export const metadata = pageMetadata(
  'About',
  'KNOuX is a digital headquarters: eight divisions sharing one data model, one motion grammar and one engineering practice.',
  '/about',
);

const METHOD = [
  {
    index: '01',
    name: 'AUDIT',
    body: 'Start with the source. Inspect what exists, what is claimed and what the available evidence can actually support.',
  },
  {
    index: '02',
    name: 'BUILD',
    body: 'Design and implement against that verified baseline instead of rebuilding solved work or inventing capability.',
  },
  {
    index: '03',
    name: 'VERIFY',
    body: 'Use runtime evidence, tests, build output and repository state. A result is not complete because a model says it is.',
  },
  {
    index: '04',
    name: 'SHIP',
    body: 'Publish only what can be defended, with the limits and external dependencies kept visible.',
  },
] as const;

const COUNT: Record<string, string> = {
  software: String(softwareProducts.length) + ' PRODUCTS',
  wordpress: String(wordPressServices.length) + ' SERVICES / 0 RELEASES',
  web: String(webSystems.length) + ' SYSTEM TYPES',
  growth: String(growthChannelsDetail.length) + ' CHANNELS / ' + String(growthModules.length) + ' MODULES',
  creative: String(creativeDisciplines.length) + ' SYSTEMS',
  solutions: String(solutions.length) + ' ENTRIES',
  labs: 'RESEARCH',
  institution: 'PRACTICE',
};

const METRICS = [
  ['DIVISIONS', String(divisions.length)],
  ['CANONICAL PRODUCTS', String(softwareProducts.length)],
  ['WEB SYSTEM TYPES', String(webSystems.length)],
  ['GROWTH CHANNELS', String(growthChannelsDetail.length)],
  ['GROWTH MODULES', String(growthModules.length)],
  ['CREATIVE SYSTEMS', String(creativeDisciplines.length)],
  ['WORDPRESS SERVICES', String(wordPressServices.length)],
  ['WORDPRESS RELEASES', '0'],
  ['SOLUTIONS', String(solutions.length)],
  ['CAPABILITIES', String(capabilities.length)],
  ['REPOSITORIES AUDITED', String(repositoryLedger.length)],
  ['AUDIT DATE', softwareAuditDate],
] as const;

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className="about-origin-page">
      <AboutOriginRoom />

      <section id="about-point-of-view" className="about-chapter about-chapter--manifesto">
        <div className="about-chapter__frame">
          <aside className="about-chapter__rail" aria-hidden="true">
            <span>01</span>
            <strong>POINT OF VIEW</strong>
          </aside>
          <div className="about-chapter__content">
            <p className="about-chapter__eyebrow">THE INSTITUTION / WHY IT EXISTS</p>
            <h2>
              Make the complex
              <br />
              <em>feel considered.</em>
            </h2>
            <div className="about-manifesto">
              <p>
                The quality of a digital system is found in the decisions that hold it together: what it claims,
                what it leaves out, and whether those two stay consistent as it grows. That is why this site is
                organised the way it is.
              </p>
              <p>
                A product page that lists a capability nobody has verified is worse than no product page, because it
                spends the reader&apos;s trust on a claim. The software universe is therefore built from repository
                evidence, and every canonical product keeps its documented limits visible.
              </p>
              <p>
                KNOuX has no first-party WordPress releases yet. Its WordPress marketplace discovers work from the
                official WordPress.org directories and credits the original authors. The Work archive contains
                verified KNOuX product and engineering records without invented client stories or outcomes.
              </p>
              <p>
                The divisions, composer, search, product worlds and institutional pages share one entity model, one
                motion grammar and one interaction language. Different disciplines should still feel like one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-chapter about-chapter--registry" aria-labelledby="about-divisions-title">
        <div className="about-chapter__frame">
          <aside className="about-chapter__rail" aria-hidden="true">
            <span>02</span>
            <strong>DIVISIONS</strong>
          </aside>
          <div className="about-chapter__content">
            <p className="about-chapter__eyebrow">EIGHT WINGS / ONE INSTITUTION</p>
            <div className="about-chapter__head">
              <h2 id="about-divisions-title">
                Different disciplines.
                <br />
                <em>One operating language.</em>
              </h2>
              <p>
                Each division owns a different registry and function. They share navigation, motion, evidence rules
                and request architecture instead of behaving like separate microsites.
              </p>
            </div>

            <div className="about-registry" role="list">
              {divisions.map((division) => (
                <Link key={division.id} href={division.route} className="about-registry__row" role="listitem">
                  <span className="about-registry__index">{division.index}</span>
                  <strong>{division.label}</strong>
                  <p>{division.statement}</p>
                  <span className="about-registry__meta">{COUNT[division.id] ?? ''}</span>
                  <span className="about-registry__arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about-chapter about-chapter--method" aria-labelledby="about-method-title">
        <div className="about-chapter__frame">
          <aside className="about-chapter__rail" aria-hidden="true">
            <span>03</span>
            <strong>PRACTICE</strong>
          </aside>
          <div className="about-chapter__content">
            <p className="about-chapter__eyebrow">HOW KNOuX BUILDS</p>
            <div className="about-chapter__head">
              <h2 id="about-method-title">
                Evidence before
                <br />
                <em>the victory lap.</em>
              </h2>
              <p>
                The method is deliberately plain: establish reality, preserve verified work, implement the smallest
                correct change, then prove it in the environment that matters.
              </p>
            </div>

            <div className="about-method">
              {METHOD.map((step) => (
                <article key={step.index} className="about-method__step">
                  <span>{step.index}</span>
                  <h3>{step.name}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>

            <Link href="/engineering" className="about-inline-link">
              READ THE ENGINEERING PRACTICE <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="about-chapter about-chapter--evidence" aria-labelledby="about-evidence-title">
        <div className="about-chapter__frame">
          <aside className="about-chapter__rail" aria-hidden="true">
            <span>04</span>
            <strong>EVIDENCE</strong>
          </aside>
          <div className="about-chapter__content">
            <p className="about-chapter__eyebrow">IN NUMBERS THAT ARE TRUE</p>
            <div className="about-chapter__head">
              <h2 id="about-evidence-title">
                The countable
                <br />
                <em>state.</em>
              </h2>
              <p>
                Only quantities that can be counted from the source data live here. No client count, revenue figure,
                download number or team size is published without an established source.
              </p>
            </div>

            <dl className="about-evidence-grid">
              {METRICS.map(([label, value], index) => (
                <div key={label}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="about-chapter about-chapter--closing" aria-labelledby="about-closing-title">
        <div className="about-closing">
          <div>
            <p className="about-chapter__eyebrow">05 / CONTINUE</p>
            <h2 id="about-closing-title">
              Have something
              <br />
              <em>to build?</em>
            </h2>
          </div>
          <div className="about-closing__actions">
            <p>
              Start with the Composer when you know the shape of the system. Start with a conversation when the
              problem still needs framing.
            </p>
            <div>
              <Link href="/build" className="action action--primary">
                Open the Composer <span className="action-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link href="/contact" className="action">
                Contact KNOuX <span className="action-arrow" aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="about-closing__next">
          <span>NEXT / PRACTICE</span>
          <Link href="/engineering">
            How KNOuX engineers <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
