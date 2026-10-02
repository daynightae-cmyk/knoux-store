/** Deterministic KNOuX Sentinel identity. No runtime entropy. */

export const SENTINEL_SIZE = 52;
export const SENTINEL_HEIGHT = 64;
export const OFFSET_NEAR = 30;
export const OFFSET_FAR = 38;
export const EYE_TRAVEL = 3.1;
export const SLEEP_AFTER_MS = 60_000;
export const BLINK_MS = 140;
export const BLINK_GAPS = [4800, 6000, 5400, 7100] as const;
export const BODY_DAMP = 0.16;
export const EYE_DAMP = 0.32;
export const SHELL_TILT = 4.2;

export type SentinelMood =
  | 'idle'
  | 'observe'
  | 'curious'
  | 'focus'
  | 'active'
  | 'alert'
  | 'critical'
  | 'sleep';

export type SentinelVisual =
  | 'idle'
  | 'look-left'
  | 'look-right'
  | 'curious'
  | 'blink'
  | 'focus'
  | 'alert'
  | 'critical'
  | 'active'
  | 'sleep';

export const SENTINEL_VISUALS: readonly SentinelVisual[] = [
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
];

/** Seven architectural shards. Phase, speed and radius are authored, not rolled. */
export const SHARDS = [
  { x: 6, y: 18, w: 7, h: 15, rot: -38, phase: 0.0, speed: 0.42, radius: 2.6 },
  { x: 67, y: 14, w: 6, h: 13, rot: 28, phase: 1.1, speed: 0.36, radius: 2.2 },
  { x: 2, y: 46, w: 8, h: 12, rot: -18, phase: 2.2, speed: 0.31, radius: 1.9 },
  { x: 71, y: 50, w: 5, h: 14, rot: 42, phase: 3.4, speed: 0.39, radius: 2.7 },
  { x: 18, y: 4, w: 5, h: 8, rot: -52, phase: 4.0, speed: 0.47, radius: 1.7 },
  { x: 58, y: 78, w: 6, h: 10, rot: 16, phase: 5.2, speed: 0.33, radius: 2.0 },
  { x: 37, y: 1, w: 4, h: 7, rot: 8, phase: 0.7, speed: 0.28, radius: 1.5 },
] as const;

export function blinkGap(index: number): number {
  return BLINK_GAPS[((index % BLINK_GAPS.length) + BLINK_GAPS.length) % BLINK_GAPS.length];
}

export function isDoubleBlink(index: number): boolean {
  return index % 4 === 3;
}

export function resolveVisual(input: {
  mood: SentinelMood;
  gazeX: number;
  gazeY: number;
  blinking: boolean;
}): SentinelVisual {
  if (input.mood === 'critical') return 'critical';
  if (input.mood === 'alert') return 'alert';
  if (input.mood === 'active') return 'active';
  if (input.mood === 'sleep') return 'sleep';
  if (input.blinking) return 'blink';
  if (input.mood === 'focus') return 'focus';
  if (input.mood === 'curious') return 'curious';
  if (input.gazeY < -0.48) return 'curious';
  if (input.gazeX < -0.34) return 'look-left';
  if (input.gazeX > 0.34) return 'look-right';
  return 'idle';
}

export function classifyTarget(node: Element | null): {
  mood: SentinelMood;
  formCalm: boolean;
} {
  if (!node) return { mood: 'observe', formCalm: false };
  const formCalm = Boolean(
    node.closest(
      'input, textarea, select, label, .auth-field, .contact-form, .search-field, .palette__field, [role="textbox"]',
    ),
  );
  if (
    node.closest(
      '[aria-invalid="true"], .is-invalid, .form-status.error, .form-status--error, .auth-status--error, .auth-field.is-invalid',
    )
  ) {
    return { mood: 'critical', formCalm };
  }
  if (node.closest('.form-status--unconfigured, .form-status.unconfigured, .auth-status--unavailable, [data-knoux-alert]')) {
    return { mood: 'alert', formCalm };
  }
  if (
    node.closest(
      '[aria-busy="true"], .form-status.sent, .form-status--sent, .form-status--ok, .form-status--sending, [data-knoux-active]',
    )
  ) {
    return { mood: 'active', formCalm };
  }
  if (node.closest('.build-composer-orb, .composer-intelligence, .composer-readout__stack, .assembly__items')) {
    return { mood: 'active', formCalm };
  }
  if (node.closest('.palette__empty')) {
    return { mood: 'alert', formCalm };
  }
  if (node.closest('.button-primary, .action--primary, button[type="submit"], [data-cta]')) {
    return { mood: 'focus', formCalm };
  }
  if (node.closest('.palette__result, .composer-stage, .composer-disclosure, .composer-readout')) {
    return { mood: 'curious', formCalm };
  }
  if (node.closest('a, [role="link"]')) {
    return { mood: 'curious', formCalm };
  }
  return { mood: 'observe', formCalm };
}
