import { NextResponse, type NextRequest } from 'next/server';
import { assertFQDN } from '@/lib/domain/shared';
import { publicRequestOrigin, checkRequestOrigin } from '@/lib/contact/intake-guard';

export const dynamic = 'force-dynamic';
/** Existing registrar adapters expose search only. Never convert availability into a purchase. */
export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return NextResponse.json({ state: 'BLOCKED' }, { status: 403 });
  let body: { domain?: unknown }; try { body = await request.json(); } catch { return NextResponse.json({ state: 'INVALID' }, { status: 400 }); }
  if (typeof body.domain !== 'string' || !assertFQDN(body.domain).ok) return NextResponse.json({ state: 'INVALID', message: 'Select a valid domain from the search results.' }, { status: 400 });
  return NextResponse.json({ state: 'REGISTRATION_REQUIRES_OPERATOR', domain: body.domain, receipt: null, externalReference: null, dns: 'UNTESTED', siteConnection: 'NOT_CONNECTED', message: 'No safe server registration adapter is configured. Review current availability and pricing with the registrar, then explicitly authorize the purchase through its operator workflow. No charge or registration request was made.' }, { status: 409, headers: { 'cache-control': 'no-store' } });
}
