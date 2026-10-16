'use client';

import { useSyncExternalStore } from 'react';
import {
  readSentinelLanguage,
  subscribeSentinelQuiet,
} from '@/components/identity/sentinel-preferences';
import type { SiteLanguage } from '@/lib/i18n/languages';

/**
 * Subscribing to the language preference.
 *
 * The public-site document, the header picker and the Sentinel guide all read
 * this same store, so the subscription lives here once. Three components each
 * writing their own `useSyncExternalStore` call produced three copies of the
 * same expression and three places to keep the server snapshot in step.
 *
 * The server snapshot is always English: the stored preference exists only in
 * this browser, and rendering it during SSR would make the first paint disagree
 * with the markup.
 */
export function useSiteLanguage(): SiteLanguage {
  return useSyncExternalStore(subscribeSentinelQuiet, readSentinelLanguage, () => 'en');
}