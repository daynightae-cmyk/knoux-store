import { type NextRequest } from 'next/server';
import { listDrafts, readDraftRequest, authorizeDraft, persistDraft, validRecordId, apiFailure } from '@/lib/growth/draft-api';
import { destinationValid } from '@/lib/growth/studio';

/** Creative drafts: guarded service-role writes, tenant-scoped, idempotent. */
export const dynamic = 'force-dynamic';

const FIELDS = 'id,client_id,campaign_id,format,concept,headline,primary_text,description,cta,languages,ai_generated,status,media_asset_id,destination_url,origin,created_at,updated_at';

export async function GET(request: NextRequest) {
  return listDrafts(request, 'creative', FIELDS);
}

export async function POST(request: NextRequest) {
  const input = await readDraftRequest(request);
  if (input instanceof Response) return input;
  const clientId = input.clientId as string;
  const guard = await authorizeDraft(input.id ? 'creative.edit' : 'creative.create', clientId);
  if (guard instanceof Response) return guard;
  for (const key of ['campaignId', 'mediaAssetId']) {
    if (input[key] != null && input[key] !== '' && !validRecordId(input[key])) return apiFailure('Invalid associated record.', 400);
  }
  const headline = String(input.headline ?? '').slice(0, 500);
  const destination = typeof input.destination === 'string' ? input.destination : '';
  if (destination && !destinationValid(destination)) return apiFailure('Destination must be HTTPS without credentials.', 400);
  return persistDraft('creative', input, {
    campaign_id: input.campaignId || null, media_asset_id: input.mediaAssetId || null,
    concept: String(input.concept ?? (headline || 'Untitled')).slice(0, 500),
    headline: headline || null, primary_text: String(input.primaryText ?? '').slice(0, 5000) || null,
    description: String(input.description ?? '').slice(0, 5000) || null,
    cta: String(input.cta ?? '').slice(0, 120) || null,
    languages: Array.isArray(input.languages) ? input.languages.filter(l => l === 'ar' || l === 'en') : ['en'],
    destination_url: destination || null,
  }, guard.principal.userId);
}
