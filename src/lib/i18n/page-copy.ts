'use client';

import { useCallback } from 'react';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import type { SiteLanguage } from '@/lib/i18n/languages';

/**
 * Page copy that a route owns, resolved against the site-wide language.
 *
 * The public site used to have two language systems. The site-wide one lives
 * in `site-copy.ts` and is driven by the header picker. PR #46 shipped a second
 * one — a local EN/AR toggle with its own state, its own button and its own
 * `dir` attribute — inside /growth, /wordpress and /signal.
 *
 * They were never reconciled, and the two disagreed on screen: the header
 * picker could set Arabic while the page body stayed English, the page body
 * forced `dir="ltr"` inside an RTL document, and a second language control
 * appeared in the content next to the one in the header.
 *
 * This module makes the site-wide store the only authority. A route keeps the
 * Arabic it already authored; the shared catalogue supplies Urdu when the same
 * string is published there; and English is the honest fallback when a string
 * has no authored translation at all. Nothing is machine-translated and no
 * language is invented.
 */
export type PageCopy = (english: string, arabic?: string) => string;

/**
 * Resolve one string for one language.
 *
 * The optional `arabic` argument is a route's own authored Arabic. It is used
 * when the shared catalogue has nothing for that string, and ignored when the
 * catalogue does, so a string published in both places resolves to one answer
 * instead of two.
 */
export function resolvePageCopy(language: SiteLanguage, english: string, arabic?: string): string {
  if (language === 'en') return english;
  if (language === 'ar') return arabic ?? translatedSiteCopy(english, 'ar');
  return translatedSiteCopy(english, language);
}

/**
 * The resolver bound to the active site language.
 *
 * The returned function is stable for as long as the language does not change,
 * so it can be used in dependency arrays without re-creating them on every
 * render.
 */
export function usePageCopy(): PageCopy {
  const language = useSiteLanguage();
  return useCallback(
    (english: string, arabic?: string) => resolvePageCopy(language, english, arabic),
    [language],
  );
}
