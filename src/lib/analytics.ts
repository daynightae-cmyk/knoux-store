/**
 * Analytics event surface.
 *
 * KNOuX ships no analytics provider. This module is the single place where
 * interaction events are named, so a provider can be attached later without
 * scattering `track()` calls across components or inventing tracking for
 * things that are not implemented.
 *
 * Events are queued onto a small in-memory buffer and mirrored to
 * `window.dataLayer` only when something else has already defined it. Nothing
 * is sent anywhere by default and no visitor data leaves the page.
 */

export type AnalyticsEvent =
  | { type: 'search_performed'; query: string; resultCount: number; surface: 'command' | 'finder' | 'in-page' }
  | { type: 'search_result_opened'; id: string; kind: string; division: string }
  | { type: 'product_opened'; id: string; slug: string }
  | { type: 'product_node_focused'; id: string; method: 'pointer' | 'keyboard' }
  | { type: 'division_opened'; division: string; route: string }
  | { type: 'registry_filtered'; registry: string; filter: string; count: number }
  | { type: 'composer_started'; preset?: string }
  | { type: 'composer_item_added'; id: string; division: string }
  | { type: 'composer_item_removed'; id: string; division: string }
  | { type: 'solution_opened'; slug: string }
  | { type: 'budget_stated'; currency: string; band: string }
  | { type: 'request_started'; requestType: string; entryRoute: string }
  | { type: 'request_submitted'; requestType: string; itemCount: number; delivered: boolean };

export type AnalyticsPayload = Extract<AnalyticsEvent, { type: AnalyticsEvent['type'] }> extends never
  ? never
  : Record<string, unknown>;

type Buffered = { event: AnalyticsEvent['type']; at: number; data: Record<string, unknown> };

const BUFFER_LIMIT = 60;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function buffer(): Buffered[] {
  if (typeof window === 'undefined') return [];
  const store = window as Window & { __knouxEvents?: Buffered[] };
  store.__knouxEvents ??= [];
  return store.__knouxEvents;
}

/** Last recorded events. Exposed for verification, not for user-facing copy. */
export function recordedEvents(): readonly Buffered[] {
  return buffer();
}

export function track(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  const { type, ...data } = event;
  const entry: Buffered = { event: type, at: Date.now(), data };

  const events = buffer();
  events.push(entry);
  if (events.length > BUFFER_LIMIT) events.shift();

  // Mirror into a tag manager only if the site already loads one.
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: type, ...data });
}
