import { normalizeGuideLanguage, type GuideLanguage } from '@/lib/sentinel/languages';

export const SENTINEL_PREFERENCES_EVENT = 'knoux:sentinel-preferences';
export const SENTINEL_GUIDE_EVENT = 'knoux:sentinel-guide';
const KEY = 'knoux.sentinel.quiet';
const LANGUAGE_KEY = 'knoux.sentinel.language';
let sessionQuiet = false;
export function isSentinelQuiet(): boolean {
  try { const stored=localStorage.getItem(KEY);return stored===null?sessionQuiet:stored==='true'; } catch { return sessionQuiet; }
}
export function setSentinelQuiet(quiet: boolean) {
  sessionQuiet = quiet;
  try { localStorage.setItem(KEY, String(quiet)); } catch { /* Session-only preference still works. */ }
  document.documentElement.dataset.sentinelQuiet = String(quiet);
  window.dispatchEvent(new CustomEvent(SENTINEL_PREFERENCES_EVENT, { detail: { quiet } }));
}
export function subscribeSentinelQuiet(callback: () => void) {
  window.addEventListener(SENTINEL_PREFERENCES_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(SENTINEL_PREFERENCES_EVENT, callback); window.removeEventListener('storage', callback); };
}

/**
 * The visitor's language.
 *
 * One stored value is shared by the site picker and the Sentinel guide, so the
 * two can never disagree about the language the visitor is reading. The value is
 * normalised on read, which means a preference written by an older build, or a
 * full BCP 47 tag such as `ur-PK`, resolves to a real supported language instead
 * of being silently dropped back to English.
 */
let sessionLanguage: GuideLanguage = 'en';
export function readSentinelLanguage(): GuideLanguage {
  try { const stored=localStorage.getItem(LANGUAGE_KEY);return stored===null?sessionLanguage:normalizeGuideLanguage(stored,sessionLanguage); } catch { return sessionLanguage; }
}
export function saveSentinelLanguage(language: GuideLanguage) {
  sessionLanguage = normalizeGuideLanguage(language);
  try { localStorage.setItem(LANGUAGE_KEY, sessionLanguage); } catch { /* Optional preference. */ }
  window.dispatchEvent(new Event(SENTINEL_PREFERENCES_EVENT));
}

export type SentinelOptions = { tips: boolean; reduced: boolean; visible: boolean; sound: boolean };
export const DEFAULT_SENTINEL_OPTIONS: SentinelOptions = { tips: true, reduced: false, visible: true, sound: true };
let options = DEFAULT_SENTINEL_OPTIONS;
export function readSentinelOptions(): SentinelOptions {
  try {
    const raw=localStorage.getItem('knoux.sentinel.options');if(raw===null)return options;const saved=JSON.parse(raw);
    return Object.fromEntries(Object.entries(DEFAULT_SENTINEL_OPTIONS).map(([key,value]) => [key,typeof saved[key] === 'boolean' ? saved[key] : value])) as SentinelOptions;
  } catch { return options; }
}
export function sentinelPreferenceSnapshot() { return JSON.stringify({ ...readSentinelOptions(), quiet: isSentinelQuiet(), language: readSentinelLanguage() }); }
export const sentinelServerSnapshot = () => JSON.stringify({ ...DEFAULT_SENTINEL_OPTIONS, quiet: false, language: 'en' });
export function setSentinelOptions(next: Partial<SentinelOptions>) {
  options = { ...readSentinelOptions(), ...next };
  try { localStorage.setItem('knoux.sentinel.options',JSON.stringify(options)); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(SENTINEL_PREFERENCES_EVENT));
}
export function resetSentinelPreferences() { setSentinelOptions(DEFAULT_SENTINEL_OPTIONS); setSentinelQuiet(false); saveSentinelLanguage('en'); }
