import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'path';
import ts from 'typescript';
import { root } from './helpers.mjs';

/**
 * Spatial workspace contracts.
 *
 * Covers the deterministic stage model, the spine geometry, the core's state
 * mapping, and the two properties that matter most: the spine never hijacks
 * page scroll, and an unverified state is never drawn as healthy.
 */

function load(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const req = (specifier) => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function('require', 'module', 'exports', output)(req, loaded, loaded.exports);
  return loaded.exports;
}

const types = load('src/lib/build/types.ts');
const stages = load('src/lib/build/stages.ts');
const spatial = load('src/lib/build/spatial.ts', { './types': types });
const state = load('src/lib/build/workspace-state.ts', { './types': types, './spatial': spatial, './preferences': load('src/lib/build/preferences.ts'), './generator-state': load('src/lib/build/generator-state.ts'), './engineering-plan': load('src/lib/build/engineering-plan.ts') });

/* ------------------------------------------------------------- stage model */

test('there are exactly seven canonical engineering stages in order', () => {
  assert.equal(stages.STAGES.length, 7);
  assert.deepEqual(
    stages.STAGES.map((s) => s.name),
    ['INTENT', 'ARCHITECTURE', 'BUILD', 'RUNTIME', 'VERIFY', 'GIT', 'RELEASE'],
  );
  stages.STAGES.forEach((stage, index) => assert.equal(stage.index, index));
});

test('every stage names a real surface and a real evidence source', () => {
  for (const stage of stages.STAGES) {
    assert.ok(stage.surface, `${stage.id} must open a surface`);
    assert.ok(stage.evidenceSource.length > 0, `${stage.id} must name where its evidence comes from`);
    assert.ok(stage.description.length > 40, `${stage.id} must describe itself factually`);
    if (stage.requires !== null) {
      assert.ok(Object.values(stages.STAGES).length > 0);
      assert.ok(
        [
          'project.read', 'project.files', 'project.write', 'project.delete',
          'command.allowlisted', 'command.arbitrary', 'terminal.interactive',
          'runtime.manage', 'git.read', 'git.write', 'preview.live', 'preview.inspect',
          'database.read', 'database.write', 'provider.execute', 'diagnostics.read',
          'test.run', 'deploy.trigger',
        ].includes(stage.requires),
        `${stage.id} requires a capability that does not exist: ${stage.requires}`,
      );
    }
  }
});

test('stage requires point at the capability the surface actually needs', () => {
  const byName = Object.fromEntries(stages.STAGES.map((s) => [s.name, s]));
  assert.equal(byName.ARCHITECTURE.requires, 'project.read');
  assert.equal(byName.BUILD.requires, 'project.files');
  assert.equal(byName.RUNTIME.requires, 'preview.live');
  assert.equal(byName.VERIFY.requires, 'test.run');
  assert.equal(byName.GIT.requires, 'git.read');
  assert.equal(byName.INTENT.requires, null, 'the genesis deck needs no capability');
  assert.equal(byName.RELEASE.requires, null, 'release reports the pipeline, it does not run it');
});

test('progress maps to stages monotonically and clamps', () => {
  assert.equal(stages.stageAtProgress(0).id, 'intent');
  assert.equal(stages.stageAtProgress(1).id, 'release');
  assert.equal(stages.stageAtProgress(-5).id, 'intent');
  assert.equal(stages.stageAtProgress(9).id, 'release');
  assert.equal(stages.stageAtProgress(NaN).id, 'intent');

  // Monotonic: later progress never yields an earlier stage.
  let previous = -1;
  for (let i = 0; i <= 100; i += 1) {
    const index = stages.stageAtProgress(i / 100).index;
    assert.ok(index >= previous, `progress ${i / 100} went backwards`);
    previous = index;
  }
});

test('stage progress is an exact round trip', () => {
  for (const stage of stages.STAGES) {
    const progress = stages.progressForStage(stage.id);
    assert.equal(stages.stageAtProgress(progress).id, stage.id, `${stage.id} did not round trip`);
  }
  assert.equal(stages.progressForIndex(-4), 0);
  assert.equal(stages.progressForIndex(999), 1);
});

test('keyboard navigation clamps at both ends', () => {
  assert.equal(stages.nextStage('intent', -1).id, 'intent');
  assert.equal(stages.nextStage('release', 1).id, 'release');
  assert.equal(stages.nextStage('intent', 1).id, 'architecture');
  assert.equal(stages.nextStage('architecture', -1).id, 'intent');
});

/* ------------------------------------------------------------------ spine */

test('spine progress comes from the track rect, not the page', () => {
  const track = { top: 100, height: 400 };
  assert.equal(spatial.progressFromPointer(100, track), 0);
  assert.equal(spatial.progressFromPointer(500, track), 1);
  assert.equal(spatial.progressFromPointer(300, track), 0.5);
  assert.equal(spatial.progressFromPointer(-100, track), 0, 'above the track clamps to the first stage');
  assert.equal(spatial.progressFromPointer(900, track), 1, 'below the track clamps to the last stage');
  assert.equal(spatial.progressFromPointer(300, { top: 100, height: 0 }), 0, 'a collapsed track is inert');
});

test('clamp01 rejects non-finite input rather than propagating it', () => {
  // Any non-finite value collapses to the first stage. Mapping +Infinity to 1
  // would jump a scrubber to RELEASE on a bad measurement; 0 is the safe read.
  assert.equal(spatial.clamp01(NaN), 0);
  assert.equal(spatial.clamp01(Infinity), 0);
  assert.equal(spatial.clamp01(-Infinity), 0);
  assert.equal(spatial.clamp01(0.4), 0.4);
  assert.equal(spatial.clamp01(-0.4), 0);
  assert.equal(spatial.clamp01(1.4), 1);
});

/* -------------------------------------------------------------- core field */

test('the core field is deterministic and never random', () => {
  const a = spatial.coreField(120);
  const b = spatial.coreField(120);
  assert.equal(a.length, 120);
  assert.deepEqual(a, b, 'the same budget must always draw the same field');
  assert.notDeepEqual(a, spatial.coreField(121));
  // Distinct angles, so the golden angle is actually distributing them.
  const angles = new Set(a.map((p) => p.a.toFixed(4)));
  assert.ok(angles.size > 100, 'field angles must be distinct');
  for (const point of a) {
    assert.ok(point.r > 0 && point.r < 1.2);
    assert.ok(point.s > 0);
  }
});

test('the field budget is clamped', () => {
  assert.equal(spatial.coreField(0).length, 0);
  assert.equal(spatial.coreField(100000).length, 400);
  assert.equal(spatial.coreField(-5).length, 0);
});

test('ring emphasis is derived from real counts, and absent domains are dashed', () => {
  const rings = spatial.coreRings({
    domainCounts: { ui: 40, routes: 20, tests: 4 },
    selectedDomain: null,
    maxDomainCount: 40,
    verification: 'not-run',
  });
  const byRadius = new Map(rings.map((r) => [r.radius, r]));
  assert.ok(byRadius.get(0.3).emphasis > byRadius.get(0.58).emphasis, 'denser domain reads stronger');
  // api and data are absent, so they must be dim and dashed rather than omitted.
  assert.ok(byRadius.get(0.58).dash, 'an absent domain is dashed, not hidden');
  assert.ok(byRadius.get(0.58).emphasis < 0.2);
});

test('a selected domain is emphasised and nothing else is invented', () => {
  const rings = spatial.coreRings({
    domainCounts: { api: 12, routes: 20 },
    selectedDomain: 'api',
    maxDomainCount: 20,
    verification: 'not-run',
  });
  const api = rings.find((r) => r.radius === 0.58);
  const routes = rings.find((r) => r.radius === 0.45);
  assert.equal(api.emphasis, 1);
  assert.ok(routes.emphasis < 1);
  assert.ok(!api.dash, 'a present domain is not dashed');
});

/* ------------------------------------------ no fake pass, the important one */

test('verification ring never paints an unverified state as healthy', () => {
  assert.equal(spatial.toRingState('not-applicable'), 'not-run', 'N/A is not a pass');
  assert.equal(spatial.toRingState('not-run'), 'not-run');
  assert.equal(spatial.toRingState('blocked'), 'blocked');
  assert.equal(spatial.toRingState('unconfigured'), 'unconfigured');
  assert.equal(spatial.toRingState('pass'), 'pass');
  assert.equal(spatial.toRingState('fail'), 'fail');

  const notRun = spatial.verificationRing('not-run');
  const na = spatial.verificationRing('not-applicable');
  assert.deepEqual(na, notRun, 'not-applicable must look exactly like not-run');
  assert.notEqual(notRun.stroke, spatial.verificationRing('pass').stroke);
  assert.equal(spatial.verificationRing('blocked').stroke, spatial.verificationRing('unconfigured').stroke);
  assert.equal(spatial.verificationRing('fail').width, 1.8, 'a failure draws heavier');
});

test('core posture is driven by measured state, and unknown is not assembled', () => {
  const base = { stageIndex: 0, stageCount: 7, nodeCount: 100 };
  assert.equal(spatial.corePosture({ ...base, runtimeRunning: false, verification: 'fail' }), 'fractured');
  assert.equal(spatial.corePosture({ ...base, runtimeRunning: true, verification: 'fail' }), 'fractured',
    'a failure outranks a running runtime');
  assert.equal(spatial.corePosture({ ...base, runtimeRunning: true, verification: 'not-run' }), 'active');
  assert.equal(
    spatial.corePosture({ stageIndex: 6, stageCount: 7, nodeCount: 100, runtimeRunning: false, verification: 'pass' }),
    'assembled',
  );
  // The same near-release position, but nothing verified. It is not assembled.
  assert.equal(
    spatial.corePosture({ stageIndex: 6, stageCount: 7, nodeCount: 100, runtimeRunning: false, verification: 'not-run' }),
    'holding',
  );
  assert.equal(
    spatial.corePosture({ stageIndex: 6, stageCount: 7, nodeCount: 0, runtimeRunning: false, verification: 'not-applicable' }),
    'idle',
  );
});

test('reduced motion removes every amplitude', () => {
  for (const posture of ['active', 'assembled', 'fractured', 'holding', 'idle']) {
    assert.equal(spatial.coreAmplitude(true, posture), 0, `${posture} must be still under reduced motion`);
  }
  assert.ok(spatial.coreAmplitude(false, 'active') > spatial.coreAmplitude(false, 'idle'));
});

test('domain counting never invents a domain', () => {
  const counts = spatial.domainCounts([
    { domain: 'ui' }, { domain: 'ui' }, { domain: 'routes' },
  ]);
  assert.equal(counts.ui, 2);
  assert.equal(counts.routes, 1);
  assert.equal(counts.api, undefined, 'a domain with no nodes stays absent');
  assert.equal(spatial.maxCount(counts), 2);
  assert.equal(spatial.maxCount({}), 0);
});

/* ---------------------------------------------------------- state extension */

test('stage progress lives in the existing reducer, not a second store', () => {
  const initial = state.initialBuildState;
  assert.equal(initial.workspace.activeSurface, 'overview', 'the spatial overview is the default surface');
  assert.equal(initial.workspace.stageProgress, 0);
  assert.equal(initial.workspace.stageId, 'intent');

  const moved = state.buildReducer(initial, { type: 'stage/progress', progress: 1 });
  assert.equal(moved.workspace.stageProgress, 1);

  const clamped = state.buildReducer(initial, { type: 'stage/progress', progress: 42 });
  assert.equal(clamped.workspace.stageProgress, 1, 'progress is clamped by the reducer');
  const negative = state.buildReducer(initial, { type: 'stage/progress', progress: -42 });
  assert.equal(negative.workspace.stageProgress, 0);

  const selected = state.buildReducer(initial, { type: 'stage/select', stageId: 'git', progress: 5 / 6 });
  assert.equal(selected.workspace.stageId, 'git');
  assert.equal(selected.workspace.stageProgress, 5 / 6);
});

/* ------------------------------------------------- no scroll hijacking, etc */

test('the spine never hijacks page scroll', () => {
  const source = readFileSync(join(root, 'src/components/build/spatial/ExecutionSpine.tsx'), 'utf8');
  assert.doesNotMatch(source, /scrollTo\(/, 'the spine must not drive window scroll');
  assert.doesNotMatch(source, /scrollBy\(/);
  assert.doesNotMatch(source, /scrollIntoView\(/);
  assert.doesNotMatch(source, /addEventListener\('scroll'/, 'the spine must not listen to page scroll');
  assert.doesNotMatch(source, /scrollHeight/, 'no scroll-space measurement');
  assert.doesNotMatch(source, /preventDefault\(\)\s*;\s*\}\s*,\s*\{?\s*passive/, 'no passive scroll override');
});

test('the spatial stage does not use a scroll-length gimmick', () => {
  const css = readFileSync(join(root, 'src/components/build/spatial/spatial.css'), 'utf8');
  const vh = css.match(/[0-9]{3,}vh/);
  assert.equal(vh, null, `no multi-thousand vh scroll space: ${vh?.[0] ?? ''}`);
  assert.doesNotMatch(css, /Math\.random/);
});

test('the core adds no WebGL context and no second orb', () => {
  const raw = readFileSync(join(root, 'src/components/build/spatial/ProjectCore.tsx'), 'utf8');
  // The doc comment explains why Three.js is not used, so scan the code only.
  const code = raw.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, '');
  assert.doesNotMatch(code, /from '(three|@react-three)/, 'the core must not import a WebGL library');
  assert.doesNotMatch(code, /new WebGLRenderer|getContext\('webgl'\)/);
  assert.match(code, /getContext\('2d'\)/, 'the core is Canvas 2D');
  assert.doesNotMatch(code, /Math\.random/, 'branded geometry is never random');
  assert.match(code, /Math\.min\(window\.devicePixelRatio \|\| 1, DPR_CAP\)/, 'DPR is capped');
  assert.match(code, /DPR_CAP = 1\.5/);
  assert.match(code, /document\.hidden/, 'the loop respects a hidden tab');
  assert.match(code, /IntersectionObserver/, 'an offscreen core stops');
  assert.match(code, /prefers-reduced-motion/, 'reduced motion is honoured');
  assert.match(code, /requestAnimationFrame/, 'the loop is explicit');
  // The property that matters is that only one call site can *start* a loop.
  // `tick` re-arms itself; `ensureRunning` is the single guarded entry point
  // every resume path goes through, so a second chain cannot exist.
  assert.match(code, /const ensureRunning = \(\) => \{\s*if \(frame\) return;/, 'the loop starter is guarded');
  assert.equal(
    (code.match(/frame = requestAnimationFrame\(tick\)/g) ?? []).length,
    2,
    'exactly two frame assignments: the self-rearm in tick and the guarded starter',
  );
  assert.equal((code.match(/const ensureRunning = /g) ?? []).length, 1, 'one starter only');
  assert.equal((code.match(/function tick\(/g) ?? []).length, 1, 'one loop body only');
  // No resume path is allowed to schedule a frame directly any more.
  assert.doesNotMatch(code, /cancelAnimationFrame\(frame\);\s*\n\s*frame = requestAnimationFrame/,
    'no resume path may restart the loop without the guard');
});

test('essential core state exists in the DOM, not only on the canvas', () => {
  const code = readFileSync(join(root, 'src/components/build/spatial/ProjectCore.tsx'), 'utf8');
  assert.match(code, /role="status"/, 'the core exposes live text for assistive technology');
  assert.match(code, /bo-visually-hidden/);
  assert.match(code, /aria-hidden="true"/, 'the canvas itself is decorative');
});

test('the spatial layer is a real application, not a canvas demo', () => {
  for (const file of [
    'src/components/build/spatial/SpatialWorkspace.tsx',
    'src/components/build/spatial/ExecutionSpine.tsx',
    'src/components/build/spatial/ProjectHud.tsx',
    'src/components/build/spatial/ProjectCore.tsx',
    'src/lib/build/stages.ts',
    'src/lib/build/spatial.ts',
  ]) {
    assert.ok(existsSync(join(root, file)), `${file} must exist`);
  }
  const spine = readFileSync(join(root, 'src/components/build/spatial/ExecutionSpine.tsx'), 'utf8');
  assert.match(spine, /role="tablist"/, 'the spine is a real tablist');
  assert.match(spine, /aria-orientation="vertical"/);
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']) {
    assert.ok(spine.includes(key), `keyboard support must include ${key}`);
  }
  assert.match(spine, /setPointerCapture/, 'drag scrubbing uses pointer capture');
});

test('the hud prints truthful absences rather than demo numbers', () => {
  const raw = readFileSync(join(root, 'src/components/build/spatial/ProjectHud.tsx'), 'utf8');
  for (const token of ['NOT CONNECTED', 'NOT RUN', 'UNCONFIGURED', 'NOT VERIFIED']) {
    assert.ok(raw.includes(token), `the HUD must be able to say ${token}`);
  }
  // Strip the leading block comment before scanning: the prose explains that the
  // HUD has no token or latency figures, so scanning the raw file would match
  // its own explanation.
  const code = raw.replace(/^\/\*[\s\S]*?\*\/\s*/m, '');
  for (const banned of [
    /98%|97%|100% ready/,
    /latency/i,
    /tokens?\b/i,
    /msAvg|avgMs/,
    /demoMetric|fakeMetric/,
  ]) {
    assert.doesNotMatch(code, banned, `the HUD must not contain ${banned}`);
  }
  // The score is only ever a measured value or an explicit absence.
  assert.match(code, /score === null \? 'NOT RUN'/);
});
