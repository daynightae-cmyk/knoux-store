import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { enableTypeScriptResolution } from './load.mjs';
import { codeOnly, root } from './helpers.mjs';

enableTypeScriptResolution();

const machine = await import('../src/lib/awakening/machine.ts');
const dialogue = await import('../src/lib/awakening/dialogue.ts');
const products = await import('../src/lib/awakening/products.ts');
const fracture = await import('../src/lib/awakening/fracture.ts');
const shout = await import('../src/lib/awakening/shout.ts');
const audio = await import('../src/lib/awakening/audio.ts');
const registry = await import('../src/data/software.ts');
const i18n = await import('../src/lib/i18n/site-copy.ts');
const languages = await import('../src/lib/i18n/languages.ts');

const read = (file) => readFileSync(join(root, file), 'utf8');
const stageSource = read('src/components/awakening/AwakeningStage.tsx');
const launcherSource = read('src/components/awakening/AwakeningLauncher.tsx');
const sentinelSource = read('src/components/awakening/ForgeSentinel.tsx');
const fractureView = read('src/components/awakening/FractureSurface.tsx');
const stageCss = read('src/components/awakening/knoux-awakening-stage.css');
const dialogueCss = read('src/components/awakening/knoux-awakening-dialogue.css');
const identityCss = read('src/components/awakening/knoux-awakening-identity.css');
const triggerCss = read('src/components/awakening/knoux-awakening-trigger.css');
const home = read('src/components/HomeExperience.tsx');
const header = read('src/components/SiteHeader.tsx');

const run = (events, initial = machine.initialAwakeningState()) =>
  events.reduce(machine.reduceAwakening, initial);

// ---------------------------------------------------------------- state machine

test('the phase catalogue is explicit, ordered and complete', () => {
  assert.deepEqual(
    [...machine.AWAKENING_PHASES],
    [
      'idle',
      'ignition',
      'awakening',
      'first-emission',
      'cascade',
      'overcharge',
      'fracture',
      'revelation',
      'explore',
      'paused',
      'skipped',
      'error',
    ],
  );
  assert.deepEqual(
    [...machine.AWAKENING_SEQUENCE],
    ['ignition', 'awakening', 'first-emission', 'cascade', 'overcharge', 'fracture', 'revelation'],
  );
  for (const phase of machine.AWAKENING_PHASES) {
    assert.equal(typeof machine.AWAKENING_EMISSIONS[phase], 'number', `${phase} needs an emission count`);
  }
});

test('timing is derived from the conversation and the sequence is bounded', () => {
  assert.deepEqual(
    { ...machine.AWAKENING_TIMING },
    {
      ignition: 7000,
      awakening: 8800,
      'first-emission': 8100,
      cascade: 25000,
      overcharge: 53500,
      fracture: 2800,
      revelation: 7000,
    },
  );
  assert.equal(machine.AWAKENING_TOTAL_MS, 112200);
  assert.equal(dialogue.AWAKENING_BEAT_COUNT, 28);
  assert.equal(dialogue.AWAKENING_DIALOGUE.length, 28);
  assert.equal(
    machine.AWAKENING_TOTAL_MS,
    machine.AWAKENING_SEQUENCE.reduce((total, phase) => total + machine.AWAKENING_TIMING[phase], 0),
  );
  assert.equal(
    machine.AWAKENING_TOTAL_MS,
    dialogue.AWAKENING_DIALOGUE.reduce((total, beat) => total + beat.duration, 0),
  );
});

test('START opens ignition, or the reveal when motion is reduced', () => {
  const started = run([{ type: 'START' }]);
  assert.equal(started.phase, 'ignition');
  assert.equal(started.beatIndex, 0);
  const reduced = run([{ type: 'START', reducedMotion: true }]);
  assert.equal(reduced.phase, 'explore');
  assert.equal(reduced.beatIndex, dialogue.AWAKENING_BEAT_COUNT);
  assert.equal(run([{ type: 'START' }, { type: 'START' }]).phase, 'ignition', 'a second START is ignored');
});

test('ADVANCE walks every authored beat once and rests in explore', () => {
  let state = run([{ type: 'START' }]);
  const visited = [state.phase];
  for (let index = 0; index < dialogue.AWAKENING_BEAT_COUNT; index += 1) {
    state = machine.reduceAwakening(state, { type: 'ADVANCE' });
    visited.push(state.phase);
  }
  assert.equal(state.phase, 'explore');
  assert.equal(state.beatIndex, dialogue.AWAKENING_BEAT_COUNT);
  assert.deepEqual(
    visited.filter((phase, index) => index === 0 || phase !== visited[index - 1]),
    [...machine.AWAKENING_SEQUENCE, 'explore'],
  );
  assert.deepEqual(visited.slice(0, 4), ['ignition', 'ignition', 'awakening', 'awakening']);
  assert.equal(machine.reduceAwakening(state, { type: 'ADVANCE' }).phase, 'explore');
  assert.equal(run([{ type: 'ADVANCE' }]).phase, 'idle');
});

test('PAUSE keeps the unspent beat and RESUME returns to it', () => {
  const paused = run([
    { type: 'START' },
    { type: 'ADVANCE' },
    { type: 'ADVANCE' },
    { type: 'PAUSE' },
  ]);
  assert.equal(paused.phase, 'paused');
  assert.equal(paused.resumePhase, 'awakening');
  assert.equal(paused.beatIndex, 2);
  assert.equal(paused.pauseSource, 'user');
  assert.equal(machine.visualAwakeningPhase(paused), 'awakening');

  const resumed = machine.reduceAwakening(paused, { type: 'RESUME' });
  assert.equal(resumed.phase, 'awakening');
  assert.equal(resumed.beatIndex, 2);
  assert.equal(resumed.resumePhase, null);

  const hidden = run([{ type: 'START' }, { type: 'PAUSE', source: 'visibility' }]);
  assert.equal(hidden.pauseSource, 'visibility');
  assert.equal(run([{ type: 'PAUSE' }]).phase, 'idle', 'an idle stage cannot pause');
  assert.equal(run([{ type: 'RESUME' }]).phase, 'idle', 'a resume without a pause is ignored');
});

test('SKIP reveals real routes instead of a blank ending', () => {
  assert.equal(run([{ type: 'START' }, { type: 'SKIP' }]).phase, 'skipped');
  assert.equal(run([{ type: 'START' }, { type: 'SKIP' }]).phase === 'error', false);
  assert.equal(run([{ type: 'SKIP' }]).phase, 'idle');
  const error = run([{ type: 'ERROR' }]);
  assert.equal(machine.reduceAwakening(error, { type: 'SKIP' }).phase, 'error');
  assert.equal(machine.isAwakeningReveal('skipped'), true);
});

test('REPLAY restarts, ERROR is explicit, CLOSE returns to idle', () => {
  const explored = run([{ type: 'START' }, { type: 'SKIP' }]);
  assert.equal(machine.reduceAwakening(explored, { type: 'REPLAY' }).phase, 'ignition');
  assert.equal(
    machine.reduceAwakening(explored, { type: 'REPLAY', reducedMotion: true }).phase,
    'explore',
  );

  const failed = machine.reduceAwakening(explored, { type: 'ERROR' });
  assert.equal(failed.phase, 'error');
  assert.equal(failed.error, 'The awakening could not start.');
  assert.equal(
    machine.reduceAwakening(explored, { type: 'ERROR', message: 'registry' }).error,
    'registry',
  );

  for (const phase of machine.AWAKENING_PHASES) {
    const state = { phase, resumePhase: null, pauseSource: null, error: null };
    assert.equal(machine.reduceAwakening(state, { type: 'CLOSE' }).phase, 'idle');
  }
});

test('reveal membership and painted phase are derived, not duplicated', () => {
  for (const phase of machine.AWAKENING_PHASES) {
    assert.equal(
      machine.isAwakeningReveal(phase),
      phase === 'revelation' || phase === 'explore' || phase === 'skipped',
      phase,
    );
  }
  assert.equal(machine.isAwakeningOpen({ phase: 'idle' }), false);
  for (const phase of machine.AWAKENING_PHASES.filter((entry) => entry !== 'idle')) {
    assert.equal(machine.isAwakeningOpen({ phase }), true);
  }
});

// ------------------------------------------------------------------ dialogue

test('the conversation gives each of the five systems a question and a follow-up', () => {
  assert.equal(dialogue.AWAKENING_EXCHANGES.length, 13);
  assert.equal(dialogue.AWAKENING_THREADS.length, 13);

  const firstPass = dialogue.AWAKENING_EXCHANGES.filter((exchange) =>
    exchange.id.endsWith('-first'),
  );
  const secondPass = dialogue.AWAKENING_EXCHANGES.filter((exchange) =>
    exchange.id.endsWith('-second'),
  );
  assert.equal(firstPass.length, 5, 'the first pass introduces every system');
  assert.equal(secondPass.length, 5, 'the same five systems return for the follow-up');

  for (const followUp of secondPass) {
    const introduction = firstPass.find((exchange) => exchange.productId === followUp.productId);
    assert.ok(introduction, `${followUp.productId} has a follow-up without an introduction`);
    assert.equal(
      followUp.author.handle,
      introduction.author.handle,
      `${followUp.productId} must return to the same asker`,
    );
    assert.notEqual(followUp.question, introduction.question, 'a follow-up asks something new');
  }

  // Every question is a real question, and every answer is a complete sentence,
  // not a caption fragment.
  for (const exchange of dialogue.AWAKENING_EXCHANGES) {
    assert.match(exchange.question, /\?|\.|!/, `${exchange.id} question must be a sentence`);
    assert.match(exchange.answer, /[.!?]"?$/, `${exchange.id} answer must be a complete sentence`);
    assert.ok(exchange.questionDuration >= 2000, `${exchange.id} question needs reading time`);
    assert.ok(exchange.answerDuration >= 2800, `${exchange.id} answer needs speaking time`);
    assert.ok(exchange.answerDuration > exchange.questionDuration, `${exchange.id} answer must breathe`);
  }
});

test('anger escalates in order before the screen breaks', () => {
  const rank = { calm: 0, measured: 1, sharp: 2, angry: 3, furious: 4 };
  let strongest = -1;
  for (const exchange of dialogue.AWAKENING_EXCHANGES) {
    const value = rank[exchange.mood];
    assert.ok(value >= strongest, `${exchange.id} cools down after a hotter exchange`);
    strongest = value;
  }
  assert.equal(strongest, rank.furious);
  const furious = dialogue.AWAKENING_EXCHANGES.filter((exchange) => exchange.mood === 'furious');
  assert.equal(furious.length, 1);
  assert.equal(furious[0].id, 'rupture');
  assert.equal(furious[0].answer, 'ENOUGH.');
  assert.equal(furious[0].question, 'Then break it. Prove it is real.');

  const breakBeat = dialogue.AWAKENING_DIALOGUE.find((beat) => beat.id === 'fracture-break');
  assert.ok(breakBeat);
  assert.equal(breakBeat.act, 'fracture');
  assert.equal(breakBeat.kind, 'outburst');
  assert.equal(breakBeat.text, 'BREAK!');
});

test('every paraphrased claim is grounded in the published registry', () => {
  for (const exchange of dialogue.AWAKENING_EXCHANGES) {
    if (!exchange.productId) {
      assert.equal(exchange.evidence, undefined, `${exchange.id} has evidence without a product`);
      continue;
    }
    const product = products.awakeningProducts.find((entry) => entry.id === exchange.productId);
    assert.ok(product, `${exchange.id} names a product outside the projection`);
    assert.ok(Array.isArray(exchange.evidence) && exchange.evidence.length > 0, `${exchange.id} needs evidence`);
    for (const index of exchange.evidence) {
      assert.ok(
        Number.isInteger(index) && index >= 0 && index < product.capabilities.length,
        `${exchange.id} cites capability ${index}, outside ${product.capabilities.length} statements`,
      );
    }
  }

  // The follow-ups are the second half of the feature set, so they must not
  // simply repeat the first answer's citations.
  const first = dialogue.AWAKENING_EXCHANGES.find((exchange) => exchange.id === 'one-first');
  const second = dialogue.AWAKENING_EXCHANGES.find((exchange) => exchange.id === 'one-second');
  assert.notDeepEqual([...second.evidence], [...first.evidence]);
});

test('the reveal names the founder exactly and carries the AI writer narration', () => {
  const portrait = join(root, 'public/founder/sadek-elgazar.jpg');
  assert.equal(existsSync(portrait), true, 'the founder portrait must exist');
  assert.ok(statSync(portrait).size > 10_000, 'the portrait must be a real image');

  assert.match(stageSource, /aria-label="Eng Sadek elgazar"/);
  assert.match(stageSource, /\/founder\/sadek-elgazar\.jpg/);
  assert.match(stageSource, /Founder & Software Developer, KNOuX/);
  assert.match(stageSource, /AI writer \/ narration/);
  assert.match(stageSource, /FINAL_NARRATION/);
  assert.equal(dialogue.FINAL_NARRATION.includes('engineer’s refusal'), true);
  assert.equal(i18n.hasSiteCopy(dialogue.FINAL_NARRATION), true);
  for (const language of ['ar', 'ur']) {
    assert.notEqual(i18n.translatedSiteCopy(dialogue.FINAL_NARRATION, language), dialogue.FINAL_NARRATION);
  }
});

test('the answer is painted as a caption and spoken from the Sentinel mouth', () => {
  assert.match(stageSource, /className="dialogue-reply__text"/);
  assert.match(stageSource, /className="dialogue-question"/);
  assert.match(stageSource, /dialogue-reply__tail/);
  assert.match(stageSource, /dialogue-product__verified/);
  assert.match(stageSource, /aria-live="polite"/);
  assert.match(stageSource, /speechLocale\(language\)/);
  assert.match(stageSource, /voice\.speak\(/);
  assert.match(stageSource, /voice\.stopSpeaking\(\)/);
  assert.match(sentinelSource, /data-expression=\{expression\}/);
  assert.match(sentinelSource, /data-speaking=\{speaking \? 'true' : 'false'\}/);
  assert.match(sentinelSource, /data-facing=\{facing\}/);
  assert.match(dialogueCss, /\.dialogue-reply__text\s*\{/);
  assert.match(dialogueCss, /\.dialogue-reply__tail\s*\{/);
  assert.match(identityCss, /\[data-facing='left'\] \.forge-shell/);
  assert.match(identityCss, /\[data-facing='right'\] \.forge-shell/);
  assert.match(identityCss, /\[data-speaking='true'\] \.forge-mouth/);
});

// -------------------------------------------------------------------- registry

test('the scene emits five real registry systems, never authored ones', () => {
  assert.equal(products.AWAKENING_PRODUCT_COUNT, 5);
  assert.equal(products.awakeningProducts.length, 5);
  assert.equal(products.awakeningProductsAreComplete(), true);
  assert.deepEqual(
    products.awakeningProducts.map((product) => product.id),
    ['sw-one', 'sw-forge', 'sw-repair', 'sw-rec', 'sw-player-x'],
  );

  for (const product of products.awakeningProducts) {
    const source = registry.softwareProducts.find((entry) => entry.id === product.id);
    assert.ok(source, `${product.id} must exist in the canonical registry`);
    assert.equal(product.slug, source.slug);
    assert.equal(product.name, source.name);
    assert.equal(product.tagline, source.tagline);
    assert.equal(product.status, source.status);
    assert.equal(product.family, source.family);
    assert.equal(product.discipline, source.discipline);
    assert.equal(product.code, source.code);
    assert.equal(product.route, `/products/${source.slug}`);
    assert.equal(product.status, 'active');
    assert.deepEqual(product.capabilities, source.capabilities);
    assert.deepEqual(product.limitations, source.limitations);
    assert.ok(product.capabilities.length > 0, `${product.id} needs published capabilities`);
    assert.ok(product.limitations.length > 0, `${product.id} needs published limitations`);
  }
});

test('every emitted card opens a dossier generated from the same registry entry', () => {
  const dossiers = read('src/app/products/[slug]/page.tsx');
  assert.match(dossiers, /softwareProducts/);
  assert.match(dossiers, /product\.slug/);
  for (const product of products.awakeningProducts) {
    assert.match(product.route, /^\/products\/[a-z0-9-]+$/);
    assert.doesNotMatch(product.route, /\s/);
  }
});

test('the projection clamps instead of inventing entries', () => {
  assert.deepEqual(products.awakeningProductsFor(-4), []);
  assert.deepEqual(products.awakeningProductsFor(0), []);
  assert.equal(products.awakeningProductsFor(3).length, 3);
  assert.deepEqual(products.awakeningProductsFor(99), products.awakeningProducts);
  assert.equal(products.awakeningProductsFor(2.9).length, 2);
});

test('each emitted system has a small real thumbnail on disk', () => {
  for (const product of products.awakeningProducts) {
    assert.match(product.logoSrc, /^\/knoux-universe\/forge\/[a-z0-9-]+\.webp$/);
    const file = join(root, 'public', product.logoSrc.replace(/^\//, ''));
    assert.ok(existsSync(file), `${product.logoSrc} must exist`);
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(bytes.length < 40_000, `${product.logoSrc} must stay a thumbnail`);
  }
});

// -------------------------------------------------------------------- fracture

test('the fracture is deterministic and bounded', () => {
  assert.deepEqual(fracture.buildScreenFracture(fracture.SCREEN_FRACTURE_SEED), fracture.screenFracture);
  assert.notDeepEqual(
    fracture.buildScreenFracture(fracture.SCREEN_FRACTURE_SEED + 1),
    fracture.screenFracture,
  );
  assert.equal(fracture.screenFracture.impacts.length, 7);
  assert.ok(fracture.screenFracture.cracks.length >= 63, 'every impact must throw a real web');
  assert.ok(fracture.screenFracture.rings.length >= 14, 'every impact must ring');
  assert.equal(fracture.screenFracture.shards.length, 38);
  assert.doesNotMatch(read('src/lib/awakening/fracture.ts'), /Math\.random/);

  const coordinates = (path) =>
    (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map((value) => Number(value));
  for (const line of fracture.screenFracture.cracks) {
    for (const value of coordinates(line.d)) {
      assert.ok(value >= 0 && value <= 1000, `crack coordinate ${value} left the screen`);
    }
  }
});

test('the fracture finishes inside its phase and cannot catch pointer input', () => {
  const phase = machine.AWAKENING_TIMING.fracture;
  // The latest authored delay plus the longest CSS draw must fit the phase.
  for (const line of fracture.screenFracture.cracks) {
    assert.ok(line.delay * 1000 + 520 <= phase, 'a crack outlived the fracture phase');
  }
  for (const shard of fracture.screenFracture.shards) {
    assert.ok(shard.delay * 1000 + 1150 <= phase, 'a shard outlived the fracture phase');
  }
  assert.match(fractureView, /if \(mode === 'off'\) return null/);
  assert.match(fractureView, /aria-hidden="true"/);
  assert.doesNotMatch(fractureView, /removeChild|innerHTML|outerHTML|replaceChildren/);
  assert.match(stageCss, /\.awakening-fracture\s*\{[^}]*pointer-events:\s*none/s);
});

// ----------------------------------------------------------------------- audio

test('audio never starts before a gesture and cleans up', () => {
  const instance = new audio.AwakeningAudio();
  assert.equal(instance.isUnlocked, false, 'constructing the score must not open a context');
  assert.equal(instance.isMuted, false);
  instance.cue('ignition');
  assert.equal(instance.isUnlocked, false, 'a cue without a gesture must stay silent');
  assert.equal(instance.unlock(), false, 'Node has no Web Audio; the scene continues silently');
  assert.equal(instance.speak('I am.', 'en-GB'), false, 'a platform without speech stays silent');
  instance.stopSpeaking();
  instance.setMuted(true);
  assert.equal(instance.isMuted, true);
  instance.dispose();
  assert.equal(instance.isUnlocked, false);
});

test('the score is synthesized locally, deterministic and bounded', () => {
  const source = read('src/lib/awakening/audio.ts');
  assert.doesNotMatch(codeOnly(source), /Math\.random/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /new Audio\(|\.mp3|\.wav|\.ogg/);
  assert.match(source, /new Ctor\(\)/);
  assert.match(source, /context\.close\(\)/);
  assert.match(source, /oscillator\.stop\(/);
  assert.match(source, /source\.stop\(/);
  assert.match(stageSource, /audioRef\.current\?\.dispose\(\)/);
  assert.match(stageSource, /audioRef\.current = null/);
});

// ------------------------------------------------------------------------- i18n

test('every awakening string resolves in the shipped EN/AR/UR catalogue', () => {
  const keys = new Set();
  for (const source of [stageSource, launcherSource]) {
    for (const match of source.matchAll(/\bt\(\s*'([^']+)'\s*\)/g)) keys.add(match[1]);
    for (const match of source.matchAll(/\bt\(\s*"([^"]+)"\s*\)/g)) keys.add(match[1]);
  }
  for (const source of [stageSource]) {
    for (const match of source.matchAll(/(?:ACT_LABEL|CAPTION|PHASE_LABEL)[\s\S]*?\n\};/g)) {
      for (const value of match[0].matchAll(/:\s*'([^']+)'/g)) keys.add(value[1]);
    }
  }
  // Every spoken line is a catalogue key, including the narrator close.
  for (const beat of dialogue.AWAKENING_DIALOGUE) keys.add(beat.text);
  keys.add(dialogue.FINAL_NARRATION);
  // Literal keys passed through a map, plus the dynamically selected sound labels.
  for (const key of [
    'Idle',
    'Ignition',
    'Awakening',
    'First emission',
    'Cascade',
    'Overcharge',
    'Fracture',
    'Revelation',
    'Explore',
    'Paused',
    'Skipped',
    'Error',
    'Cinematic phase',
    'Unmute sound',
    'Mute sound',
    'Sound off',
    'Resume the awakening',
    'Resume',
    'Skip to the reveal',
    'Skip intro',
    'Replay the awakening',
    'Replay',
    'Question from the floor',
    'replying to',
    'Live reply',
    'Registry verified',
    'Registry progress',
    'Founder reveal',
    'Founder & Software Developer, KNOuX',
    'Visitor',
    'AI writer / narration',
  ]) {
    keys.add(key);
  }

  assert.ok(keys.size > 65, `expected the whole scene vocabulary, found ${keys.size}`);
  for (const key of keys) {
    if (!key.trim()) continue;
    assert.equal(i18n.hasSiteCopy(key), true, `missing catalogue entry: ${key}`);
    for (const language of ['ar', 'ur']) {
      const translated = i18n.translatedSiteCopy(key, language);
      assert.ok(translated.length > 0, `${key} has no ${language} copy`);
      assert.notEqual(translated, key, `${key} silently fell back to English in ${language}`);
    }
  }
});

test('product tokens stay verbatim while the chrome localizes', () => {
  for (const product of products.awakeningProducts) {
    assert.equal(i18n.translatedSiteCopy(product.name, 'ar'), product.name);
    assert.equal(i18n.translatedSiteCopy(product.name, 'ur'), product.name);
    assert.equal(i18n.translatedSiteCopy(product.code, 'ar'), product.code);
  }
  assert.match(stageSource, />KNOuX</, 'the brand casing is authored, not uppercased');
  assert.doesNotMatch(stageSource, /textTransform.*KNOuX/i);
  assert.match(stageCss, /\.shout-bar__title\s*\{[^}]*color:/s);
});

test('the stage follows the site language authority and mirrors in RTL', () => {
  assert.equal(languages.siteDirection('ar'), 'rtl');
  assert.equal(languages.siteDirection('ur'), 'rtl');
  assert.equal(languages.siteDirection('en'), 'ltr');
  assert.match(stageSource, /dir=\{siteDirection\(language\)\}/);
  assert.match(stageSource, /lang=\{siteLanguageTag\(language\)\}/);
  assert.match(dialogueCss, /\[dir='rtl'\]\s+\.dialogue-question/);
  assert.match(dialogueCss, /\[dir='rtl'\]\s+\.dialogue-reply__text/);
  assert.match(dialogueCss, /\[dir='rtl'\]\s+\.shout-final__name/);
  assert.match(stageCss, /\[dir='rtl'\]\s+\.shout-final__products a/);
});

// --------------------------------------------------------------- presentation

test('the stage reuses the canonical Sentinel instead of a second mascot', () => {
  assert.match(stageSource, /<ForgeSentinel\b/);
  assert.doesNotMatch(stageSource, /<KnouxSentinel/);
  assert.match(sentinelSource, /sentinelMarkGlyph/);
  assert.match(sentinelSource, /sentinelCore\(\)/);
  assert.match(sentinelSource, /SHARDS/);
  assert.match(sentinelSource, /aria-hidden="true"/);
  assert.equal((read('src/components/identity/SentinelGuideLauncher.tsx').match(/<KnouxSentinel/g) ?? []).length, 1);
});

test('one trigger event, one stage owner', () => {
  assert.match(launcherSource, /window\.dispatchEvent\(new CustomEvent\(AWAKENING_EVENT/);
  assert.match(stageSource, /window\.addEventListener\(AWAKENING_EVENT, onAwaken\)/);
  assert.equal((stageSource.match(/addEventListener\(AWAKENING_EVENT/g) ?? []).length, 1);
  assert.match(launcherSource, /router\.push\(`\/\?\$\{AWAKENING_QUERY\}=1`\)/);
  assert.match(stageSource, /url\.searchParams\.get\(AWAKENING_QUERY\) !== '1'/);
  assert.match(stageSource, /window\.history\.replaceState/);
  assert.match(launcherSource, /event\.key\.toLowerCase\(\) !== 'k'/);
  assert.match(launcherSource, /closest\('input, textarea, select, \[contenteditable="true"\]'\)/);
  assert.match(home, /<AwakeningStage \/>/);
  assert.equal((home.match(/<AwakeningStage \/>/g) ?? []).length, 1);
  assert.equal((home.match(/<AwakeningLauncher variant="hero" \/>/g) ?? []).length, 1);
  assert.equal((header.match(/<AwakeningLauncher variant="header"/g) ?? []).length, 1);
  assert.equal((header.match(/<AwakeningLauncher variant="menu"/g) ?? []).length, 1);
});

test('the overlay is a modal that restores scroll and focus', () => {
  assert.match(stageSource, /role="dialog"/);
  assert.match(stageSource, /aria-modal="true"/);
  assert.match(stageSource, /aria-labelledby="awakening-title"/);
  assert.match(stageSource, /body\.style\.overflow = 'hidden'/);
  assert.match(stageSource, /body\.style\.overflow = previousOverflow/);
  assert.match(stageSource, /previousFocus\.current/);
  assert.match(stageSource, /restore\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stageSource, /event\.key === 'Escape'/);
  assert.match(stageSource, /event\.key !== 'Tab'/);
  assert.match(stageCss, /z-index:\s*90/);
  assert.match(stageCss, /html\[data-awakening='open'\] body/);
  assert.match(stageCss, /html\[data-awakening='open'\] \.knoux-sentinel/);
});

test('reduced motion is a direct reveal, never a faster performance', () => {
  assert.match(stageSource, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(stageSource, /dispatch\(\{ type: 'SKIP' \}\)/);
  assert.match(stageSource, /reduced \? \(\s*<p className="shout-reduced-note">/);
  assert.match(stageCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stageCss, /animation:\s*none !important/);
  assert.match(stageCss, /transition-duration:\s*0\.01ms !important/);
  assert.equal(machine.reduceAwakening(machine.initialAwakeningState(), { type: 'START', reducedMotion: true }).phase, 'explore');
});

test('no per-frame React state, no new renderer, no unbounded loop', () => {
  for (const [name, source] of [
    ['stage', stageSource],
    ['sentinel', sentinelSource],
    ['fracture view', fractureView],
    ['fracture model', read('src/lib/awakening/fracture.ts')],
    ['choreography', read('src/lib/awakening/shout.ts')],
  ]) {
    assert.doesNotMatch(source, /requestAnimationFrame/, `${name} must not animate React`);
    assert.doesNotMatch(source, /setInterval/, `${name} must not poll`);
    assert.doesNotMatch(
      source,
      /from ['"]three['"]|WebGLRenderer|getContext\(|createElement\(['"]canvas['"]\)/,
      `${name} must stay CSS/SVG`,
    );
  }
  assert.equal((stageSource.match(/setTimeout\(/g) ?? []).length <= 2, true);
  assert.equal((stageSource.match(/useState\(/g) ?? []).length, 2, 'only mute and reduced motion need state');
  assert.match(dialogueCss, /\.dialogue-archive\s*\{[^}]*display:\s*none/s);
  assert.match(dialogueCss, /\.dialogue-reply\s*\{[^}]*max-height:\s*37vh/s);
  assert.match(dialogueCss, /\.dialogue-registry\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(stageSource, /THREAD_SEATS\[AWAKENING_THREADS\.indexOf\(thread\)/);
  assert.equal(dialogue.THREAD_SEATS.length, 8);
  assert.equal(dialogue.THREAD_ARCHIVE_LIMIT, 8);
  for (const seat of dialogue.THREAD_SEATS) {
    assert.ok(seat.x >= 0 && seat.x <= 100, 'an archive seat left the viewport');
    assert.ok(seat.y >= 0 && seat.y <= 100, 'an archive seat left the viewport');
  }
  assert.equal(shout.SHOUT_SPARKS.length, 30);
  assert.equal(shout.SHOUT_ORBS.length, 2);
  assert.doesNotMatch(read('src/lib/awakening/shout.ts'), /Math\.random/);
});

test('the trigger surface is a real keyboard control in the header and menu', () => {
  assert.match(launcherSource, /<button\s+type="button"/);
  assert.match(launcherSource, /aria-label=\{t\('Activate the KNOuX awakening'\)\}/);
  assert.match(triggerCss, /\.awakening-key/);
  assert.match(triggerCss, /\.awakening-header/);
  assert.match(triggerCss, /\.awakening-menu/);
  for (const css of [triggerCss, identityCss, dialogueCss]) {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  }
});

test('the canonical Sentinel CSS is imported once and no page is rebuilt', () => {
  assert.match(sentinelSource, /import '@\/components\/identity\/knoux-sentinel\.css'/);
  assert.equal((sentinelSource.match(/knoux-sentinel\.css/g) ?? []).length, 1);
  assert.equal((stageSource.match(/knoux-awakening-dialogue\.css/g) ?? []).length, 1);
  assert.doesNotMatch(home, /replace\(|dangerouslySetInnerHTML|document\.body\.innerHTML/);
  assert.equal(existsSync(join(root, 'src/app/products/[slug]/page.tsx')), true);
  assert.ok(statSync(join(root, 'public/knoux-universe/forge')).isDirectory());
});
