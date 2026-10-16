import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

const { SITE_COPY, translatedSiteCopy, hasSiteCopy } = await import('../src/lib/i18n/site-copy.ts');
const {
  SITE_LANGUAGES,
  SITE_LANGUAGE_IDS,
  isSiteLanguage,
  isRtlLanguage,
  normalizeSiteLanguage,
  siteDirection,
  siteLanguageTag,
  speechLocale,
  translationSlot,
} = await import('../src/lib/i18n/languages.ts');

/*
 * Public-site internationalisation.
 *
 * Covers the three things that can silently break a language switcher:
 * the catalogue itself, the direction/attribute layer that decides RTL layout,
 * and the fallback rules that keep an untranslated or malformed value from
 * producing a blank page.
 */

test('every shipped language is declared with a tag, an endonym and a direction', () => {
  assert.deepEqual(SITE_LANGUAGE_IDS, ['en', 'ar', 'ur']);
  for (const id of SITE_LANGUAGE_IDS) {
    const meta = SITE_LANGUAGES[id];
    assert.ok(meta, id);
    assert.ok(meta.tag, id);
    assert.ok(meta.label.trim(), id);
    assert.ok(meta.englishLabel.trim(), id);
    assert.ok(['ltr', 'rtl'].includes(meta.direction), id);
  }
});

test('Arabic and Urdu are right-to-left with distinct scripts; English is left-to-right', () => {
  assert.equal(siteDirection('en'), 'ltr');
  assert.equal(siteDirection('ar'), 'rtl');
  assert.equal(siteDirection('ur'), 'rtl');
  assert.equal(isRtlLanguage('en'), false);
  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('ur'), true);
  // Urdu is Nastaliq, not Arabic script. Collapsing these would render Urdu
  // with Arabic-shaped letterforms.
  assert.equal(SITE_LANGUAGES.ar.script, 'arabic');
  assert.equal(SITE_LANGUAGES.ur.script, 'nastaliq');
});

test('document attributes and speech locales are resolved per language', () => {
  assert.equal(siteLanguageTag('en'), 'en');
  assert.equal(siteLanguageTag('ar'), 'ar');
  assert.equal(siteLanguageTag('ur'), 'ur');
  // Arabic and Urdu must not share a voice.
  assert.equal(speechLocale('ar'), 'ar-AE');
  assert.equal(speechLocale('ur'), 'ur-PK');
  assert.notEqual(speechLocale('ar'), speechLocale('ur'));
});

test('the translation pair layout is Arabic then Urdu', () => {
  assert.equal(translationSlot('ar'), 0);
  assert.equal(translationSlot('ur'), 1);
});

test('shared site chrome provides Arabic and Urdu copy without changing brand names or technical facts', () => {
  for (const [source, translations] of Object.entries(SITE_COPY)) {
    assert.equal(translations.length, 2, source);
    assert.ok(translations.every((value) => typeof value === 'string' && value.trim()), source);
    assert.equal(translatedSiteCopy(source, 'en'), source);
  }
  // Lookup is case-insensitive so a component may render a label in any casing.
  assert.equal(translatedSiteCopy('MODELS', 'ar'), 'النماذج');
  assert.equal(translatedSiteCopy('MODELS', 'ur'), 'ماڈلز');
  assert.equal(translatedSiteCopy('models', 'ar'), 'النماذج');
});

test('brand names, model identifiers and secrets are never translated', () => {
  // These must round-trip untouched in every language. A translated API key,
  // model id or vendor mark is a correctness bug, not a localisation choice.
  for (const protectedFact of [
    'Gemini',
    'OpenCode Console V2',
    'OPENCODE_CONSOLE_TOKEN',
    'UNKNOWN',
    'Not yet measured',
    'KNOuX',
    'Sentinel',
    'Composer orb',
    'Vercel',
    'Supabase',
    'Next.js',
    'Tailwind',
    'Base44',
    'PowerShell',
    'WordPress.org',
    'WordPress Studio',
  ]) {
    assert.equal(translatedSiteCopy(protectedFact, 'ar'), protectedFact, protectedFact);
    assert.equal(translatedSiteCopy(protectedFact, 'ur'), protectedFact, protectedFact);
    assert.equal(hasSiteCopy(protectedFact), false, protectedFact);
  }
});

test('the Composer product name keeps its Latin form in Arabic', () => {
  // Arabic for "author" is المؤلّف, which is not what Composer means here.
  // The catalogue elsewhere keeps the Latin name ("فتح Composer"), so the
  // standalone key must agree with it rather than transliterate a different word.
  assert.equal(translatedSiteCopy('Composer', 'ar'), 'Composer');
  assert.notEqual(translatedSiteCopy('Composer', 'ar'), 'المؤلّف');
  // The call-to-action keeps the same Latin brand in its Arabic rendering.
  assert.ok(
    translatedSiteCopy('Open the Composer', 'ar').endsWith('Composer'),
    'call to action must preserve the Composer brand',
  );
});

test('an untranslated key falls back to the English source instead of rendering empty', () => {
  for (const language of SITE_LANGUAGE_IDS) {
    assert.equal(translatedSiteCopy('A string nobody translated', language), 'A string nobody translated');
  }
  // A near-miss must not resolve to a different entry.
  assert.equal(translatedSiteCopy('Modelz', 'ar'), 'Modelz');
});

test('language switching is stable and reversible across all three languages', () => {
  // Expected values are pinned rather than compared against a second call, so a
  // lookup that returned a different value every time would fail here.
  const expected = { en: 'Language', ar: 'اللغة', ur: 'زبان' };
  assert.equal(translatedSiteCopy('Language', 'en'), expected.en);
  assert.equal(translatedSiteCopy('Language', 'ar'), expected.ar);
  assert.equal(translatedSiteCopy('Language', 'ur'), expected.ur);

  // Switching away and back must return the original value, repeatedly.
  for (let pass = 0; pass < 3; pass += 1) {
    for (const language of SITE_LANGUAGE_IDS) {
      assert.equal(translatedSiteCopy('Language', language), expected[language]);
    }
  }
});

test('a stored preference is validated against the shipped language set', () => {
  assert.equal(isSiteLanguage('en'), true);
  assert.equal(isSiteLanguage('ar'), true);
  assert.equal(isSiteLanguage('ur'), true);
  assert.equal(isSiteLanguage('fr'), false);
  assert.equal(isSiteLanguage(undefined), false);
  assert.equal(isSiteLanguage(42), false);
  // A hand-edited or stale storage entry must not be trusted.
  assert.equal(normalizeSiteLanguage('de'), 'en');
  assert.equal(normalizeSiteLanguage('klingon'), 'en');
  assert.equal(normalizeSiteLanguage(null), 'en');
  assert.equal(normalizeSiteLanguage({}), 'en');
});

test('a full BCP 47 tag normalises to its base language', () => {
  assert.equal(normalizeSiteLanguage('ur-PK'), 'ur');
  assert.equal(normalizeSiteLanguage('ar-AE'), 'ar');
  assert.equal(normalizeSiteLanguage('AR'), 'ar');
  assert.equal(normalizeSiteLanguage('  ur  '), 'ur');
  assert.equal(normalizeSiteLanguage('en_US'), 'en');
});

test('an explicit fallback is honoured when normalising', () => {
  assert.equal(normalizeSiteLanguage('fr', 'ar'), 'ar');
  assert.equal(normalizeSiteLanguage('ur-PK', 'ar'), 'ur');
});

test('an unknown language direction degrades to LTR rather than a broken mirror', () => {
  assert.equal(siteDirection('fr'), 'ltr');
  assert.equal(siteLanguageTag('fr'), 'en');
  assert.equal(isRtlLanguage('fr'), false);
});