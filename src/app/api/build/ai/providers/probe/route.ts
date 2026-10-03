import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { getAdapter, updateHealth } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

/** POST /api/build/ai/providers/probe — explicit auth probe for one provider. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-probe' });
  if (denied) return denied;

  let body: { provider?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected provider id.' }, { status: 400 }); }

  const providerId = body.provider;
  if (!providerId) return NextResponse.json({ message: 'Expected provider id.' }, { status: 400 });

  const adapter = getAdapter(providerId);
  if (!adapter) return NextResponse.json({ message: `Unknown provider: ${providerId}` }, { status: 404 });

  if (!adapter.isConfigured(process.env)) {
    return NextResponse.json({
      providerId,
      authenticated: false,
      detail: `Provider not configured. Set ${adapter.requiredEnv.join(' and ')} on the server.`,
      latencyMs: 0,
    });
  }

  const result = await adapter.probe(process.env);

  // Update health record
  updateHealth(providerId, {
    auth: result.authenticated ? 'AUTHENTICATED' : 'FAILED',
    lastError: result.error ? { category: result.error.category, safeMessage: result.error.safeMessage } : null,
    latencyMs: result.latencyMs,
  });

  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
}
