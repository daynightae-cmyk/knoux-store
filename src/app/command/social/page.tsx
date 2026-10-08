'use client';

/**
 * Command Center — Social, and the content calendar.
 *
 * The calendar is month and week aware and filters by client, platform and status.
 *
 * The important constraint: scheduling here is a *record of intent*. Nothing in
 * this build publishes, and `PUBLISHED` is a status a content item can only reach
 * through an approved connector call — so the calendar shows what is planned and
 * makes the distinction from what is live obvious rather than leaving it to a
 * reader to assume.
 */

import { useMemo, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, EmptyState, OriginLabel, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';

import { PLATFORM_IDS, type ContentItem, type ContentStatus, type PlatformId } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_TONE: Record<ContentStatus, 'live' | 'info' | 'warn' | 'bad' | 'neutral'> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  PUBLISHED: 'live',
  FAILED: 'bad',
  APPROVAL_REQUIRED: 'warn',
};

export default function SocialPage() {
  return <Social />;
}

function Social() {
  const { records, activeClient, clients, setActiveClientId } = useWorkspace();
  const area = areaBySlug('social')!;
  const items = records.content;

  const [clientFilter, setClientFilter] = useState<string>(activeClient.id);
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const first = items.find((item) => item.scheduledFor)?.scheduledFor;
    return first ? new Date(first) : new Date();
  });

  const visible = items
    .filter((item) => (platform === 'all' ? true : item.platforms.includes(platform as PlatformId)))
    .filter((item) => (status === 'all' ? true : item.status === status));

  const grid = useMemo(() => buildMonthGrid(monthAnchor, visible), [monthAnchor, visible]);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'social',
        contextLine: `${activeClient.name} · ${items.length} content item(s) · ${items.filter((i) => i.status === 'APPROVAL_REQUIRED').length} need approval`,
      }}
      facts={[
        { label: 'Scheduled', value: String(items.filter((i) => i.status === 'SCHEDULED').length) },
        { label: 'Published', value: String(items.filter((i) => i.status === 'PUBLISHED').length) },
      ]}
    >
      <div className={styles.commandFilters ?? ''}>
        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Client</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={clientFilter}
            onChange={(event) => {
              setClientFilter(event.target.value);
              setActiveClientId(event.target.value);
            }}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Platform</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            <option value="all">All platforms</option>
            {PLATFORM_IDS.map((entry) => (
              <option key={entry} value={entry}>
                {entry.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Status</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'APPROVAL_REQUIRED'] as ContentStatus[]).map(
              (entry) => (
                <option key={entry} value={entry}>
                  {entry.replace(/_/g, ' ')}
                </option>
              ),
            )}
          </select>
        </label>

        <div className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Month</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
              onClick={() => setMonthAnchor(shiftMonth(monthAnchor, -1))}
            >
              Prev
            </button>
            <span
              className={styles.ccMetricMeta ?? ''}
              style={{ alignSelf: 'center', minWidth: 88, textAlign: 'center' }}
            >
              {monthAnchor.toISOString().slice(0, 7)}
            </span>
            <button
              type="button"
              className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
              onClick={() => setMonthAnchor(shiftMonth(monthAnchor, 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Section
        title="Calendar"
        note="Scheduling records intent. Nothing is published by this build."
      >
        {visible.length === 0 ? (
          <EmptyState title="Nothing scheduled for this filter" />
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable calendar" style={{ overflowX: 'auto' }}>
            <div className={styles.ccCalendar ?? ''} style={{ minWidth: 640 }}>
              {WEEKDAYS.map((day) => (
                <div key={day} className={styles.ccCalendarDow ?? ''}>
                  {day}
                </div>
              ))}
              {grid.map((cell) => (
                <div
                  key={cell.key}
                  className={`${styles.ccCalendarDay ?? ''} ${
                    cell.inMonth ? '' : (styles.ccCalendarDayEmpty ?? '')
                  } ${cell.key === todayKey ? (styles.ccCalendarDayToday ?? '') : ''}`}
                >
                  <span className={styles.ccCalendarDayNum ?? ''}>{Number(cell.key.slice(8, 10))}</span>
                  {cell.items.map((item) => (
                    <span
                      key={item.id}
                      className={`${styles.ccCalendarEntry ?? ''} ${calendarTone(item.status)}`}
                      title={`${item.platforms.join(', ')} — ${item.status}`}
                    >
                      {item.copy.slice(0, 70)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Content items" note="AI-generated items are drafts until a human edits or accepts them.">
        {visible.length === 0 ? (
          <EmptyState title="No content items" />
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Copy</th>
                  <th scope="col">Platforms</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col">Status</th>
                  <th scope="col">Author</th>
                  <th scope="col">Origin</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td style={{ maxWidth: 420 }}>
                      {item.copy}
                      {item.aiGenerated ? (
                        <div style={{ marginTop: 4 }}>
                          <CodeBadge tone="info">AI GENERATED</CodeBadge>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.platforms.map((entry) => (
                          <CodeBadge key={entry}>{entry.replace(/_/g, ' ')}</CodeBadge>
                        ))}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                      {item.scheduledFor ? item.scheduledFor.slice(0, 10) : '—'}
                    </td>
                    <td>
                      <CodeBadge tone={STATUS_TONE[item.status]}>{item.status.replace(/_/g, ' ')}</CodeBadge>
                    </td>
                    <td className={styles.ccTableAbsent ?? ''}>{item.author}</td>
                    <td>
                      <OriginLabel origin={item.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          Demo content. No item here has been published to any platform, and the Publish control is
          disabled because no account is connected.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}

/* -------------------------------------------------------------- calendar */

type CalendarCell = { key: string; inMonth: boolean; items: ContentItem[] };

/**
 * Builds a six-week grid starting Monday.
 *
 * Padded to whole weeks so the grid does not reflow between months, which is what
 * stops a calendar from jumping while an operator pages through it.
 *
 * `items` is passed in rather than re-read: the caller already filtered by client,
 * platform and status, and a builder that fetched its own data would quietly
 * ignore those filters.
 */
function buildMonthGrid(anchor: Date, items: ContentItem[]): CalendarCell[] {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - mondayOffset));

  const byDay = new Map<string, ContentItem[]>();
  for (const item of items) {
    const key = item.scheduledFor?.slice(0, 10);
    if (!key) continue;
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(item);
  }

  const cells: CalendarCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getTime() + index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    cells.push({ key, inMonth: date.getUTCMonth() === month, items: byDay.get(key) ?? [] });
  }
  return cells;
}

function shiftMonth(anchor: Date, delta: number): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta, 1));
}

function calendarTone(status: ContentStatus): string {
  switch (status) {
    case 'SCHEDULED':
      return styles.ccCalendarEntryScheduled ?? '';
    case 'APPROVAL_REQUIRED':
    case 'FAILED':
      return styles.ccCalendarEntryApproval ?? '';
    default:
      return styles.ccCalendarEntryDraft ?? '';
  }
}