'use client';

/**
 * Command Center — Community Hub.
 *
 * The flagship screen, and the one with the most care taken over what it refuses
 * to do.
 *
 * Facebook does not expose a general Groups API for arbitrary group publishing
 * or member extraction. Rather than model that limitation away, the product
 * models it honestly: discovery ranks public communities by explainable
 * relevance, and distribution is a *manual-assisted queue*. KNOuX prepares the
 * post and the destination; a person opens the group, posts, and marks it done.
 *
 * What this screen never does: read a member list, hold a private URL, infer a
 * contact detail, or claim a community is receptive. Promotion policy and admin
 * approval are separate fields precisely because a large group is not a
 * reachable one.
 */

import { useMemo, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  DemoNotice,
  EmptyState,
  OriginLabel,
  Pane,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';

import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_GEOGRAPHY,
  COMMUNITY_PLATFORMS,
  citiesFor,
  platformById,
} from '@/data/growth/taxonomy';
import { scoreCommunity } from '@/lib/growth/intelligence/adapters/local';
import type { Community, CountryCode } from '@/lib/growth/types';
import type { RelevanceBand } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

/** Paging is deliberate: a full community registry rendered at once is thousands of DOM nodes. */
const PAGE_SIZE = 9;

export default function CommunitiesPage() {
  return <Communities />;
}

function Communities() {
  const { records } = useWorkspace();
  const area = areaBySlug('communities')!;
  const lists = records.distributionLists;

  const [country, setCountry] = useState<CountryCode>('AE');
  const [city, setCity] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [page, setPage] = useState(0);

  const terms = useMemo(
    () => query.split(/[\s,]+/).map((term) => term.trim()).filter(Boolean),
    [query],
  );

  const scored = useMemo(() => {
    return records.communities.map((community) => ({
      community,
      score: scoreCommunity(community, terms, city),
    }))
      .filter((entry) => entry.community.country === country)
      .filter((entry) => (city ? entry.community.city === city : true))
      .filter((entry) => (category ? entry.community.category === category : true))
      .filter((entry) => (platform ? entry.community.platform === platform : true))
      .filter((entry) => (terms.length > 0 ? entry.score > 0 : true))
      .sort((a, b) => b.score - a.score);
  }, [country, city, category, platform, terms, records.communities]);

  const bands: Record<RelevanceBand, typeof scored> = {
    HIGH: scored.filter((entry) => entry.score >= 60),
    MEDIUM: scored.filter((entry) => entry.score >= 30 && entry.score < 60),
    LOW: scored.filter((entry) => entry.score < 30),
  };

  const visible = scored.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(scored.length / PAGE_SIZE));

  const cities = citiesFor(country);
  const facebook = platformById('facebook');

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'community-hub',
        subjectId: city || country,
        inputs: { keywords: terms, city, country, category, platform },
        contextLine: `Community Hub · ${scored.length} record(s) in ${country.toUpperCase()}${city ? ` / ${city}` : ''}`,
      }}
      facts={[
        { label: 'High relevance', value: String(bands.HIGH.length) },
        { label: 'Distribution lists', value: String(lists.length) },
      ]}
    >
      <div className={styles.commandFilters ?? ''}>
        <Field label="Search">
          <input
            className={styles.ccFieldControl ?? ''}
            value={query}
            placeholder="swimming, parents, jobs…"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </Field>

        <Field label="Country">
          <select
            className={styles.ccFieldControl ?? ''}
            value={country}
            onChange={(event) => {
              setCountry(event.target.value as CountryCode);
              setCity('');
              setPage(0);
            }}
          >
            {COMMUNITY_GEOGRAPHY.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="City">
          <select
            className={styles.ccFieldControl ?? ''}
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All cities</option>
            {cities.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category">
          <select
            className={styles.ccFieldControl ?? ''}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All categories</option>
            {COMMUNITY_CATEGORIES.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Platform">
          <select
            className={styles.ccFieldControl ?? ''}
            value={platform}
            onChange={(event) => {
              setPlatform(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All platforms</option>
            {COMMUNITY_PLATFORMS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Section title="Platform capability" note="A platform limitation is not a missing feature.">
        <div className={styles.commandGrid2 ?? ''}>
          <Pane title="Automated community posting">
            <p className={styles.ccPaneBody ?? ''}>
              Facebook exposes no general Groups API for publishing into arbitrary groups. KNOuX will
              not pretend otherwise, and there is no automated path planned.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <CapabilityBadge state="BLOCKED" />
              <CodeBadge tone="info">MANUAL QUEUE</CodeBadge>
            </div>
          </Pane>

          <Pane title="What KNOuX does instead">
            <ul className={styles.ccPaneList ?? ''}>
              <li>1. Ranks public communities by explainable relevance.</li>
              <li>2. Prepares the post and the destination list.</li>
              <li>3. An operator opens the group and posts.</li>
              <li>4. The operator marks it posted. That is recorded in the audit trail.</li>
            </ul>
            <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 6, fontSize: 12 }}>
              No member list is read. No private URL is stored. No message is sent by KNOuX.
            </p>
          </Pane>
        </div>
      </Section>

      <Section
        title="Relevance"
        note="Scored on stored fields: category and tag overlap, city, visibility, promotion policy. Explainable by design."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <CodeBadge tone="info">HIGH {bands.HIGH.length}</CodeBadge>
          <CodeBadge>MEDIUM {bands.MEDIUM.length}</CodeBadge>
          <CodeBadge>LOW {bands.LOW.length}</CodeBadge>
        </div>

        <DemoNotice>
          These are invented records showing the shape of a community record. No group named here
          exists, no URL resolves, and no admin contact is real. Relevance is computed from stored
          fields — it is not a judgement that a community will accept promotion.
        </DemoNotice>
      </Section>

      <Section
        title={`Communities (${scored.length})`}
        note={
          facebook
            ? `${facebook.mechanism}`
            : undefined
        }
      >
        {visible.length === 0 ? (
          <EmptyState title="No community records match">
            Nothing is recorded for this combination. A zero result means the registry has no record,
            not that no such community exists. Operator-supplied imports are the next step.
          </EmptyState>
        ) : (
          <>
            <div className={styles.commandGrid3 ?? ''}>
              {visible.map(({ community, score }) => (
                <CommunityCard key={community.id} community={community} score={score} />
              ))}
            </div>

            {pages > 1 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
                <button
                  type="button"
                  className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span className={styles.ccMetricMeta ?? ''}>
                  Page {page + 1} of {pages}
                </span>
                <button
                  type="button"
                  className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                  onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
                  disabled={page >= pages - 1}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </Section>

      <Section
        title="Distribution lists"
        note="A list is many destinations. Actions are manual-assisted and recorded."
      >
        {lists.length === 0 ? (
          <EmptyState title="No distribution lists">
            A distribution list collects community destinations and prepares the post for an operator
            to distribute manually.
          </EmptyState>
        ) : (
          <div className={styles.commandGrid2 ?? ''}>
            {lists.map((list) => (
              <Pane key={list.id} title={`${list.name} · ${list.communityIds.length} destinations`}>
                {list.description ? (
                  <p className={styles.ccPaneBody ?? ''}>{list.description}</p>
                ) : null}
                <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''} style={{ marginTop: 6 }}>
                  <table className={styles.ccTable ?? ''}>
                    <thead>
                      <tr>
                        <th scope="col">Destination</th>
                        <th scope="col">Status</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.entries.map((entry) => {
                        const community = records.communities.find(
                          (candidate) => candidate.id === entry.communityId,
                        );
                        return (
                          <tr key={entry.id}>
                            <td>{community?.name ?? entry.communityId}</td>
                            <td>
                              <CodeBadge
                                tone={
                                  entry.status === 'POSTED'
                                    ? 'live'
                                    : entry.status === 'NEEDS_APPROVAL'
                                      ? 'warn'
                                      : entry.status === 'SKIPPED'
                                        ? 'bad'
                                        : 'info'
                                }
                              >
                                {entry.status.replace(/_/g, ' ')}
                              </CodeBadge>
                            </td>
                            <td>
                              {entry.status === 'QUEUED' ? (
                                <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                  <button type="button" className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}>
                                    Copy Post
                                  </button>
                                  <button type="button" className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}>
                                    Open Destination
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                                    disabled
                                    title="Requires an operator action in the group. KNOuX cannot post here."
                                  >
                                    Mark Posted
                                  </button>
                                </span>
                              ) : entry.status === 'NEEDS_APPROVAL' ? (
                                <span className={styles.ccMetricMeta ?? ''}>
                                  Held. The community requires admin approval.
                                </span>
                              ) : entry.skipReason ? (
                                <span className={styles.ccMetricMeta ?? ''}>{entry.skipReason}</span>
                              ) : (
                                <span className={styles.ccMetricMeta ?? ''}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Pane>
            ))}
          </div>
        )}
      </Section>

      <p className={styles.ccFoot ?? ''}>
        <strong>Discovery is lawful-only.</strong> KNOuX does not scrape member lists, private
        profiles, hidden emails or closed content. Discovery is operator-supplied and imported.
        Each record shows its own stored provenance.
      </p>
    </CommandShell>
  );
}

function CommunityCard({ community, score }: { community: Community; score: number }) {
  const band: RelevanceBand = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  return (
    <article className={styles.ccCommunity ?? ''}>
      <div className={styles.ccCommunityHead ?? ''}>
        <div style={{ minWidth: 0 }}>
          <h3 className={styles.ccCommunityName ?? ''}>{community.name}</h3>
          <p className={styles.ccCommunityWhere ?? ''}>
            {community.region} · {community.city} · {community.category}
          </p>
        </div>
        <CodeBadge tone={band === 'HIGH' ? 'live' : band === 'MEDIUM' ? 'info' : 'neutral'}>
          {band} {score}
        </CodeBadge>
      </div>

      <div className={styles.ccCommunityFacts ?? ''}>
        <span>{community.platform}</span>
        <span>{community.visibility}</span>
        <span>PROMOTION {community.promotionPolicy.replace(/_/g, ' ')}</span>
        {community.adminApprovalRequired ? <span>ADMIN APPROVAL</span> : null}
        <span>ACTIVITY {community.activityEstimate}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <CodeBadge tone={community.verificationStatus === 'NEEDS_REVIEW' ? 'warn' : 'neutral'}>
          {community.verificationStatus.replace(/_/g, ' ')}
        </CodeBadge>
        <OriginLabel origin={community.origin} />
      </div>

      {community.notes ? (
        <p style={{ fontSize: 12, color: 'var(--cc-ink-4)', margin: 0, lineHeight: 1.5 }}>
          {community.notes}
        </p>
      ) : null}

      <div className={styles.ccCommunityTags ?? ''}>
        {community.relevanceTags.slice(0, 4).map((tag) => (
          <span key={tag} className={styles.ccTag ?? ''}>
            {tag}
          </span>
        ))}
      </div>

      <div className={styles.ccCommunityFacts ?? ''}>
        <span>
          LAST CHECKED {community.lastCheckedAt ? community.lastCheckedAt.slice(0, 10) : 'NEVER'}
        </span>
      </div>

      <div className={styles.ccCommunityActions ?? ''}>
        <button type="button" className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}>
          Add to list
        </button>
        <button
          type="button"
          className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
          disabled={!community.publicUrl}
          title={community.publicUrl ? 'Open the public page' : 'No public URL is stored for this record'}
        >
          Open
        </button>
        <button
          type="button"
          className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
          title="Refreshes stored public metadata only. Reads nothing behind a login."
        >
          Verify
        </button>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.ccField ?? ''}>
      <span className={styles.ccFieldLabel ?? ''}>{label}</span>
      {children}
    </label>
  );
}
