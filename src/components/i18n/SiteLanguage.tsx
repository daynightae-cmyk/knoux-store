'use client';

import { useEffect } from 'react';
import { SITE_LANGUAGES, SITE_LANGUAGE_IDS, siteDirection } from '@/lib/i18n/languages';
import { saveSentinelLanguage } from '@/components/identity/sentinel-preferences';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import { useSiteCopy, useSiteLanguage } from '@/lib/i18n/use-language';
import type { SiteLanguage as SiteLanguageId } from '@/lib/i18n/languages';
import styles from './SiteLanguage.module.css';

export { useSiteCopy, useSiteLanguage };

/**
 * Keeps `<html lang>` and `<html dir>` truthful.
 *
 * The layout ships `lang="en"` so the document is valid and correctly described
 * before any script runs. This effect corrects both attributes after the stored
 * preference is read, which is also what makes Urdu render right-to-left instead
 * of inheriting a left-to-right box model.
 */
export function SiteLanguageMetadata() {
  const language = useSiteLanguage();
  useEffect(() => {
    document.documentElement.lang = SITE_LANGUAGES[language].tag;
    document.documentElement.dir = siteDirection(language);
  }, [language]);
  return null;
}

/**
 * Language picker.
 *
 * A labelled native `<select>` rather than a custom listbox: it is keyboard
 * operable, screen-reader labelled and platform-native on mobile with no extra
 * code. The visible label is translated; the accessible name comes from
 * `aria-label` so it stays meaningful in the active language.
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

/**
 * Skip link.
 *
 * The layout previously rendered this as a literal string. Routing it through
 * the catalogue keeps the first thing a keyboard or screen-reader user reaches
 * available in the language they chose.
 */
export function LocalizedSkipLink() {
  const t = useSiteCopy();
  return (
    <a className="skip-link" href="#main-content">
      {t('Skip to content')}
    </a>
  );
}