import { NextResponse } from 'next/server';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { createClient } from '@/lib/supabase/server';

const CATEGORIES = new Set(['spam', 'scam', 'sales', 'harassment', 'safe_business', 'other']);

export async function POST(request: Request) {
  const limit = rateLimit(`signal:report:${clientAddress(request.headers)}`, { max: 8, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Report limit reached.' }, { status: 429 });
  }

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
  const category = typeof body.category === 'string' && CATEGORIES.has(body.category)
    ? body.category
    : null;
  if (!facts.valid || !facts.e164 || !facts.nationalNumber || !category) {
    return NextResponse.json({ error: 'A valid number and report category are required.' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in before reporting.' }, { status: 401 });

  const { data, error } = await supabase.rpc('signal_report_reputation', {
    p_phone: facts.e164,
    p_country_code: facts.countryCode,
    p_national_number: facts.nationalNumber,
    p_line_type: facts.lineType,
    p_category: category,
  });

  return NextResponse.json(
    error ? { error: 'Signal report storage is unavailable.' } : { ok: true, report: data },
    { status: error ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  );
}
