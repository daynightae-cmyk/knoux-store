/**
 * Language authority for the public site and the Build workspace.
 *
 * This is the single place that decides which languages exist, how each one is
 * written and how it is labelled to a visitor. Everything else derives from it:
 * the Sentinel preference store, the guide dictionaries, the request parser and
 * the `dir`/`lang` attributes all read from here rather than repeating `'ar'`
 * literals, which is why adding Urdu is an addition to this file plus its
 * dictionaries and not a second i18n library.
 *
 * `direction` drives RTL layout. `script` is exposed so a component can request
 * the right typeface — Arabic and Urdu are both RTL but are distinct scripts
 * with different letterforms and different Noto families, so a single "RTL"
 * bucket would render Urdu with Arabic-shaped glyphs in the wrong places.
 */
export type GuideLanguage = 'en' | 'ar' | 'ur';
export type GuideDirection = 'ltr' | 'rtl';

export type GuideLanguageMeta = {
  /** BCP 47 tag written into the `lang` attribute. */
  tag: string;
  /** Endonym — the language's name in that language. */
  label: string;
  /** Name in English, for a language picker heading. */
  englishLabel: string;
  direction: GuideDirection;
  script: 'latin' | 'arabic' | 'nastaliq';
};

export const GUIDE_LANGUAGES: Readonly<Record<GuideLanguage, GuideLanguageMeta>> = {
  en: { tag: 'en', label: 'English', englishLabel: 'English', direction: 'ltr', script: 'latin' },
  ar: { tag: 'ar', label: 'العربية', englishLabel: 'Arabic', direction: 'rtl', script: 'arabic' },
  ur: { tag: 'ur', label: 'اردو', englishLabel: 'Urdu', direction: 'rtl', script: 'nastaliq' },
};

export const GUIDE_LANGUAGE_IDS = Object.keys(GUIDE_LANGUAGES) as GuideLanguage[];

export function isGuideLanguage(value: unknown): value is GuideLanguage {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GUIDE_LANGUAGES, value);
}

/**
 * Direction for a language. Defaults to LTR so an unrecognised stored
 * preference degrades to the English layout instead of a broken mirrored one.
 */
export function guideDirection(language: GuideLanguage): GuideDirection {
  return GUIDE_LANGUAGES[language]?.direction ?? 'ltr';
}

export function guideLanguageTag(language: GuideLanguage): string {
  return GUIDE_LANGUAGES[language]?.tag ?? 'en';
}

/**
 * BCP 47 locale handed to the Web Speech API.
 *
 * Kept separate from `tag` because a two-letter tag is not always a usable
 * speech locale, and because Arabic and Urdu need distinct voices: resolving
 * both to one "RTL" voice would speak Urdu with Arabic phonetics.
 */
export function speechLocale(language: GuideLanguage): string {
  if (language === 'ar') return 'ar-AE';
  if (language === 'ur') return 'ur-PK';
  return 'en-GB';
}

/** Languages rendered right-to-left. */
export function isRtlLanguage(language: GuideLanguage): boolean {
  return guideDirection(language) === 'rtl';
}

/**
 * Normalise anything read from storage or a request into a real language.
 * Accepts the full BCP 47 prefix so `ur-PK` selects Urdu.
 */
export function normalizeGuideLanguage(value: unknown, fallback: GuideLanguage = 'en'): GuideLanguage {
  if (typeof value !== 'string')
    return fallback;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isGuideLanguage(base) ? base : fallback;
}

/**
 * How Sentinel is instructed to phrase a reply.
 *
 * This governs conversational register only. A regional variant is expressed as
 * an optional natural register — the written language, script and direction are
 * unchanged — so an Egyptian or Gulf reader still receives standard written
 * Arabic and the response remains shaped and laid out identically.
 */
export function companionAnswerLanguage(language: GuideLanguage, tone?: GuideTone): string {
  if (language === 'ar') return tone === 'egyptian' ? 'natural Egyptian-spoken Arabic' : tone === 'gulf' ? 'natural Gulf-spoken Arabic' : 'natural Arabic';
  if (language === 'ur') return 'natural Urdu';
  return 'English';
}

/**
 * Extra script guidance appended to the model instruction.
 *
 * Arabic and Urdu are both RTL but are separate scripts with different
 * letterforms and different conventions for numerals and punctuation. Naming the
 * script explicitly stops a model from answering an Urdu request with
 * Arabic-shaped letterforms, and keeps embedded Latin identifiers — product
 * names, model ids, URLs — in their original LTR form rather than transliterating
 * or reversing them.
 */
export function companionScriptInstruction(language: GuideLanguage): string {
  if (language === 'ar') return 'Write in Arabic script, right-to-left. Keep product names, model identifiers and code exactly as published; never transliterate or reverse embedded Latin text or numbers.';
  if (language === 'ur') return 'Write in Urdu Nastaliq script, right-to-left. Keep product names, model identifiers and code exactly as published; never transliterate or reverse embedded Latin text or numbers.';
  return '';
}

/**
 * Optional conversational register for Arabic. Purely a phrasing preference; it
 * never changes the language, script or layout direction.
 */
export type GuideTone = 'standard' | 'egyptian' | 'gulf';

export const GUIDE_TONES: Readonly<Record<GuideTone, { label: string; englishLabel: string; availableFor: GuideLanguage[] }>> = {
  standard: { label: 'عربية فصحى · Standard', englishLabel: 'Standard', availableFor: ['ar'] },
  egyptian: { label: 'مصري · Egyptian', englishLabel: 'Egyptian Arabic', availableFor: ['ar'] },
  gulf: { label: 'خليجي · Gulf / UAE', englishLabel: 'Gulf Arabic', availableFor: ['ar'] },
};

export function isGuideTone(value: unknown): value is GuideTone {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GUIDE_TONES, value);
}

/** Tones offered for a given language. English and Urdu have no variants yet. */
export function tonesForLanguage(language: GuideLanguage): GuideTone[] {
  return GUIDE_TONE_IDS.filter(tone => GUIDE_TONES[tone].availableFor.includes(language));
}

export const GUIDE_TONE_IDS = Object.keys(GUIDE_TONES) as GuideTone[];
