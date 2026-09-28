import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { TrackOnView } from '@/components/TrackOnView';
import { MissionPath } from '@/components/SpatialExperiences';
import { SolutionMissionRows } from '@/components/SpecialistArchives';

export const metadata = pageMetadata(
  'Solutions',
  'KNOuX solutions by business need: start a business, launch a product, build a store, digitise operations, create a portal, promote a local business, build an academy, modernise a website.',
  '/solutions',
);

export default function SolutionsPage() {
  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'solutions', route: '/solutions' }} />
      <PageIntro
        index="06"
        label="Solutions"
        title="Start from"
        italic="the need."
        description="You should not have to know which internal department serves you. Every solution below is assembled from the same registries the divisions publish."
      />
      <SignalRail division="solutions" path="/solutions" />
      <section
        className="shell"
        style={{ paddingTop: 'clamp(70px, 8vw, 130px)', paddingBottom: 'clamp(70px, 8vw, 130px)' }}
      >
        <div className="block-head">
          <div>
            <span className="label label--signal">MISSION NAVIGATION</span>
            <h2 className="block-head__title">Follow the need.</h2>
          </div>
          <p className="block-head__aside">
            Move through real business objectives. Each station resolves into documented systems and services.
          </p>
        </div>
        <MissionPath />
      </section>

      <SolutionMissionRows />

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="dev-state" data-reveal>
          <p className="dev-state__mark">
            <span className="dev-state__pulse" aria-hidden="true" />
            <span className="label label--signal">HOW THESE ARE BUILT</span>
          </p>
          <h2>Nothing here is a package price.</h2>
          <p>
            A solution is a starting position, not a quotation. Its core layers are what that objective usually
            requires; its optional layers are what sometimes does. You are not expected to need all of it, and the
            Composer will show you which parts a stated need actually resolves to.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
            <Link href="/build" className="action action--primary">
              Open the Composer
              <span className="action-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link href="/contact?requestType=solution" className="action">
              Describe your situation
            </Link>
          </div>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Prefer to describe it in your own words?"
          body="The Composer reads a plain description of the problem and resolves it against the same registries these solutions are built from. It will not estimate price, duration or outcome."
          href="/build"
          action="Tell us what you need"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Composer" href="/build" />
        </div>
      </section>
    </main>
  );
}
