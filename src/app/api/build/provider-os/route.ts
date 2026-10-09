import { type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { isBuildOperator } from '@/lib/build/operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProviderRepository, ProviderStorageError } from '@/lib/ai/provider-os/repository';
import { ProviderService, ProviderInputError } from '@/lib/ai/provider-os/service';
import { validIdentifier } from '@/lib/ai/provider-os/policy';
import { providerDefinitions } from '@/lib/ai/provider-os/definitions';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
function unavailable(state: string, message: string, status = 503) {
    return reply({ definitions: providerDefinitions(), profiles: [], credentials: [], agents: [], inventory: [], audit: [], workspaceId: null, persistence: state, secretStore: { writable: false, state }, operator: false, blocker: message, message, measuredAt: new Date().toISOString() }, status);
}
async function handle(request: NextRequest): Promise<Response> {
    if (request.method !== 'GET' && !checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok)
        return reply({ message: 'Cross-site provider mutation refused.' }, 403);
    const ownerId = await resolveBuildOwnerId();
    // Provider OS persistence always requires a verified account, including local development.
    if (!ownerId)
        return reply({ definitions: providerDefinitions(), profiles: [], credentials: [], agents: [], inventory: [], audit: [], workspaceId: null, persistence: 'AUTH_REQUIRED', secretStore: { writable: false, state: 'AUTH_REQUIRED' }, operator: false, blocker: 'Sign in to manage your provider profiles. Operator environment providers remain available through the canonical runtime.', measuredAt: new Date().toISOString() }, 401);
    const denied = await guardBuildApi(request, { scope: 'provider-os', session: async () => ({ id: ownerId }) });
    if (denied)
        return denied;
    const workspaceId = request.headers.get('x-knoux-workspace-id') ?? request.cookies.get('knoux-provider-workspace')?.value ?? ownerId;
    if (!validIdentifier(workspaceId))
        return reply({ message: 'Invalid workspace identity.' }, 400);
    try {
        const repository = new ProviderRepository(createAdminClient(), ownerId, workspaceId);
        await repository.ensureWorkspace();
        const service = new ProviderService(repository, isBuildOperator(ownerId));
        let selectedWorkspace = false;
        if (request.method === 'POST') {
            const input = await readBoundedJson(request, 32 * 1024);
            if (!input.ok)
                return reply({ message: 'Provider request body was refused.' }, input.reason === 'body-too-large' ? 413 : 400);
            if (!input.value || typeof input.value !== 'object' || Array.isArray(input.value))
                return reply({ message: 'Invalid provider command.' }, 400);
            await service.command(input.value as Record<string, unknown>);
            selectedWorkspace = (input.value as Record<string, unknown>).action === 'WORKSPACE_SELECT';
            // Secrets are write-only. No request data or database envelope is reflected.
        }
        const response = reply(await service.snapshot());
        if (selectedWorkspace)
            response.headers.append('set-cookie', `knoux-provider-workspace=${workspaceId}; Path=/api/build; HttpOnly; SameSite=Strict; Max-Age=86400${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`);
        return response;
    }
    catch (cause) {
        if (cause instanceof ProviderInputError)
            return reply({ message: cause.message }, cause.status);
        if (cause instanceof ProviderStorageError) {
            const response = unavailable(cause.code, cause.message, cause.code === 'CONFLICT' || cause.code === 'DEPENDENCY' ? 409 : 503);
            // A cookie from a previous account cannot select its workspace for this owner.
            // Clear that selection and require an explicit refresh; never retry a mutation.
            if (cause.code === 'BLOCKED' && !request.headers.has('x-knoux-workspace-id') && request.cookies.has('knoux-provider-workspace'))
                response.headers.append('set-cookie', 'knoux-provider-workspace=; Path=/api/build; HttpOnly; SameSite=Strict; Max-Age=0');
            return response;
        }
        return unavailable('CONFIG_REQUIRED', 'Provider persistence or secret storage is unavailable. No fixture was substituted.');
    }
}
export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }
