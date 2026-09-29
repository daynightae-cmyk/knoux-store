import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Source with comments and string literals stripped.
 *
 * A `doesNotMatch` over raw source is a test of the prose, not the code: this
 * file's own comment explaining why `arrayBuffer()` is bad would otherwise fail
 * the assertion that `arrayBuffer()` is gone. A behavioural test asserts on
 * behaviour; where a source assertion is genuinely the right tool — that a
 * module is imported, that a route calls the guard — it should be reading the
 * code and not the commentary.
 */
export function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}
