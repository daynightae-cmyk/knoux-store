/**
 * Systems field â€” the painter behind the KNOuX Systems Register.
 *
 * One Canvas 2D renderer, drawn in the same vocabulary as the accepted Hero:
 * deep black, graphite, platinum and silver with KNOuX violet used only as a
 * signal, hairline architecture, deterministic motion and generous negative
 * space. It is Canvas 2D rather than a second WebGL scene for the same reason
 * `UniverseConstellation` is: the Hero already holds the site's one permanent
 * renderer, and a graph of seven systems does not repay the cost of another
 * context.
 *
 * Two rules govern everything below.
 *
 * The first is that the field never invents. Positions come from each product's
 * own `topology` in `src/data/software.ts`; the motif comes from the product's
 * own visual profile in `src/data/product-visuals.ts`; the relationships drawn
 * as connectors are the product's own `relatedIds`. There is no decorative node,
 * no invented metric, no health reading and no live status anywhere in here. A
 * motif is geometry, and geometry is presentation.
 *
 * The second is determinism. `Math.random()` appears nowhere, so the same
 * registry renders the same composition on every load, at every width, in every
 * build.
 *
 * Ported from the Stellar Seal donor (de6072446d3ee9034b3d7143b35c61c81004b1f8)
 * into current-main-compatible code. Data authority is origin/main (ae7c0d3).
 */

import { softwareProducts, type SoftwareProduct } from '@/data/software';
import { visualProfileFor, type ProductVisualMotif } from '@/data/product-visuals';
import { buildStarField, type Star } from '@/lib/knouxField';
import { UNIVERSE_PALETTE } from '@/lib/universePalette';

/** The plane is squashed vertically so it reads as a surface, not a flat graph. */
const PLANE_SQUASH = 0.62;
/** Field dust per tier. The Hero's seed, thinned â€” the same field, not a new one. */
export const SYSTEMS_DUST = { high: 190, balanced: 132, low: 74, reduced: 56 } as const;

/** Convert a 6-digit hex token into a valid rgba() canvas colour. */
function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return hex;
  const parsed = Number.parseInt(value, 16);
  return `rgba(${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}, ${Math.max(
    0,
    Math.min(1, alpha),
  ).toFixed(3)})`;
}

/** Only the tokens the accepted Hero already uses. */
const INK = {
  /** Structural construction lines. */
  hairline: '#3a3a41',
  /** Dashed survey lines, quieter than structure. */
  survey: '#2c2b32',
  /** A system body: graphite, so interiors stay dark. */
  body: UNIVERSE_PALETTE.graphite,
  /** An open rim. */
  rim: '#5b5a64',
  platinum: UNIVERSE_PALETTE.platinum,
  muted: UNIVERSE_PALETTE.muted,
  violet: UNIVERSE_PALETTE.violet,
  violetSoft: UNIVERSE_PALETTE.violetSoft,
  violetDeep: UNIVERSE_PALETTE.violetDeep,
  connector: UNIVERSE_PALETTE.connector,
} as const;

export type FieldFrame = {
  /** Seconds since mount. Drives every cycle, so nothing needs a timer. */
  seconds: number;
  /** The system the field is currently resolving. */
  active: SoftwareProduct;
  /** The system being resolved away from, while a transition is in flight. */
  previous: SoftwareProduct | null;
  /** 0..1, how much of the outgoing motif is still on the field. */
  fade: number;
  /** 0..1 arrival. The field resolves in rather than appearing. */
  reveal: number;
  /** -1..1, the pointer's position inside the field. Pointer depth only. */
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
};

/* ------------------------------------------------------------------ */
/* Motifs. Each one is geometry only: no number drawn here is a metric. */
/* ------------------------------------------------------------------ */

type MotifPainter = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  alpha: number,
) => void;

function diamond(context: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  context.beginPath();
  context.moveTo(cx, cy - r);
  context.lineTo(cx + r, cy);
  context.lineTo(cx, cy + r);
  context.lineTo(cx - r, cy);
  context.closePath();
  context.stroke();
}

/**
 * KNOUX ONE â€” system control. Modular planes over one nucleus: three stacked
 * operating surfaces, each a partial rectangle, with a bounded pulse travelling
 * the spine between them.
 */
const systemNucleus: MotifPainter = (context, cx, cy, r, t, alpha) => {
  for (let plane = 0; plane < 3; plane += 1) {
    const lift = (plane - 1) * r * 0.24;
    const width = r * (1.18 - plane * 0.2);
    const height = r * (0.42 - plane * 0.06);
    context.strokeStyle = rgba(plane === 1 ? '#6d6a78' : INK.hairline, 0.62 * alpha);
    context.lineWidth = plane === 1 ? 1.2 : 1;
    context.strokeRect(cx - width / 2, cy + lift - height / 2, width, height);
    // Registered modules along the plane's leading edge.
    for (let slot = 0; slot < 4; slot += 1) {
      const slotX = cx - width / 2 + (width / 4) * (slot + 0.5);
      context.fillStyle = rgba(INK.muted, 0.5 * alpha);
      context.fillRect(slotX - 1.5, cy + lift - height / 2 + 3, 3, Math.max(2, height - 6));
    }
  }
  // The nucleus, on the mark's own diagonal.
  context.strokeStyle = rgba(INK.violetSoft, 0.7 * alpha);
  context.lineWidth = 1.1;
  diamond(context, cx, cy, r * 0.24);
  const run = ((t * 0.34) % 1 + 1) % 1;
  context.fillStyle = rgba(INK.platinum, (1 - run) * 0.85 * alpha);
  context.beginPath();
  context.arc(cx, cy - r * 0.42 + run * r * 0.84, 1.6, 0, Math.PI * 2);
  context.fill();
};

/**
 * KForge â€” engineering graph. One trunk resolving into dependency branches and
 * leaves, with a trace propagating outward as they resolve.
 */
const repositoryTopology: MotifPainter = (context, cx, cy, r, t, alpha) => {
  const branches = 3;
  const footY = cy + r * 0.46;
  const ends: Array<{ elbowX: number; elbowY: number; tipX: number; tipY: number }> = [];

  for (let branch = 0; branch < branches; branch += 1) {
    const spread = ((branch - 1) / branches) * 1.5;
    const elbowX = cx + spread * r * 0.34;
    const elbowY = cy - r * 0.1;
    const tipX = cx + spread * r * 0.92;
    const tipY = cy - r * 0.06 - Math.abs(spread) * r * 0.1;
    ends.push({ elbowX, elbowY, tipX, tipY });

    context.strokeStyle = rgba('#4c4b55', 0.66 * alpha);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx, footY);
    context.lineTo(elbowX, elbowY);
    context.stroke();

    context.strokeStyle = rgba(INK.rim, 0.5 * alpha);
    context.beginPath();
    context.moveTo(elbowX, elbowY);
    context.lineTo(tipX, tipY);
    context.stroke();

    // Two leaves per branch.
    for (let leaf = 0; leaf < 2; leaf += 1) {
      const leafX = tipX + (leaf === 0 ? 1 : -1) * r * 0.16;
      const leafY = tipY - r * (0.1 + leaf * 0.14);
      context.strokeStyle = rgba(INK.hairline, 0.7 * alpha);
      context.beginPath();
      context.moveTo(tipX, tipY);
      context.lineTo(leafX, leafY);
      context.stroke();
      context.fillStyle = rgba(INK.muted, 0.72 * alpha);
      context.fillRect(leafX - 1.2, leafY - 1.2, 2.4, 2.4);
    }
  }

  // The trace: the trunk first, then each branch, on one deterministic cycle.
  const resolve = (((t * 0.28) % 1.6) + 1.6) % 1.6 / 1.6;
  context.fillStyle = rgba(INK.violetSoft, 0.9 * alpha);
  for (let index = 0; index < ends.length; index += 1) {
    const at = resolve * 1.4 - index * 0.16;
    if (at <= 0 || at >= 1) continue;
    const { elbowX, elbowY, tipX, tipY } = ends[index];
    // Leg one: foot to elbow. Leg two: elbow to tip.
    const first = Math.min(1, at * 1.6);
    const second = Math.min(1, Math.max(0, (at - 0.55) * 2.2));
    const trunkX = cx + (elbowX - cx) * first;
    const trunkY = footY + (elbowY - footY) * first;
    const px = trunkX + (tipX - trunkX) * second;
    const py = trunkY + (tipY - trunkY) * second;
    context.beginPath();
    context.arc(px, py, 1.7, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = rgba(INK.platinum, 0.8 * alpha);
  context.fillRect(cx - 3, footY - 3, 6, 6);
};

/**
 * KNOuX Repair â€” diagnostics. Concentric rings with a bounded scan arc and
 * radial sector ticks. The arc is a scan, not a reading: nothing here is
 * presented as a health percentage, a temperature or a pass rate.
 */
const diagnosticRings: MotifPainter = (context, cx, cy, r, t, alpha) => {
  for (let ring = 0; ring < 4; ring += 1) {
    context.lineWidth = 1;
    context.setLineDash(ring % 2 === 0 ? [] : [2, 6]);
    context.strokeStyle = rgba(INK.hairline, (0.5 - ring * 0.06) * alpha);
    context.beginPath();
    context.arc(cx, cy, r * (0.32 + ring * 0.24), 0, Math.PI * 2);
    context.stroke();
  }
  context.setLineDash([]);
  // Sector ticks: eight, one per division of the ring, not one per claim.
  for (let sector = 0; sector < 8; sector += 1) {
    const angle = (sector / 8) * Math.PI * 2;
    context.strokeStyle = rgba(INK.muted, 0.42 * alpha);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * r * 0.34, cy + Math.sin(angle) * r * 0.34 * PLANE_SQUASH);
    context.lineTo(cx + Math.cos(angle) * r * 1.04, cy + Math.sin(angle) * r * 1.04 * PLANE_SQUASH);
    context.stroke();
  }
  const sweep = t * 0.5;
  context.lineWidth = 1.4;
  context.strokeStyle = rgba(INK.violetSoft, 0.8 * alpha);
  context.beginPath();
  context.arc(cx, cy, r * 0.8, sweep, sweep + 0.9);
  context.stroke();
  context.lineWidth = 1;
  context.strokeStyle = rgba(INK.violet, 0.34 * alpha);
  context.beginPath();
  context.arc(cx, cy, r * 0.8, sweep + 0.9, sweep + 1.5);
  context.stroke();
  context.fillStyle = rgba(INK.platinum, 0.7 * alpha);
  context.beginPath();
  context.arc(cx, cy, 2.1, 0, Math.PI * 2);
  context.fill();
};

/**
 * SmartOrganizer â€” ordered clusters. A deterministic scatter resolves into three
 * storage lanes. Nothing is deleted and nothing is claimed to be: the motion is
 * about order, which is the product's actual subject.
 */
const fileClusters: MotifPainter = (context, cx, cy, r, t, alpha) => {
  const lanes = 3;
  const perLane = 9;
  for (let lane = 0; lane < lanes; lane += 1) {
    const laneY = cy + (lane - 1) * r * 0.44;
    context.strokeStyle = rgba(INK.hairline, 0.5 * alpha);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx - r * 1.06, laneY);
    context.lineTo(cx + r * 1.06, laneY);
    context.stroke();

    for (let item = 0; item < perLane; item += 1) {
      const share = perLane <= 1 ? 0 : item / (perLane - 1);
      const seed = lane * 97 + item * 13;
      const wander = Math.sin(seed) * r * 0.5;
      const breathe = Math.sin(t * 0.4 + seed * 0.3) * r * 0.02;
      // The lane fills left to right, because the item's share is its arrival.
      const arrive = Math.min(1, Math.max(0, t * 0.22 - share * 0.5));
      const eased = arrive * arrive * (3 - 2 * arrive);
      const scatterY = laneY + wander + breathe;
      const px = cx - r * 1.02 + share * r * 2.04;
      const py = scatterY + (laneY - scatterY) * eased;
      const size = 3 + eased * 4.4;
      context.strokeStyle = rgba('#514f5a', (0.3 + eased * 0.55) * alpha);
      context.strokeRect(px - size / 2, py - size / 2, size, size);
    }
  }
  context.fillStyle = rgba(INK.violetSoft, 0.7 * alpha);
  context.fillRect(cx - 0.6, cy - r * 0.5, 1.2, r);
};

/**
 * KNOuX REC â€” capture field. Corner brackets close on a frame, a waveform ribbon
 * breathes inside it, and two timeline lanes run beneath. The waveform is a
 * drawn shape, not sampled audio.
 */
const captureTimeline: MotifPainter = (context, cx, cy, r, t, alpha) => {
  const half = r * 0.94;
  const arm = r * 0.3;
  const close = Math.min(1, Math.max(0, t * 0.3));
  const reach = half * (0.6 + 0.4 * (close * close * (3 - 2 * close)));
  context.lineWidth = 1.2;
  context.strokeStyle = rgba('#5c5b66', 0.8 * alpha);
  const corners: Array<[number, number, number, number]> = [
    [cx - reach, cy - reach * PLANE_SQUASH, 1, 1],
    [cx + reach, cy - reach * PLANE_SQUASH, -1, 1],
    [cx - reach, cy + reach * PLANE_SQUASH, 1, -1],
    [cx + reach, cy + reach * PLANE_SQUASH, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    context.beginPath();
    context.moveTo(x + sx * arm, y);
    context.lineTo(x, y);
    context.lineTo(x, y + sy * arm);
    context.stroke();
  }

  const bars = 34;
  context.lineWidth = 1;
  context.strokeStyle = rgba(INK.violetSoft, 0.66 * alpha);
  context.beginPath();
  for (let bar = 0; bar < bars; bar += 1) {
    const share = bar / (bars - 1);
    const envelope = Math.sin(share * Math.PI);
    const value = Math.sin(share * 22 + t * 1.6) * 0.5 + Math.sin(share * 9 - t * 1.1) * 0.5;
    const barX = cx - reach + share * reach * 2;
    const barY = cy + value * envelope * r * 0.3;
    if (bar === 0) context.moveTo(barX, barY);
    else context.lineTo(barX, barY);
  }
  context.stroke();

  for (let lane = 0; lane < 2; lane += 1) {
    const laneY = cy + r * (0.62 + lane * 0.2);
    context.lineWidth = 1;
    context.strokeStyle = rgba(INK.hairline, 0.5 * alpha);
    context.beginPath();
    context.moveTo(cx - half, laneY);
    context.lineTo(cx + half, laneY);
    context.stroke();
    const playhead = ((((t * 0.24 + lane * 0.3) % 1) + 1) % 1) * 2 - 1;
    context.fillStyle = rgba(INK.platinum, 0.6 * alpha);
    context.fillRect(cx + playhead * half - 0.75, laneY - r * 0.06, 1.5, r * 0.12);
  }
};

/**
 * Player X â€” signal architecture. A playback ring over a deterministic spectral
 * field, with two subtitle tracks beneath. The bars are geometry: no level, no
 * loudness figure and no track name is asserted.
 */
const mediaSpectrum: MotifPainter = (context, cx, cy, r, t, alpha) => {
  const bars = 28;
  const baseline = cy + r * 0.34;
  for (let bar = 0; bar < bars; bar += 1) {
    const share = bar / (bars - 1);
    const envelope = Math.sin(share * Math.PI) * 0.7 + 0.3;
    const value =
      (Math.sin(share * 17 + t * 1.3) * 0.5 + 0.5) * 0.6 +
      (Math.sin(share * 41 - t * 0.8) * 0.5 + 0.5) * 0.4;
    const height = value * envelope * r * 0.86;
    const barX = cx - r * 0.96 + share * r * 1.92;
    context.fillStyle = rgba('#4f4e59', (0.24 + value * 0.5) * alpha);
    context.fillRect(barX - 2.4, baseline - height, 4.8, height);
  }
  context.lineWidth = 1;
  context.strokeStyle = rgba(INK.hairline, 0.5 * alpha);
  context.beginPath();
  context.moveTo(cx - r, baseline);
  context.lineTo(cx + r, baseline);
  context.stroke();

  const ring = r * 0.36;
  context.strokeStyle = rgba('#4a4952', 0.6 * alpha);
  context.beginPath();
  context.arc(cx, cy, ring, 0, Math.PI * 2);
  context.stroke();
  const travel = ((((t * 0.22) % 1) + 1) % 1) * Math.PI * 2 - Math.PI / 2;
  context.lineWidth = 1.4;
  context.strokeStyle = rgba(INK.violetSoft, 0.85 * alpha);
  context.beginPath();
  context.arc(cx, cy, ring, travel, travel + 0.6);
  context.stroke();
  context.fillStyle = rgba(INK.platinum, 0.85 * alpha);
  context.beginPath();
  context.arc(cx + Math.cos(travel) * ring, cy + Math.sin(travel) * ring, 1.9, 0, Math.PI * 2);
  context.fill();

  for (let track = 0; track < 2; track += 1) {
    const trackY = cy + r * (0.62 + track * 0.18);
    const from = -r * (0.7 - track * 0.12);
    const width = r * (0.62 + track * 0.16);
    context.lineWidth = 1;
    context.strokeStyle = rgba(track === 0 ? INK.violetDeep : INK.survey, 0.8 * alpha);
    context.beginPath();
    context.moveTo(cx + from, trackY);
    context.lineTo(cx + from + width, trackY);
    context.stroke();
  }
};

/**
 * Clipboard AI â€” the guarded channel. Cards enter a channel, meet an inspection
 * gate, and resolve to a bounded route. The gate is drawn, not labelled with a
 * verdict: the product's real status is published as text in the record beside
 * it, and the field makes no claim of its own.
 */
const guardedClipboard: MotifPainter = (context, cx, cy, r, t, alpha) => {
  const channelHalf = r * 0.3;
  const halfSpan = r * 0.98;
  const inspect = ((((t * 0.26) % 1.6) + 1.6) % 1.6) / 1.6;

  context.lineWidth = 1;
  context.strokeStyle = rgba(INK.survey, 0.9 * alpha);
  context.beginPath();
  context.moveTo(cx - halfSpan, cy - channelHalf);
  context.lineTo(cx, cy - channelHalf);
  context.moveTo(cx - halfSpan, cy + channelHalf);
  context.lineTo(cx, cy + channelHalf);
  context.moveTo(cx, cy - channelHalf);
  context.lineTo(cx + halfSpan, cy - channelHalf);
  context.moveTo(cx, cy + channelHalf);
  context.lineTo(cx + halfSpan, cy + channelHalf);
  context.stroke();

  // The inspection gate, brightest at the moment of inspection.
  const gate = Math.max(0, 1 - Math.abs(inspect - 0.5) * 3.4);
  context.lineWidth = 1.3;
  context.strokeStyle = rgba(INK.violetSoft, (0.3 + gate * 0.7) * alpha);
  context.beginPath();
  context.moveTo(cx, cy - channelHalf * 1.16);
  context.lineTo(cx, cy + channelHalf * 1.16);
  context.stroke();

  for (let lane = 0; lane < 3; lane += 1) {
    const laneY = cy + (lane - 1) * channelHalf * 0.62;
    for (let card = 0; card < 3; card += 1) {
      const travel = ((((inspect + card * 0.33 + lane * 0.11) % 1) + 1) % 1) * 2 - 1;
      const cardX = cx + travel * halfSpan;
      const cardW = r * 0.16;
      const cardH = r * 0.1;
      const passed = travel > 0;
      context.lineWidth = 1;
      context.strokeStyle = rgba(passed ? INK.rim : '#5a5866', (passed ? 0.75 : 0.5) * alpha);
      context.strokeRect(cardX - cardW / 2, laneY - cardH / 2, cardW, cardH);
      if (Math.abs(travel) < 0.04) {
        context.fillStyle = rgba(INK.platinum, 0.9 * alpha);
        context.fillRect(cardX - 0.75, laneY - cardH / 2, 1.5, cardH);
      }
    }
  }

  context.lineWidth = 1;
  context.strokeStyle = rgba(INK.violet, 0.5 * alpha);
  context.beginPath();
  context.moveTo(cx + halfSpan * 0.74, cy - channelHalf * 0.5);
  context.lineTo(cx + halfSpan * 0.74, cy + channelHalf * 0.5);
  context.stroke();
};

const MOTIFS: Record<ProductVisualMotif, MotifPainter> = {
  'system-nucleus': systemNucleus,
  'repository-topology': repositoryTopology,
  'diagnostic-rings': diagnosticRings,
  'file-clusters': fileClusters,
  'capture-timeline': captureTimeline,
  'media-spectrum': mediaSpectrum,
  'guarded-clipboard': guardedClipboard,
};

export function motifFor(product: SoftwareProduct): ProductVisualMotif {
  return visualProfileFor(product.slug)?.motif ?? 'system-nucleus';
}

/* ------------------------------------------------------------------ */
/* Relationships, resolved from the registry                            */
/* ------------------------------------------------------------------ */

export type RelatedNode = {
  product: SoftwareProduct;
  /** Absolute radians, taken from the product's own declared topology angle. */
  angle: number;
  /** Orbit index, 1..3, straight from the registry. */
  orbit: number;
};

export function relatedNodes(product: SoftwareProduct): RelatedNode[] {
  const members = softwareProducts.filter((entry) => product.relatedIds.includes(entry.id));
  // The bearing is the registry's own. Only the starting offset is ours, so two
  // related systems never stack on the same bearing.
  return members.map((entry, index) => ({
    product: entry,
    angle: (entry.topology.angleDeg * Math.PI) / 180 + index * 0.16,
    orbit: entry.topology.orbit,
  }));
}

/* ------------------------------------------------------------------ */
/* The frame                                                           */
/* ------------------------------------------------------------------ */

let dust: Star[] = [];
let dustCount = -1;

function dustFor(count: number): Star[] {
  if (count !== dustCount) {
    dustCount = count;
    dust = buildStarField(count);
  }
  return dust;
}

/** Stable, non-random phase for a connector, so a signal never flickers on load. */
function phaseFor(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return hash / 997;
}

function drawDust(context: CanvasRenderingContext2D, frame: FieldFrame, count: number) {
  for (const star of dustFor(count)) {
    const depth = star.layer === 'near' ? 1 : star.layer === 'mid' ? 0.5 : 0.2;
    const drift = frame.seconds * frame.reveal;
    const x = star.x * frame.width + star.driftX * drift * frame.width * 900;
    const y =
      star.y * frame.height +
      star.driftY * drift * frame.height * 900 +
      Math.sin(frame.seconds * 0.05 + star.phase) * 2 * depth +
      frame.pointerY * depth * -7;
    const alpha = Math.min(
      1,
      (star.alpha + star.amplitude * Math.sin(frame.seconds * star.speed + star.phase)) * frame.reveal,
    );
    if (alpha <= 0.03) continue;
    context.fillStyle = star.violet ? rgba('#bea8e0', alpha * 0.8) : rgba('#e2e0e7', alpha);
    context.beginPath();
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawArchitecture(context: CanvasRenderingContext2D, frame: FieldFrame, cx: number, cy: number, r: number) {
  const alpha = frame.reveal;
  context.lineWidth = 1;
  // Two construction axes, interrupted at the motif, so the field reads as drawn
  // around a subject rather than as graph paper behind it.
  context.strokeStyle = rgba('#33333a', 0.5 * alpha);
  context.setLineDash([1, 9]);
  context.beginPath();
  context.moveTo(0, cy);
  context.lineTo(cx - r * 0.5, cy);
  context.moveTo(cx + r * 0.5, cy);
  context.lineTo(frame.width, cy);
  context.moveTo(cx, 0);
  context.lineTo(cx, cy - r * 0.5);
  context.moveTo(cx, cy + r * 0.5);
  context.lineTo(cx, frame.height);
  context.stroke();
  context.setLineDash([]);
  // The datum arc the related systems stand on.
  context.strokeStyle = rgba(INK.survey, 0.8 * alpha);
  context.setLineDash([2, 8]);
  context.beginPath();
  context.ellipse(cx, cy, r * 1.28, r * 1.28 * PLANE_SQUASH, 0, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
}

function drawMotif(
  context: CanvasRenderingContext2D,
  frame: FieldFrame,
  product: SoftwareProduct,
  alpha: number,
  cx: number,
  cy: number,
  r: number,
) {
  if (alpha <= 0.02) return;
  context.save();
  MOTIFS[motifFor(product)](context, cx, cy, r, frame.seconds, alpha);
  context.restore();
}

function drawRelations(context: CanvasRenderingContext2D, frame: FieldFrame, cx: number, cy: number, base: number) {
  const alpha = frame.reveal;
  relatedNodes(frame.active).forEach((node, index) => {
    const radius = base * (node.orbit === 1 ? 1.34 : node.orbit === 2 ? 1.62 : 1.92);
    const x = cx + Math.cos(node.angle) * radius;
    const y = cy + Math.sin(node.angle) * radius * PLANE_SQUASH;
    const controlX = cx + (x - cx) * 0.5 - (y - cy) * 0.14;
    const controlY = cy + (y - cy) * 0.5 + (x - cx) * 0.14;

    context.lineWidth = 1;
    context.strokeStyle = rgba(INK.connector, 0.6 * alpha);
    context.beginPath();
    context.moveTo(cx, cy);
    context.quadraticCurveTo(controlX, controlY, x, y);
    context.stroke();

    // A signal travels only the relationships of what is being read.
    const travel = (frame.seconds * 0.18 + phaseFor(`${frame.active.id}:${node.product.id}`)) % 1;
    const inverse = 1 - travel;
    context.fillStyle = rgba(INK.violetSoft, 0.9 * alpha);
    context.beginPath();
    context.arc(
      inverse * inverse * cx + 2 * inverse * travel * controlX + travel * travel * x,
      inverse * inverse * cy + 2 * inverse * travel * controlY + travel * travel * y,
      1.7,
      0,
      Math.PI * 2,
    );
    context.fill();

    // The related system: a graphite body, an open rim, a code tick.
    const size = base * 0.1;
    context.fillStyle = INK.body;
    context.fillRect(x - size / 2, y - size / 2, size, size);
    context.strokeStyle = rgba(INK.rim, 0.9 * alpha);
    context.strokeRect(x - size / 2, y - size / 2, size, size);
    context.fillStyle = rgba(INK.muted, 0.7 * alpha);
    context.fillRect(x - size / 2, y + size / 2 + 3, size * 0.44, 1);
    if (index === 0) {
      context.strokeStyle = rgba(INK.violet, 0.34 * alpha);
      context.strokeRect(x - size * 0.86, y - size * 0.86, size * 1.72, size * 1.72);
    }
  });
}

/** One frame. The caller owns the loop, the sizing and the pause policy. */
export function drawSystemsField(context: CanvasRenderingContext2D, frame: FieldFrame, dustCount: number) {
  context.clearRect(0, 0, frame.width, frame.height);
  const cx = frame.width / 2 + frame.pointerX * 9;
  const cy = frame.height / 2 + frame.pointerY * 6;
  const r = Math.min(frame.width, frame.height) * 0.29;

  drawDust(context, frame, dustCount);
  drawArchitecture(context, frame, cx, cy, r);
  drawRelations(context, frame, cx, cy, r);
  // The outgoing motif stays on the field while the incoming one resolves, so a
  // switch reads as one field changing subject rather than as a repaint.
  if (frame.previous) drawMotif(context, frame, frame.previous, frame.fade, cx, cy, r);
  drawMotif(context, frame, frame.active, frame.reveal, cx, cy, r);
}
