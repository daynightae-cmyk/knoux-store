'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { GUIDE_LANGUAGES, GUIDE_LANGUAGE_IDS, type GuideLanguage } from '@/lib/sentinel/languages';
import { readSentinelLanguage, saveSentinelLanguage, subscribeSentinelQuiet } from '@/components/identity/sentinel-preferences';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import styles from './SiteLanguage.module.css';

export function useSiteLanguage(): GuideLanguage {
  return useSyncExternalStore(subscribeSentinelQuiet, readSentinelLanguage, () => 'en');
}
export function useSiteCopy() {
  const language = useSiteLanguage();
  return useCallback((source: string) => translatedSiteCopy(source, language), [language]);
}
export function SiteLanguagePicker() {
  const language = useSiteLanguage(), label = translatedSiteCopy('Language', language);
  return <label className={styles.picker}><span className={styles.hidden}>{label}</span><select aria-label={label} value={language} onChange={event => saveSentinelLanguage(event.target.value as GuideLanguage)}>{GUIDE_LANGUAGE_IDS.map(id => <option key={id} value={id}>{GUIDE_LANGUAGES[id].label}</option>)}</select></label>;
}
