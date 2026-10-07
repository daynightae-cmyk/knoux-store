/**
 * Redaction — the one place a credential stops being visible.
 *
 * Three surfaces reach this: provider error text on the server, browser console
 * capture in the workspace preview, and anything a route echoes back. All three
 * previously carried their own private pattern list, and all three leaked
 * something: `Authorization: Bearer …` and every bare JWT passed straight
 * through, because a regex anchored on `\b` does not fire inside
 * `META_APP_SECRET` — an underscore is a word character — and because a
 * credential with no label in front of it has nothing for a label pattern to
 * match.
 *
 * Two kinds of input have to be distinguished.
 *
 *   1. A credential, matched either by its label (`META_APP_SECRET=…`,
 *      `client secret: …`) or by its shape alone (a bearer token, a JWT, a
 *      provider token, a long hex key). Shape matters because provider error
 *      bodies very often contain a token and nothing that says "this is one".
 *   2. Ordinary prose — a budget, a campaign name, a date, a client id. It has
 *      to survive byte-for-byte. A diagnostic that reads "the detail was
 *      removed" is worse than no diagnostic, because it looks like a record.
 *
 * Pure and framework-free, so it can be asserted on directly and imported from
 * either side of the server/client boundary.
 */

/**
 * A credential label, then `=` or `:`.
 *
 * The `[_\-. ]*` joins are what make `META_APP_SECRET=` and `app secret:` both
 * match. They are separators, not word boundaries, precisely because `\b` is
 * silent in the middle of an underscore-joined name.
 */
// Scan delimiters once, so an ordinary field never consumes a later secret.
const SENSITIVE_LABEL = /(?:key|token|secret|password|passwd|pwd|credential|authorization|bearer|session|cookie|signature|auth|sig)$/i;
const LABEL_CHAR = /[A-Za-z0-9_.-]/;
const VALUE_END = /[\s,;)\]}]/;

/** Scan each assignment separator once; a nonsensitive field cannot swallow a later secret. */
function redactAssignments(input: string): string {
  let output = '';
  let copied = 0;
  for (let separator = 0; separator < input.length; separator++) {
    if (input[separator] !== ':' && input[separator] !== '=') continue;
    let labelEnd = separator - 1;
    while (labelEnd >= 0 && (input[labelEnd] === ' ' || input[labelEnd] === '\t')) labelEnd--;
    if (input[labelEnd] === '"' || input[labelEnd] === "'") labelEnd--;
    let labelStart = labelEnd;
    while (labelStart >= 0 && LABEL_CHAR.test(input[labelStart])) labelStart--;
    if (!SENSITIVE_LABEL.test(input.slice(labelStart + 1, labelEnd + 1))) continue;

    let valueStart = separator + 1;
    while (input[valueStart] === ' ' || input[valueStart] === '\t') valueStart++;
    let valueEnd = valueStart;
    const quote = input[valueStart] === '"' || input[valueStart] === "'" ? input[valueStart] : null;
    if (quote) {
      valueEnd++;
      while (valueEnd < input.length && input[valueEnd] !== quote) {
        if (input[valueEnd] === '\\') valueEnd++;
        valueEnd++;
      }
      if (valueEnd < input.length) valueEnd++;
    } else {
      while (valueEnd < input.length && !VALUE_END.test(input[valueEnd])) valueEnd++;
    }
    if (valueEnd <= valueStart) continue;
    output += input.slice(copied, valueStart) + '[REDACTED]';
    copied = valueEnd;
    separator = valueEnd - 1;
  }
  return output + input.slice(copied);
}

/**
 * A bare `UPPER_SNAKE` name that names a credential class, whatever follows it.
 * Covers a name appearing in prose or a JSON fragment where the separator is
 * not `=`.
 */
const CREDENTIAL_ENV_NAME =
  /\b[A-Z][A-Z0-9]*_(?:SECRET|SECRET_KEY|TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|APIKEY|KEY|CREDENTIALS?|WEBHOOK_SECRET|APP_ID|CLIENT_ID)\b/g;

/** Bearer credentials, with or without a label in front of them. */
const BEARER = /\bBearer[ \t]+[\w.~+\/=\-]+/gi;

/** A three-segment JWT. */
const JWT = /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{5,}\b/g;

/** Tokens whose prefix identifies them: OpenAI, Stripe, webhook signing, Slack, GitHub, Vercel, Supabase, Resend. */
const PREFIXED_TOKEN =
  /\b(?:sk|pk|rk|whsec|xoxb|xoxp|gh[pousr]|sbp|sb_secret|vercel|re_[A-Za-z0-9]{8,})[-_][A-Za-z0-9_-]{8,}\b/g;

/** A Meta marketing access token — `EA…` / `EAA…`, which carries no separator. */
const META_TOKEN = /\bEAA?[A-Za-z0-9]{20,}\b/g;

/** A long hex run: a fingerprint, a checksum, or a key in hex. */
const LONG_HEX = /\b[0-9a-f]{32,}\b/gi;

/** Redact a string, preserving prose. */
export function redactSecrets(input: string): string {
  // `Bearer` runs first on purpose. `AUTHORIZATION=Bearer abc123` is two
  // labelled tokens, and if the label rule runs first it consumes the word
  // `Bearer` as the value and leaves the credential itself in the clear.
  return redactAssignments(input.replace(BEARER, 'Bearer [REDACTED]'))
    .replace(CREDENTIAL_ENV_NAME, '[REDACTED_ENV_NAME]')
    .replace(JWT, '[REDACTED_JWT]')
    .replace(PREFIXED_TOKEN, '[REDACTED]')
    .replace(META_TOKEN, '[REDACTED]')
    .replace(LONG_HEX, '[REDACTED_HEX]');
}