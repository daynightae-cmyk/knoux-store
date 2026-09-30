import { NextResponse } from 'next/server';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { query?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const facts = normalizeSignalPhone(
    typeof body.query === 'string' ? body.query.slice(0, 80) : '',
    typeof body.country === 'string' ? body.country.slice(0, 3) : null,
  );

  if (!facts.valid || !facts.e164) {
    return NextResponse.json({ error: 'Invalid number.' }, { status: 422, headers: { 'cache-control': 'no-store' } });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('signal_record_profile_view', { p_phone: facts.e164 });

  return NextResponse.json(
    error ? { recorded: false } : data,
    { status: error ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  );
}
