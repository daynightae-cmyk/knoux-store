import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, RevealGroup, SystemIndex, IndexRow } from '@/components/blocks';
import { BudgetScope, GrowthFlow } from '@/components/GrowthFlow';
import { pageMetadata } from '@/lib/metadata';
import { growthChannelsDetail, growthModules } from '@/data/growth';
import { TrackOnView } from '@/components/TrackOnView';
import { SignalField } from '@/components/SpatialExperiences';

export const metadata = pageMetadata(
  'Growth',
  'KNOuX Growth: campaign strategy, account and campaign setup, conversion tracking, creative preparation, optimisation and reporting across Google, Meta, social, content and SEO.',
  '/growth',
);

export default function GrowthPage() {
  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'growth', route: '/growth' }} />
      <PageIntro
        index="04"
        label="Growth"
        title="Findable,"
        italic="then chosen."
        description="Campaign architecture, measurement and content. No target metrics, minimum spends or return claims appear on this site, because none of those are knowable before a scope is agreed."
      />
      <SignalRail division="growth" path="/growth" />

      <section className="shell" style={{ paddingTop: 'clamp(60px, 7vw, 120px)' }}><SignalField /></section>

      <section className="shell" id="flow" style={{ paddingTop: 'clamp(56px, 7vw, 110px)', paddingBottom: 'clamp(70px, 8vw, 130px)', scrollMarginTop: 80 }}>
        <RevealGroup>
          <div className="block-head">
            <div>
              <span className="label label--signal">ENTRY</span>
              <h2 className="block-head__title">
                Three questions
                <br />
                before anything else.
              </h2>
            </div>
            <p className="block-head__aside">
              Answering these narrows the work to real service modules. It does not produce a quote, a plan or a
              projection.
            </p>
          </div>
        </RevealGroup>
        <div style={{ marginTop: 20 }}>
          <GrowthFlow />
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <BudgetScope />
      </section>

      <RevealGroup>
        <SystemIndex
          eyebrow="CHANNELS"
          title={<>Five channels,<br />one method.</>}
          statement="Each channel is a distinct discipline with its own prerequisites and outputs. The method underneath them is shared."
        >
          <div className="index-rows">
            {growthChannelsDetail.map((channel) => (
              <IndexRow
                key={channel.id}
                index={channel.index}
                name={channel.name}
                meta={channel.tagline}
                metaSecondary={`${channel.moduleIds.length} MODULES`}
                href={`/growth/${channel.slug}`}
              />
            ))}
          </div>
        </SystemIndex>
      </RevealGroup>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">SERVICE MODULES</span>
            <h2 className="block-head__title">
              What is
              <br />
              actually offered.
            </h2>
          </div>
          <p className="block-head__aside">
            Every module KNOuX intends to deliver, described by the work involved. Anything not on this list is
            not offered.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW SERVICE MODULE REGISTRY</summary><div className="registry" style={{ marginTop: 34 }}>
          <div className="registry-row" style={{ gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.2fr) 90px', borderBottomColor: '#3d3e43' }}>
            <span className="registry-row__id">ID</span>
            <span className="registry-row__name">Module</span>
            <span className="registry-row__purpose">Involves</span>
            <span className="label">Type</span>
          </div>
          {growthModules.map((module) => (
            <div key={module.id} className="registry-row" style={{ gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.2fr) 90px' }}>
              <span className="registry-row__id">{module.code}</span>
              <span className="registry-row__name">
                {module.name}
                <small>{module.statement}</small>
              </span>
              <span className="registry-row__purpose">{module.activities.slice(0, 3).join(' · ')}</span>
              <span className="registry-row__compat">{module.setup ? 'SETUP' : 'ONGOING'}</span>
            </div>
          ))}
        </div></details>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Need a landing experience to send the traffic to?"
          body="A campaign that lands on a generic page wastes the work that produced it. KNOuX Web builds the destination and KNOuX Creative produces the assets it needs."
          href="/web"
          action="KNOuX Web"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Creative" href="/creative" />
        </div>
      </section>
    </main>
  );
}
