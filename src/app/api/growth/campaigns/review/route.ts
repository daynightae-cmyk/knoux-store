import { type NextRequest } from 'next/server';
import { apiFailure, authorizeDraft, validClientId, validRecordId } from '@/lib/growth/draft-api';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { can } from '@/lib/growth/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const campaignId = request.nextUrl.searchParams.get('campaignId');
  if (!validClientId(clientId) || !validRecordId(campaignId)) return apiFailure('Choose a valid client and campaign.', 400);
  const access = await authorizeDraft('campaign.view', clientId);
  if (access instanceof Response) return access;
  try {
    const { data, error } = await createAdminClient().from('knoux_growth_campaign_approvals').select('*')
      .eq('client_id', clientId).eq('campaign_id', campaignId).order('requested_at', { ascending: false }).limit(25);
    if (error) return apiFailure('Review history unavailable.');
    return Response.json({ approvals: data ?? [], actorId: access.principal.userId,
      canSubmit: can({ principal: access.principal, clientId, permission: 'campaign.submit' }).allowed,
      canReview: can({ principal: access.principal, clientId, permission: 'campaign.approve' }).allowed,
    }, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Review history unavailable.'); }
}

export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return apiFailure('Cross-site refused.', 403);
  const body = await readBoundedJson(request, 4096);
  if (!body.ok || !body.value || typeof body.value !== 'object' || Array.isArray(body.value)) return apiFailure('Invalid review body.', !body.ok && body.reason === 'body-too-large' ? 413 : 400);
  const input = body.value as Record<string, unknown>;
  if (!validClientId(input.clientId) || !validRecordId(input.campaignId) ||
    typeof input.action !== 'string' || !['SUBMIT', 'APPROVE', 'REQUEST_CHANGES', 'REJECT', 'WITHDRAW'].includes(input.action) ||
    typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt)) ||
    (input.action !== 'SUBMIT' && !validRecordId(input.approvalId)) ||
    (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 2000))) return apiFailure('A valid action, campaign revision and review record are required.', 400);
  const access = await authorizeDraft(input.action === 'SUBMIT' || input.action === 'WITHDRAW' ? 'campaign.submit' : 'campaign.approve', input.clientId);
  if (access instanceof Response) return access;
  try {
    const { data, error } = await createAdminClient().rpc('knoux_growth_review_campaign', {
      p_client: input.clientId, p_actor: access.principal.userId, p_campaign: input.campaignId,
      p_expected: input.expectedUpdatedAt, p_action: input.action, p_approval: input.approvalId ?? null, p_note: input.note ?? null,
    });
    if (error) {
      const status = ({ '42501': 403, P0002: 404, '40001': 409, '22023': 400 } as Record<string, number>)[error.code] ?? 503;
      return apiFailure(status === 409 ? 'Campaign or review changed. Reload before reviewing again.' : status === 503 ? 'Review storage unavailable; no decision confirmed.' : status === 403 ? 'This action requires an authorized, separate reviewer.' : status === 404 ? 'Campaign or review not found in this workspace.' : 'Complete and save the campaign before review.', status);
    }
    if (!data?.campaign || !data?.approval) return apiFailure('No durable review receipt was returned.');
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch { return apiFailure('Review storage unavailable; no decision confirmed.'); }
}
