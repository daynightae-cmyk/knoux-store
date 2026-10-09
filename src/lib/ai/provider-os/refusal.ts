/** Fixed repair guidance. Never reflects a raw provider error or a credential. */
export function refusal(category: string | null, httpStatus: number | null = null): {
    category: string;
    message: string;
} {
    if (httpStatus === 402)
        return { category: 'BILLING_REQUIRED', message: 'BILLING_REQUIRED — provider credit or billing policy refused execution. Review the provider account yourself; KNOuX does not change billing.' };
    if (httpStatus === 429 || category === 'RATE_LIMIT')
        return { category: 'RATE_LIMITED', message: 'RATE_LIMITED — wait for the provider’s measured reset, if supplied, or review its quota. Unknown reset times remain UNKNOWN.' };
    if (httpStatus === 403)
        return { category: 'PERMISSION_DENIED', message: 'PERMISSION_DENIED — verify account entitlement and credential scope. No broader credential is substituted.' };
    if (category === 'AUTHENTICATION' || httpStatus === 401)
        return { category: 'AUTH_REQUIRED', message: 'AUTH_REQUIRED — replace the credential or complete the supported authentication flow, then test again.' };
    if (category === 'MODEL_NOT_FOUND')
        return { category: 'MODEL_UNAVAILABLE', message: 'MODEL_UNAVAILABLE — refresh discovery and explicitly select a model accessible to this profile.' };
    if (category === 'NETWORK' || category === 'TIMEOUT')
        return { category: category, message: 'Provider endpoint is unreachable. Verify the endpoint, server host policy and network, then test again.' };
    return { category: category ?? 'UNKNOWN', message: 'Provider refused this operation. Review the safe category and configuration before explicitly retrying.' };
}
