import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', delivered: false }, { status: 400 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return NextResponse.json({ error: 'Invalid request body.', delivered: false }, { status: 400 });
  }

  const fields = data as Record<string, unknown>;

  // Honeypot submissions are accepted silently so bots do not learn the rule.
  if (cleanText(fields.website, 200)) {
    return NextResponse.json({ ok: true, delivered: false });
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
    return NextResponse.json({ error: 'Request fields are invalid.', delivered: false }, { status: 422 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { error: 'Request delivery is not configured on this deployment.', delivered: false },
      { status: 503 },
    );
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
    return NextResponse.json({ ok: true, delivered: true });
  } catch {
    return NextResponse.json({ error: 'Delivery failed.', delivered: false }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
