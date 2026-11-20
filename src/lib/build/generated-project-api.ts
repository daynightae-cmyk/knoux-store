import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from './api-guard';
import { isBuildOperator } from './operator';
import { GENERATED_PROJECT_MAX_ARTIFACT_BYTES } from './generated-project-contract.ts';

export function generationEnabled() {
  return process.env.KNOUX_BUILD_ALLOW_GENERATION === '1' && Boolean(process.env.KNOUX_GENERATED_PROJECTS_ROOT);
}

export function generationRoot() {
  const root = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (!root || process.env.KNOUX_BUILD_ALLOW_GENERATION !== '1') throw new Error('Generated project execution is disabled. Configure a trusted local KNOUX_GENERATED_PROJECTS_ROOT and KNOUX_BUILD_ALLOW_GENERATION=1.');
  return root;
}

export async function requireGeneratedOperator(request: NextRequest, mutation: boolean) {
  const denied = await guardBuildApi(request, { scope: 'generated-project' });
  if (denied) return { denied };
  const origin = request.headers.get('origin');
  const sameOrigin = origin ? origin === request.nextUrl.origin : !mutation && request.headers.get('sec-fetch-site') === 'same-origin';
  const ownerId = sameOrigin ? await resolveBuildOwnerId() : null;
  if (!ownerId || !isBuildOperator(ownerId)) {
    return { denied: NextResponse.json({ error: 'generation-forbidden', message: 'Generated project writes require a same-origin authenticated operator in KNOUX_BUILD_OPERATOR_IDS.' }, { status: 403, headers: { 'cache-control': 'no-store' } }) };
  }
  if (!generationEnabled()) {
    return { denied: NextResponse.json({ error: 'generation-disabled', message: 'Structured static generation is disabled on this host. Configure KNOUX_BUILD_ALLOW_GENERATION=1 and a dedicated KNOUX_GENERATED_PROJECTS_ROOT on the trusted local server.' }, { status: 503, headers: { 'cache-control': 'no-store' } }) };
  }
  return { ownerId };
}

export async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  const maximum = GENERATED_PROJECT_MAX_ARTIFACT_BYTES + 2048;
  if (length > maximum) throw new Error('Generated request exceeds its transport limit.');
  if (!request.body) throw new Error('A generated JSON request is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new Error('Generated request exceeds its transport limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const input = new TextDecoder().decode(Buffer.concat(chunks));
  try { return JSON.parse(input); } catch { throw new Error('Expected a JSON generated-project request.'); }
}
