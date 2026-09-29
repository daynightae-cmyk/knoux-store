import { NextResponse } from 'next/server';
import {
  checkDeclaredLength,
  checkRequestOrigin,
  intakeRateLimit,
  readBoundedJson,
} from '@/lib/contact/intake-guard';

/**
 * Request intake.
 *
 * Validates and forwards only. The field set matches the unified request
 * engine, so a Composer stack, a WordPress goal and a direct contact all
 * arrive in the same shape.
 *
 * Delivery requires CONTACT_WEBHOOK_URL. Without it the endpoint returns 503
 * rather than pretending a message was received. No other transport, no
 * logging of message content, and no storage of submissions.
 *
 * Abuse controls are applied in the order that costs the least to a legitimate
 * caller: a cross-site browser request is refused before the body is read, an
 * oversized body is refused before it is buffered, and the per-address ceiling
 * is charged only once the request is otherwise going to be processed.
 */

const MAX_ITEMS = 24;
const MAX_CHANNELS = 12;

type Payload = {
  name: string;
  email: string;
  organisation: string;
  message: string;
  requestType: string;
  selectedItems: string[];
  preferredChannels: string[];
  budgetBand: string | null;
  timeline: string;
  sourceInput: string | null;
  entryRoute: string;
};

function cleanList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function refuse(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { error, delivered: false, ...extra },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const ownOrigin = new URL(request.url).origin;

  const origin = checkRequestOrigin(request.headers, ownOrigin);
  if (!origin.ok) {
    return refuse(403, 'This endpoint accepts submissions from the KNOuX site only.');
  }

  const declared = checkDeclaredLength(request.headers);
  if (!declared.ok) {
    return refuse(413, 'Submission is larger than this endpoint accepts.');
  }

  const limit = intakeRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again shortly.', delivered: false },
      {
        status: 429,
        headers: {
          'cache-control': 'no-store',
          'retry-after': String(limit.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    return refuse(body.reason === 'body-too-large' ? 413 : 400, 'Invalid request body.');
  }

  const data = body.value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return refuse(400, 'Invalid request body.');
  }

  const fields = data as Record<string, unknown>;

  // Honeypot submissions are accepted silently so bots do not learn the rule.
  if (cleanText(fields.website, 200)) {
    return NextResponse.json({ ok: true, delivered: false }, { headers: { 'cache-control': 'no-store' } });
  }

  const payload: Payload = {
    name: cleanText(fields.name, 100),
    email: cleanText(fields.email, 254),
    organisation: cleanText(fields.organisation, 160),
    message: cleanText(fields.message, 4000),
    requestType: cleanText(fields.requestType, 40) || 'custom',
    selectedItems: cleanList(fields.selectedItems, MAX_ITEMS),
    preferredChannels: cleanList(fields.preferredChannels, MAX_CHANNELS),
    budgetBand: typeof fields.budgetBand === 'string' ? fields.budgetBand.slice(0, 40) : null,
    timeline: cleanText(fields.timeline, 40),
    sourceInput: typeof fields.sourceInput === 'string' ? cleanText(fields.sourceInput, 500) : null,
    entryRoute: cleanText(fields.entryRoute, 200) || '/contact',
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
  if (
    payload.name.length < 2 ||
    !emailValid ||
    payload.message.length < 10 ||
    payload.message.length > 4000
  ) {
    return refuse(422, 'Request fields are invalid.');
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    return refuse(503, 'Request delivery is not configured on this deployment.');
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: 'knoux.store', receivedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Upstream responded ${response.status}`);
    return NextResponse.json(
      { ok: true, delivered: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return refuse(502, 'Delivery failed.');
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed.' },
    { status: 405, headers: { 'cache-control': 'no-store' } },
  );
}
