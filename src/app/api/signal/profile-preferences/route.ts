import { NextResponse } from 'next/server';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { createClient } from '@/lib/supabase/server';

const VISIBILITY = new Set(['standard', 'limited', 'hidden']);
const KINDS = new Set(['person', 'business']);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const facts = normalizeSignalPhone(
    typeof body.query === 'string' ? body.query.slice(0, 80) : '',
    typeof body.country === 'string' ? body.country.slice(0, 3) : null,
  );
  const visibility = typeof body.visibility === 'string' && VISIBILITY.has(body.visibility)
    ? body.visibility
    : 'standard';
  const profileKind = typeof body.profileKind === 'string' && KINDS.has(body.profileKind)
    ? body.profileKind
    : null;
  if (!facts.valid || !facts.e164) {
    return NextResponse.json({ error: facts.reason ?? 'Invalid number.' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const { data, error } = await supabase.rpc('signal_set_profile_preferences', {
    p_phone: facts.e164,
    p_allow_community_aliases: body.allowCommunityAliases === true,
    p_visibility: visibility,
    p_display_name: typeof body.displayName === 'string' ? body.displayName.slice(0, 120) : null,
    p_business_name: typeof body.businessName === 'string' ? body.businessName.slice(0, 160) : null,
    p_profile_kind: profileKind,
  });

  return NextResponse.json(
    error ? { error: 'Signal profile preference storage is unavailable.' } : { ok: true, profile: data },
    { status: error ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  );
}
