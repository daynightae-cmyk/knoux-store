import { NextResponse } from 'next/server';
import { normalizeSignalPhone } from '@/lib/signal/phone';
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

  if (!facts.valid || !facts.e164 || !facts.nationalNumber) {
    return NextResponse.json({ error: facts.reason ?? 'Invalid number.' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data, error } = await supabase.rpc('signal_claim_number', {
    p_phone: facts.e164,
    p_country_code: facts.countryCode,
    p_national_number: facts.nationalNumber,
    p_line_type: facts.lineType,
  });

  if (error) {
    const message = /verified_phone_required/i.test(error.message)
      ? 'Verify this number on your signed-in account before claiming it.'
      : /already_claimed/i.test(error.message)
        ? 'This number is already claimed.'
        : 'Signal claim storage is unavailable.';
    return NextResponse.json({ error: message }, { status: 409, headers: { 'cache-control': 'no-store' } });
  }

  return NextResponse.json(
    { ok: true, claim: data },
    { headers: { 'cache-control': 'no-store' } },
  );
}
