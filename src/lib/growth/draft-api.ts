import 'server-only';
import { NextResponse } from 'next/server';
import { guardGrowth } from './auth/session';
import type { Permission } from './rbac';
import { createAdminClient } from '../supabase/admin';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '../contact/intake-guard';

export const validClientId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
export const validRecordId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function apiFailure(reason: string, status = 503, code?: string) {
  return NextResponse.json({ reason, ...(code ? { code } : {}) }, { status, headers: { 'cache-control': 'no-store' } });
}
export async function authorizeDraft(permission: Permission, clientId: string) {
  const result = await guardGrowth({ permission, clientId });
  return result.ok ? result : apiFailure(result.failure.message, result.failure.status, result.failure.code);
}
export async function readDraftRequest(request: Request) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return apiFailure('Cross-site refused.', 403);
  const body = await readBoundedJson(request, 32 * 1024);
  if (!body.ok) return apiFailure('Invalid draft body.', body.reason === 'body-too-large' ? 413 : 400);
  if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) return apiFailure('Invalid draft.', 400);
  const input = body.value as Record<string, unknown>;
  if (!validClientId(input.clientId)) return apiFailure('Choose a valid client.', 400);
  if (!input.id && !validRecordId(input.requestId)) return apiFailure('A save request ID is required.', 400);
  if (input.id !== undefined && !validRecordId(input.id)) return apiFailure('Invalid record ID.', 400);
  if (input.id && (typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt)))) return apiFailure('Reload the draft before editing.', 409);
  if (input.status !== undefined && input.status !== 'DRAFT') return apiFailure('Use the review workflow for status changes.', 403);
  return input;
}

/** The database owns locking, tenant checks, approval invalidation and audit. */
export async function persistDraft(kind: 'creative' | 'campaign', input: Record<string, unknown>, row: Record<string, unknown>, actorId: string) {
  try {
    const { data, error } = await createAdminClient().rpc(`knoux_growth_save_${kind}_draft`, {
      p_client: input.clientId, p_actor: actorId, p_id: input.id ?? null,
      p_expected: input.expectedUpdatedAt ?? null, p_input: { ...row, request_key: input.requestId ?? null },
    });
    if (error) {
      const status = ({ '42501': 403, P0002: 404, '40001': 409, '23505': 409, '22023': 400, '23514': 400, '22P02': 400, '22007': 400, '22008': 400 } as Record<string, number>)[error.code] ?? 503;
      return apiFailure(status === 503 ? 'Draft store unavailable; no save confirmed.' : status === 409 ? 'Draft changed. Reload before saving again.' : status === 404 ? 'Draft not found in this workspace.' : 'Draft refused.', status);
    }
    return NextResponse.json(kind === 'creative' ? { draft: data } : { campaignId: data.id, campaign: data }, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Draft store unavailable; no save confirmed.'); }
}


export async function listDrafts(request: { nextUrl: URL }, kind: 'creative' | 'campaign', fields: string) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!validClientId(clientId)) return apiFailure('Choose a valid client.', 400);
  const guard = await authorizeDraft(kind === 'creative' ? 'creative.view' : 'campaign.view', clientId);
  if (guard instanceof Response) return guard;
  try {
    const { data, error } = await createAdminClient().from(kind === 'creative' ? 'knoux_growth_creatives' : 'knoux_growth_campaigns')
      .select(fields).eq('client_id', clientId).order('updated_at', { ascending: false }).limit(200);
    if (error) return apiFailure('Drafts unavailable.');
    return NextResponse.json({ [kind === 'creative' ? 'drafts' : 'campaigns']: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Store unavailable.'); }
}
