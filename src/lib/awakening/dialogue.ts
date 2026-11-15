/**
 * The conversation inside KNOuX: THE AWAKENING.
 *
 * The first production of the scene was a shout. This one is a correspondence:
 * visitors put real questions about the published registry to the Sentinel and
 * it answers in complete sentences, one person at a time. The two passes are
 * deliberate. The first pass introduces each system; the second returns to the
 * same asker and finishes the feature set, which is also where the patience
 * starts to run out.
 *
 * No product, capability, limitation, route or status is authored here. An
 * answer names `productId` and, when it paraphrases a capability, the indexes
 * of the registry statements it is grounded in. `tests/awakening.test.mjs`
 * proves those indexes still resolve against `src/data/software.ts`.
 *
 * Text is the English source key for `translatedSiteCopy`. It is not display
 * copy: the stage translates every beat through the site catalogue, so Arabic
 * and Urdu visitors hear the same conversation in their own language.
 */

/** The seven authored acts. Order is the performance order. */
export const AWAKENING_ACTS = [
  'ignition',
  'awakening',
  'first-emission',
  'cascade',
  'overcharge',
  'fracture',
  'revelation',
] as const;

export type AwakeningAct = (typeof AWAKENING_ACTS)[number];

export type DialogueMood = 'calm' | 'measured' | 'sharp' | 'angry' | 'furious';

export type DialogueAuthor = {
  /** A person, not a product. Kept Latin because it is a handle, not UI copy. */
  name: string;
  handle: string;
  initials: string;
  /** Stable hue slot for the avatar, so the same person keeps the same colour. */
  tone: 0 | 1 | 2 | 3 | 4 | 5;
};

export type AwakeningExchange = {
  id: string;
  act: AwakeningAct;
  author: DialogueAuthor;
  question: string;
  answer: string;
  questionDuration: number;
  answerDuration: number;
  /** Registry entry under discussion. Absent for the opening and the crowd. */
  productId?: string;
  /** Indexes into that product's canonical `capabilities` array. */
  evidence?: readonly number[];
  mood: DialogueMood;
  side: 'left' | 'right';
};

const NOUR: DialogueAuthor = { name: 'Nour', handle: '@nour.builds', initials: 'N', tone: 0 };
const MARIAM: DialogueAuthor = { name: 'Mariam', handle: '@mariam.codes', initials: 'M', tone: 1 };
const YOUSSEF: DialogueAuthor = { name: 'Youssef', handle: '@youssef.dev', initials: 'Y', tone: 2 };
const HANA: DialogueAuthor = { name: 'Hana', handle: '@hana.ux', initials: 'H', tone: 3 };
const TAREK: DialogueAuthor = { name: 'Tarek', handle: '@tarek.frames', initials: 'T', tone: 4 };
const LINA: DialogueAuthor = { name: 'Lina', handle: '@lina.sound', initials: 'L', tone: 5 };
const OMAR: DialogueAuthor = { name: 'Omar', handle: '@omar.sys', initials: 'O', tone: 2 };

export const SENTINEL_IDENTITY = { name: 'Sentinel', handle: '@knoux.sentinel' } as const;

/**
 * Thirteen exchanges, in performance order.
 *
 * The eight-second opening is two questions, not one: the first establishes
 * that somebody is home, the second gives the institution a voice before the
 * first product is named.
 */
export const AWAKENING_EXCHANGES: readonly AwakeningExchange[] = [
  {
    id: 'opening',
    act: 'ignition',
    author: NOUR,
    question: 'Is anyone in there?',
    answer: 'I am. And I have been waiting for a question worth waking up for.',
    questionDuration: 2400,
    answerDuration: 4600,
    mood: 'calm',
    side: 'right',
  },
  {
    id: 'one-first',
    act: 'awakening',
    author: MARIAM,
    question: 'Start with KNOUX ONE. Is it just another Windows cleaner?',
    answer:
      'No. KNOUX ONE is one shell over nineteen Windows modules — cleanup, repair, storage, startup, performance, network and a developer studio.',
    questionDuration: 2600,
    answerDuration: 6200,
    productId: 'sw-one',
    evidence: [0, 2],
    mood: 'measured',
    side: 'left',
  },
  {
    id: 'forge-first',
    act: 'first-emission',
    author: YOUSSEF,
    question: 'Forge. What does it actually forge?',
    answer:
      'Evidence. Forge maps files, imports, symbols, routes, APIs, dependencies and cycles across your local repositories.',
    questionDuration: 2300,
    answerDuration: 5800,
    productId: 'sw-forge',
    evidence: [1],
    mood: 'measured',
    side: 'right',
  },
  {
    id: 'repair-first',
    act: 'cascade',
    author: HANA,
    question: 'My PC is dying. Which one of these fixes it?',
    answer:
      'Repair. Eighteen service categories — cleanup, network, security, diagnostics, backup, drivers, privacy and performance — under one workstation.',
    questionDuration: 2400,
    answerDuration: 6200,
    productId: 'sw-repair',
    evidence: [0],
    mood: 'measured',
    side: 'left',
  },
  {
    id: 'rec-first',
    act: 'cascade',
    author: TAREK,
    question: 'Why record with REC instead of OBS?',
    answer:
      'Because the take survives. REC writes to disk incrementally, recovers after a crash, and verifies every export with FFmpeg and FFprobe.',
    questionDuration: 2200,
    answerDuration: 6000,
    productId: 'sw-rec',
    evidence: [1, 2],
    mood: 'measured',
    side: 'right',
  },
  {
    id: 'player-first',
    act: 'cascade',
    author: LINA,
    question: 'Another media player? Really?',
    answer:
      'Really. Hardware-accelerated 4K HDR playback, FFprobe inspection, a ten-band neural DSP stage, and SRT, VTT, ASS and SSA subtitles.',
    questionDuration: 2200,
    answerDuration: 6000,
    productId: 'sw-player-x',
    evidence: [0, 1, 2, 3],
    mood: 'measured',
    side: 'left',
  },
  {
    id: 'one-second',
    act: 'overcharge',
    author: MARIAM,
    question: 'And if ONE deletes something by mistake?',
    answer:
      'It does not guess. Cross-volume quarantine copies, flushes, verifies a BLAKE3 digest, and only then removes the source. The command bridge is a typed Rust allowlist with no arbitrary shell endpoint.',
    questionDuration: 2200,
    answerDuration: 6400,
    productId: 'sw-one',
    evidence: [1, 3],
    mood: 'sharp',
    side: 'left',
  },
  {
    id: 'forge-second',
    act: 'overcharge',
    author: YOUSSEF,
    question: 'So it can deploy and install extensions for me, right?',
    answer:
      'Only when a real adapter supplies evidence. Forge starts in Offline Mode; a missing provider stays explicitly unavailable instead of pretending to succeed. It also exposes release provenance, permissions and compatibility without inventing a green light.',
    questionDuration: 2400,
    answerDuration: 6600,
    productId: 'sw-forge',
    evidence: [2, 3, 4],
    mood: 'sharp',
    side: 'right',
  },
  {
    id: 'repair-second',
    act: 'overcharge',
    author: HANA,
    question: 'Will Repair run something dangerous without asking?',
    answer:
      'No. Every tool carries a risk class, destructive actions require explicit confirmation, and an unelevated bridge rejects admin tools with a 403 instead of silently escalating.',
    questionDuration: 2300,
    answerDuration: 6200,
    productId: 'sw-repair',
    evidence: [1, 2, 3],
    mood: 'angry',
    side: 'left',
  },
  {
    id: 'rec-second',
    act: 'overcharge',
    author: TAREK,
    question: 'Captions? Regions? Or just full-screen?',
    answer:
      'Screen, window or a constrained region, camera picture-in-picture, manual captions with SRT export, local thumbnails and a searchable library. The renderer stays sandboxed behind a narrow typed bridge.',
    questionDuration: 2100,
    answerDuration: 6200,
    productId: 'sw-rec',
    evidence: [0, 3, 4],
    mood: 'angry',
    side: 'right',
  },
  {
    id: 'player-second',
    act: 'overcharge',
    author: LINA,
    question: 'And the AI part?',
    answer:
      'Optional OpenRouter chat, model selection and playlist generation — only with your own key. Without it, Player X never pretends the AI is there.',
    questionDuration: 2000,
    answerDuration: 5600,
    productId: 'sw-player-x',
    evidence: [4],
    mood: 'angry',
    side: 'left',
  },
  {
    id: 'crowd',
    act: 'overcharge',
    author: OMAR,
    question: 'MORE. SHOW US EVERYTHING.',
    answer: 'You have seen everything. Every claim has a source. Every route opens.',
    questionDuration: 2200,
    answerDuration: 4200,
    mood: 'angry',
    side: 'right',
  },
  {
    id: 'rupture',
    act: 'overcharge',
    author: NOUR,
    question: 'Then break it. Prove it is real.',
    answer: 'ENOUGH.',
    questionDuration: 2300,
    answerDuration: 2800,
    mood: 'furious',
    side: 'right',
  },
];

export type DialogueBeatKind = 'question' | 'answer' | 'outburst' | 'narration';

export type AwakeningBeat = {
  id: string;
  exchangeId: string | null;
  kind: DialogueBeatKind;
  act: AwakeningAct;
  speaker: 'visitor' | 'sentinel' | 'narrator';
  /** English source key for the site catalogue. */
  text: string;
  duration: number;
  productId?: string;
  author?: DialogueAuthor;
  mood: DialogueMood;
  side?: 'left' | 'right';
};

const exchangeBeats: readonly AwakeningBeat[] = AWAKENING_EXCHANGES.flatMap((exchange) => [
  {
    id: `${exchange.id}-q`,
    exchangeId: exchange.id,
    kind: 'question' as const,
    act: exchange.act,
    speaker: 'visitor' as const,
    text: exchange.question,
    duration: exchange.questionDuration,
    author: exchange.author,
    productId: exchange.productId,
    mood: exchange.mood,
    side: exchange.side,
  },
  {
    id: `${exchange.id}-a`,
    exchangeId: exchange.id,
    kind: 'answer' as const,
    act: exchange.act,
    speaker: 'sentinel' as const,
    text: exchange.answer,
    duration: exchange.answerDuration,
    productId: exchange.productId,
    author: exchange.author,
    mood: exchange.mood,
    side: exchange.side,
  },
]);

const standaloneBeats: readonly AwakeningBeat[] = [
  {
    id: 'fracture-break',
    exchangeId: null,
    kind: 'outburst',
    act: 'fracture',
    speaker: 'sentinel',
    text: 'BREAK!',
    duration: 2800,
    mood: 'furious',
  },
  {
    id: 'revelation-narration',
    exchangeId: null,
    kind: 'narration',
    act: 'revelation',
    speaker: 'narrator',
    text: 'The machine writes: KNOuX is one engineer’s refusal to ship a lie. Every system here is real. Every route opens. And the universe is still being written.',
    duration: 7000,
    mood: 'calm',
  },
];

/** The complete performance, one beat at a time. */
export const AWAKENING_DIALOGUE: readonly AwakeningBeat[] = [...exchangeBeats, ...standaloneBeats];

export const AWAKENING_BEAT_COUNT = AWAKENING_DIALOGUE.length;

/** The last line, also the line the reduced-motion and skipped reveals show. */
export const FINAL_NARRATION =
  standaloneBeats[1]?.text ??
  'The machine writes: KNOuX is one engineer’s refusal to ship a lie. Every system here is real. Every route opens. And the universe is still being written.';

export type AwakeningThread = AwakeningExchange & {
  questionIndex: number;
  answerIndex: number;
};

/**
 * Each exchange paired with its two beat indexes. The stage uses this to keep
 * the question on screen while its answer is speaking, and to archive a thread
 * only after the answer has actually landed.
 */
export const AWAKENING_THREADS: readonly AwakeningThread[] = AWAKENING_EXCHANGES.map((exchange) => ({
  ...exchange,
  questionIndex: AWAKENING_DIALOGUE.findIndex((beat) => beat.id === `${exchange.id}-q`),
  answerIndex: AWAKENING_DIALOGUE.findIndex((beat) => beat.id === `${exchange.id}-a`),
}));

export function awakeningBeatAt(index: number): AwakeningBeat | null {
  return index >= 0 && index < AWAKENING_DIALOGUE.length ? AWAKENING_DIALOGUE[index] ?? null : null;
}

export function awakeningThreadAt(index: number): AwakeningThread | null {
  return (
    AWAKENING_THREADS.find(
      (thread) => thread.questionIndex === index || thread.answerIndex === index,
    ) ?? null
  );
}

/** Threads whose answer has been delivered before this beat. */
export function awakenedThreadsBefore(index: number): readonly AwakeningThread[] {
  return AWAKENING_THREADS.filter((thread) => thread.answerIndex < index);
}

/** The act totals derived from the script, so a duration can never drift. */
export function awakeningActTotals(): Readonly<Record<AwakeningAct, number>> {
  const totals = AWAKENING_ACTS.reduce(
    (all, act) => ({ ...all, [act]: 0 }),
    {} as Record<AwakeningAct, number>,
  );
  for (const beat of AWAKENING_DIALOGUE) totals[beat.act] += beat.duration;
  return Object.freeze(totals);
}

/**
 * Seats for the questions that have already been answered. They are viewport
 * percentages with a slight authored rotation; nothing here is random.
 * The centre column belongs to the live conversation, so the archive only
 * occupies the outer edges.
 */
export type ThreadSeat = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

export const THREAD_SEATS: readonly ThreadSeat[] = [
  { x: 11, y: 21, rotate: -3.2, scale: 0.92 },
  { x: 89, y: 22, rotate: 2.8, scale: 0.94 },
  { x: 8, y: 40, rotate: 2.2, scale: 0.88 },
  { x: 92, y: 41, rotate: -2.4, scale: 0.9 },
  { x: 12, y: 59, rotate: -1.8, scale: 0.86 },
  { x: 88, y: 58, rotate: 2.6, scale: 0.86 },
  { x: 10, y: 76, rotate: 1.4, scale: 0.82 },
  { x: 90, y: 75, rotate: -1.6, scale: 0.82 },
];

export const THREAD_ARCHIVE_LIMIT = THREAD_SEATS.length;
