import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { normalizeSignalPhone } = await loadTypeScript('../src/lib/signal/phone.ts');

test('Signal normalizes UAE local mobile numbers', () => {
  const result = normalizeSignalPhone('050 123 4567', 'AE');
  assert.equal(result.valid, true);
  assert.equal(result.countryCode, 'AE');
  assert.equal(result.lineType, 'mobile');
});

test('Signal normalizes Egyptian local mobile numbers', () => {
  const result = normalizeSignalPhone('010 1234 5678', 'EG');
  assert.equal(result.valid, true);
  assert.equal(result.countryCode, 'EG');
  assert.equal(result.lineType, 'mobile');
});

test('Signal accepts international input without a hint', () => {
  const result = normalizeSignalPhone('+12025550123');
  assert.equal(result.valid, true);
  assert.equal(result.countryCode, 'US');
});

test('Signal converts international 00 prefix', () => {
  const result = normalizeSignalPhone('0012025550123');
  assert.equal(result.valid, true);
  assert.equal(result.e164, '+12025550123');
});

test('Signal rejects invalid international numbers', () => {
  const result = normalizeSignalPhone('+999123');
  assert.equal(result.valid, false);
  assert.equal(result.e164, null);
});

test('Signal rejects local input without a country hint', () => {
  const result = normalizeSignalPhone('0501234567');
  assert.equal(result.valid, false);
  assert.equal(result.e164, null);
});