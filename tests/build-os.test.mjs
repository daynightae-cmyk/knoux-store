import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'path';
import ts from 'typescript';
import { root } from './helpers.mjs';

/**
 * The deterministic Build OS contracts.
 *
 * These cover the parts that must never drift: intent normalisation,
 * permission ceilings, provider configuration, routing, verification
 * aggregation and the workspace reducer. None of them touch the DOM, so none of
 * them will break when a surface's markup changes.
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

const entities = load('src/lib/entities.ts');
const capabilityData = load('src/data/capabilities.ts');
const services = load('src/data/services.ts', registryOnly());
const growth = load('src/data/growth.ts', registryOnly());
const solutions = load('src/data/solutions.ts', registryOnly());
const wordpress = load('src/data/wordpress.ts', registryOnly());
const software = load('src/data/software.ts', registryOnly());

function registryOnly() {
  return { '@/lib/entities': entities };
}

const composerRules = load('src/data/composer-rules.ts', {
  '@/lib/entities': entities,
  '@/data/capabilities': capabilityData,
  '@/data/services': services,
  '@/data/growth': growth,
  '@/data/solutions': solutions,
  '@/data/wordpress': wordpress,
  '@/data/software': software,
});
const { compileBuildIntent, summariseIntent } = load('src/lib/build/intent.ts', {
  '@/data/composer-rules': composerRules,
  '@/lib/entities': entities,
});
const permissions = load('src/lib/build/permissions.ts');
const providers = load('tests/fixtures/historical-provider-catalog.ts');
const router = load('src/lib/build/model-router.ts');
const verification = load('src/lib/build/verification.ts');
const diagnostics = load('src/lib/build/diagnostics.ts');
const { tokenize, clampLine } = load('src/lib/build/tokenizer.ts');
// The workspace store imports the spatial helpers for stage-progress clamping.
const spatial = load('src/lib/build/spatial.ts');
const { buildReducer, initialBuildState, capabilityResolutions, dirtyFiles } = load(
  'src/lib/build/workspace-state.ts',
  { './spatial': spatial, './preferences': load('src/lib/build/preferences.ts'), './generator-state': load('src/lib/build/generator-state.ts'), './engineering-plan': load('src/lib/build/engineering-plan.ts') },
);

/* ------------------------------------------------------------------- intent */

test('intent reads a real engineering sentence without a model', () => {
  const intent = compileBuildIntent(
    'Build an inventory management app with Supabase, Arabic and English, an admin dashboard and an Android-ready PWA.',
  );
  assert.equal(intent.productKind, 'admin', 'admin dashboard is a more specific kind than a generic application');
  assert.ok(intent.requestedStack.includes('Supabase'));
  assert.ok(intent.languagePreferences.includes('Arabic'));
  assert.ok(intent.languagePreferences.includes('English'));
  assert.equal(intent.deploymentTarget, 'pwa', 'Android-ready PWA resolves to the PWA target');
  assert.equal(intent.confidence, 'resolved');
  assert.ok(intent.resolvedEntityIds.length > 0, 'the sentence resolved to real registry records');
  for (const id of intent.resolvedEntityIds) {
    assert.ok(composerRules.entityById.has(id), `every resolved id must exist: ${id}`);
  }
});

test('intent is deterministic', () => {
  const sentence = 'I need an online store with payments and Google Ads.';
  assert.deepEqual(compileBuildIntent(sentence), compileBuildIntent(sentence));
});

test('intent reports what it could not resolve rather than guessing', () => {
  const intent = compileBuildIntent('quantum flux capacitor synchroniser');
  assert.equal(intent.confidence, 'empty');
  assert.deepEqual(intent.resolvedEntityIds, []);
  assert.ok(intent.unresolvedTerms.includes('quantum'), 'unmatched words are surfaced, not dropped');
  assert.equal(intent.productKind, 'unknown');
  assert.equal(intent.deploymentTarget, 'unknown');
});

test('an empty input is empty, not a confident guess', () => {
  const intent = compileBuildIntent('   ');
  assert.equal(intent.confidence, 'empty');
  assert.equal(intent.productKind, 'unknown');
  assert.equal(summariseIntent(intent), 'NO SPECIFICATION READ');
});

test('a longer phrase wins over a shorter one it contains', () => {
  // "online store" must not be read as the generic "app".
  const intent = compileBuildIntent('I want an online store');
  assert.equal(intent.productKind, 'ecommerce');
});

/* -------------------------------------------------------------- permissions */

test('read is free and every mutating level needs approval', () => {
  const read = permissions.evaluatePermission(
    permissions.newAction('a', 'read', 'Read', 'Inspect a file'),
  );
  assert.equal(read.allowed, true);
  assert.equal(read.requiresApproval, false);

  for (const level of ['edit', 'run', 'install', 'database-write', 'git-write', 'deploy']) {
    const decision = permissions.evaluatePermission(
      permissions.newAction('a', level, 'Mutate', 'Does something'),
    );
    assert.equal(decision.allowed, false, `${level} must not proceed without approval`);
    assert.equal(decision.requiresApproval, true);
    assert.ok(decision.reason.length > 0, `${level} must explain itself`);
  }
});

test('an irreversible action says so in the reason', () => {
  const decision = permissions.evaluatePermission(
    permissions.newAction('a', 'git-write', 'Force push', 'Rewrites remote history', [], true),
  );
  assert.match(decision.reason, /not reversible/);
});

test('mode ceilings stop a plan becoming an edit', () => {
  assert.equal(permissions.ceilingForMode('ask'), 'read');
  assert.equal(permissions.ceilingForMode('plan'), 'edit');
  assert.equal(permissions.ceilingForMode('execute'), 'deploy');

  assert.equal(permissions.modeMayPropose('ask', 'read'), true);
  assert.equal(permissions.modeMayPropose('ask', 'edit'), false);
  assert.equal(permissions.modeMayPropose('plan', 'edit'), true);
  assert.equal(permissions.modeMayPropose('plan', 'run'), false);
  assert.equal(permissions.modeMayPropose('execute', 'deploy'), true);
});

test('the highest level wins when several actions aggregate', () => {
  assert.equal(permissions.highestLevel(['read', 'edit', 'run']), 'run');
  assert.equal(permissions.highestLevel(['read']), 'read');
  assert.equal(permissions.highestLevel([]), 'read');
});

/* ---------------------------------------------------------------- providers */

test('no credential means unconfigured, never online', () => {
  const statuses = providers.providerStatuses({});
  assert.equal(statuses.length, 8);
  for (const status of statuses) {
    assert.equal(status.configured, false);
    assert.equal(status.status, 'unconfigured', `${status.id} must not claim to be available`);
    assert.ok(status.requiredEnv.length > 0, `${status.id} must name the variable that would enable it`);
    assert.doesNotMatch(status.reason, /\bonline\b/i, 'an unconfigured provider is not online');
  }
});

test('configuration is decided by presence of every required variable', () => {
  const [openai] = providers.providerStatuses({ OPENAI_API_KEY: 'sk-test' });
  assert.equal(openai.configured, true);
  assert.equal(openai.status, 'available');

  const [local] = providers.providerStatuses({ KNOUX_BUILD_LLM_ENDPOINT: 'https://example.invalid' });
  assert.equal(local.configured, false, 'a partial configuration is not a configuration');
});

test('a provider reason never contains a value', () => {
  const statuses = providers.providerStatuses({ OPENAI_API_KEY: 'sk-super-secret-value' });
  for (const status of statuses) {
    assert.doesNotMatch(status.reason, /sk-super-secret-value/);
  }
});

test('every declared model declares real capabilities, not invented ones', () => {
  for (const definition of providers.PROVIDER_DEFINITIONS) {
    for (const model of definition.models) {
      assert.equal(typeof model.supportsVision, 'boolean');
      assert.equal(typeof model.supportsTools, 'boolean');
      if (model.supportsVision) {
        assert.equal(
          definition.capabilities.vision,
          true,
          `${model.id} claims vision but the provider does not declare it`,
        );
      }
      if (model.contextWindow !== null) {
        assert.ok(model.contextWindow > 0);
      }
    }
  }
});

/* ------------------------------------------------------------------ router */

test('routing refuses to invent a provider', () => {
  const statuses = providers.providerStatuses({});
  for (const task of router.taskClasses()) {
    const decision = router.routeModel(task, 'auto', statuses);
    assert.equal(decision.status, 'unavailable');
    assert.equal(decision.providerId, null);
    assert.equal(decision.modelId, null);
    assert.ok(decision.blocker && decision.blocker.length > 0, `${task} must state its blocker`);
  }
});

test('auto routing only matches declared capabilities', () => {
  const statuses = providers.providerStatuses({ ANTHROPIC_API_KEY: 'x', GROQ_API_KEY: 'y' });
  const vision = router.routeModel('vision', 'auto', statuses);
  assert.equal(vision.status, 'resolved');
  const model = statuses
    .flatMap((p) => p.models)
    .find((m) => m.id === vision.modelId);
  assert.ok(model, 'the chosen model exists in the catalogue');
  assert.equal(model.supportsVision, true, 'a vision task must not select a model that declares no vision');

  const longContext = router.routeModel('long-context', 'auto', statuses);
  const longModel = statuses.flatMap((p) => p.models).find((m) => m.id === longContext.modelId);
  assert.ok(longModel.contextWindow >= 100_000, 'long context must not select a model below the floor');
});

test('routing is deterministic and inspectable', () => {
  const statuses = providers.providerStatuses({ OPENAI_API_KEY: 'x' });
  const a = router.routeModel('architecture', 'auto', statuses);
  const b = router.routeModel('architecture', 'auto', statuses);
  assert.deepEqual(a, b);
  assert.ok(a.reason.length > 0, 'a resolved routing must publish the rule that fired');
});

test('manual routing does not silently substitute an unconfigured provider', () => {
  const statuses = providers.providerStatuses({ OPENAI_API_KEY: 'x' });
  const decision = router.routeModel('general', 'manual', statuses, {
    providerId: 'anthropic',
    modelId: 'claude-sonnet-4',
  });
  assert.equal(decision.status, 'unavailable');
  assert.equal(decision.providerId, null);
  assert.match(decision.blocker, /ANTHROPIC_API_KEY/);
});

test('manual routing refuses a model the provider does not declare', () => {
  const statuses = providers.providerStatuses({ OPENAI_API_KEY: 'x' });
  const decision = router.routeModel('general', 'manual', statuses, {
    providerId: 'openai',
    modelId: 'not-a-real-model',
  });
  assert.equal(decision.status, 'unavailable');
  assert.match(decision.blocker, /not in the declared catalogue/);
});

/* ------------------------------------------------------------ verification */

test('an unrun check is never a pass', () => {
  assert.equal(verification.aggregate([verification.notRun('lint', 'not run')]), 'not-run');
  assert.equal(verification.aggregate([verification.blocked('ci', 'no access')]), 'blocked');
  assert.equal(verification.aggregate([]), 'not-run');
});

test('one failure sinks the aggregate', () => {
  const pass = { ...verification.notRun('a', 'ok'), status: 'pass' };
  const fail = { ...verification.notRun('b', 'bad'), status: 'fail' };
  assert.equal(verification.aggregate([pass, fail]), 'fail');
  assert.equal(verification.aggregate([pass, verification.notRun('c', 'x')]), 'not-run');
});

test('a score is withheld unless the four gates were all measured', () => {
  const pass = (id) => ({ ...verification.notRun(id, 'ok'), status: 'pass' });
  const four = ['lint', 'typecheck', 'test', 'build'].map(pass);
  assert.equal(verification.measurableScore(four), 100);

  const three = four.slice(0, 3);
  assert.equal(verification.measurableScore(three), null, 'three gates are not enough for a number');

  const partial = [...four.slice(0, 3), verification.notRun('build', 'not run')];
  assert.equal(verification.measurableScore(partial), null, 'an unrun gate withholds the number entirely');

  const oneFailing = [...four.slice(0, 3), { ...pass('build'), status: 'fail' }];
  assert.equal(verification.measurableScore(oneFailing), 75, 'a real failing gate does produce a number');

  assert.equal(verification.measurableScore([]), null);
  assert.equal(verification.measurableScore([pass('lint')]), null, 'one passing check is not a health score');
});

test('a ledger row is only as green as its weakest axis', () => {
  const row = verification.ledgerRow({
    subject: 'Thing',
    implemented: 'pass',
    configured: 'pass',
    tested: 'pass',
    ciVerified: 'not-run',
  });
  assert.equal(verification.ledgerHeadline(row), 'not-run');

  const blockedRow = verification.ledgerRow({
    subject: 'Thing',
    implemented: 'pass',
    configured: 'blocked',
    tested: 'pass',
  });
  assert.equal(verification.ledgerHeadline(blockedRow), 'blocked');
});

/* ------------------------------------------------------------- diagnostics */

test('typescript output parses into located diagnostics', () => {
  const out = [
    "src/app/page.tsx(12,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
    'src/app/other.tsx(3,1): warning TS6133: Unused variable.',
  ].join('\n');
  const parsed = diagnostics.parseTypeScript(out);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].file, 'src/app/page.tsx');
  assert.equal(parsed[0].line, 12);
  assert.equal(parsed[0].column, 5);
  assert.equal(parsed[0].severity, 'error');
  assert.equal(parsed[1].severity, 'warning');
  assert.equal(parsed[0].rootCause, null, 'a parse is not a diagnosis, so root cause stays unset');
});

test('eslint output attaches to the file header it was printed under', () => {
  const out = [
    'D:\\repo\\src\\a.ts',
    '  10:3  error  Unexpected console statement  no-console',
    '  20:1  warning  Missing dependency  import/no-cycle',
    'D:\\repo\\src\\b.ts',
    '  4:2  error  Unused var  no-unused-vars',
  ].join('\n');
  const parsed = diagnostics.parseEslint(out);
  assert.equal(parsed.length, 3);
  assert.match(parsed[0].file, /a\.ts$/);
  assert.equal(parsed[0].title, 'no-console');
  assert.match(parsed[2].file, /b\.ts$/);
});

test('a warning does not block', () => {
  const warning = {
    id: 'w', source: 'eslint', severity: 'warning', title: 't', message: 'm',
    file: null, line: null, column: null, relatedFiles: [], evidence: 'e',
    status: 'fail', rootCause: null, verificationMethod: null,
  };
  assert.equal(diagnostics.hasBlockingDiagnostic([warning]), false);
  assert.equal(diagnostics.hasBlockingDiagnostic([{ ...warning, severity: 'error' }]), true);
});

test('a passing test run yields no diagnostics', () => {
  assert.deepEqual(diagnostics.parseTestRunner('ok 1 - fine', 0), []);
  assert.equal(diagnostics.parseTestRunner('not ok 3 - it broke', 1).length, 1);
});

/* -------------------------------------------------------------- tokenizer */

test('the tokenizer never produces an HTML string', () => {
  const source = '<script>alert(1)</script>';
  const tokens = tokenize(source, 'html').flat();
  const joined = tokens.map((t) => t.text).join('');
  assert.equal(joined, source, 'tokenisation is lossless');
  for (const token of tokens) {
    assert.equal(typeof token.text, 'string');
  }
});

test('keywords inside strings are not highlighted', () => {
  const [tokens] = tokenize('const a = "return class"', 'typescript');
  const string = tokens.find((t) => t.kind === 'str');
  assert.ok(string, 'the string is one token');
  assert.equal(string.text, '"return class"');
});

test('line clamping never goes out of range', () => {
  assert.equal(clampLine(0, 10), 1);
  assert.equal(clampLine(99, 10), 10);
  assert.equal(clampLine(NaN, 10), 1);
});

/* -------------------------------------------------------- workspace reducer */

test('the reducer starts empty and honest', () => {
  const state = initialBuildState;
  assert.equal(state.status, 'idle');
  // The spatial overview is the entry point; the Composer is reached through it.
  assert.equal(state.workspace.activeSurface, 'overview');
  assert.equal(state.workspace.stageProgress, 0);
  assert.equal(state.intent, null);
  assert.equal(state.project, null);
  assert.equal(state.executions.length, 0);
  assert.equal(state.terminal.sessions.length, 0);
  assert.equal(state.verification, null);
});

test('single mode never keeps a secondary surface', () => {
  let state = initialBuildState;
  state = buildReducer(state, { type: 'surface/secondary', surface: 'git' });
  assert.equal(state.workspace.splitMode, 'horizontal');
  state = buildReducer(state, { type: 'split/set', mode: 'single' });
  assert.equal(state.workspace.secondarySurface, null);
});

test('going back to single clears the split, and the secondary never equals the primary', () => {
  let state = initialBuildState;
  state = buildReducer(state, { type: 'surface/secondary', surface: 'git' });
  state = buildReducer(state, { type: 'surface/active', surface: 'git' });
  assert.notEqual(state.workspace.secondarySurface, state.workspace.activeSurface);
});

test('a draft marks a file dirty and the dirty list is derived', () => {
  const file = {
    path: 'src/a.ts', language: 'typescript', bytes: 10, lines: 1, role: 'library',
    content: 'a', draft: null, readOnly: true, cursorLine: 1, cursorColumn: 1,
  };
  let state = buildReducer(initialBuildState, { type: 'file/open', file });
  assert.equal(dirtyFiles(state).length, 0);
  state = buildReducer(state, { type: 'file/draft', path: 'src/a.ts', draft: 'b' });
  assert.equal(dirtyFiles(state).length, 1);
  assert.equal(dirtyFiles(state)[0].draft, 'b');
  state = buildReducer(state, { type: 'file/draft', path: 'src/a.ts', draft: 'a' });
  assert.equal(dirtyFiles(state).length, 0, 'a draft equal to the content is not dirty');
});

test('closing the selected file selects another rather than leaving a dangling path', () => {
  const make = (p) => ({
    path: p, language: 'typescript', bytes: 1, lines: 1, role: 'library',
    content: '', draft: null, readOnly: true, cursorLine: 1, cursorColumn: 1,
  });
  let state = buildReducer(initialBuildState, { type: 'file/open', file: make('a') });
  state = buildReducer(state, { type: 'file/open', file: make('b') });
  state = buildReducer(state, { type: 'file/close', path: 'b' });
  assert.equal(state.workspace.selectedFilePath, 'a');
});

test('capability resolutions always carry a reason', () => {
  const state = buildReducer(initialBuildState, {
    type: 'adapter/resolved',
    adapter: 'test',
    label: 'Test',
    environment: 'production',
    capabilities: { 'git.read': 'available', 'git.write': 'blocked' },
    blockers: { 'git.write': 'needs credentials' },
  });
  const resolutions = capabilityResolutions(state);
  assert.equal(resolutions.length, 2);
  for (const entry of resolutions) {
    assert.ok(entry.reason.length > 0);
  }
  const write = resolutions.find((entry) => entry.capability === 'git.write');
  assert.equal(write.requirement, 'needs credentials');
  assert.equal(write.status, 'blocked');
});

test('execution history is newest first and bounded', () => {
  let state = initialBuildState;
  for (let i = 0; i < 60; i += 1) {
    state = buildReducer(state, {
      type: 'execution/add',
      execution: {
        id: `e${i}`, prompt: 'p', mode: 'ask', providerId: null, modelId: null,
        startedAt: '2026-01-01T00:00:00.000Z', completedAt: null, inspectedResources: [],
        proposedChanges: [], approvedActions: [], changedFiles: [], commands: [],
        verification: null, status: 'queued', blocker: null,
      },
    });
  }
  assert.equal(state.executions.length, 50, 'history is bounded so it cannot grow without limit');
  assert.equal(state.executions[0].id, 'e59');
});

test('an approval is recorded and the pending request is cleared', () => {
  const action = { id: 'a1', level: 'edit', title: 'Edit', detail: 'd', affects: [], irreversible: false };
  let state = buildReducer(initialBuildState, { type: 'permission/request', action });
  assert.equal(state.permissions.pending.id, 'a1');
  state = buildReducer(state, { type: 'permission/resolve', approved: false, reason: 'declined' });
  assert.equal(state.permissions.pending, null);
  assert.equal(state.permissions.decisions[0].approved, false);
});

/* ------------------------------------------------------------ source guards */

test('no Build OS source reaches for a browser-exposed secret', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      const text = readFileSync(full, 'utf8');
      if (/NEXT_PUBLIC_[A-Z_]*(API_KEY|SECRET|TOKEN)/.test(text)) {
        offenders.push(full.replace(root, '.'));
      }
    }
  };
  walk(`${root}/src`);
  assert.deepEqual(offenders, [], 'no provider key may be exposed through a NEXT_PUBLIC variable');
});

test('the verification route cannot accept an arbitrary command', () => {
  const route = readFileSync(join(root, 'src/app/api/build/verify/route.ts'), 'utf8');
  assert.match(route, /KNOUX_BUILD_ALLOW_VERIFY !== '1'/, 'the runner is refused unless explicitly enabled');
  assert.match(route, /TASKS = new Set\(\['lint', 'typecheck', 'test', 'build'\]\)/);
  assert.doesNotMatch(route, /request\.json\(\)\)\.command/, 'the body must not be able to name a command');
  assert.doesNotMatch(route, /exec\(|execSync\(/, 'no shell string execution');
});

test('the file route refuses traversal before touching the disk', () => {
  const route = readFileSync(join(root, 'src/app/api/build/file/route.ts'), 'utf8');
  assert.match(route, /\.\./, 'traversal is checked explicitly');
  assert.match(route, /startsWith\('\/'\)/, 'absolute paths are refused');
  assert.match(route, /404/);
});

test('the project adapter has no write method at all', () => {
  const adapter = readFileSync(join(root, 'src/lib/build/project-adapter.ts'), 'utf8');
  assert.doesNotMatch(adapter, /writeFile\s*\(/, 'the read-only adapter must not write');
  assert.doesNotMatch(adapter, /rm\s*\(/, 'the read-only adapter must not delete');
  assert.doesNotMatch(adapter, /unlink\s*\(/);
  assert.doesNotMatch(adapter, /rmdir\s*\(/);
  assert.match(adapter, /shell: false/, 'git and npm are spawned without a shell');
});

test('a source directory named build is not skipped as build output', () => {
  const adapter = readFileSync(join(root, 'src/lib/build/project-adapter.ts'), 'utf8');
  // `build` is a real source directory in this project. Skipping it at any
  // depth silently removed three real modules from the topology.
  assert.match(adapter, /ROOT_ONLY_SKIP = new Set\(\[[^\]]*'build'/);
  assert.match(adapter, /depth === 0 && ROOT_ONLY_SKIP\.has\(entry\.name\)/);
  assert.doesNotMatch(adapter, /SKIP_DIRECTORIES/);
  // And the directories that really do exist must be on disk, or the rule above
  // is untestable.
  for (const dir of ['src/components/build', 'src/lib/build', 'src/app/api/build']) {
    assert.ok(existsSync(join(root, dir)), `${dir} must exist for this test to mean anything`);
  }
});

test('every api route on disk is reported by the adapter', async () => {
  // Walks the tree the same way the adapter does, then asserts the regex the
  // adapter uses turns each real route file into a route.
  const routeFile = /^src\/app\/(.*)\/(page|layout|route)\.tsx?$/;
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (['node_modules', 'coverage'].includes(entry.name)) continue;
        walk(full);
      } else if (entry.name === 'route.ts') {
        found.push(full.slice(root.length + 1).split('\\').join('/'));
      }
    }
  };
  walk(`${root}/src/app`);

  assert.ok(found.length >= 8, `expected the build os api routes to exist, found ${found.length}`);
  for (const file of found) {
    assert.match(file, routeFile, `${file} must be recognised as an api route`);
  }
  assert.ok(
    found.some((file) => file.includes('api/build/project')),
    'the project adapter route itself must be discoverable, not skipped',
  );
});
