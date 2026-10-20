'use client';

import { useEffect } from 'react';
import { SITE_LANGUAGES, SITE_LANGUAGE_IDS, siteDirection } from '@/lib/i18n/languages';
import { saveSentinelLanguage } from '@/components/identity/sentinel-preferences';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import type { SiteLanguage as SiteLanguageId } from '@/lib/i18n/languages';
import styles from './SiteLanguage.module.css';

export { useSiteLanguage };

/**
 * Everything the document itself has to say about the chosen language.
 *
 * Two things were previously separate components that each subscribed to the
 * same preference: one reconciled `<html lang>`/`<html dir>`, the other rendered
 * the translated skip link. They are the same concern at the same level — a
 * statement about the document rather than about anything visible — so they are
 * one component now, reading the language once.
 *
 * Merging them also keeps the skip link unambiguously first: the effect cannot
 * reorder markup, and the anchor is the only node this component renders.
 *
 * The layout ships `lang="en"` so the document is valid and correctly described
 * before any script runs. The effect corrects both attributes once the stored
 * preference is read, which is also what makes Urdu render right-to-left instead
 * of inheriting a left-to-right box model.
 */
export function SiteLanguageDocument() {
  const language = useSiteLanguage();

  useEffect(() => {
    document.documentElement.lang = SITE_LANGUAGES[language].tag;
    document.documentElement.dir = siteDirection(language);
  }, [language]);

  return (
    <a className="skip-link" href="#main-content">
      {translatedSiteCopy('Skip to content', language)}
    </a>
  );
}

/**
 * Language picker.
 *
 * A labelled native `<select>` rather than a custom listbox: it is keyboard
 * operable, screen-reader labelled and platform-native on mobile with no extra
 * code. The visible label is translated; the accessible name comes from
 * `aria-label` so it stays meaningful in the active language.
 *
 * Independent of `SiteLanguageDocument`: the picker is visible chrome in the
 * header, this is markup around the page, and neither is nested in the other.
 */
export function SiteLanguagePicker() {
  const language = useSiteLanguage();
  const label = translatedSiteCopy('Language', language);
  return (
    <label className={styles.picker}>
      <span className={styles.hidden}>{label}</span>
      <select
        aria-label={label}
        value={language}
        onChange={(event) => saveSentinelLanguage(event.target.value as SiteLanguageId)}
      >
        {SITE_LANGUAGE_IDS.map((id) => (
          <option key={id} value={id}>
            {SITE_LANGUAGES[id].label}
          </option>
        ))}
      </select>
    </label>
  );
}