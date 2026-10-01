/**
 * Redaction — strip secrets from audit log entries and error messages.
 *
 * Any string matching /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i is redacted.
 * Paths outside the root are never included in client-facing errors.
 */

const SECRET_PATTERN = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)/i;

/** Redact a string — replace secret-like values with [REDACTED]. */
export function redactString(input: string): string {
  return input.replace(
    /((?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)[A-Z_]*)\s*[=:]\s*\S+/gi,
    '$1=[REDACTED]',
  );
}

/** Redact an error message — never leak paths or secrets. */
export function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactString(message);
}

/** Redact an object's string values recursively. */
export function redactObject<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      out[key] = redactString(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactObject(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/** Check if a string contains a secret-like pattern. */
export function containsSecret(input: string): boolean {
  return SECRET_PATTERN.test(input);
}
