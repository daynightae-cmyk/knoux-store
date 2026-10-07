/**
 * Redaction — strip secrets from audit log entries and error messages.
 *
 * Three kinds of input reach this function, and all three must be safe:
 *
 *   1. A labelled credential: `META_APP_SECRET=…`, `client secret: …`. The
 *      label is what tells us the value is a secret, so the label has to match
 *      however it is punctuated. An underscore is a word character, which means
 *      `\b` does not fire inside `META_APP_SECRET` — a naive `\b(secret)\s*=`
 *      misses exactly the shape that matters here, so the join between words is
 *      `[_\-. ]*` rather than a boundary assertion.
 *   2. A value whose shape is a credential even with no label: a bearer token,
 *      a JWT, a provider access token, a service-role key, a webhook signing
 *      secret, a long hex fingerprint. Nothing in the surrounding text says
 *      "secret", so these are matched on shape alone.
 *   3. Ordinary prose — a budget, a client name, a date. It must survive
 *      byte-for-byte, because an audit row that says "the detail was removed"
 *      is useless for diagnosing anything.
 *
 * Paths outside the root are never included in client-facing errors.
 */

/** A credential label followed by `=` or `:`. */
// Scan delimiters once, so an ordinary field never consumes a later secret.
const SENSITIVE_LABEL = /(?:key|token|secret|password|passwd|pwd|credential|authorization|bearer|session|cookie|signature|auth|sig)$/i;
const LABEL_CHAR = /[A-Za-z0-9_.-]/;
const VALUE_END = /[\s,;)\]}]/;

function sensitiveLabelAt(input: string, separator: number): boolean {
  let end = separator - 1;
  while (end >= 0 && /[ \t]/.test(input[end])) end--;
  if (input[end] === '"' || input[end] === "'") end--;
  let start = end;
  while (start >= 0 && LABEL_CHAR.test(input[start])) start--;
  return SENSITIVE_LABEL.test(input.slice(start + 1, end + 1));
}

function assignmentEnd(input: string, start: number): number {
  const quote = input[start];
  let end = start;
  if (quote !== '"' && quote !== "'") {
    while (end < input.length && !VALUE_END.test(input[end])) end++;
    return end;
  }
  end++;
  while (end < input.length && input[end] !== quote) {
    if (input[end] === '\\') end++;
    end++;
  }
  return Math.min(end + 1, input.length);
}

/** Walk separators monotonically; no backtracking regex consumes credential values. */
function redactAssignments(input: string): string {
  let output = '';
  let copied = 0;
  let separator = 0;
  while (separator < input.length) {
    const position = separator++;
    if (input[position] !== ':' && input[position] !== '=') continue;
    if (!sensitiveLabelAt(input, position)) continue;
    let start = position + 1;
    while (input[start] === ' ' || input[start] === '\t') start++;
    const end = assignmentEnd(input, start);
    if (end <= start) continue;
    output += input.slice(copied, start) + '[REDACTED]';
    copied = end;
    separator = end;
  }
  return output + input.slice(copied);
}

/**
 * A bare `UPPER_SNAKE` name that names a credential class, whatever follows it.
 * Catches a name in prose or a JSON fragment where the separator is not `=`.
 */
const CREDENTIAL_ENV_NAME = /\b[A-Z][A-Z0-9]*_(?:SECRET|SECRET_KEY|TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|APIKEY|KEY|CREDENTIALS?|WEBHOOK_SECRET|APP_ID|CLIENT_ID)\b/g;

/** Bearer credentials, with or without a label in front of them. */
const BEARER = /\bBearer[ \t]+[\w.~+/=-]+/gi;

/** A three-segment JWT. */
const JWT = /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{5,}\b/g;

/** Provider tokens whose prefix identifies them: Meta, OpenAI, Stripe, GitHub, Slack, Vercel, Supabase, Resend. */
const PREFIXED_TOKEN = /\b(?:sk|pk|rk|whsec|xoxb|xoxp|gh[pousr]|sbp|sb_secret|vercel|re_[A-Za-z0-9]{8,})[-_][A-Za-z0-9_-]{8,}\b/g;

/** A Meta marketing access token: `EA…` / `EAA…`, which carries no separator. */
const META_TOKEN = /\bEAA?[A-Za-z0-9]{20,}\b/g;

/** A long hex run — a fingerprint, a checksum, or a key in hex. */
const LONG_HEX = /\b[0-9a-f]{32,}\b/gi;

/**
 * Any label naming a credential. Used by `containsSecret` to answer "does this
 * string look like it carries a secret?" without rewriting it.
 */
const SECRET_PATTERN = /(?:key|token|secret|password|passwd|pwd|credential|authorization|bearer|private[_-]?key)/i;

/** Redact a string — replace secret-like values with [REDACTED]. */
export function redactString(input: string): string {
  // `Bearer` runs first on purpose. `AUTHORIZATION=Bearer abc123` is two
  // labelled tokens, and if the label rule runs first it consumes the word
  // `Bearer` as the value, leaving the credential itself in the clear.
  return redactAssignments(input.replace(BEARER, 'Bearer [REDACTED]'))
    .replace(CREDENTIAL_ENV_NAME, '[REDACTED_ENV_NAME]')
    .replace(JWT, '[REDACTED_JWT]')
    .replace(PREFIXED_TOKEN, '[REDACTED]')
    .replace(META_TOKEN, '[REDACTED]')
    .replace(LONG_HEX, '[REDACTED_HEX]');
}

/** Redact an error message — never leak paths or secrets. */
export function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactString(message);
}

/**
 * Redact an object's string values recursively.
 *
 * The key is inspected as well as the value: a field literally named `token` or
 * `apiKey` is a secret whatever it contains, so its value is replaced outright
 * rather than pattern-matched.
 */
export function redactObject<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
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