import type { DomainAvailability } from '@/lib/domain/shared';

export const STATE_TONE: Record<DomainAvailability['state'], { en: string; ar: string; tone: 'ok' | 'signal' | 'off' | 'warn' }> = {
  available: { en: 'Available', ar: 'متاح', tone: 'ok' },
  premium: { en: 'Premium', ar: 'مميز', tone: 'signal' },
  unavailable: { en: 'Unavailable', ar: 'غير متاح', tone: 'off' },
  unsupported: { en: 'Unsupported TLD', ar: 'امتداد غير مدعوم', tone: 'off' },
  unknown: { en: 'Not determined', ar: 'لم يتحدد', tone: 'off' },
  unconfigured: { en: 'Provider not configured', ar: 'المزود غير مضبوط', tone: 'off' },
  error: { en: 'Check failed', ar: 'فشل الفحص', tone: 'warn' },
};

export type RegistrationReview = {
  state: string;
  message: string;
  externalReference: string | null;
  dns?: string;
  siteConnection?: string;
};

export async function readRegistrationReview(domain: string, signal: AbortSignal): Promise<RegistrationReview> {
  const response = await fetch('/api/domain/registration', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain }),
    signal,
  });
  const data = await response.json() as Partial<RegistrationReview> | null;
  if (typeof data?.state !== 'string') throw new Error('Registration status unavailable');
  return {
    state: data.state,
    message: typeof data.message === 'string' ? data.message : 'Registration capability could not be verified.',
    externalReference: typeof data.externalReference === 'string' ? data.externalReference : null,
    dns: typeof data.dns === 'string' ? data.dns : undefined,
    siteConnection: typeof data.siteConnection === 'string' ? data.siteConnection : undefined,
  };
}
