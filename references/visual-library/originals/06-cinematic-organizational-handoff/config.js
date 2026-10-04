/* ============================================================
   EDIT THIS FILE — all copy and tuning lives here.
   ============================================================ */

export const FLOW_STEPS = [
  {
    team: 'HR',
    icon: '◆',
    glyph: 'hr',
    title: 'Intake & Onboarding',
    body: 'New colleagues are sourced, verified and contracted. HR establishes the employee record, compliance baseline and start date, then packages a clean profile for enablement.'
  },
  {
    team: 'Training',
    icon: '▲',
    glyph: 'training',
    title: 'Capability Build',
    body: 'Structured curriculum, shadowing and assessment bring each cohort to competency. Training certifies readiness and hands over verified skill evidence.'
  },
  {
    team: 'Transitions',
    icon: '●',
    glyph: 'transitions',
    title: 'Knowledge Transfer',
    body: 'Process maps, runbooks and system access migrate from source to target. Transitions governs the cutover plan and signs off exit criteria.'
  },
  {
    team: 'Operations',
    icon: '■',
    glyph: 'operations',
    title: 'Steady-State Delivery',
    body: 'Work moves into live production under agreed SLAs. Operations owns daily throughput, exception handling and capacity against forecast.'
  },
  {
    team: 'Quality',
    icon: '✦',
    glyph: 'quality',
    title: 'Assurance & BAU',
    body: 'Sampling, audit and continuous improvement close the loop. Quality confirms stability and formally accepts the service into business as usual.'
  }
];

export const CONFIG = {
  autoplay: false,          // start autoplay on load
  autoplayDelay: 6500,      // ms per step
  loop: true,               // autoplay wraps to the start
  scrollNav: true,          // wheel / swipe navigation
  travelDuration: 2.1,      // seconds for the payload to cross
  finalLabel: 'Business as usual',
  environment: {
    water: true,
    clouds: true,
    moon: true,
    islandLights: true
  },
  palette: {
    bg: 0x05070b,
    terrain: 0x2a4a62,
    terrainActive: 0x7fb0e0,
    accent: 0xffb257,        // warm ember accent, as in the reference
    accentCool: 0x6fb4ff,
    particle: 0xffd7a0,
    link: 0x2d4258,
    water: 0x0c1726,
    moon: 0xf0e6d8,
    rock: 0x26344a,
    rockActive: 0x3f5f86
  }
};