import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';
import type { SignalLineType, SignalPhoneFacts } from './types';

export const SIGNAL_PREFERRED_COUNTRIES = Object.freeze([
  'AE', 'EG', 'SA', 'QA', 'BH', 'OM', 'KW',
] as const);

function mapLineType(type: string | undefined): SignalLineType {
  switch (type) {
    case 'MOBILE': return 'mobile';
    case 'FIXED_LINE': return 'fixed';
    case 'VOIP': return 'voip';
    default: return 'unknown';
  }
}

function failure(input: string, reason: string): SignalPhoneFacts {
  return {
    input,
    valid: false,
    e164: null,
    countryCode: 'ZZ',
    nationalNumber: null,
    lineType: 'unknown',
    reason,
  };
}
export function normalizeSignalPhone(input: string, hint?: string | null): SignalPhoneFacts {
  const raw = input.trim();
  if (!raw) return failure(input, 'Phone number is required.');

  const canonicalInput = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
  const hintUpper = (hint ?? '').trim().toUpperCase();
  const defaultCountry = isSupportedCountry(hintUpper)
    ? hintUpper as CountryCode
    : undefined;

  if (!canonicalInput.startsWith('+') && !defaultCountry) {
    return failure(input, 'Use international format or select a supported country.');
  }

  let parsed;
  try {
    parsed = parsePhoneNumberFromString(canonicalInput, defaultCountry);
  } catch {
    parsed = undefined;
  }

  if (!parsed || !parsed.isValid()) {
    return failure(input, 'Number does not match a valid numbering plan.');
  }

  return {
    input,
    valid: true,
    e164: parsed.number,
    countryCode: parsed.country ?? 'ZZ',
    nationalNumber: parsed.nationalNumber,
    lineType: mapLineType(parsed.getType()),
  };
}
