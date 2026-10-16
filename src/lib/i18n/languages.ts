/**
 * Language authority for the public site.
 *
 * This is the single place that decides which languages exist, how each one is
 * written and how it is labelled to a visitor. Everything else derives from it:
 * the Sentinel preference store, the site copy catalogue, the request parser and
 * the `dir`/`lang` attributes all read from here rather than repeating `'ar'`
 * literals, which is why adding a language is an addition to this file plus its
 * dictionary and not a second i18n library.
 *
 * Recovered from the unmerged `codex/knoux-dev-completion` branch, where this
 * module lived at `src/lib/sentinel/languages.ts` and carried both this
 * authority and the Sentinel companion's model-prompt helpers. Those prompt
 * helpers (`companionAnswerLanguage`, `companionScriptInstruction`, `GUIDE_TONES`)
 * are deliberately NOT here: they configure a live model conversation and belong
 * with the Companion recovery, not with public-site translation. Keeping this
 * module free of them is what lets the site ship a language switcher without
 * pulling in an AI surface.
 *
 * `direction` drives RTL layout. `script` is exposed so a component can request
 * the right typeface — Arabic and Urdu are both RTL but are distinct scripts
 * with different letterforms and different Noto families, so a single "RTL"
 * bucket would render Urdu with Arabic-shaped glyphs in the wrong places.
 */

/** The languages the public site ships. English is the source of truth. */
export type SiteLanguage = 'en' | 'ar' | 'ur';

export type SiteDirection = 'ltr' | 'rtl';

export type SiteLanguageMeta = {
  /** BCP 47 tag written into the `lang` attribute. */
  tag: string;
  /** Endonym — the language's name in that language. */
  label: string;
  /** Name in English, for a language picker heading. */
  englishLabel: string;
  direction: SiteDirection;
  script: 'latin' | 'arabic' | 'nastaliq';
};

export const SITE_LANGUAGES: Readonly<Record<SiteLanguage, SiteLanguageMeta>> = {
  en: { tag: 'en', label: 'English', englishLabel: 'English', direction: 'ltr', script: 'latin' },
  ar: { tag: 'ar', label: 'العربية', englishLabel: 'Arabic', direction: 'rtl', script: 'arabic' },
  ur: { tag: 'ur', label: 'اردو', englishLabel: 'Urdu', direction: 'rtl', script: 'nastaliq' },
};

export const SITE_LANGUAGE_IDS = Object.keys(SITE_LANGUAGES) as SiteLanguage[];

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SITE_LANGUAGES, value);
}

/**
 * Read one field of a language's metadata, degrading to a shipped default.
 *
 * Every accessor below is this lookup with a different field and default, so an
 * unrecognised value has to resolve to something usable rather than throw. The
 * fallback is supplied here once instead of repeated at each call site.
 */
function meta<K extends keyof SiteLanguageMeta>(
  language: SiteLanguage,
  field: K,
  fallback: SiteLanguageMeta[K],
): SiteLanguageMeta[K] {
  return SITE_LANGUAGES[language]?.[field] ?? fallback;
}

/** Languages rendered right-to-left. */
export function isRtlLanguage(language: SiteLanguage): boolean {
  return siteDirection(language) === 'rtl';
}

/**
 * Direction for a language. Defaults to LTR so an unrecognised stored
 * preference degrades to the English layout instead of a broken mirrored one.
 */
export function siteDirection(language: SiteLanguage): SiteDirection {
  return meta(language, 'direction', 'ltr');
}

export function siteLanguageTag(language: SiteLanguage): string {
  return meta(language, 'tag', 'en');
}

/**
 * BCP 47 locale handed to the Web Speech API.
 *
 * Kept separate from `tag` because a two-letter tag is not always a usable
 * speech locale, and because Arabic and Urdu need distinct voices: resolving
 * both to one "RTL" voice would speak Urdu with Arabic phonetics.
 */
const SPEECH_LOCALES: Readonly<Record<SiteLanguage, string>> = {
  en: 'en-GB',
  ar: 'ar-AE',
  ur: 'ur-PK',
};

export function speechLocale(language: SiteLanguage): string {
  return SPEECH_LOCALES[language] ?? SPEECH_LOCALES.en;
}

/**
 * Normalise anything read from storage or a request into a real language.
 * Accepts the full BCP 47 prefix so `ur-PK` selects Urdu.
 */
export function normalizeSiteLanguage(value: unknown, fallback: SiteLanguage = 'en'): SiteLanguage {
  if (typeof value !== 'string') return fallback;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isSiteLanguage(base) ? base : fallback;
}

/**
 * Index into a `[arabic, urdu]` translation pair.
 *
 * `SITE_COPY` stores two slots per key because English is the source string and
 * never needs storing. Returning `0` for Arabic and `1` for Urdu keeps that
 * layout from leaking into callers; English never reaches this because
 * `translatedSiteCopy` short-circuits before lookup.
 */
const TRANSLATION_SLOTS: Readonly<Record<SiteLanguage, 0 | 1>> = { en: 0, ar: 0, ur: 1 };

export function translationSlot(language: SiteLanguage): 0 | 1 {
  return TRANSLATION_SLOTS[language] ?? TRANSLATION_SLOTS.ar;
}