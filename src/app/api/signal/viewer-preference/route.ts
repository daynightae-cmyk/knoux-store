import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { discloseVisits?: unknown; publicLabel?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const discloseVisits = body.discloseVisits === true;
  const publicLabel = typeof body.publicLabel === 'string'
    ? body.publicLabel.trim().slice(0, 80)
    : null;

  if (discloseVisits && (!publicLabel || publicLabel.length < 2)) {
    return NextResponse.json({ error: 'A public label is required when visit disclosure is enabled.' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data, error } = await supabase.rpc('signal_set_viewer_preference', {
    p_disclose_visits: discloseVisits,
    p_public_label: publicLabel,
  });

  return NextResponse.json(
    error ? { error: 'Signal viewer preference storage is unavailable.' } : { ok: true, preference: data },
    { status: error ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  );
}
