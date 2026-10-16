import { NextResponse, type NextRequest } from 'next/server';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { destinationValid } from '@/lib/growth/studio';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_PLATFORMS } from '@/lib/growth/types';

/** Campaign drafts: guarded writes; approval-invalidating fields tracked. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId') ?? '';
  if (!clientId) return NextResponse.json({ reason: 'Choose a client.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'campaign.view', clientId });
  if (!guard.ok) return NextResponse.json({ code: guard.failure.code }, { status: guard.failure.status });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('knoux_growth_campaigns')
      .select('id,client_id,name,objective,budget_minor,currency,start_date,end_date,locations,languages,audience_notes,landing_page_url,conversion_target,status,origin,created_at,updated_at,knoux_growth_campaign_channels(platform)')
      .eq('client_id', clientId).order('updated_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ reason: 'Campaigns unavailable.' }, { status: 503 });
    return NextResponse.json({ campaigns: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ reason: 'Store unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) {
    return NextResponse.json({ reason: 'Cross-site refused.' }, { status: 403 });
  }
  const body = await readBoundedJson(request, 32 * 1024);
  if (!body.ok || typeof body.value !== 'object' || !body.value) {
    return NextResponse.json({ reason: 'Invalid campaign.' }, { status: 400 });
  }
  const input = body.value as Record<string, unknown>;
  const clientId = typeof input.clientId === 'string' ? input.clientId : '';
  const name = String(input.name ?? '').trim().slice(0, 200);
  if (!clientId || !name) return NextResponse.json({ reason: 'Client and name required.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'campaign.create', clientId });
  if (!guard.ok) return NextResponse.json({ code: guard.failure.code }, { status: guard.failure.status });
  const objective = String(input.objective ?? 'LEADS');
  if (!CAMPAIGN_OBJECTIVES.includes(objective as (typeof CAMPAIGN_OBJECTIVES)[number])) {
    return NextResponse.json({ reason: 'Unknown objective.' }, { status: 400 });
  }
  const platforms = Array.isArray(input.platforms) ? input.platforms.filter((p) => CAMPAIGN_PLATFORMS.includes(p as (typeof CAMPAIGN_PLATFORMS)[number])) : [];
  const budgetMinor = Number(input.budgetMinor);
  if (!Number.isSafeInteger(budgetMinor) || budgetMinor <= 0) {
    return NextResponse.json({ reason: 'Budget must be a positive integer (minor units).' }, { status: 400 });
  }
  const landing = typeof input.landingPageUrl === 'string' ? input.landingPageUrl : '';
  if (landing && !destinationValid(landing)) {
    return NextResponse.json({ reason: 'Landing must be HTTPS without credentials.' }, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    const { data: campaign, error } = await admin.from('knoux_growth_campaigns').upsert({
      ...(typeof input.id === 'string' && input.id ? { id: input.id } : {}),
      client_id: clientId, name, objective, budget_minor: budgetMinor,
      currency: ['AED', 'EGP', 'USD'].includes(String(input.currency)) ? String(input.currency) : 'AED',
      start_date: String(input.startDate ?? ''), end_date: String(input.endDate ?? ''),
      locations: Array.isArray(input.locations) ? input.locations.map(String).slice(0, 20) : [],
      languages: Array.isArray(input.languages) ? input.languages.filter((l) => l === 'ar' || l === 'en') : ['en'],
      audience_notes: String(input.audienceNotes ?? '').slice(0, 5000) || null,
      landing_page_url: landing || null,
      conversion_target: String(input.conversionTarget ?? '').slice(0, 500) || null,
      status: 'DRAFT', origin: 'LIVE',
    }, { onConflict: 'id' }).select('id').single();
    if (error || !campaign) return NextResponse.json({ reason: 'Campaign refused.' }, { status: 503 });
    const campaignId = String((campaign as Record<string, unknown>).id);
    await admin.from('knoux_growth_campaign_channels').delete().eq('campaign_id', campaignId);
    if (platforms.length > 0) {
      await admin.from('knoux_growth_campaign_channels').insert(
        platforms.map((platform) => ({ campaign_id: campaignId, platform: String(platform) })),
      );
    }
    await admin.from('knoux_growth_audit_log').insert({
      client_id: clientId, actor_id: guard.principal.userId, actor_label: 'Operator',
      action: 'CAMPAIGN_CHANGED', subject_type: 'campaign', subject_id: campaignId,
      detail: `Draft saved: ${name}; prior approval invalidated.`,
    });
    return NextResponse.json({ campaignId }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ reason: 'Store unavailable.' }, { status: 503 }); }
}
