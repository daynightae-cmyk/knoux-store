import { type NextRequest } from 'next/server';
import { listDrafts, readDraftRequest, authorizeDraft, persistDraft, apiFailure } from '@/lib/growth/draft-api';
import { destinationValid } from '@/lib/growth/studio';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_PLATFORMS } from '@/lib/growth/types';

/** Campaign drafts: guarded writes; approval-invalidating fields tracked. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return listDrafts(request, 'campaign', 'id,client_id,name,objective,budget_minor,currency,start_date,end_date,locations,languages,audience_notes,landing_page_url,conversion_target,status,origin,created_at,updated_at,knoux_growth_campaign_channels(platform)');
}

export async function POST(request: NextRequest) {
  const input = await readDraftRequest(request);
  if (input instanceof Response) return input;
  const guard = await authorizeDraft(input.id ? 'campaign.edit' : 'campaign.create', input.clientId as string);
  if (guard instanceof Response) return guard;
  const name = String(input.name ?? '').trim().slice(0, 200);
  const objective = String(input.objective ?? 'LEADS');
  const platforms = input.platforms;
  const budgetMinor = Number(input.budgetMinor);
  const start = String(input.startDate ?? '');
  const end = String(input.endDate ?? '');
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!name || !CAMPAIGN_OBJECTIVES.includes(objective as (typeof CAMPAIGN_OBJECTIVES)[number]) ||
    !Number.isSafeInteger(budgetMinor) || budgetMinor <= 0 || !validDate(start) || !validDate(end) || end < start ||
    !Array.isArray(platforms) || platforms.length > CAMPAIGN_PLATFORMS.length ||
    platforms.some(p => !CAMPAIGN_PLATFORMS.includes(p as (typeof CAMPAIGN_PLATFORMS)[number])) || new Set(platforms).size !== platforms.length) {
    return apiFailure('Invalid campaign fields, dates or platforms.', 400);
  }
  const landing = typeof input.landingPageUrl === 'string' ? input.landingPageUrl : '';
  if (landing && !destinationValid(landing)) return apiFailure('Landing must be HTTPS without credentials.', 400);
  return persistDraft('campaign', input, {
    name, objective, budget_minor: budgetMinor, platforms,
    currency: ['AED', 'EGP', 'USD'].includes(String(input.currency)) ? String(input.currency) : 'AED',
    start_date: start, end_date: end,
    locations: Array.isArray(input.locations) ? input.locations.map(String).slice(0, 20) : [],
    languages: Array.isArray(input.languages) ? input.languages.filter(l => l === 'ar' || l === 'en') : ['en'],
    audience_notes: String(input.audienceNotes ?? '').slice(0, 5000) || null,
    landing_page_url: landing || null, conversion_target: String(input.conversionTarget ?? '').slice(0, 500) || null,
  }, guard.principal.userId);
}
