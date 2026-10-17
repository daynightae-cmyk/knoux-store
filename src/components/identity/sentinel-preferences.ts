import { isSiteLanguage, type SiteLanguage } from '@/lib/i18n/languages';

export const SENTINEL_PREFERENCES_EVENT = 'knoux:sentinel-preferences';
const KEY = 'knoux.sentinel.quiet';
const LANGUAGE_KEY = 'knoux.sentinel.language';
let sessionQuiet = false;
export function isSentinelQuiet(): boolean {
  try { const stored = localStorage.getItem(KEY); return stored === null ? sessionQuiet : stored === 'true'; } catch { return sessionQuiet; }
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
 * Previously a bare `'en' | 'ar'` pair compared literally against storage. It is
 * now routed through the shared language authority so the public site's picker
 * and the Sentinel agree on one vocabulary, and so Urdu is a first-class
 * preference rather than a value that silently fails validation and falls back to
 * English. A stored value is still matched against the shipped set, so a stale
 * or hand-edited entry degrades to the session value rather than being trusted.
 */
let sessionLanguage: SiteLanguage = 'en';
export function readSentinelLanguage(): SiteLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isSiteLanguage(stored) ? stored : sessionLanguage;
  } catch { return sessionLanguage; }
}
export function saveSentinelLanguage(language: SiteLanguage) {
  sessionLanguage = language;
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(SENTINEL_PREFERENCES_EVENT));
}
