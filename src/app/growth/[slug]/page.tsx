import { notFound } from 'next/navigation';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, IndexRow } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { growthChannelBySlug, growthChannelsDetail, growthModulesFor } from '@/data/growth';
import { entityById } from '@/data/composer-rules';
import { TrackOnView } from '@/components/TrackOnView';

export function generateStaticParams() {
  return growthChannelsDetail.map((channel) => ({ slug: channel.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = growthChannelBySlug(slug);
  if (!channel) return pageMetadata('Channel not found', 'This growth channel does not exist.', '/growth');
  return pageMetadata(channel.name, `${channel.tagline}. ${channel.statement.split('.')[0]}`, `/growth/${channel.slug}`);
}

export default async function GrowthChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = growthChannelBySlug(slug);
  if (!channel) notFound();

  const modules = growthModulesFor(channel.slug);
  const related = channel.relatedEntityIds
    .map((id) => entityById.get(id))
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
  const others = growthChannelsDetail.filter((entry) => entry.id !== channel.id);

  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'growth', route: `/growth/${channel.slug}` }} />
      <PageIntro index={channel.code} label="Growth" title={channel.name.replace(/ \([^)]*\)/, '')} italic="channel." description={channel.tagline} />
      <SignalRail division="growth" path={`/growth/${channel.slug}`} />

      <section className="shell" style={{ paddingTop: 'clamp(56px, 7vw, 110px)', paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="dossier">
          <div className="dossier__main">
            <div className="dossier__section">
              <span className="label label--signal">STATEMENT</span>
              <p className="dossier__prose" style={{ fontSize: 18, marginTop: 16 }}>
                {channel.statement}
              </p>
            </div>

            <div className="dossier__section">
              <h2>What KNOuX produces</h2>
              <span className="label">ARTEFACTS, NOT OUTCOMES</span>
              <ul className="fact-list" style={{ marginTop: 20 }}>
                {channel.outputs.map((output) => (
                  <li key={output}>{output}</li>
                ))}
              </ul>
            </div>

            <div className="dossier__section">
              <h2>Modules in this channel</h2>
              <div className="registry" style={{ marginTop: 20 }}>
                {modules.map((module) => (
                  <div key={module.id} className="registry-row" style={{ gridTemplateColumns: '44px minmax(0,1fr) 90px' }}>
                    <span className="registry-row__id">{module.code}</span>
                    <span className="registry-row__name">
                      {module.name}
                      <small>{module.statement}</small>
                    </span>
                    <span className="registry-row__compat">{module.setup ? 'SETUP' : 'ONGOING'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="dossier__side">
            <div className="dossier-card">
              <span className="dossier-card__label">REQUIRED FROM THE CLIENT</span>
              <ul className="limit-list">
                {channel.prerequisites.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {related.length > 0 ? (
              <div className="dossier-card">
                <span className="dossier-card__label">PAIRS WITH</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {related.map((entity) => (
                    <a
                      key={entity.id}
                      href={entity.route ?? '#'}
                      className="action"
                      style={{ padding: '11px 14px', fontSize: 9 }}
                    >
                      {entity.name}
                      <span className="action-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="dossier-card">
              <span className="dossier-card__label">NO PROMISES</span>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--muted)', margin: 0 }}>
                This page states no target metric, benchmark, minimum spend or expected return. Those depend on
                market, offer, budget and history, and are discussed against a real scope.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <span className="label label--signal">OTHER CHANNELS</span>
        <div className="index-rows" style={{ marginTop: 22 }}>
          {others.map((entry) => (
            <IndexRow key={entry.id} index={entry.index} name={entry.name} meta={entry.tagline} href={`/growth/${entry.slug}`} />
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Ready to acquire customers for it?"
          body="Campaigns need somewhere to land and something to say. KNOuX Web builds the destination; KNOuX Creative produces the assets campaigns carry."
          href="/web"
          action="KNOuX Web"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Back to" name="Growth overview" href="/growth" />
        </div>
      </section>
    </main>
  );
}
