import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
import { readFile } from 'node:fs/promises';
const { modelPriceLabel } = await loadTypeScript('../src/lib/build/model-search.ts');
const { mergeVerificationResults, verificationChecksAtHead, currentWorkspaceVerificationChecks } = await loadTypeScript('../src/components/build/dev/verification-results.ts');
const { workspaceFacts } = await loadTypeScript('../src/components/build/dev/workspace-facts.ts');
const { initialBuildState } = await loadTypeScript('../src/lib/build/workspace-state.ts');
const check = (id) => ({ id, status: 'pass' });
const snapshot = (headSha, checks, sourceState = 'clean') => ({ headSha, checks, sourceState, capturedAt: 'test' });
test('unknown or partially unknown model prices never become a paid or free claim', () => {
  const label = (inputPerMillion, outputPerMillion) => modelPriceLabel({ pricing: { inputPerMillion, outputPerMillion } });
  assert.equal(label(0, 0), 'FREE'); assert.equal(label(1, 2), 'PLAN');
  for (const [input, output] of [[null, null], [null, 0], [0, null], [2, null]]) assert.equal(label(input, output), 'PRICE UNKNOWN');
});
test('new SHA never adopts old PASS while same SHA retains independent results', () => {
  const previous = snapshot('A', [check('build'), check('lint')]);
  const incoming = snapshot('B', [check('test')]);
  assert.deepEqual(mergeVerificationResults(previous, incoming).checks, incoming.checks);
  assert.deepEqual(mergeVerificationResults(previous, snapshot('A', [check('lint')])).checks.map(c => c.id), ['build', 'lint']);
  assert.deepEqual(mergeVerificationResults(snapshot(null, [check('build')]), snapshot(null, [check('test')])).checks.map(c => c.id), ['test']);
});
test('pipeline only displays clean checkout scoped verification, never WIP, unknown or bridge results', () => {
  const evidence = snapshot('A', [check('build')]);
  assert.deepEqual(verificationChecksAtHead(evidence, 'A', null, false), evidence.checks);
  for (const [head, project] of [['B', null], [null, null], ['A', 'selected']]) assert.deepEqual(verificationChecksAtHead(evidence, head, project, false), []);
  for (const dirty of [true, null, undefined]) assert.deepEqual(verificationChecksAtHead(evidence, 'A', null, dirty), []);
  for (const sourceState of ['wip', 'unknown', undefined]) {
    assert.deepEqual(verificationChecksAtHead({ ...evidence, sourceState }, 'A', null, false), []);
  }
});
test('same HEAD never pools results across WIP, unknown or legacy snapshots', () => {
  for (const priorSource of ['clean', 'wip', 'unknown', undefined]) {
    for (const incomingSource of ['clean', 'wip', 'unknown', undefined]) {
      const previous = { ...snapshot('A', [check('build')]), sourceState: priorSource };
      const incoming = { ...snapshot('A', [check('test')]), sourceState: incomingSource };
      assert.deepEqual(mergeVerificationResults(previous, incoming).checks.map(c => c.id),
        priorSource === 'clean' && incomingSource === 'clean' ? ['build', 'test'] : ['test']);
    }
  }
});

function currentState() {
  return { ...initialBuildState, projectRef: null,
    git: { ...initialBuildState.git, available: true, headSha: 'A', dirty: false },
    verification: snapshot('A', [check('build')]),
  };
}

test('shared display boundary and actual workspace footer retain clean, current native evidence', () => {
  const state = currentState();
  assert.deepEqual(currentWorkspaceVerificationChecks(state), state.verification.checks);
  assert.equal(workspaceFacts(state).verification, '1/1 CHECKS PASS');
  state.verification.checks.push({ id: 'test', status: 'fail' });
  assert.equal(workspaceFacts(state).verification, '1/2 CHECKS PASS');
});

test('footer and shared display boundary never promote WIP, stale, unknown, imported or unreadable results', () => {
  const mutations = [
    (s) => { s.verification.sourceState = 'wip'; },
    (s) => { s.verification.sourceState = 'unknown'; },
    (s) => { delete s.verification.sourceState; },
    (s) => { s.git.dirty = true; },
    (s) => { s.git.dirty = null; },
    (s) => { delete s.git.dirty; },
    (s) => { s.git.headSha = 'B'; },
    (s) => { s.git.headSha = null; },
    (s) => { s.verification.headSha = null; },
    (s) => { s.git.available = false; },
    (s) => { s.git = null; },
    (s) => { s.projectRef = 'K:/explicit-test-only-import'; },
    (s) => { s.verification = null; },
  ];
  for (const mutate of mutations) {
    const state = currentState();
    mutate(state);
    assert.deepEqual(currentWorkspaceVerificationChecks(state), []);
    assert.equal(workspaceFacts(state).verification, 'VERIFICATION NOT RUN');
  }
});

test('all current-evidence UI projections use the shipped shared boundary, not raw snapshots', async () => {
  for (const file of ['dev/workspace-facts.ts', 'dev/BuildPipelinePage.tsx', 'surfaces/PreviewSurface.tsx',
    'surfaces/CodeSurface.tsx', 'spatial/SpatialWorkspace.tsx', 'spatial/ProjectHud.tsx', 'generator/GenerationMonitor.tsx']) {
    const source = await readFile(new URL(`../src/components/build/${file}`, import.meta.url), 'utf8');
    assert.match(source, /currentWorkspaceVerificationChecks\(state\)/, file);
    assert.doesNotMatch(source, /(?:const (?:checks|snapshot) =|aggregate\()\s*(?:state\.)?verification\?\.checks/, file);
    assert.doesNotMatch(source, /state\.verification\??\.checks\.(?:map|find)/, file);
  }
  const pipeline = await readFile(new URL('../src/components/build/dev/BuildPipelinePage.tsx', import.meta.url), 'utf8');
  assert.match(pipeline, /Last measured output/);
  assert.match(pipeline, /WIP outcomes are bounded snapshots, not proof of current edited files/);
});
