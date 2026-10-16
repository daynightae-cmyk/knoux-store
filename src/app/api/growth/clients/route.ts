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

export async function PATCH(request: NextRequest) {
  const input = await readDraftRequest(request);
  if (input instanceof Response) return input;
  const guard = await authorizeDraft('client.manage', input.clientId as string);
  if (guard instanceof Response) return guard;
  const name = String(input.name ?? '').trim();
  const website = String(input.website ?? '');
  const colors = input.brandColors;
  const fonts = input.brandFonts;
  const claims = input.forbiddenClaims;
  const validStrings = (value: unknown, count: number, length: number): value is string[] => Array.isArray(value) && value.length <= count && value.every(item => typeof item === 'string' && item.length <= length);
  if (!name || name.length > 200 || (website && !destinationValid(website)) ||
    !validStrings(colors, 12, 7) || colors.some(color => !/^#[0-9a-f]{6}$/i.test(color)) ||
    !validStrings(fonts, 20, 120) || !validStrings(claims, 100, 500) ||
    typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt))) return apiFailure('Invalid profile or missing revision.', 400);
  try {
    const { data, error } = await createAdminClient().rpc('knoux_growth_save_brand_profile', {
      p_client: input.clientId, p_actor: guard.principal.userId, p_expected: input.expectedUpdatedAt,
      p_input: {
        name, website: website || null, business_category: String(input.businessCategory ?? '').slice(0, 200),
        city: String(input.city ?? '').slice(0, 120), brand_tone: String(input.brandTone ?? '').slice(0, 2000),
        brand_colors: colors, brand_fonts: fonts, forbidden_claims: claims,
        arabic_style: String(input.arabicStyle ?? '').slice(0, 2000), english_style: String(input.englishStyle ?? '').slice(0, 2000),
      },
    });
    if (error) return apiFailure(error.code === '40001' ? 'Profile changed. Reload before saving.' : error.code === '42501' ? 'Brand editing is restricted while approved or live work exists.' : 'Profile save unavailable.', error.code === '40001' ? 409 : error.code === '42501' ? 403 : 503);
    return NextResponse.json({ client: data }, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Profile store unavailable.'); }
}
