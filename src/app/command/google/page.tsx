'use client';

/**
 * Command Center — Google Presence.
 *
 * Business Profile, Maps visibility, calls, reviews, direction requests, Search
 * Console and GA4 in one place.
 *
 * The pattern to notice: a location with no reviews and no website clicks shows
 * "Not reported" in those cells rather than a zero. A new location genuinely has
 * no rating, and a zero rating would be a false statement about a business.
 */

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  DemoNotice,
  EmptyState,
  MetricCell,
  Pane,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';


import styles from '@/components/command/command.module.css';

export default function GooglePage() {
  return <GooglePresence />;
}

const GOOGLE_SURFACES = [
  { id: 'google_business', label: 'Business Profile', scopes: 'business.manage' },
  { id: 'google_ads', label: 'Google Ads', scopes: 'adwords' },
  { id: 'ga4', label: 'Analytics 4', scopes: 'analytics.readonly' },
  { id: 'search_console', label: 'Search Console', scopes: 'webmasters.readonly' },
  { id: 'youtube', label: 'YouTube', scopes: 'youtube.readonly' },
] as const;

function GooglePresence() {
  const { records, activeClient } = useWorkspace();
  const area = areaBySlug('google')!;
  const locations = records.locations;
  const connections = records.connections;

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'google-presence',
        contextLine: `${activeClient.name} · ${locations.length} location(s) · ${GOOGLE_SURFACES.length} Google surface(s)`,
      }}
      facts={[
        { label: 'Locations', value: String(locations.length) },
        { label: 'Linked profiles', value: String(locations.filter((l) => l.googleLocationId).length) },
      ]}
    >
      <Section
        title="Google surfaces"
        note="One connection flow where practical, with scopes kept separate so a grant can be narrow."
      >
        <div className={styles.commandGrid3 ?? ''}>
          {GOOGLE_SURFACES.map((surface) => {
            const record = connections.find((connection) => connection.platform === surface.id);
            return (
              <Pane key={surface.id} title={surface.label}>
                <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 12 }}>
                  Scope: <code>{surface.scopes}</code>
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {record ? <CapabilityBadge state={record.capabilityState} /> : <CodeBadge>NO RECORD</CodeBadge>}
                </div>
                {record?.lastError ? (
                  <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 12 }}>
                    {record.lastError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Configure
                </button>
              </Pane>
            );
          })}
        </div>
      </Section>

      <Section title="Locations" note="A Business Profile is location-scoped, so each branch is its own record.">
        {locations.length === 0 ? (
          <EmptyState title="No locations">
            Locations appear once a Business Profile account is connected and its locations are read.
          </EmptyState>
        ) : (
          <div className={styles.commandGrid2 ?? ''}>
            {locations.map((location) => (
              <article key={location.id} className={styles.ccPane ?? ''}>
                <span className={styles.ccPaneTitle ?? ''}>{location.name}</span>
                <p className={styles.ccPaneBody ?? ''} style={{ fontSize: 12 }}>
                  {location.addressLine} · {location.category ?? 'No category recorded'}
                </p>

                <div className={styles.commandGrid4 ?? ''} style={{ border: 0 }}>
                  <MetricCell label="Rating" value={location.rating ?? null} note="No reviews yet" />
                  <MetricCell label="Reviews" value={location.reviewCount ?? null} note="No reviews yet" />
                  <MetricCell label="Calls" value={location.calls ?? null} />
                  <MetricCell label="Website clicks" value={location.websiteClicks ?? null} />
                  <MetricCell label="Directions" value={location.directionRequests ?? null} />
                  <MetricCell label="Bookings" value={null} note="Not collected by this workspace" />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {location.googleLocationId ? (
                    <CodeBadge tone="live">PROFILE LINKED</CodeBadge>
                  ) : (
                    <CodeBadge tone="warn">PROFILE NOT LINKED</CodeBadge>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Maps visibility and keywords" note="Shown as architecture. No data source is connected.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">Would report</th>
                <th scope="col">Source</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Maps visibility (searches, views, requests)</td>
                <td>Search queries, discovery and brand searches</td>
                <td>Business Profile Performance API</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
              <tr>
                <td>Reviews</td>
                <td>Rating, count, and individual review text</td>
                <td>Business Profile API</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
              <tr>
                <td>Calls</td>
                <td>Call volume by hour and duration</td>
                <td>Business Profile / Google Ads</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
              <tr>
                <td>Direction requests</td>
                <td>Click-to-directions count</td>
                <td>Business Profile API</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
              <tr>
                <td>Keywords</td>
                <td>Impressions, clicks, CTR, position</td>
                <td>Search Console</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
              <tr>
                <td>Website clicks</td>
                <td>Profile-driven sessions</td>
                <td>Business Profile + GA4</td>
                <td>
                  <CodeBadge tone="warn">CONFIG REQUIRED</CodeBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          Location values are demo fixtures. Every Google surface above is in a CONFIG REQUIRED
          state, so nothing on this screen is a live Google value.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}