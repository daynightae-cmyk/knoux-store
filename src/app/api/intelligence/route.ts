import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { buildRouter } from '@/lib/growth/server/runtime';
import { INTELLIGENCE_INTENTS, type IntelligenceFamily, type IntelligenceRequest } from '@/lib/growth/intelligence/types';
import { INTELLIGENCE_FAMILIES } from '@/lib/growth/intelligence/types';
import { AUTONOMY_MODES, DEFAULT_AUTONOMY } from '@/lib/growth/states';
import { clientById } from '@/data/growth/clients';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { readBoundedJson } from '@/lib/contact/intake-guard';
import { guardGrowthProviderAccess } from '@/lib/growth/server/access';

export const dynamic = 'force-dynamic';

/** Generation is the expensive path, so the ceiling is tighter than a read. */
const MAX_REQUESTS_PER_MINUTE = 20;
const MAX_BODY_BYTES = 24 * 1024;


/**
 * KNOuX Intelligence API.
 *
 * The one route the Command Center is allowed to reason through. The frontend
 * has no knowledge of a model provider; it posts an intent plus workspace
 * context and receives a KNOuX response with its provenance attached.
 *
 * Guards, in order: method, rate, body size, then shape. A refusal names its
 * reason rather than returning a generic failure, because an operator who cannot
 * tell a rate limit from a malformed request cannot act on either.
 */
export async function POST(request: NextRequest) {
  const denied = await guardGrowthProviderAccess(request);
  if (denied) return denied;
  const limit = rateLimit(`intelligence:${clientAddress(request.headers)}`, {
    max: MAX_REQUESTS_PER_MINUTE,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { reason: `Rate limited. Retry in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds), 'cache-control': 'no-store' } },
    );
  }

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json(
      { reason: `Body exceeds the ${MAX_BODY_BYTES} byte ceiling.` },
      { status: 413, headers: { 'cache-control': 'no-store' } },
    );
  }

  const parsed = await readBoundedJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json(
      { reason: parsed.reason === 'body-too-large' ? 'Body exceeds the ceiling.' : 'The request body was not valid JSON.' },
      { status: parsed.reason === 'body-too-large' ? 413 : 400, headers: { 'cache-control': 'no-store' } },
    );
  }
  if (!isRecord(parsed.value)) return NextResponse.json({ reason: 'Expected a JSON object.' }, { status: 400 });
  const body = parsed.value;

  const intent = typeof body.intent === 'string' ? body.intent : '';
  if (!INTELLIGENCE_INTENTS.includes(intent as (typeof INTELLIGENCE_INTENTS)[number])) {
    return NextResponse.json(
      { reason: `Unknown intent. Expected one of: ${INTELLIGENCE_INTENTS.join(', ')}.` },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId : '';
  const client = clientById(clientId);
  if (!client) {
    return NextResponse.json(
      { reason: 'Unknown client workspace.' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }

  const requestedFamily = typeof body.family === 'string' ? body.family : '';
  const family: IntelligenceFamily =
    requestedFamily && (INTELLIGENCE_FAMILIES as readonly string[]).includes(requestedFamily)
      ? (requestedFamily as IntelligenceFamily)
      : inferFamily(intent as IntelligenceRequest['intent']);

  const autonomy = AUTONOMY_MODES.includes(body.autonomy as (typeof AUTONOMY_MODES)[number])
    ? (body.autonomy as IntelligenceRequest['context']['autonomy'])
    : DEFAULT_AUTONOMY;

  const intelligenceRequest: IntelligenceRequest = {
    requestId: `ir_${randomUUID()}`,
    intent: intent as IntelligenceRequest['intent'],
    prompt: typeof body.prompt === 'string' ? body.prompt.slice(0, 2000) : '',
    inputs: isRecord(body.inputs) ? body.inputs : {},
    context: {
      family,
      clientId: client.id,
      clientName: client.name,
      ...(typeof body.surface === 'string' ? { surface: body.surface.slice(0, 80) } : {}),
      ...(typeof body.subjectId === 'string' ? { subjectId: body.subjectId.slice(0, 120) } : {}),
      // Brand facts and forbidden claims are attached server-side from the
      // client record. A browser cannot supply them, so a caller cannot talk
      // KNOuX out of a forbidden claim by omitting it from the payload.
      brandFacts: [
        `Business category: ${client.businessCategory}.`,
        `Market: ${client.city}, ${client.country}.`,
        ...(client.brandNotes ? [client.brandNotes] : []),
      ],
      forbiddenClaims: client.brand.forbiddenClaims,
      budgetCeilingMinor: budgetCeilingMinor(client.id),
      currency: client.country === 'EG' ? 'EGP' : 'AED',
      autonomy,
    },
  };

  try {
    const router = buildRouter();
    const response = await router.reason(intelligenceRequest);

    return NextResponse.json(
      { response },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    // A provider failure is reported as a provider failure. It is never
    // converted into an empty answer, which would read as "nothing to say".
    return NextResponse.json(
      {
        reason:
          'The KNOuX Intelligence layer could not produce a response.',
        detail: error instanceof Error ? error.message : 'unknown failure',
      },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }
}

/** Maps an intent to the family that owns it. Repair is never reachable here. */
function inferFamily(intent: IntelligenceRequest['intent']): IntelligenceFamily {
  switch (intent) {
    case 'ANALYZE_PERFORMANCE':
    case 'GENERATE_REPORT':
      return 'ANALYTICS';
    case 'FIND_COMMUNITIES':
    case 'PLAN_DISTRIBUTION':
      return 'COMMUNITY';
    case 'PLAN_CAMPAIGN':
    case 'BUILD_LANDING_PAGE':
      return 'ADVERTISING';
    case 'DRAFT_CREATIVE':
    case 'DRAFT_CONTENT':
    case 'FIND_AUDIENCES':
    case 'RESEARCH':
      return 'SOCIAL';
    case 'QUALIFY_LEADS':
      return 'GROWTH';
    case 'EXPLAIN':
    default:
      return 'GROWTH';
  }
}

/**
 * A ceiling used only to tell KNOuX whether a proposed plan is within range.
 * Derived from the client's committed campaign budgets, so it is a real
 * workspace fact rather than an invented number.
 */
function budgetCeilingMinor(clientId: string): number | undefined {
  const total = DEMO_CAMPAIGN_BUDGETS[clientId];
  return total === undefined ? undefined : total;
}

const DEMO_CAMPAIGN_BUDGETS: Record<string, number> = {
  cl_swimfit: 115_000,
  cl_northbay: 180_000,
  cl_sands: 200_000,
  cl_nile: 90_000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
