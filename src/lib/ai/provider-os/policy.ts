import type { ProviderConnection, PermissionPolicy } from './types';
import { AGENT_PERMISSIONS } from './types';
export const EMPTY_CONNECTION: ProviderConnection = {
    configuration: 'CONFIG_REQUIRED', auth: 'UNTESTED', discovery: 'UNTESTED', runtime: 'UNTESTED',
    streaming: 'UNTESTED', health: 'UNTESTED', lastTestedAt: null, lastSuccessAt: null,
    lastErrorCategory: null, blocker: 'Configure and test this profile before routing.',
};
export function defaultPermissions(): PermissionPolicy {
    return Object.fromEntries(AGENT_PERMISSIONS.map(id => [id, 'DENY'])) as PermissionPolicy;
}
export function validIdentifier(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function validName(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 80 && !/[\x00-\x1f\x7f]/.test(value);
}
export function validSecret(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 1 && value.length <= 8192 && !/[\r\n\x00]/.test(value) && value === value.trim();
}
export function routingEligibility(profile: import('./types').ProviderProfile, configured: boolean): {
    eligible: boolean;
    reason: string;
} {
    if (!profile.enabled)
        return { eligible: false, reason: 'PROVIDER_DISABLED — configuration and credential are preserved.' };
    if (!profile.active)
        return { eligible: false, reason: 'PROFILE_INACTIVE — select this profile explicitly.' };
    if (!profile.routing.automatic)
        return { eligible: false, reason: 'AUTO_DISABLED — profile policy permits manual routing only.' };
    if (!configured)
        return { eligible: false, reason: 'CONFIG_REQUIRED — credential source is missing or revoked.' };
    if (profile.routing.monthlySpendLimit !== null)
        return { eligible: false, reason: 'LIMIT_UNKNOWN — routing is blocked until durable usage can enforce the configured spending ceiling.' };
    if (profile.connection.auth !== 'AUTHENTICATED')
        return { eligible: false, reason: 'AUTH_REQUIRED — test connection.' };
    if (profile.connection.discovery !== 'DISCOVERY_VERIFIED' || !profile.models.some(m => m.modalities.text && m.lifecycle !== 'deprecated'))
        return { eligible: false, reason: 'MODEL_UNAVAILABLE — discover a Build-eligible model.' };
    if (['FAILED', 'BLOCKED', 'RATE_LIMITED', 'DEGRADED'].includes(profile.connection.runtime))
        return { eligible: false, reason: `${profile.connection.lastErrorCategory ?? profile.connection.runtime} — resolve the measured provider refusal and test again.` };
    return { eligible: true, reason: 'Eligible for canonical Router V2; context and model capabilities are checked per request.' };
}
