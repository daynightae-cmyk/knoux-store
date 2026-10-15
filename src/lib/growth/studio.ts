import type { Campaign, CreativeDraft, LanguageCode } from './types';

/** Local layout guides, not provider validation or publishing capabilities. */
export const PLACEMENTS = [
  { id: 'instagram-feed', label: 'Instagram Feed', ratio: '1 / 1', kind: 'feed', formats: 'JPEG / PNG', hidden: 'Destination shown as a local CTA only' },
  { id: 'instagram-story', label: 'Instagram Story / Reel', ratio: '9 / 16', kind: 'vertical', formats: 'JPEG / PNG / MP4', hidden: 'Description omitted; overlay copy' },
  { id: 'facebook-feed', label: 'Facebook Feed', ratio: '4 / 5', kind: 'feed', formats: 'JPEG / PNG', hidden: 'Caption above image; headline below' },
  { id: 'tiktok', label: 'TikTok', ratio: '9 / 16', kind: 'vertical', formats: 'MP4', hidden: 'Headline omitted; caption overlay' },
  { id: 'youtube', label: 'YouTube', ratio: '16 / 9', kind: 'video', formats: 'MP4 / JPEG thumbnail', hidden: 'Primary copy below video' },
  { id: 'google-search', label: 'Google Search', ratio: 'Responsive text', kind: 'search', formats: 'Text only', hidden: 'Media and CTA button omitted' },
  { id: 'google-display', label: 'Google Display', ratio: '1.91 / 1', kind: 'display', formats: 'JPEG / PNG', hidden: 'Responsive image approximation' },
  { id: 'whatsapp', label: 'WhatsApp Business', ratio: 'Local message', kind: 'message', formats: 'Text / JPEG / PNG', hidden: 'Local composition only; no sending or delivery test' },
] as const;
export type PlacementId = typeof PLACEMENTS[number]['id'];
export type StudioEdit = { creative: CreativeDraft; destination: string; locale: LanguageCode; asset: string; revision: number; baseUpdatedAt: string };

export function beginEdit(creative: CreativeDraft, destination = ''): StudioEdit {
  return { creative: { ...creative }, destination, locale: creative.languages[0] ?? 'en', asset: '', revision: 0, baseUpdatedAt: creative.updatedAt };
}

export function updateEdit(edit: StudioEdit, patch: Partial<Pick<StudioEdit, 'destination' | 'locale' | 'asset'>> & { creative?: Partial<CreativeDraft> }, clientId: string, current: CreativeDraft): StudioEdit {
  if (edit.creative.clientId !== clientId || current.clientId !== clientId || current.id !== edit.creative.id || current.updatedAt !== edit.baseUpdatedAt) throw new Error('Stale or cross-client edit refused. Reselect the current draft.');
  if (patch.creative?.clientId && patch.creative.clientId !== clientId) throw new Error('Client ownership cannot change.');
  return { ...edit, ...patch, creative: { ...edit.creative, ...patch.creative, id: current.id, clientId, status: 'DRAFT', reviewedBy: undefined }, revision: edit.revision + 1 };
}

export function destinationValid(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function brandViolations(edit: StudioEdit, forbidden: readonly string[]): string[] {
  const copy = [edit.creative.headline, edit.creative.primaryText, edit.creative.cta, edit.creative.description].join(' ').toLocaleLowerCase();
  return forbidden.filter((claim) => copy.includes(claim.toLocaleLowerCase()));
}

/** Deterministic review fingerprint. Never an authorization token. */
export function reviewFingerprint(campaign: Campaign, edits: readonly StudioEdit[]): string {
  return JSON.stringify({ clientId: campaign.clientId, id: campaign.id, name: campaign.name, objective: campaign.objective, platforms: campaign.platforms, budgetMinor: campaign.budgetMinor, currency: campaign.currency, startDate: campaign.startDate, endDate: campaign.endDate, locations: campaign.locations, languages: campaign.languages, audienceNotes: campaign.audienceNotes, creativeSetIds: campaign.creativeSetIds, landingPageUrl: campaign.landingPageUrl, conversionTarget: campaign.conversionTarget, creatives: edits.map((edit) => ({ creative: edit.creative, destination: edit.destination, locale: edit.locale, asset: edit.asset, revision: edit.revision })) });
}
