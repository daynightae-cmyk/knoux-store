// Sphinx Code — embed configuration + responsive layout controller.
//
// Reads query params so the same build can run standalone or embedded:
//   ?embed=1        strip brand HUD, legend, blueprint toggle, hints
//   &bg=transparent use an alpha canvas (falls back to #22201F)
//   &bg=22201F      explicit hex
//   &node=A         open on a given position
//
// Also owns the breakpoint state machine (desktop / tablet / mobile) which
// drives both CSS classes and the camera framing offsets.

export const FALLBACK_BG = '#22201F';

export function readConfig() {
  const q = new URLSearchParams(location.search);
  const inIframe = (() => {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  const embed = q.get('embed') === '1' || q.get('embed') === 'true' || inIframe;
  const bgParam = (q.get('bg') || '').trim().toLowerCase();

  let transparent = false;
  let background = FALLBACK_BG;
  if (bgParam === 'transparent' || bgParam === 'none') {
    transparent = true;
  } else if (/^#?[0-9a-f]{6}$/.test(bgParam)) {
    background = '#' + bgParam.replace('#', '');
  }

  const bpParam = q.get('blueprint');
  // Blueprint toggle: on by default standalone, opt-in when embedded.
  const showBlueprint = embed
    ? (bpParam === '1' || bpParam === 'true')
    : bpParam !== '0';

  const storyParam = q.get('story');
  const story = storyParam === '1' || storyParam === 'true';

  return {
    embed,
    transparent,
    background,
    initialNode: (q.get('node') || '').toUpperCase().slice(0, 1) || null,
    showBlueprint,
    story,
    // The STORY chip is offered in standalone mode, or when explicitly asked
    // for in an embed via ?story=1.
    showStoryChip: !embed || story,
  };
}

/* --------------------------------------------------------- breakpoints */
export const BP = { MOBILE: 640, TABLET: 1024 };

export function layoutMode() {
  const w = window.innerWidth;
  if (w < BP.MOBILE) return 'mobile';
  if (w < BP.TABLET) return 'tablet';
  return 'desktop';
}

// Framing per breakpoint.
//   offsetX  : horizontal shift of the brain in NDC (negative = move left,
//              clearing the right-hand panel)
//   offsetY  : vertical shift (mobile lifts the brain above the copy)
//   distance : base orbit radius
//   fov      : perspective FOV
export const FRAMING = {
  desktop: { offsetX: -0.20, offsetY: 0.02, distance: 6.2, fov: 33, nodeScale: 1.0 },
  tablet:  { offsetX: -0.06, offsetY: 0.10, distance: 6.9, fov: 35, nodeScale: 1.15 },
  mobile:  { offsetX:  0.00, offsetY: 0.30, distance: 7.6, fov: 40, nodeScale: 1.45 },
};

// Pixel-ratio ceiling per breakpoint — mobile GPUs choke above 2.
export function pixelRatioCap() {
  const m = layoutMode();
  if (m === 'mobile') return 1.75;
  if (m === 'tablet') return 2;
  return 2;
}

// Geometry budget scaling — fewer sampled points on small screens.
export function densityScale() {
  const m = layoutMode();
  if (m === 'mobile') return 0.55;
  if (m === 'tablet') return 0.78;
  return 1;
}

export function applyBodyClasses(cfg) {
  const b = document.body;
  b.classList.toggle('sc-embed', cfg.embed);
  b.classList.toggle('sc-transparent', cfg.transparent);
  const m = layoutMode();
  b.classList.remove('sc-desktop', 'sc-tablet', 'sc-mobile');
  b.classList.add('sc-' + m);
  return m;
}