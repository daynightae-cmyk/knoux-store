import { NextResponse } from 'next/server';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { createClient } from '@/lib/supabase/server';
import { readSignalMutation } from '@/lib/signal/mutation-input';

export async function POST(request: Request) {
  const body = await readSignalMutation(request);
  if (body instanceof Response) return body;

  const facts = normalizeSignalPhone(
    typeof body.query === 'string' ? body.query.slice(0, 80) : '',
    typeof body.country === 'string' ? body.country.slice(0, 3) : null,
  );

  if (!facts.valid || !facts.e164 || !facts.nationalNumber) {
    return NextResponse.json({ error: facts.reason ?? 'Invalid number.' }, { status: 422 });
  }

  try {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
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
    const conflict = /verified_phone_required|already_claimed/i.test(error.message);
    return NextResponse.json({ error: message }, { status: conflict ? 409 : 503, headers: { 'cache-control': 'no-store' } });
  }
  if (!data) return NextResponse.json({ error: 'No claim receipt was returned. Retry after checking your account.' }, { status: 503 });

  return NextResponse.json(
    { ok: true, claim: data },
    { headers: { 'cache-control': 'no-store' } },
  );
  } catch {
    return NextResponse.json({ error: 'Signal claim storage is unavailable.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
