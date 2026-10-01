import { NextResponse } from 'next/server';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import type { SignalActivity } from '@/lib/signal/types';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { query?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const facts = normalizeSignalPhone(
    typeof body.query === 'string' ? body.query.slice(0, 80) : '',
    typeof body.country === 'string' ? body.country.slice(0, 3) : null,
  );
  if (!facts.valid || !facts.e164) {
    return NextResponse.json({ error: facts.reason ?? 'Invalid number.' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data, error } = await supabase.rpc('signal_my_activity', { p_phone: facts.e164 });
  if (error) {
    const ownerRequired = /verified_owner_required/i.test(error.message);
    return NextResponse.json(
      { error: ownerRequired ? 'Claim and verify this number first.' : 'Signal activity storage is unavailable.' },
      { status: ownerRequired ? 403 : 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, activity: data as SignalActivity },
    { headers: { 'cache-control': 'no-store' } },
  );
}
