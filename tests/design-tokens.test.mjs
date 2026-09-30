import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

/**
 * The design tokens have exactly one authority, and that authority meets
 * contrast.
 *
 * Both of these were real defects that the automated accessibility suite found
 * and could not explain. `--dim` was failing 4.5:1 across the whole site, and
 * raising it changed nothing, because `globals.css` declared `:root` twice: a
 * minified block at the top and a readable one further down. The readable one
 * won, so the readable one was also the one every later edit went into, and the
 * fix was being applied to a definition that had already been superseded.
 *
 * A second layer of the same problem is literal colour. `#6d6e70` appeared in
 * six components and in the canvas palette as inline styles, so those surfaces
 * kept the old value regardless of what the token said. This test therefore
 * checks the *runtime* surface, not just the stylesheet: the tokens, the
 * literals that bypass them, and the arithmetic behind them.
 */

/* ------------------------------------------------------------------ contrast */

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio, rounded to two places. */
export function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

const globals = readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf8');

/** Every surface a text token is ever painted on. */
const SURFACES = ['#08090a', '#0b0c0e', '#0d0e10', '#101113', '#16171a', '#17171a'];

function token(name) {
  const match = globals.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1]?.toLowerCase() ?? null;
}

test('every text token clears 4.5:1 on every surface it is used on', () => {
  // These are the tokens applied to body copy, metadata, labels and hints.
  // `--dim` is the one that failed: it was #6d6e70, which is 3.90:1 on --bg.
  const TEXT_TOKENS = ['text', 'text-dim', 'muted', 'dim', 'violet', 'violet-dim'];

  for (const name of TEXT_TOKENS) {
    const colour = token(name);
    assert.ok(colour, `--${name} must be defined in globals.css`);

    for (const surface of SURFACES) {
      const ratio = contrast(colour, surface);
      assert.ok(
        ratio >= 4.5,
        `--${name} (${colour}) is ${ratio}:1 on ${surface}. Normal text needs 4.5:1.`,
      );
    }
  }
});

/* ------------------------------------------------------------ single authority */

test('the palette is declared in exactly one :root block', () => {
  const blocks = [...globals.matchAll(/(^|[\s,{};])[: ]root\s*\{/gm)];
  assert.equal(
    blocks.length,
    1,
    `globals.css declares :root ${blocks.length} times. A second definition silently ` +
      `overrides the first, so the effective value of every token depends on ` +
      `source order and nothing records that. Keep one.`,
  );
});

test('no colour token is defined twice in the token authority', () => {
  /**
   * Scoped to the `:root` block, because that is the only place a token is
   * *declared* rather than overridden. A descendant rule such as
   * `.chamber__figure-dock { --chamber-stand: 16vw }` is a legitimate scoped
   * override, and a media query narrowing a value at a breakpoint is the
   * mechanism the design uses. Counting those as duplicates would be wrong, and
   * a test that cries wolf is a test that gets deleted.
   */
  const rootBlock = globals.slice(globals.indexOf(':root {'));
  const end = rootBlock.indexOf('}');
  const declarations = rootBlock.slice(0, end);

  const seen = new Map();
  const duplicates = [];
  for (const match of declarations.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    seen.set(match[1], (seen.get(match[1]) ?? 0) + 1);
    if (seen.get(match[1]) === 2) duplicates.push(match[1]);
  }

  assert.deepEqual(
    duplicates,
    [],
    `the :root block declares these tokens more than once: ${duplicates.join(', ')}. ` +
      `Within one block the later declaration simply wins, so the first is dead.`,
  );
});

/* ------------------------------------------------------------------- literals */

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full);
  }
  return out;
}

test('no component bypasses the palette with a superseded colour', () => {
  /**
   * Scoped deliberately.
   *
   * A blanket ban on hex would fail on legitimate uses: code that draws to a
   * canvas or resolves a 3D material cannot read a CSS variable, and the
   * `UNIVERSE_PALETTE` mirror is covered by its own test below. What this
   * catches is the specific failure that occurred — a colour that a token
   * already defines, written as an inline style, left behind at the value the
   * token used to have. Six components and the canvas palette were still
   * carrying `#6d6e70` after the token moved to `#8a8c8f`, which is why the
   * same grey was readable in HTML and failed contrast in a caption beside it.
   */
  const superseded = ['#6d6e70', '#6f5f8f', '#45464a', '#77707d', '#8f8893', '#796c84'];
  const current = new Set(
    ['bg', 'surface', 'panel', 'text', 'text-dim', 'muted', 'dim', 'violet', 'violet-dim']
      .map((name) => token(name))
      .filter(Boolean),
  );

  const offenders = [];
  for (const file of sourceFiles(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8');
    // Comments are stripped: these files now *name* the superseded values in
    // order to explain them, and the rule is about code.
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .toLowerCase();

    for (const colour of superseded) {
      if (current.has(colour)) continue;
      if (code.includes(colour)) offenders.push(`${file.replace(root, '.')}: ${colour}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these files still carry a superseded token value, so they do not follow the palette:\n  ${offenders.join('\n  ')}`,
  );
});

test('the canvas palette mirrors the CSS tokens', () => {
  /**
   * `UNIVERSE_PALETTE` is a hand-maintained copy of the tokens for code that
   * draws to a canvas, where a CSS variable does not exist. A copy that drifts
   * renders the same colour twice at two different contrasts, which is exactly
   * what axe then reports as a failure on one and not the other.
   */
  const palette = readFileSync(join(root, 'src', 'lib', 'universePalette.ts'), 'utf8');
  const pairs = [
    ['void', 'bg'],
    ['panel', 'panel-2'],
    ['text', 'text'],
    ['silver', 'text-dim'],
    ['muted', 'muted'],
    ['dim', 'dim'],
    ['line', 'line'],
    ['violet', 'violet'],
    ['violetSoft', 'violet-soft'],
    ['violetDeep', 'violet-dim'],
  ];

  for (const [key, cssToken] of pairs) {
    const match = palette.match(new RegExp(`\\b${key}:\\s*'(#[0-9a-fA-F]{6})'`));
    assert.ok(match, `UNIVERSE_PALETTE.${key} must be a hex literal`);
    assert.equal(
      match[1].toLowerCase(),
      token(cssToken),
      `UNIVERSE_PALETTE.${key} is ${match[1]} but --${cssToken} is ${token(cssToken)}. ` +
        `A canvas cannot read a CSS variable, so this file is the copy — it has to be kept equal.`,
    );
  }
});
