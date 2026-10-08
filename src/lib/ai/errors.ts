import "server-only";
import type { ErrorCategory, NormalizedError } from "./types";

/**
 * Error normalization. Converts provider-specific HTTP errors into a safe,
 * category-tagged structure. The `safeMessage` field is the only thing that
 * reaches the UI — it never contains secrets, tokens, or raw response bodies.
 */

import { redactSecrets } from "@/lib/security/redact";

function redact(text: string): string {
  // Limit length to avoid leaking large error bodies. Truncating after
  // redaction, so a credential that straddles the cut is still removed.
  return redactSecrets(text).slice(0, 500);
}

/**
 * Return the first argument that is a non-empty string, or null.
 *
 * Provider error envelopes carry their machine-readable identifier under
 * different keys depending on the vendor (`code` for OpenAI and Google, `type`
 * for OpenAI and Anthropic, `status` for Google). Google sends `code` as a
 * number, which is not an identifier string and is therefore never reported
 * as one.
 */
function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/**
 * The operator-facing explanation for each category. Shared by every
 * constructor so a category always reads the same way wherever it surfaces.
 */
const DEFAULT_MESSAGES: Record<ErrorCategory, string> = {
  AUTHENTICATION:
    "Authentication failed. The API key is missing, invalid, or lacks permissions.",
  RATE_LIMIT: "Rate limit reached. The provider is throttling requests.",
  MODEL_NOT_FOUND: "The requested model does not exist or has been deprecated.",
  CONTEXT_OVERFLOW: "The input exceeds the model context window.",
  TIMEOUT: "The request timed out before the provider responded.",
  NETWORK: "Could not reach the provider endpoint.",
  PROVIDER_5XX: "The provider returned a server error.",
  INVALID_REQUEST: "The request was rejected as invalid.",
  UNSUPPORTED_CAPABILITY:
    "This provider or model does not support the requested capability.",
  ABORTED: "The request was cancelled.",
  UNKNOWN: "An unexpected error occurred.",
};

export function normalizeError(
  status: number | null,
  bodyText: string | null,
  defaultCategory: ErrorCategory = "UNKNOWN",
): NormalizedError {
  let category: ErrorCategory = defaultCategory;
  let providerErrorId: string | null = null;
  let retryable = false;

  if (status !== null) {
    if (status === 401 || status === 403) {
      category = "AUTHENTICATION";
      retryable = false;
    } else if (status === 429) {
      category = "RATE_LIMIT";
      retryable = true;
    } else if (status === 404) {
      category = "MODEL_NOT_FOUND";
      retryable = false;
    } else if (status === 400 || status === 422) {
      category = "INVALID_REQUEST";
      retryable = false;
    } else if (status >= 500) {
      category = "PROVIDER_5XX";
      retryable = true;
    } else if (status >= 300) {
      category = "UNKNOWN";
      retryable = false;
    }
  }

  // Try to parse provider error details from body
  let rawMessage = bodyText ?? "";
  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      // Provider error envelopes. OpenAI, Anthropic and Google all nest the
      // human-readable text under `error.message`, so a single branch covers
      // all three; only the key holding the identifier differs per vendor. The
      // identifier is taken in a documented order of precedence and only when
      // it really is a string.
      if (typeof parsed?.error?.message === "string") {
        rawMessage = parsed.error.message;
        providerErrorId =
          firstString(
            parsed.error.code,
            parsed.error.type,
            parsed.error.status,
          ) ?? null;
      }
      // Generic { message }
      else if (typeof parsed?.message === "string") {
        rawMessage = parsed.message;
      }
    } catch {
      // Body wasn't JSON, use raw text (will be redacted + truncated)
    }
  }

  // Override category based on message content
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("context") &&
    (lower.includes("length") ||
      lower.includes("overflow") ||
      lower.includes("too long"))
  ) {
    category = "CONTEXT_OVERFLOW";
  } else if (
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("too many requests")
  ) {
    category = "RATE_LIMIT";
    retryable = true;
  } else if (
    lower.includes("model") &&
    (lower.includes("not found") ||
      lower.includes("does not exist") ||
      lower.includes("deprecated"))
  ) {
    category = "MODEL_NOT_FOUND";
  } else if (lower.includes("timeout") || lower.includes("timed out")) {
    category = "TIMEOUT";
    retryable = true;
  } else if (lower.includes("aborted") || lower.includes("cancel")) {
    category = "ABORTED";
    retryable = false;
  }

  const safeMessage = redact(
    rawMessage || `Provider returned HTTP ${status ?? "unknown"}`,
  );

  return {
    category,
    message: DEFAULT_MESSAGES[category],
    safeMessage,
    httpStatus: status,
    providerErrorId,
    retryable,
  };
}

export function networkError(message: string): NormalizedError {
  return {
    category: "NETWORK",
    message: "Could not reach the provider endpoint.",
    safeMessage: redact(message),
    httpStatus: null,
    providerErrorId: null,
    retryable: false,
  };
}

/**
 * The single canonical constructor for a locally-generated NormalizedError.
 *
 * Provider responses go through `normalizeError`. Everything else — a missing
 * credential, a refused fallback, an unconfigured transport — goes through
 * this. It exists so that no call site can hand-roll a partial error object
 * and silently drop `message`, `httpStatus`, `providerErrorId` or `retryable`.
 * The category decides the retry contract; the caller may override it only
 * when it has measured evidence.
 */
export function createNormalizedError(
  category: ErrorCategory,
  safeMessage: string,
  options: {
    message?: string;
    httpStatus?: number | null;
    providerErrorId?: string | null;
    retryable?: boolean;
  } = {},
): NormalizedError {
  const retryableByCategory: Record<ErrorCategory, boolean> = {
    AUTHENTICATION: false,
    RATE_LIMIT: true,
    MODEL_NOT_FOUND: false,
    CONTEXT_OVERFLOW: false,
    TIMEOUT: true,
    NETWORK: true,
    PROVIDER_5XX: true,
    INVALID_REQUEST: false,
    UNSUPPORTED_CAPABILITY: false,
    ABORTED: false,
    UNKNOWN: false,
  };

  return {
    category,
    message: options.message ?? DEFAULT_MESSAGES[category],
    safeMessage: redact(safeMessage),
    httpStatus: options.httpStatus ?? null,
    providerErrorId: options.providerErrorId ?? null,
    retryable: options.retryable ?? retryableByCategory[category],
  };
}

export function timeoutError(): NormalizedError {
  return {
    category: "TIMEOUT",
    message: "The request timed out.",
    safeMessage: "Request timed out before the provider responded.",
    httpStatus: null,
    providerErrorId: null,
    retryable: true,
  };
}

export function abortedError(): NormalizedError {
  return {
    category: "ABORTED",
    message: "The request was cancelled.",
    safeMessage: "Request was cancelled by the user.",
    httpStatus: null,
    providerErrorId: null,
    retryable: false,
  };
}
