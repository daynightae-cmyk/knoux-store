import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { SITE_COPY, translatedSiteCopy } = await import('../src/lib/i18n/site-copy.ts');
test('shared site chrome provides Arabic and Urdu copy without changing brand names or technical facts', () => {
  for (const [source, translations] of Object.entries(SITE_COPY)) {
    assert.equal(translations.length, 2, source);
    assert.ok(translations.every(value => typeof value === 'string' && value.trim()), source);
    assert.equal(translatedSiteCopy(source, 'en'), source);
  }
  assert.equal(translatedSiteCopy('MODELS', 'ar'), 'النماذج');
  assert.equal(translatedSiteCopy('MODELS', 'ur'), 'ماڈلز');
  for (const protectedFact of ['Gemini', 'OpenCode Console V2', 'OPENCODE_CONSOLE_TOKEN', 'UNKNOWN', 'Not yet measured']) {
    assert.equal(translatedSiteCopy(protectedFact, 'ar'), protectedFact);
    assert.equal(translatedSiteCopy(protectedFact, 'ur'), protectedFact);
  }
});
