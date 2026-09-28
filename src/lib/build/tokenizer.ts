/**
 * A small, dependency-free highlighter.
 *
 * KNOuX ships no editor dependency, and adding one would put the heaviest
 * tooling on the critical path for a surface that is read-only in the hosted
 * product. This tokenises well enough to make a file legible, and it never
 * injects markup: the result is a list of `{ text, kind }` spans that the
 * renderer turns into text nodes.
 *
 * There is no HTML string anywhere in this file, which is what keeps a source
 * file from becoming an injection vector.
 */

export type TokenKind = 'plain' | 'key' | 'str' | 'num' | 'com' | 'tag' | 'attr';

export type Token = { text: string; kind: TokenKind };

const KEYWORDS: Record<string, string[]> = {
  typescript: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'async', 'await',
    'class', 'extends', 'implements', 'interface', 'type', 'enum', 'new', 'if', 'else', 'for',
    'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'typeof',
    'instanceof', 'in', 'of', 'this', 'super', 'null', 'undefined', 'true', 'false', 'public',
    'private', 'protected', 'readonly', 'static', 'as', 'satisfies', 'keyof', 'infer', 'void',
    'never', 'unknown', 'any', 'string', 'number', 'boolean', 'symbol', 'yield', 'delete', 'do',
    'declare', 'namespace', 'abstract', 'implements', 'override', 'get', 'set',
  ],
  javascript: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'async', 'await',
    'class', 'extends', 'new', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
    'continue', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this',
    'super', 'null', 'undefined', 'true', 'false', 'default',
  ],
  css: ['import', 'media', 'supports', 'keyframes', 'from', 'to', 'and', 'not', 'only'],
};

KEYWORDS.markdown = ['#'];
KEYWORDS.yaml = ['true', 'false', 'null'];

function keywordsFor(language: string): string[] {
  return KEYWORDS[language] ?? [];
}

type Rule = { kind: TokenKind; pattern: RegExp };

/**
 * One combined pass. Order matters: comments and strings are matched before
 * numbers and keywords so a keyword inside a string is not highlighted.
 */
function rulesFor(language: string): Rule[] {
  const rules: Rule[] = [];
  if (language === 'typescript' || language === 'javascript') {
    rules.push(
      { kind: 'com', pattern: /\/\/[^\n]*/y },
      { kind: 'com', pattern: /\/\*[\s\S]*?\*\//y },
      { kind: 'str', pattern: /`(?:\\[\s\S]|[^`\\])*`/y },
      { kind: 'str', pattern: /"(?:\\[\s\S]|[^"\\\n])*"/y },
      { kind: 'str', pattern: /'(?:\\[\s\S]|[^'\\\n])*'/y },
    );
  }
  if (language === 'css') {
    rules.push({ kind: 'com', pattern: /\/\*[\s\S]*?\*\//y });
    rules.push({ kind: 'str', pattern: /"(?:\\[\s\S]|[^"\\\n])*"/y });
    rules.push({ kind: 'attr', pattern: /--[a-zA-Z][\w-]*/y });
  }
  if (language === 'json' || language === 'yaml') {
    rules.push({ kind: 'str', pattern: /"(?:\\[\s\S]|[^"\\\n])*"(?=\s*:)/y });
  }
  if (language === 'markdown' || language === 'text' || language === 'svg') {
    rules.push({ kind: 'com', pattern: /^#{1,6} [^\n]*/my });
  }
  return rules;
}

const NUMBERS = /(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
const IDENT = /[A-Za-z_$][\w$]*/y;

/**
 * Tokenise one line. Line-at-a-time is enough for a viewer and keeps the
 * output deterministic, which matters for snapshot-style tests.
 */
export function tokenizeLine(line: string, language: string): Token[] {
  const tokens: Token[] = [];
  const rules = rulesFor(language);
  const keywords = new Set(keywordsFor(language));
  let plain = '';
  let index = 0;

  const flush = () => {
    if (plain) {
      tokens.push({ text: plain, kind: 'plain' });
      plain = '';
    }
  };

  while (index < line.length) {
    let matched = false;

    for (const rule of rules) {
      rule.pattern.lastIndex = index;
      const found = rule.pattern.exec(line);
      if (found && found.index === index && found[0].length > 0) {
        flush();
        tokens.push({ text: found[0], kind: rule.kind });
        index += found[0].length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    NUMBERS.lastIndex = index;
    const number = NUMBERS.exec(line);
    if (number && number.index === index) {
      flush();
      tokens.push({ text: number[0], kind: 'num' });
      index += number[0].length;
      continue;
    }

    IDENT.lastIndex = index;
    const ident = IDENT.exec(line);
    if (ident && ident.index === index) {
      if (keywords.has(ident[0])) {
        flush();
        tokens.push({ text: ident[0], kind: 'key' });
      } else {
        plain += ident[0];
      }
      index += ident[0].length;
      continue;
    }

    plain += line[index];
    index += 1;
  }

  flush();
  return tokens;
}

/** Escape is unnecessary because tokens are rendered as text nodes, not HTML. */
export function tokenize(source: string, language: string): Token[][] {
  return source.split('\n').map((line) => tokenizeLine(line, language));
}

export function lineCount(source: string): number {
  return source.length === 0 ? 0 : source.split('\n').length;
}

/** Guard for the "line 1,204" readout. */
export function clampLine(line: number, total: number): number {
  if (!Number.isFinite(line)) return 1;
  return Math.max(1, Math.min(total, Math.trunc(line)));
}
