export const SENTINEL_PREFERENCES_EVENT = 'knoux:sentinel-preferences';
const KEY = 'knoux.sentinel.quiet';
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

let sessionLanguage: 'en' | 'ar' = 'en';
export function readSentinelLanguage(): 'en' | 'ar' {
  try {
    const stored = localStorage.getItem('knoux.sentinel.language');
    return stored === 'ar' || stored === 'en' ? stored : sessionLanguage;
  } catch { return sessionLanguage; }
}
export function saveSentinelLanguage(language: 'en' | 'ar') {
  sessionLanguage = language;
  try { localStorage.setItem('knoux.sentinel.language', language); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(SENTINEL_PREFERENCES_EVENT));
}
