import { NextResponse } from 'next/server';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { searchPublicPhoneMentions } from '@/lib/signal/providers/public-search';
import type { SignalLookupPayload, SignalLookupResponse } from '@/lib/signal/types';
import { createClient } from '@/lib/supabase/server';

const MAX_BODY_BYTES = 2048;

function noStore(body: SignalLookupResponse, status = 200) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return noStore({
      ok: false,
      query: normalizeSignalPhone(''),
      data: null,
      storage: { available: false, reason: 'Request is too large.' },
      providers: { community: 'unavailable', licensedIdentity: 'not_configured', publicSearch: 'not_configured' },
    }, 413);
  }

  const limit = rateLimit(`signal:lookup:${clientAddress(request.headers)}`, { max: 20 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many lookups. Try again shortly.' },
      { status: 429, headers: { 'cache-control': 'no-store', 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  let body: { query?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const query = typeof body.query === 'string' ? body.query.slice(0, 80) : '';
  const country = typeof body.country === 'string' ? body.country.slice(0, 3) : null;
  const facts = normalizeSignalPhone(query, country);

  if (!facts.valid || !facts.e164 || !facts.nationalNumber) {
    return noStore({
      ok: false,
      query: facts,
      data: null,
      storage: { available: true },
      providers: { community: 'unavailable', licensedIdentity: 'not_configured', publicSearch: 'not_configured' },
    }, 422);
  }

  const supabase = await createClient();
  const [storageResult, publicSearch] = await Promise.all([
    supabase.rpc('signal_lookup_safe', {
      p_phone: facts.e164,
      p_country_code: facts.countryCode,
      p_national_number: facts.nationalNumber,
      p_line_type: facts.lineType,
    }),
    searchPublicPhoneMentions(facts.e164, facts.nationalNumber),
  ]);
  const { data, error } = storageResult;

  if (error) {
    return noStore({
      ok: true,
      query: facts,
      data: {
        number: {
          e164: facts.e164,
          countryCode: facts.countryCode,
          nationalNumber: facts.nationalNumber,
          lineType: facts.lineType,
        },
        profile: null,
        aliases: [],
        reputation: {},
        publicMentions: publicSearch.mentions,
      },
      storage: { available: false, reason: 'Signal storage is not active on this deployment yet.' },
      providers: { community: 'unavailable', licensedIdentity: 'not_configured', publicSearch: publicSearch.status },
    });
  }

  const payload = data as Omit<SignalLookupPayload, 'publicMentions'>;
  return noStore({
    ok: true,
    query: facts,
    data: { ...payload, publicMentions: publicSearch.mentions },
    storage: { available: true },
    providers: { community: 'live', licensedIdentity: 'not_configured', publicSearch: publicSearch.status },
  });
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405, headers: { 'cache-control': 'no-store' } });
}
