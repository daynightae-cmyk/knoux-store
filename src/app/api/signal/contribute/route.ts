import { NextResponse } from 'next/server';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { createClient } from '@/lib/supabase/server';

const CATEGORIES = new Set(['personal', 'business', 'professional', 'service', 'other']);

export async function POST(request: Request) {
  const limit = rateLimit(`signal:contribute:${clientAddress(request.headers)}`, { max: 12, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Contribution limit reached. Try again later.' },
      { status: 429, headers: { 'cache-control': 'no-store', 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Sign in before contributing a label.' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const query = typeof body.query === 'string' ? body.query.slice(0, 80) : '';
  const country = typeof body.country === 'string' ? body.country.slice(0, 3) : null;
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) : '';
  const category = typeof body.category === 'string' && CATEGORIES.has(body.category) ? body.category : 'other';
  const language = typeof body.language === 'string' ? body.language.slice(0, 12) : 'und';
  const facts = normalizeSignalPhone(query, country);

  if (!facts.valid || !facts.e164 || !facts.nationalNumber || label.length < 2) {
    return NextResponse.json({ error: 'A valid number and label are required.' }, { status: 422, headers: { 'cache-control': 'no-store' } });
  }

  const { data, error } = await supabase.rpc('signal_contribute_alias', {
    p_phone: facts.e164,
    p_country_code: facts.countryCode,
    p_national_number: facts.nationalNumber,
    p_label: label,
    p_language: language,
    p_category: category,
  });

  if (error) {
    const consentBlocked = /target_not_opted_in/i.test(error.message);
    return NextResponse.json(
      { error: consentBlocked ? 'This number has not opted in to community aliases.' : 'Signal contribution storage is unavailable.' },
      { status: consentBlocked ? 409 : 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json({ ok: true, contribution: data }, { headers: { 'cache-control': 'no-store' } });
}
