import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { enableTypeScriptResolution } from './load.mjs';
import { root } from './helpers.mjs';

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

/* ---------------------------------------------------------------------------
 * One language authority.
 *
 * PR #46 shipped a second, page-local EN/AR language system inside /growth,
 * /wordpress and /signal, and PR #52 shipped the site-wide EN/AR/UR system.
 * They were never reconciled, so the header picker and the page body could
 * show two different languages at once, the page body could force `dir="ltr"`
 * inside an RTL document, and a visitor could be offered two language
 * controls that disagreed.
 *
 * These assertions are the contract that stops a second authority coming back.
 * --------------------------------------------------------------------------- */

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const APP_SOURCE = sourceFiles(join(root, 'src'));

test('the site has exactly one language authority', () => {
  // A private locale state is how a second authority starts: a component that
  // holds its own language and its own direction instead of reading the one
  // the document already carries.
  const privateLocale = [];
  for (const file of APP_SOURCE) {
    const source = readFileSync(file, 'utf8');
    if (/useState<\s*'en'\s*\|\s*'ar'\s*>/.test(source)) {
      privateLocale.push(`${file} holds a private EN/AR language state`);
    }
    if (/setUiLocale\s*[:=]/.test(source)) {
      privateLocale.push(`${file} writes a private language`);
    }
  }
  assert.deepEqual(privateLocale, [], 'no component may own a second language authority');
});

test('no route forces a direction that contradicts the document', () => {
  // The document already carries `dir`, reconciled by the site language
  // document. A section that re-derives its own direction is the mixed
  // right-to-left layout the merge introduced.
  //
  // One exception is deliberate: a creative preview renders in the copy
  // language of the creative itself, which is a property of the advertisement
  // and is selectable inside the studio, not a property of the page.
  const forcedDirection = [];
  for (const file of APP_SOURCE) {
    const source = readFileSync(file, 'utf8');
    const DIRECTION = /dir=\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*===\s*'ar'\s*\?/g;
    let match;
    while ((match = DIRECTION.exec(source))) {
      if (match[1] === 'edit.locale') continue;
      const line = source.slice(0, match.index).split('\n').length;
      forcedDirection.push(`${file}:${line} derives its own direction from ${match[1]}`);
    }
  }
  assert.deepEqual(forcedDirection, [], 'a section may not derive its own direction');
});

test('every translation call site resolves in the shipped catalogue', () => {
  // A call site that asks for a translation the catalogue does not publish
  // silently renders its English source, which is how a route ends up
  // claiming a language it does not have.
  const unresolved = [];
  const CALL = /(?:\btranslatedSiteCopy\(\s*|\bt\(\s*)(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const file of APP_SOURCE) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('@/lib/i18n/')) continue;
    CALL.lastIndex = 0;
    let match;
    while ((match = CALL.exec(source))) {
      const literal = match[2];
      if (!literal || literal.includes('${')) continue;
      if (!hasSiteCopy(literal)) {
        const line = source.slice(0, match.index).split('\n').length;
        unresolved.push(`${file}:${line} ${JSON.stringify(literal)}`);
      }
    }
  }
  assert.deepEqual(unresolved, [], 'every translated string must be published in the catalogue');
});

test('the route copy that used to be page-local is trilingual', () => {
  for (const source of [
    'Turn attention into',
    'Start a growth brief',
    'This field is required.',
    'Consent is required.',
    'Request delivered.',
    'Your next website, in view.',
    'Official WordPress.org themes',
    'Find public business contact evidence, with its source and limitations.',
    'Google Presence',
  ]) {
    assert.ok(hasSiteCopy(source), source);
    // The catalogue is keyed by the English source; the value is the
    // [arabic, urdu] pair.
    const [arabic, urdu] = SITE_COPY[Object.keys(SITE_COPY).find(key => key.toLowerCase() === source.toLowerCase())];
    assert.ok(arabic.trim(), `${source} needs Arabic`);
    assert.ok(urdu.trim(), `${source} needs Urdu`);
    // A translation that is identical to its English source is a placeholder,
    // not a translation.
    assert.notEqual(arabic.trim().toLowerCase(), source.trim().toLowerCase(), `${source} Arabic is a copy of the English`);
    assert.notEqual(urdu.trim().toLowerCase(), source.trim().toLowerCase(), `${source} Urdu is a copy of the English`);
  }
});