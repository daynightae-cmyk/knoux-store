import 'server-only';
import type { ErrorCategory, NormalizedError } from './types';

/**
 * Error normalization. Converts provider-specific HTTP errors into a safe,
 * category-tagged structure. The `safeMessage` field is the only thing that
 * reaches the UI — it never contains secrets, tokens, or raw response bodies.
 */

const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /api[_-]?key[=:]\s*[A-Za-z0-9._\-]+/gi,
  /authorization["']?\s*[:=]\s*["']?[A-Za-z0-9._\-]+["']?/gi,
  /x-api-key["']?\s*[:=]\s*["']?[A-Za-z0-9._\-]+["']?/gi,
];

function redact(text: string): string {
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  // Limit length to avoid leaking large error bodies
  return result.slice(0, 500);
}

export function normalizeError(
  status: number | null,
  bodyText: string | null,
  defaultCategory: ErrorCategory = 'UNKNOWN',
): NormalizedError {
  let category: ErrorCategory = defaultCategory;
  let providerErrorId: string | null = null;
  let retryable = false;

  if (status !== null) {
    if (status === 401 || status === 403) {
      category = 'AUTHENTICATION';
      retryable = false;
    } else if (status === 429) {
      category = 'RATE_LIMIT';
      retryable = true;
    } else if (status === 404) {
      category = 'MODEL_NOT_FOUND';
      retryable = false;
    } else if (status === 400 || status === 422) {
      category = 'INVALID_REQUEST';
      retryable = false;
    } else if (status >= 500) {
      category = 'PROVIDER_5XX';
      retryable = true;
    } else if (status >= 300) {
      category = 'UNKNOWN';
      retryable = false;
    }
  }

  // Try to parse provider error details from body
  let rawMessage = bodyText ?? '';
  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      // OpenAI-style: { error: { message, code, type } }
      if (parsed?.error?.message) {
        rawMessage = parsed.error.message;
        providerErrorId = parsed.error.code ?? parsed.error.type ?? null;
      }
      // Anthropic-style: { error: { type, message } }
      else if (parsed?.error?.type && parsed?.error?.message) {
        rawMessage = parsed.error.message;
        providerErrorId = parsed.error.type;
      }
      // Google-style: { error: { code, message, status } }
      else if (parsed?.error?.message) {
        rawMessage = parsed.error.message;
        providerErrorId = parsed.error.status ?? null;
      }
      // Generic { message }
      else if (parsed?.message) {
        rawMessage = parsed.message;
      }
    } catch {
      // Body wasn't JSON, use raw text (will be redacted + truncated)
    }
  }

  // Override category based on message content
  const lower = rawMessage.toLowerCase();
  if (lower.includes('context') && (lower.includes('length') || lower.includes('overflow') || lower.includes('too long'))) {
    category = 'CONTEXT_OVERFLOW';
  } else if (lower.includes('rate limit') || lower.includes('quota') || lower.includes('too many requests')) {
    category = 'RATE_LIMIT';
    retryable = true;
  } else if (lower.includes('model') && (lower.includes('not found') || lower.includes('does not exist') || lower.includes('deprecated'))) {
    category = 'MODEL_NOT_FOUND';
  } else if (lower.includes('timeout') || lower.includes('timed out')) {
    category = 'TIMEOUT';
    retryable = true;
  } else if (lower.includes('aborted') || lower.includes('cancel')) {
    category = 'ABORTED';
    retryable = false;
  }

  const safeMessage = redact(rawMessage || `Provider returned HTTP ${status ?? 'unknown'}`);

  const messageMap: Record<ErrorCategory, string> = {
    AUTHENTICATION: 'Authentication failed. The API key is missing, invalid, or lacks permissions.',
    RATE_LIMIT: 'Rate limit reached. The provider is throttling requests.',
    MODEL_NOT_FOUND: 'The requested model does not exist or has been deprecated.',
    CONTEXT_OVERFLOW: 'The input exceeds the model context window.',
    TIMEOUT: 'The request timed out before the provider responded.',
    NETWORK: 'Could not reach the provider endpoint.',
    PROVIDER_5XX: 'The provider returned a server error.',
    INVALID_REQUEST: 'The request was rejected as invalid.',
    UNSUPPORTED_CAPABILITY: 'This provider or model does not support the requested capability.',
    ABORTED: 'The request was cancelled.',
    UNKNOWN: 'An unexpected error occurred.',
  };

  return {
    category,
    message: messageMap[category],
    safeMessage,
    httpStatus: status,
    providerErrorId,
    retryable,
  };
}

export function networkError(message: string): NormalizedError {
  return {
    category: 'NETWORK',
    message: 'Could not reach the provider endpoint.',
    safeMessage: redact(message),
    httpStatus: null,
    providerErrorId: null,
    retryable: false,
  };
}

export function timeoutError(): NormalizedError {
  return {
    category: 'TIMEOUT',
    message: 'The request timed out.',
    safeMessage: 'Request timed out before the provider responded.',
    httpStatus: null,
    providerErrorId: null,
    retryable: true,
  };
}

export function abortedError(): NormalizedError {
  return {
    category: 'ABORTED',
    message: 'The request was cancelled.',
    safeMessage: 'Request was cancelled by the user.',
    httpStatus: null,
    providerErrorId: null,
    retryable: false,
  };
}

export function unsupportedError(capability: string): NormalizedError {
  return {
    category: 'UNSUPPORTED_CAPABILITY',
    message: `Capability "${capability}" is not supported.`,
    safeMessage: `This provider or model does not support ${capability}.`,
    httpStatus: null,
    providerErrorId: null,
    retryable: false,
  };
}
