import type { SignalCountryCode, SignalLineType, SignalPhoneFacts } from './types';

type Plan = {
  callingCode: string;
  trunkPrefix?: string;
  national: RegExp;
  mobile?: RegExp;
};

const PLANS: Record<Exclude<SignalCountryCode, 'ZZ'>, Plan> = {
  AE: { callingCode: '971', trunkPrefix: '0', national: /^\d{9}$/, mobile: /^(50|52|54|55|56)\d{7}$/ },
  EG: { callingCode: '20', trunkPrefix: '0', national: /^\d{8,10}$/, mobile: /^(10|11|12|15)\d{8}$/ },
  SA: { callingCode: '966', trunkPrefix: '0', national: /^\d{9}$/, mobile: /^5\d{8}$/ },
  QA: { callingCode: '974', national: /^\d{8}$/, mobile: /^(3|5|6|7)\d{7}$/ },
  BH: { callingCode: '973', national: /^\d{8}$/, mobile: /^[367]\d{7}$/ },
  OM: { callingCode: '968', national: /^\d{8}$/, mobile: /^(7|9)\d{7}$/ },
  KW: { callingCode: '965', national: /^\d{8}$/, mobile: /^(4|5|6|9)\d{7}$/ },
};

export const SIGNAL_COUNTRIES = Object.freeze(
  Object.keys(PLANS) as Array<Exclude<SignalCountryCode, 'ZZ'>>,
);

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function classify(plan: Plan | undefined, national: string): SignalLineType {
  if (!plan) return 'unknown';
  if (plan.mobile?.test(national)) return 'mobile';
  return plan.national.test(national) ? 'fixed' : 'unknown';
}

function fromInternational(input: string): SignalPhoneFacts {
  const digits = digitsOnly(input);
  if (digits.length < 7 || digits.length > 15 || digits.startsWith('0')) {
    return { input, valid: false, e164: null, countryCode: 'ZZ', nationalNumber: null, lineType: 'unknown', reason: 'Invalid E.164 length.' };
  }

  const country = SIGNAL_COUNTRIES.find((code) => digits.startsWith(PLANS[code].callingCode));
  if (!country) {
    return { input, valid: true, e164: `+${digits}`, countryCode: 'ZZ', nationalNumber: digits, lineType: 'unknown' };
  }

  const plan = PLANS[country];
  const national = digits.slice(plan.callingCode.length);
  const valid = plan.national.test(national);
  return {
    input,
    valid,
    e164: valid ? `+${digits}` : null,
    countryCode: country,
    nationalNumber: valid ? national : null,
    lineType: valid ? classify(plan, national) : 'unknown',
    reason: valid ? undefined : `Number does not match the ${country} numbering shape supported by Signal.`,
  };
}

export function normalizeSignalPhone(input: string, hint?: string | null): SignalPhoneFacts {
  const raw = input.trim();
  if (!raw) {
    return { input, valid: false, e164: null, countryCode: 'ZZ', nationalNumber: null, lineType: 'unknown', reason: 'Phone number is required.' };
  }

  if (raw.startsWith('+')) return fromInternational(raw);
  if (raw.startsWith('00')) return fromInternational(`+${raw.slice(2)}`);

  const country = (hint?.toUpperCase() ?? '') as Exclude<SignalCountryCode, 'ZZ'>;
  const plan = PLANS[country];
  if (!plan) {
    return { input, valid: false, e164: null, countryCode: 'ZZ', nationalNumber: null, lineType: 'unknown', reason: 'Use international format or select a supported country.' };
  }

  let national = digitsOnly(raw);
  if (plan.trunkPrefix && national.startsWith(plan.trunkPrefix)) national = national.slice(plan.trunkPrefix.length);
  const valid = plan.national.test(national);
  return {
    input,
    valid,
    e164: valid ? `+${plan.callingCode}${national}` : null,
    countryCode: country,
    nationalNumber: valid ? national : null,
    lineType: valid ? classify(plan, national) : 'unknown',
    reason: valid ? undefined : `Number does not match the ${country} numbering shape supported by Signal.`,
  };
}
