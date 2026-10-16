import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readDraftRequest, authorizeDraft, apiFailure } from '@/lib/growth/draft-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { destinationValid } from '@/lib/growth/studio';

export async function POST(request: NextRequest) {
  const input = await readDraftRequest(request);
  if (input instanceof Response) return input;
  if (input.id) return apiFailure('Client creation does not accept an existing ID.', 400);
  const guard = await authorizeDraft('client.manage', input.clientId as string);
  if (guard instanceof Response) return guard;
  if (guard.principal.clientRoles?.[input.clientId as string] !== 'OWNER') return apiFailure('A workspace owner must onboard clients.', 403);
  const name = String(input.name ?? '').trim();
  const website = String(input.website ?? '');
  const colors = Array.isArray(input.brandColors) ? input.brandColors : [];
  if (!name || name.length > 200 || (website && !destinationValid(website)) || colors.length > 12 || colors.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) return apiFailure('Invalid client name, website or brand colors.', 400);
  try {
    const { data, error } = await createAdminClient().rpc('knoux_growth_create_client', {
      p_client: input.clientId, p_actor: guard.principal.userId,
      p_input: {
        name, business_category: String(input.businessCategory ?? '').slice(0, 200),
        country: input.country === 'EG' ? 'EG' : 'AE', city: String(input.city ?? '').slice(0, 120),
        website: website || null, languages: ['en', 'ar'], brand_colors: colors,
        brand_tone: String(input.brandTone ?? '').slice(0, 2000), request_key: input.requestId,
      },
    });
    if (error) return apiFailure('Client creation refused.', error.code === '42501' ? 403 : error.code === '40001' ? 409 : 503);
    return NextResponse.json({ client: data }, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Client store unavailable.'); }
}
