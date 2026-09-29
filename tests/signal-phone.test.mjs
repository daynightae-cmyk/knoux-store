import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { normalizeSignalPhone } = await loadTypeScript('../src/lib/signal/phone.ts');

test('Signal normalizes UAE local mobile numbers', () => {
  const result = normalizeSignalPhone('050 123 4567', 'AE');
  assert.equal(result.valid, true);
  assert.equal(result.e164, '+971501234567');
  assert.equal(result.countryCode, 'AE');
  assert.equal(result.lineType, 'mobile');
});

test('Signal normalizes Egyptian local mobile numbers', () => {
  const result = normalizeSignalPhone('010 1234 5678', 'EG');
  assert.equal(result.valid, true);
  assert.equal(result.e164, '+201012345678');
  assert.equal(result.countryCode, 'EG');
  assert.equal(result.lineType, 'mobile');
});

test('Signal accepts supported E.164 input without a hint', () => {
  const result = normalizeSignalPhone('+966512345678');
  assert.equal(result.valid, true);
  assert.equal(result.countryCode, 'SA');
  assert.equal(result.lineType, 'mobile');
});

test('Signal never invents a country for unknown international ranges', () => {
  const result = normalizeSignalPhone('+447911123456');
  assert.equal(result.valid, true);
  assert.equal(result.countryCode, 'ZZ');
  assert.equal(result.lineType, 'unknown');
});

test('Signal rejects local input without a supported country hint', () => {
  const result = normalizeSignalPhone('0501234567');
  assert.equal(result.valid, false);
  assert.equal(result.e164, null);
});
