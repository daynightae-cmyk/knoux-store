import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import ts from 'typescript';
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

test('the capability layer reads KNOuX instead of inventing capability', () => {
  const capability = read('src/components/identity/sentinel-capability.ts');
  assert.match(capability, /from '@\/lib\/knouxMark'/);
  assert.match(capability, /from '@\/data\/software'/);
  assert.match(capability, /MARK_PATHS/);
  assert.match(capability, /parseMarkPath/);
  assert.doesNotMatch(capability, /Math\.random/);
  for (const fn of [
    'sentinelMarkGlyph',
    'sentinelCore',
    'sentinelRegistry',
    'capabilityFor',
    'auraFor',
    'litShards',
  ]) {
    assert.match(capability, new RegExp(`export function ${fn}\\(`));
  }
});

test('the Sentinel is constituted from the canonical mark geometry', () => {
  const capability = read('src/components/identity/sentinel-capability.ts');
  assert.match(capability, /MARK_VIEW_BOX/);
  assert.match(capability, /GLYPH_BOX/);
  assert.match(capability, /path\.id === 'dot'/);
  assert.match(view, /sentinelMarkGlyph/);
  assert.match(view, /sentinelCore/);
  assert.match(view, /className="ks-mark"/);
  assert.match(view, /className="ks-core"/);
  assert.match(css, /\.ks-mark__p/);
  assert.match(css, /\.ks-core/);
  assert.match(css, /@keyframes ks-mark-breathe/);
  assert.match(css, /@keyframes ks-core-pulse/);
});

test('telemetry is counted from the real registry and exposed honestly', () => {
  assert.match(view, /sentinelRegistry\(\)/);
  assert.match(view, /data-records=/);
  assert.match(view, /data-shipped=/);
  assert.match(view, /data-shards=/);
  assert.match(view, /data-lit=/);
  assert.match(css, /\[data-lit='true'\]/);
  assert.match(css, /\[data-lit='false'\]/);
  assert.match(css, /\[data-capability='traversing'\]/);
  assert.match(css, /\[data-capability='guarding'\]/);
  assert.match(css, /\[data-capability='shipping'\]/);
  assert.match(css, /\[data-capability='dormant'\]/);
});

test('capability reflexes only name surfaces that really exist', () => {
  for (const surface of [
    'build-composer-orb',
    'composer-intelligence',
    'composer-readout__stack',
    'assembly__items',
    'palette__result',
    'palette__empty',
  ]) {
    assert.ok(model.includes(surface), `Sentinel model must react to ${surface}`);
  }
  const composer = read('src/components/Composer.tsx');
  const palette = read('src/components/CommandPalette.tsx');
  for (const surface of [
    'build-composer-orb',
    'composer-intelligence',
    'composer-readout__stack',
    'assembly__items',
  ]) {
    assert.ok(composer.includes(surface), `${surface} must exist in Composer`);
  }
  assert.ok(palette.includes('palette__result'));
  assert.ok(palette.includes('palette__empty'));
});

test('the mark reading is not serialised into the document payload', () => {
  assert.match(view, /useSyncExternalStore/);
  assert.match(view, /const hydrated = useIsHydrated\(\)/);
  assert.match(view, /\{hydrated \? \(/);
  assert.match(view, /className="ks-mark"/);
  assert.match(view, /data-knoux-sentinel/);
});

test('reduced motion still silences every new animated element', () => {
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  for (const selector of ['.ks-mark', '.ks-mark__p', '.ks-core', '.ks-core-halo']) {
    assert.ok(block.includes(selector), `${selector} must be covered by the reduced-motion block`);
  }
});

function load(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const require = (specifier) => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function('require', 'module', 'exports', output)(require, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const mark = load('src/lib/knouxMark.ts');
const software = load('src/data/software.ts');
const entities = load('src/lib/entities.ts');
const capabilityModule = load('src/components/identity/sentinel-capability.ts', {
  '@/lib/knouxMark': mark,
  '@/data/software': software,
  '@/lib/entities': entities,
});

const EXPECTED_SENTINEL_SHELL = { width: 80, height: 100 };

test('the glyph is a real reading of the canonical mark, inside the shell', () => {
  const glyph = capabilityModule.sentinelMarkGlyph(96);
  assert.equal(glyph.length, 96);
  const { GLYPH_BOX } = capabilityModule;
  assert.match(view, /<svg viewBox="0 0 80 100"/);
  for (const point of glyph) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(
      point.x >= GLYPH_BOX.x - 0.6 && point.x <= GLYPH_BOX.x + GLYPH_BOX.width + 0.6,
      `x ${point.x} escaped the glyph box`,
    );
    assert.ok(
      point.y >= GLYPH_BOX.y - 0.6 && point.y <= GLYPH_BOX.y + GLYPH_BOX.height + 0.6,
      `y ${point.y} escaped the glyph box`,
    );
    assert.ok(point.x >= 0 && point.x <= EXPECTED_SENTINEL_SHELL.width, 'glyph stayed inside the shell width');
    assert.ok(point.y >= 0 && point.y <= EXPECTED_SENTINEL_SHELL.height, 'glyph stayed inside the shell height');
    assert.ok(point.r > 0 && point.r < 2, 'particle radius is renderable');
  }
  assert.ok(glyph.some((p) => p.violet), 'KNOuX violet energy particles are present');
  assert.ok(new Set(glyph.map((p) => p.group)).size >= 3, 'the reading spans the canonical components');
});

test('the glyph is deterministic and budget-clamped', () => {
  const a = capabilityModule.sentinelMarkGlyph(64);
  const b = capabilityModule.sentinelMarkGlyph(64);
  assert.deepEqual(a, b, 'the same budget must always produce the same mark reading');
  assert.equal(capabilityModule.sentinelMarkGlyph(0).length, 8, 'a tiny budget is floored, never empty');
  assert.equal(capabilityModule.sentinelMarkGlyph(9999).length, 320, 'an absurd budget is capped');
  assert.notDeepEqual(a, capabilityModule.sentinelMarkGlyph(65));
});

test('KNOuX Core is the real centroid of the canonical dot path', () => {
  const core = capabilityModule.sentinelCore();
  assert.ok(Number.isFinite(core.x) && Number.isFinite(core.y));
  const { GLYPH_BOX } = capabilityModule;
  assert.ok(core.x >= GLYPH_BOX.x && core.x <= GLYPH_BOX.x + GLYPH_BOX.width, 'core sits inside the glyph box');
  assert.ok(core.y >= GLYPH_BOX.y && core.y <= GLYPH_BOX.y + GLYPH_BOX.height, 'core sits inside the glyph box');
  assert.equal(capabilityModule.sentinelCore(), core, 'core is a stable singleton');

  const dot = mark.parseMarkPath(mark.MARK_PATHS.find((p) => p.id === 'dot').d);
  const minX = Math.min(...dot.map(([x]) => x));
  const maxX = Math.max(...dot.map(([x]) => x));
  assert.ok(minX > 150 && maxX > 250, 'the canonical dot is the right-hand circular node');
  const centre = GLYPH_BOX.x + GLYPH_BOX.width / 2;
  assert.ok(core.x > centre, 'the core stays right of the glyph centre, as the canonical dot is');
  assert.ok(core.r > 1 && core.r < GLYPH_BOX.width, 'the core is a real, renderable size');
  assert.ok(core.x - core.r >= GLYPH_BOX.x - 0.01, 'the core footprint stays inside the glyph box');
});

test('telemetry is counted from the real registry, never hard-coded', () => {
  const read2 = capabilityModule.sentinelRegistry();
  const expected = software.softwareProducts.length + software.labEntities().length;
  assert.equal(read2.total, expected);
  assert.equal(read2.codes.length, expected);
  assert.equal(
    Object.values(read2.counts).reduce((sum, value) => sum + value, 0),
    expected,
  );
  const summed = software.softwareProducts.reduce((sum, p) => sum + (read2.counts[p.status] >= 1 ? 1 : 0), 0);
  assert.equal(summed, software.softwareProducts.length, 'every product status is a real EntityStatus');
  assert.equal(read2.shippedShare, (read2.counts.active + read2.counts['release-candidate']) / expected);
  assert.ok(read2.shippedShare > 0 && read2.shippedShare <= 1);
  assert.equal(capabilityModule.sentinelRegistry(), read2, 'the registry read is a stable singleton');
});

test('aura and lit shards follow the registry and stay bounded', () => {
  assert.equal(capabilityModule.auraFor(0), 0.34);
  assert.equal(capabilityModule.auraFor(1), 0.84);
  assert.equal(capabilityModule.auraFor(5), 0.84, 'an impossible share is clamped');
  assert.equal(capabilityModule.auraFor(-3), 0.34);
  assert.equal(capabilityModule.litShards(6), 6);
  assert.equal(capabilityModule.litShards(0), 1, 'never fully dark while the registry has records');
  assert.equal(capabilityModule.litShards(99), 7, 'never more shards than exist');
});

test('capability names describe real behaviour', () => {
  const { capabilityFor } = capabilityModule;
  assert.equal(capabilityFor('sleep'), 'dormant');
  assert.equal(capabilityFor('critical'), 'guarding');
  assert.equal(capabilityFor('alert'), 'guarding');
  assert.equal(capabilityFor('active'), 'shipping');
  assert.equal(capabilityFor('focus'), 'traversing');
  assert.equal(capabilityFor('curious'), 'traversing');
  assert.equal(capabilityFor('idle'), 'core');
  assert.equal(capabilityFor('blink'), 'core');
});
