'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  readSentinelLanguage,
  subscribeSentinelQuiet,
} from '@/components/identity/sentinel-preferences';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import type { SiteLanguage } from '@/lib/i18n/languages';

/**
 * Subscribing to the language preference.
 *
 * Both the public-site header and the Sentinel guide read this same store, so
 * the subscription lives here once. Two components each writing their own
 * `useSyncExternalStore` call produced two copies of the same expression and
 * two places to keep the server snapshot in step.
 *
 * The server snapshot is always English: the stored preference exists only in
 * this browser, and rendering it during SSR would make the first paint disagree
 * with the markup.
 */
export function useSiteLanguage(): SiteLanguage {
  return useSyncExternalStore(subscribeSentinelQuiet, readSentinelLanguage, () => 'en');
}

/**
 * Translator bound to the active language. Memoised so it stays a stable prop
 * and does not re-render consumers on every unrelated render.
 */
export function useSiteCopy(): (source: string) => string {
  const language = useSiteLanguage();
  return useCallback((source: string) => translatedSiteCopy(source, language), [language]);
}