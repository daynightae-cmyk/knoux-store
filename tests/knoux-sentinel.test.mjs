import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import { root } from './helpers.mjs';

const read = (file) => readFileSync(join(root, file), 'utf8');

const model = read('src/components/identity/knoux-sentinel.ts');
const view = read('src/components/identity/KnouxSentinel.tsx');
const css = read('src/components/identity/knoux-sentinel.css');
const pointer = read('src/components/motion/PointerField.tsx');
const layout = read('src/app/layout.tsx');
const globals = read('src/app/globals.css');

test('Sentinel sources never roll Math.random', () => {
  for (const [name, source] of [
    ['model', model],
    ['view', view],
    ['css', css],
  ]) {
    assert.doesNotMatch(source, /Math\.random/, `${name} must stay deterministic`);
  }
});

test('blink schedule is the authored sequence', () => {
  assert.match(model, /BLINK_GAPS = \[4800, 6000, 5400, 7100\]/);
  assert.match(model, /BLINK_MS = 140/);
  assert.match(model, /SLEEP_AFTER_MS = 60_000/);
});

test('ten visual states exist as one component', () => {
  for (const state of [
    'idle',
    'look-left',
    'look-right',
    'curious',
    'blink',
    'focus',
    'alert',
    'critical',
    'active',
    'sleep',
  ]) {
    assert.match(model, new RegExp(`'${state}'`));
    assert.match(css, new RegExp(`data-state='${state}'`));
  }
  assert.match(view, /data-knoux-sentinel/);
  assert.match(view, /aria-hidden="true"/);
  assert.match(css, /pointer-events:\s*none/);
});

test('there is one pointer owner, not a second follower', () => {
  assert.match(layout, /KnouxSentinel/);
  assert.doesNotMatch(layout, /KnouxLivingCompanion/);
  assert.match(pointer, /export \{ KnouxSentinel as KnouxLivingCompanion \}/);
  assert.equal(
    pointer
      .replace(/'use client';\s*/, '')
      .trim()
      .split('\n')
      .filter(Boolean).length,
    1,
    'PointerField must only re-export the Sentinel',
  );
  assert.match(view, /pointermove/);
  assert.match(view, /data-spatial/);
  assert.doesNotMatch(view, /window\.addEventListener\('scroll', hide/);
  assert.doesNotMatch(globals, /\.knoux-companion/);
});

test('shards are authored, not generated at runtime', () => {
  assert.match(model, /export const SHARDS = \[/);
  const shards = model.match(/\{ x: /g) ?? [];
  assert.equal(shards.length, 7);
  assert.match(css, /@keyframes ks-drift/);
});

test('semantic colour only maps to real UI signals', () => {
  assert.match(model, /form-status--error/);
  assert.match(model, /form-status--unconfigured/);
  assert.match(model, /auth-status--error/);
  assert.match(model, /button-primary/);
  assert.match(model, /action--primary/);
  assert.match(css, /pointer: coarse/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-ready='true'/);
});

test('sleep is a closed-eye rest state, not a blink override', () => {
  assert.match(model, /if \(input\.mood === 'sleep'\) return 'sleep'/);
  assert.match(view, /sleeping = true/);
  assert.match(view, /mouseleave/);
  assert.match(view, /pointer: coarse/);
  assert.doesNotMatch(view, /fine\.matches && !reduced/);
});
