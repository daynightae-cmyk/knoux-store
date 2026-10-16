import { NextResponse, type NextRequest } from 'next/server';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { destinationValid } from '@/lib/growth/studio';

/** Creative drafts: guarded service-role writes, tenant-scoped, idempotent. */
export const dynamic = 'force-dynamic';

const FIELDS = 'id,client_id,campaign_id,format,concept,headline,primary_text,description,cta,languages,ai_generated,status,media_asset_id,origin,created_at,updated_at';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId') ?? '';
  if (!clientId) return NextResponse.json({ reason: 'Choose a client.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'creative.view', clientId });
  if (!guard.ok) return NextResponse.json({ code: guard.failure.code }, { status: guard.failure.status });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('knoux_growth_creatives')
      .select(`${FIELDS},knoux_growth_media_assets!left(storage_path,mime_type)`)
      .eq('client_id', clientId).order('updated_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ reason: 'Drafts unavailable.' }, { status: 503 });
    return NextResponse.json({ drafts: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ reason: 'Store unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) {
    return NextResponse.json({ reason: 'Cross-site refused.' }, { status: 403 });
  }
  const body = await readBoundedJson(request, 32 * 1024);
  if (!body.ok || typeof body.value !== 'object' || !body.value) {
    return NextResponse.json({ reason: 'Invalid draft.' }, { status: 400 });
  }
  const input = body.value as Record<string, unknown>;
  const clientId = typeof input.clientId === 'string' ? input.clientId : '';
  if (!clientId) return NextResponse.json({ reason: 'Choose a client.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'creative.create', clientId });
  if (!guard.ok) return NextResponse.json({ code: guard.failure.code }, { status: guard.failure.status });
  const headline = String(input.headline ?? '').slice(0, 500);
  const primaryText = String(input.primaryText ?? '').slice(0, 5000);
  const destination = typeof input.destination === 'string' ? input.destination : '';
  if (destination && !destinationValid(destination)) {
    return NextResponse.json({ reason: 'Destination must be HTTPS without credentials.' }, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    if (input.mediaAssetId) {
      const { data: asset } = await admin.from('knoux_growth_media_assets')
        .select('id').eq('id', String(input.mediaAssetId)).eq('client_id', clientId).maybeSingle();
      if (!asset) return NextResponse.json({ reason: 'Media asset not in this workspace.' }, { status: 403 });
    }
    const row = {
      client_id: clientId,
      ...(typeof input.id === 'string' && input.id ? { id: input.id } : {}),
      ...(typeof input.campaignId === 'string' && input.campaignId ? { campaign_id: input.campaignId } : {}),
      concept: String(input.concept ?? headline ?? 'Untitled').slice(0, 500),
      headline: headline || null, primary_text: primaryText || null,
      description: String(input.description ?? '').slice(0, 5000) || null,
      cta: String(input.cta ?? '').slice(0, 120) || null,
      languages: Array.isArray(input.languages) ? input.languages.filter((l) => l === 'ar' || l === 'en') : ['en'],
      ...(input.mediaAssetId ? { media_asset_id: String(input.mediaAssetId) } : {}),
      status: 'DRAFT', reviewed_by: null, origin: 'LIVE',
    };
    const { data, error } = await admin.from('knoux_growth_creatives').upsert(row, { onConflict: 'id' }).select(FIELDS).single();
    if (error) return NextResponse.json({ reason: 'Draft was refused.' }, { status: 503 });
    await admin.from('knoux_growth_audit_log').insert({
      client_id: clientId, actor_id: guard.principal.userId, actor_label: 'Operator',
      action: 'CAMPAIGN_CHANGED', subject_type: 'creative', subject_id: String((data as Record<string, unknown>).id),
      detail: 'Creative draft saved; prior approval invalidated.',
    });
    return NextResponse.json({ draft: data }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ reason: 'Store unavailable.' }, { status: 503 }); }
}
