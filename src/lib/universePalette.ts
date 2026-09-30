/**
 * KNOuX Universe palette.
 *
 * The colour contract for the second homepage block, taken from the tokens the
 * accepted Hero and `globals.css` already use. It lives in one module so the
 * block cannot drift into a palette of its own: if a colour is not here, the
 * block does not use it.
 *
 * The rule this encodes is that the map is monochromatic plus violet. Products
 * are distinguished by size, depth, ring treatment, label, opacity and pulse
 * timing — never by an arbitrary hue. There is no per-product colour, no
 * category colour, and nothing in here that could light up as a rainbow.
 */

export const UNIVERSE_PALETTE = {
  /** Matches `--bg`. The field never sits on anything lighter. */
  void: '#08090a',
  panel: '#0b0c0e',
  raised: '#121316',
  text: '#f1eee8',
  platinum: '#e6e2da',
  silver: '#b8b5b4',
  muted: '#9a9899',
  /**
   * Matches `--dim` in `globals.css`.
   *
   * The two must stay equal. This map is a mirror of the token set for code
   * that draws to a canvas, where a CSS variable is not available — and it had
   * drifted: the token was raised to `#8a8c8f` to clear 4.5:1 on the page
   * background, and this copy stayed at the old `#6d6e70` (3.90:1). Anything
   * rendering this map as text then failed contrast while the same colour
   * beside it in HTML passed.
   */
  dim: '#8a8c8f',
  graphite: '#17171a',
  line: '#292a2d',
  connector: '#51455b',
  violet: '#a18acb',
  violetSoft: '#c2b5d8',
  violetDeep: '#8b8ea3',
} as const;

export type UniverseNodePalette = keyof typeof UNIVERSE_PALETTE;

type NodeInk = {
  /** The body fill. Graphite holds a dark interior; the mark keeps its void. */
  body: string;
  /** The edge. */
  rim: string;
  /** The signal that resolves on selection. */
  accent: string;
  /** Halo radius in world units. */
  halo: number;
  /** Resting alpha. Deeper layers rest quieter, never louder. */
  alpha: number;
  /** True when the node should draw an orbital ring. */
  ring: boolean;
};

/**
 * Depth expresses itself by getting quieter.
 *
 * The core is the strongest thing in the room and is the only node allowed a
 * warm platinum body. Products carry the violet signal. Capabilities resolve
 * toward silver and graphite with a violet edge hint, so the second layer reads
 * as subordinate without becoming a different colour family.
 */
export const UNIVERSE_NODE_INK: Record<'core' | 'product' | 'capability', NodeInk> = {
  core: {
    body: UNIVERSE_PALETTE.platinum,
    rim: UNIVERSE_PALETTE.text,
    accent: UNIVERSE_PALETTE.violet,
    halo: 132,
    alpha: 1,
    ring: true,
  },
  product: {
    body: UNIVERSE_PALETTE.graphite,
    rim: UNIVERSE_PALETTE.violet,
    accent: UNIVERSE_PALETTE.violetSoft,
    halo: 62,
    alpha: 0.94,
    ring: true,
  },
  capability: {
    body: UNIVERSE_PALETTE.raised,
    rim: UNIVERSE_PALETTE.connector,
    accent: UNIVERSE_PALETTE.violetDeep,
    halo: 26,
    alpha: 0.72,
    ring: false,
  },
};

/** Dotted particles, matching the hero's neutral field. Violet is the minority. */
export const UNIVERSE_DUST = {
  neutral: 'rgba(226,224,231,',
  violet: 'rgba(190,168,224,',
  /** Share of dust carrying the violet signal. Matches the hero's field. */
  violetShare: 0.05,
} as const;

/** Star density per quality tier. The phone field is thinned, not re-seeded. */
export const UNIVERSE_DENSITY = { high: 210, balanced: 150, low: 84, reduced: 64 } as const;
