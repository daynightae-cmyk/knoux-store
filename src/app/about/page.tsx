import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { NextLink, SystemIndex, IndexRow } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { divisions } from '@/lib/entities';
import { softwareProducts, repositoryLedger, softwareAuditDate } from '@/data/software';
import { wordPressServices } from '@/data/wordpress';
import { webSystems } from '@/data/services';
import { growthChannelsDetail, growthModules } from '@/data/growth';
import { creativeDisciplines } from '@/data/services';
import { solutions } from '@/data/solutions';
import { capabilities } from '@/data/capabilities';
import { AboutLivingIdentity } from '@/components/AboutLivingIdentity';

export const metadata = pageMetadata(
  'About',
  'KNOuX is a digital headquarters: eight divisions sharing one data model, one motion grammar and one engineering practice.',
  '/about',
);

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <PageIntro
        index="11"
        label="About"
        title="An institution,"
        italic="not a catalogue."
        description="KNOuX is organised as a headquarters with internal divisions rather than as a shop with product pages. The distinction decides what gets built."
      />

      <section className="shell" style={{ paddingTop: 'clamp(50px, 6vw, 100px)', paddingBottom: 'clamp(80px, 9vw, 140px)' }}>
        <div className="about-layout about-layout--living">
          <div className="about-layout__narrative">
            <span className="label label--signal">POINT OF VIEW</span>
            <h2 className="about-heading">
              Make the complex
              <br />
              <em>feel considered.</em>
            </h2>
            <div className="about-prose">
              <p>
                The quality of a digital system is found in the decisions that hold it together: what it claims, what
                it leaves out, and whether those two stay consistent as it grows. That is why this site is organised
                the way it is.
              </p>
              <p>
                A product page that lists a capability nobody has verified is worse than no product page, because it
                spends the reader&rsquo;s trust on a claim. So the software universe is built from an audit of
                repositories, and every entry publishes the limits its own maintainers documented. KNOuX has no
                first-party WordPress releases yet; the separate marketplace discovers work from the official
                WordPress.org directories and credits its authors. The Work archive contains verified KNOuX product
                and engineering case files, without invented client stories or outcomes.
              </p>
              <p>
                Everything else on the site — the divisions, the composer, the search — runs on one entity model, one
                motion grammar and one interaction language. A visitor can move from a WordPress goal to a web system
                to a growth channel without the site changing character underneath them.
              </p>
            </div>
          </div>
          <AboutLivingIdentity />
        </div>
      </section>

      <div style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <SystemIndex
          eyebrow="DIVISIONS"
          title={<>Eight wings,<br />one institution.</>}
          statement="Each division is a different discipline with its own registry. They share navigation, data model, motion grammar, search and request architecture."
        >
          <details className="evidence-disclosure"><summary>VIEW DIVISION REGISTRY</summary><div className="index-rows">
            {divisions.map((division) => (
              <IndexRow
                key={division.id}
                index={division.index}
                name={division.label}
                meta={division.statement}
                metaSecondary={COUNT[division.id] ?? ''}
                href={division.route}
              />
            ))}
          </div></details>
        </SystemIndex>
      </div>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">IN NUMBERS THAT ARE TRUE</span>
            <h2 className="block-head__title">The countable state.</h2>
          </div>
          <p className="block-head__aside">
            Only quantities that can be counted from the source data. There is no client count, no revenue figure,
            no download number and no team size on this page, because none of those are established.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW COUNTABLE REGISTRY STATE</summary><dl className="telemetry-strip" style={{ marginTop: 34, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <div>
            <dt>Divisions</dt>
            <dd>{divisions.length}</dd>
          </div>
          <div>
            <dt>Canonical products</dt>
            <dd>{softwareProducts.length}</dd>
          </div>
          <div>
            <dt>Web system types</dt>
            <dd>{webSystems.length}</dd>
          </div>
          <div>
            <dt>Growth channels</dt>
            <dd>{growthChannelsDetail.length}</dd>
          </div>
          <div>
            <dt>Growth modules</dt>
            <dd>{growthModules.length}</dd>
          </div>
          <div>
            <dt>Creative systems</dt>
            <dd>{creativeDisciplines.length}</dd>
          </div>
          <div>
            <dt>WordPress services</dt>
            <dd>{wordPressServices.length}</dd>
          </div>
          <div>
            <dt>WordPress releases</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Solutions</dt>
            <dd>{solutions.length}</dd>
          </div>
          <div>
            <dt>Capabilities</dt>
            <dd>{capabilities.length}</dd>
          </div>
          <div>
            <dt>Repositories audited</dt>
            <dd>{repositoryLedger.length}</dd>
          </div>
          <div>
            <dt>Audit date</dt>
            <dd style={{ fontSize: 11 }}>{softwareAuditDate}</dd>
          </div>
        </dl></details>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="text-band" style={{ margin: 0, paddingLeft: 'max(5.3vw, 24px)', paddingRight: 'max(5.3vw, 24px)' }}>
          <span className="eyebrow">CONTINUE THE CONVERSATION</span>
          <p>
            Have something
            <br />
            <em>to build?</em>
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/build" className="action action--primary">
              Open the Composer
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
            <Link href="/contact" className="action">
              Contact KNOuX
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
        </div>
        <div style={{ marginTop: 60 }}>
          <NextLink label="Practice" name="How KNOuX engineers" href="/engineering" />
        </div>
      </section>
    </main>
  );
}

const COUNT: Record<string, string> = {
  software: `${softwareProducts.length} PRODUCTS`,
  wordpress: `${wordPressServices.length} SERVICES / 0 RELEASES`,
  web: `${webSystems.length} SYSTEM TYPES`,
  growth: `${growthChannelsDetail.length} CHANNELS / ${growthModules.length} MODULES`,
  creative: `${creativeDisciplines.length} SYSTEMS`,
  solutions: `${solutions.length} ENTRIES`,
  labs: 'RESEARCH',
  institution: 'PRACTICE',
};
