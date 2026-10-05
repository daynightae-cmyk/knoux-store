// The 16 Sphinx Code consciousness positions, laid out to match the
// Archetypal Blueprint® diagram and mapped into brain space.
//
// BLUEPRINT GEOMETRY (as seen facing the brain, i.e. looking down -X):
//
//   PERSONAL MATRIX (left column group)      TRANSCENDENTAL PATH (right column)
//
//                    O  (apex)        ————————>          P   EXPANSION KEY
//                 M     N
//              I     J     K          ————————           L   TRANSFORMED EGO
//   ————————————————————————————————— SOUL / INCARNATION divide
//              A     B     C          ————————           D   CONDITIONED EGO
//                 E     F
//                    G  (base)        ————————>          H   HARMONIZATION KEY
//
// HEMISPHERE MAPPING
//   feminine  (A, E, I, M) -> LEFT  hemisphere  (z < 0)
//   masculine (C, F, K, N) -> RIGHT hemisphere  (z > 0)
//   essence / structure (B, J, G, O) -> midline sagittal plane
//   transcendental path (D, H, L, P) -> deep midline, posterior column
//
// Positions A–H form the INCARNATION PYRAMID (inherited / embodied) and point
// DOWNWARD. Positions I–P form the SOUL PYRAMID (evolved) and point UPWARD.

import { projectToSurface, brainSDF } from './brainField.js';

export const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
];

export const POSITIONS = {
  A: {
    title: 'EMBODIED FEMININE TRAITS',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'FEMININE',
    hemisphere: 'LEFT HEMISPHERE',
    description: 'The feminine qualities inherited through the maternal line. This position reveals how feminine energy shapes intimacy, emotional perception, and relationship dynamics.',
  },
  B: {
    title: 'EMBODIED INNER ESSENCE',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'ESSENCE',
    hemisphere: 'MIDLINE',
    description: 'The original signature carried beneath conditioning. This position holds the untouched core of identity — the quiet constant present before the personality was shaped.',
  },
  C: {
    title: 'EMBODIED MASCULINE TRAITS',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'MASCULINE',
    hemisphere: 'RIGHT HEMISPHERE',
    description: 'The masculine qualities inherited through the paternal line. This position governs direction, structure, protection, and the instinct toward decisive action.',
  },
  D: {
    title: 'CONDITIONED EGO',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'TRANSCENDENTAL PATH',
    hemisphere: 'DEEP MIDLINE',
    description: 'The protective architecture assembled in early life. This position describes the strategies, defences, and performances adopted to remain safe and accepted.',
  },
  E: {
    title: 'EMBODIED FEMININE BEHAVIORS',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'FEMININE',
    hemisphere: 'LEFT HEMISPHERE',
    description: 'The outward expression of inherited feminine energy. This position shows how receptivity, nurture, and emotional intelligence are enacted in daily relationship.',
  },
  F: {
    title: 'EMBODIED MASCULINE BEHAVIORS',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'MASCULINE',
    hemisphere: 'RIGHT HEMISPHERE',
    description: 'The outward expression of inherited masculine energy. This position shows how initiative, boundary, and provision are enacted in the world.',
  },
  G: {
    title: 'EMBODIED ENVIRONMENT & FAMILY',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'MATRIX BASE',
    hemisphere: 'MIDLINE',
    description: 'The field the self was formed within. This position maps the inherited atmosphere of home, lineage, and belonging that calibrated the earliest sense of reality.',
  },
  H: {
    title: 'HARMONIZATION KEY',
    pyramid: 'INCARNATION PYRAMID',
    axis: 'TRANSCENDENTAL PATH',
    hemisphere: 'DEEP MIDLINE',
    description: 'The reconciling point of the incarnation structure. This position indicates where inherited opposites can be integrated rather than fought, resolving internal division.',
  },
  I: {
    title: 'EVOLVED FEMININE TRAITS',
    pyramid: 'SOUL PYRAMID',
    axis: 'FEMININE',
    hemisphere: 'LEFT HEMISPHERE',
    description: 'The feminine principle refined through conscious work. This position reveals the matured form of intimacy, perception, and emotional sovereignty.',
  },
  J: {
    title: 'EVOLVED INNER ESSENCE',
    pyramid: 'SOUL PYRAMID',
    axis: 'ESSENCE',
    hemisphere: 'MIDLINE',
    description: 'The inner signature once it is fully inhabited. This position describes essence no longer hidden beneath adaptation, expressed as a stable and knowing presence.',
  },
  K: {
    title: 'EVOLVED MASCULINE TRAITS',
    pyramid: 'SOUL PYRAMID',
    axis: 'MASCULINE',
    hemisphere: 'RIGHT HEMISPHERE',
    description: 'The masculine principle refined through conscious work. This position reveals direction held without force — structure that serves rather than dominates.',
  },
  L: {
    title: 'TRANSFORMED EGO',
    pyramid: 'SOUL PYRAMID',
    axis: 'TRANSCENDENTAL PATH',
    hemisphere: 'DEEP MIDLINE',
    description: 'The protective architecture reformed into an instrument. This position marks the ego reoriented from defence toward service, retained in usefulness and released in rigidity.',
  },
  M: {
    title: 'EVOLVED FEMININE BEHAVIORS',
    pyramid: 'SOUL PYRAMID',
    axis: 'FEMININE',
    hemisphere: 'LEFT HEMISPHERE',
    description: 'The conscious enactment of refined feminine energy. This position shows receptivity practised as discernment, and nurture offered without self-abandonment.',
  },
  N: {
    title: 'EVOLVED MASCULINE BEHAVIORS',
    pyramid: 'SOUL PYRAMID',
    axis: 'MASCULINE',
    hemisphere: 'RIGHT HEMISPHERE',
    description: 'The conscious enactment of refined masculine energy. This position shows initiative expressed as clarity, and boundary held with steadiness rather than defence.',
  },
  O: {
    title: 'EVOLVED ENVIRONMENT & FAMILY',
    pyramid: 'SOUL PYRAMID',
    axis: 'MATRIX APEX',
    hemisphere: 'MIDLINE',
    description: 'The field the self chooses to build. This position maps the deliberate construction of home, relationship, and lineage aligned with realised values.',
  },
  P: {
    title: 'EXPANSION KEY',
    pyramid: 'SOUL PYRAMID',
    axis: 'TRANSCENDENTAL PATH',
    hemisphere: 'DEEP MIDLINE',
    description: 'The opening point of the soul structure. This position indicates where the integrated system extends beyond itself — the direction of growth once division has resolved.',
  },
};

// ---------------------------------------------------------------------------
// Blueprint plane coordinates.
//   u : lateral   (-1 = feminine / left hemisphere, +1 = masculine / right)
//   v : vertical  (-1 = base of Incarnation, +1 = apex of Soul)
//   path : true for the Transcendental Path column (D, H, L, P)
// These match the row/column structure of the Archetypal Blueprint diagram.
const BLUEPRINT = {
  // ---- Incarnation Pyramid (points downward) ----
  G: { u:  0.00, v: -1.00 },
  E: { u: -0.46, v: -0.62 },
  F: { u:  0.46, v: -0.62 },
  A: { u: -0.92, v: -0.20 },
  B: { u:  0.00, v: -0.20 },
  C: { u:  0.92, v: -0.20 },
  // ---- Soul Pyramid (points upward) ----
  I: { u: -0.92, v:  0.20 },
  J: { u:  0.00, v:  0.20 },
  K: { u:  0.92, v:  0.20 },
  M: { u: -0.46, v:  0.62 },
  N: { u:  0.46, v:  0.62 },
  O: { u:  0.00, v:  1.00 },
  // ---- Transcendental Path (deep midline column) ----
  H: { u: 0, v: -1.00, path: true },
  D: { u: 0, v: -0.20, path: true },
  L: { u: 0, v:  0.20, path: true },
  P: { u: 0, v:  1.00, path: true },
};

export const PYRAMIDS = {
  incarnation: { letters: ['A', 'B', 'C', 'E', 'F', 'G'], apex: 'G', base: ['A', 'C'] },
  soul: { letters: ['I', 'J', 'K', 'M', 'N', 'O'], apex: 'O', base: ['I', 'K'] },
  path: ['H', 'D', 'L', 'P'],
};

// Edges of the two superimposed pyramid armatures, in blueprint terms.
export const PYRAMID_EDGES = {
  incarnation: [
    ['A', 'C'],            // upper rule of the downward triangle
    ['A', 'G'], ['C', 'G'], // sloping sides converging at the base point
    ['A', 'B'], ['B', 'C'], // inner row
    ['E', 'F'],            // behaviours rule
    ['A', 'E'], ['C', 'F'],
    ['E', 'G'], ['F', 'G'],
    ['B', 'E'], ['B', 'F'],
  ],
  soul: [
    ['I', 'K'],
    ['I', 'O'], ['K', 'O'],
    ['I', 'J'], ['J', 'K'],
    ['M', 'N'],
    ['I', 'M'], ['K', 'N'],
    ['M', 'O'], ['N', 'O'],
    ['J', 'M'], ['J', 'N'],
  ],
  path: [['H', 'D'], ['D', 'L'], ['L', 'P']],
  // the two lateral arrows in the blueprint
  arrows: [['G', 'H'], ['O', 'P']],
  // vertical correspondences across the divide (A<->I, B<->J, ...)
  correspondence: [['A', 'I'], ['B', 'J'], ['C', 'K'], ['E', 'M'], ['F', 'N'], ['G', 'O'], ['D', 'L'], ['H', 'P']],
};

// ---------------------------------------------------------------------------
// Mapping the blueprint plane into brain space.
//
// The blueprint's vertical axis (v) becomes a front-to-top sweep through the
// cerebrum, its lateral axis (u) becomes the hemispheric axis (z), and the
// Transcendental Path sits behind the matrix on the deep midline.

const SPREAD_Z = 0.96;   // lateral reach of the feminine/masculine columns
const ARC_X = 1.02;      // anterior reach at v = -1
const ARC_Y = 1.06;      // superior reach at v = +1

function blueprintToBrain(u, v, isPath) {
  // v sweeps the cortex from the temporal/frontal base up over the crown.
  const a = (v + 1) * 0.5;                       // 0 at base, 1 at apex
  const theta = (1 - a) * 0.98 - a * 1.42;       // radians, front -> rear-top

  const x = Math.cos(theta) * ARC_X * (isPath ? 0.30 : 1.0) - (isPath ? 0.62 : 0.0);
  const y = Math.sin(theta) * -1 * 0.0 + v * ARC_Y * 0.78 + (isPath ? 0.04 : -0.06);
  const z = u * SPREAD_Z;

  return { x, y, z };
}

export function buildConsciousnessNodes() {
  return LETTERS.map((letter, i) => {
    const bp = BLUEPRINT[letter];
    const meta = POSITIONS[letter];
    const raw = blueprintToBrain(bp.u, bp.v, !!bp.path);

    let position;
    let depth;

    if (bp.path) {
      // Transcendental Path nodes live INSIDE the brain on the deep midline —
      // they must not be projected to the cortex.
      position = { x: raw.x, y: raw.y * 0.82, z: 0 };
      // pull inward until safely interior
      let guard = 0;
      while (brainSDF(position) > -0.10 && guard < 40) {
        position = { x: position.x * 0.94, y: position.y * 0.94, z: 0 };
        guard++;
      }
      depth = 'interior';
    } else {
      // Matrix nodes ride on the cortical surface.
      const l = Math.hypot(raw.x, raw.y, raw.z) || 1;
      const start = {
        x: raw.x / l * 2.0,
        y: raw.y / l * 1.8,
        z: raw.z / l * 1.45,
      };
      // bias the start toward the intended blueprint direction so the
      // projection lands on the right patch of cortex
      const seed = {
        x: (start.x + raw.x) * 0.5,
        y: (start.y + raw.y) * 0.5,
        z: (start.z + raw.z * 1.35) * 0.5,
      };
      position = projectToSurface(seed, -0.02);
      depth = 'cortical';
    }

    return {
      position,
      blueprint: bp,
      depth,
      index: i,
      letter,
      name: 'node_' + letter,
      title: meta.title,
      pyramid: meta.pyramid,
      axis: meta.axis,
      hemisphere: meta.hemisphere,
      description: meta.description,
      counterpart: LETTERS[(i + 8) % 16],
    };
  });
}