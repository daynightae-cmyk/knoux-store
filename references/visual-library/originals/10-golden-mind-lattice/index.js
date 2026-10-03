import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sampleShell, makeRng } from './src/brainField.js';
import { buildEdges, buildConstellationEdges } from './src/lattice.js';
import { buildConsciousnessNodes, LETTERS, PYRAMID_EDGES } from './src/nodes.js';
import { buildPyramidArmature } from './src/pyramids.js';
import {
  injectStyles, buildPanel, buildAxisLabels, shortAngle, damp,
  IDLE_SPEED, HOVER_SPEED_FACTOR, RESUME_DELAY,
} from './src/interaction.js';
import {
  readConfig, applyBodyClasses, layoutMode, FRAMING,
  pixelRatioCap, densityScale, FALLBACK_BG,
} from './src/embed.js';
import { PyramidMarker, crossingDirection } from './src/pyramidMarker.js';
import {
  IdleOrbit, framingForNode, applyProjectionOffset,
  nudgeToGoodAzimuth, PHI_MIN, PHI_MAX,
} from './src/camera.js';
import { Blueprint2D } from './src/blueprint2d.js';
import { buildViewModeButton } from './src/viewMode.js';
import { ResonanceField } from './src/resonance.js';
import { StoryMode } from './src/story.js';

const GOLD = new THREE.Color('#BD9865');
const CHAMPAGNE = new THREE.Color('#F2DFB8');
const DEEP = new THREE.Color('#7A5E33');

const cfg = readConfig();
injectStyles(cfg);
let mode = applyBodyClasses(cfg);

const container = document.getElementById('root') ?? document.body;
const sizeOf = () => ({
  w: container.clientWidth || window.innerWidth,
  h: container.clientHeight || window.innerHeight,
});
let { w: VW, h: VH } = sizeOf();

const scene = new THREE.Scene();
if (!cfg.transparent) {
  scene.background = new THREE.Color(cfg.background);
  scene.fog = new THREE.FogExp2(cfg.background, 0.062);
} else {
  scene.fog = new THREE.FogExp2(FALLBACK_BG, 0.062);
}

const camera = new THREE.PerspectiveCamera(FRAMING[mode].fov, VW / VH, 0.1, 100);
camera.position.set(3.4, 1.1, 4.6);

const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  alpha: cfg.transparent,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(VW, VH);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
if (cfg.transparent) renderer.setClearAlpha(0);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.4;
controls.maxDistance = 10;
controls.enablePan = false;
controls.autoRotate = false;
controls.minPolarAngle = PHI_MIN;
controls.maxPolarAngle = PHI_MAX;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 0.55;

const brain = new THREE.Group();
brain.name = 'sphinxBrain';
scene.add(brain);

/* ---------------------------------------------------------------- points */
const D = densityScale();
const rand = makeRng(20240917);
const outer = sampleShell(Math.round(3000 * D), 0.0, 0.049 / Math.sqrt(D), 1337);
const inner = sampleShell(Math.round(980 * D), -0.24, 0.082 / Math.sqrt(D), 4242);
const deep = sampleShell(Math.round(430 * D), -0.48, 0.122 / Math.sqrt(D), 9001);
const allPoints = outer.concat(inner, deep);

/* -------------------------------------------------------- cortical mesh */
function edgeGeometry(points, edges, colorNear, colorFar, opacityJitter) {
  const pos = new Float32Array(edges.length * 6);
  const col = new Float32Array(edges.length * 6);
  const tmp = new THREE.Color();
  for (let e = 0; e < edges.length; e++) {
    const a = points[edges[e][0]], b = points[edges[e][1]];
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z], e * 6);
    const t = rand();
    const k = opacityJitter ? 0.35 + t * 0.65 : 1;
    tmp.copy(colorNear).lerp(colorFar, t).multiplyScalar(k);
    col.set([tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b], e * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const surfaceEdges = buildEdges(outer, { maxDist: 0.108 / Math.sqrt(D), minNeighbors: 2, maxNeighbors: 4, rand });
const surfaceLines = new THREE.LineSegments(
  edgeGeometry(outer, surfaceEdges, GOLD, DEEP, true),
  new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
surfaceLines.name = 'corticalLattice';
brain.add(surfaceLines);

const innerEdges = buildEdges(inner, { maxDist: 0.21, minNeighbors: 1, maxNeighbors: 3, rand });
const innerLines = new THREE.LineSegments(
  edgeGeometry(inner, innerEdges, GOLD, DEEP, true),
  new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
innerLines.name = 'interiorLattice';
brain.add(innerLines);

const constellation = buildConstellationEdges(allPoints, Math.round(320 * D), rand, 0.85, 2.1);
const constellationLines = new THREE.LineSegments(
  edgeGeometry(allPoints, constellation, CHAMPAGNE, GOLD, true),
  new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
constellationLines.name = 'constellationChords';
brain.add(constellationLines);

/* ------------------------------------------------------- neural points */
function pointSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,232,180,0.85)');
  g.addColorStop(0.6, 'rgba(189,152,101,0.25)');
  g.addColorStop(1, 'rgba(189,152,101,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const sprite = pointSprite();

const ppos = new Float32Array(allPoints.length * 3);
const pphase = new Float32Array(allPoints.length);
const pscale = new Float32Array(allPoints.length);
allPoints.forEach((p, i) => {
  ppos.set([p.x, p.y, p.z], i * 3);
  pphase[i] = rand() * Math.PI * 2;
  pscale[i] = 0.6 + rand() * 0.9;
});
const pgeo = new THREE.BufferGeometry();
pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
pgeo.setAttribute('aPhase', new THREE.BufferAttribute(pphase, 1));
pgeo.setAttribute('aScale', new THREE.BufferAttribute(pscale, 1));

const pmat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uMap: { value: sprite },
    uColor: { value: new THREE.Color('#E8CB93') },
    uSize: { value: 12.0 * Math.min(window.devicePixelRatio, pixelRatioCap()) },
    uFade: { value: 1 },
  },
  vertexShader: `
    attribute float aPhase;
    attribute float aScale;
    uniform float uTime;
    uniform float uSize;
    varying float vI;
    void main() {
      float pulse = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 0.9 + aPhase), 3.0);
      vI = pulse;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uSize * aScale * (0.5 + pulse * 0.7) / -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;
    uniform vec3 uColor;
    uniform float uFade;
    varying float vI;
    void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(uColor * (0.5 + vI), t.a * vI * 0.85 * uFade);
      if (gl_FragColor.a < 0.01) discard;
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const neuralPoints = new THREE.Points(pgeo, pmat);
neuralPoints.name = 'neuralPoints';
brain.add(neuralPoints);

/* ----------------------------------------- 16 consciousness node markers */
const nodes = buildConsciousnessNodes();
const nodeGroup = new THREE.Group();
nodeGroup.name = 'consciousnessNodes';
brain.add(nodeGroup);

/* ------------------------- superimposed Archetypal Blueprint armatures */
const armature = buildPyramidArmature(nodes);
brain.add(armature.group);

const NS = FRAMING[mode].nodeScale;
const coreGeo = new THREE.IcosahedronGeometry(0.036, 2);
const ringGeo = new THREE.RingGeometry(0.072, 0.079, 48);
const pathRingGeo = new THREE.RingGeometry(0.055, 0.060, 4);
const haloGeo = new THREE.PlaneGeometry(0.42, 0.42);

const haloTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,244,214,0.95)');
  g.addColorStop(0.18, 'rgba(240,214,158,0.45)');
  g.addColorStop(0.5, 'rgba(189,152,101,0.12)');
  g.addColorStop(1, 'rgba(189,152,101,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function glyphTexture(letter) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '300 62px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#FBF1E8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glyphGeo = new THREE.PlaneGeometry(0.15, 0.15);

const nodeObjects = [];
const nodeByLetter = {};
nodes.forEach((n, i) => {
  const g = new THREE.Group();
  g.name = n.name;
  g.position.set(n.position.x, n.position.y, n.position.z);
  g.userData = {
    letter: n.letter, title: n.title, pyramid: n.pyramid, axis: n.axis,
    hemisphere: n.hemisphere, description: n.description,
    counterpart: n.counterpart, index: i,
  };

  const isPath = n.blueprint.path === true;
  const baseTint = isPath ? new THREE.Color('#FBF1E8') : new THREE.Color('#FFF3D4');

  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: baseTint, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.name = 'nodeCore_' + n.letter;
  g.add(core);

  const ring = new THREE.Mesh(isPath ? pathRingGeo : ringGeo, new THREE.MeshBasicMaterial({
    color: GOLD, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  ring.name = 'nodeRing_' + n.letter;
  g.add(ring);

  const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
    map: haloTex, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.name = 'nodeHalo_' + n.letter;
  g.add(halo);

  const glyph = new THREE.Mesh(glyphGeo, new THREE.MeshBasicMaterial({
    map: glyphTexture(n.letter), transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glyph.name = 'nodeGlyph_' + n.letter;
  glyph.position.set(0, 0.135, 0);
  g.add(glyph);

  g.scale.setScalar(NS);
  nodeGroup.add(g);

  const entry = {
    group: g, core, ring, halo, glyph,
    phase: i * 0.393, data: n, letter: n.letter,
    isPath, emphasis: 0, dim: 1, baseScale: NS,
  };
  nodeObjects.push(entry);
  nodeByLetter[n.letter] = entry;
});

/* ------------------- per-node neural pathway highlight (hover / selection) */
const pathwayObjects = {};
{
  const NEAR_RADIUS = 0.66;
  const related = {};
  for (const [a, b] of [...PYRAMID_EDGES.incarnation, ...PYRAMID_EDGES.soul,
                        ...PYRAMID_EDGES.path, ...PYRAMID_EDGES.arrows,
                        ...PYRAMID_EDGES.correspondence]) {
    (related[a] ||= new Set()).add(b);
    (related[b] ||= new Set()).add(a);
  }
  const byLetter = {};
  nodes.forEach((n) => { byLetter[n.letter] = n; });

  for (const n of nodes) {
    const pts = [];
    for (const [ia, ib] of surfaceEdges) {
      const a = outer[ia], b = outer[ib];
      const da = Math.hypot(a.x - n.position.x, a.y - n.position.y, a.z - n.position.z);
      if (da > NEAR_RADIUS) continue;
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    for (const L of related[n.letter] || []) {
      const m = byLetter[L];
      if (!m) continue;
      pts.push(n.position.x, n.position.y, n.position.z, m.position.x, m.position.y, m.position.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: new THREE.Color('#F2DFB8'), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    lines.name = 'pathways_' + n.letter;
    lines.visible = false;
    brain.add(lines);
    pathwayObjects[n.letter] = lines;
  }
}

/* ------------------------------------------------ travelling signal pulses */
const PULSE_COUNT = Math.round(90 * D);
const pulsePaths = [];
for (let i = 0; i < PULSE_COUNT; i++) {
  const e = surfaceEdges[Math.floor(rand() * surfaceEdges.length)];
  pulsePaths.push({ a: outer[e[0]], b: outer[e[1]], t: rand(), speed: 0.25 + rand() * 0.7 });
}
const pulseGeo = new THREE.BufferGeometry();
pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSE_COUNT * 3), 3));
const pulseMat = new THREE.PointsMaterial({
  map: sprite, size: 0.055, color: new THREE.Color('#FFF0CB'),
  transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
  depthWrite: false, sizeAttenuation: true,
});
const pulses = new THREE.Points(pulseGeo, pulseMat);
pulses.name = 'signalPulses';
brain.add(pulses);

/* ------------------- counterpart traveller (A↔I, B↔J …) on selection ---- */
const travellerGeo = new THREE.BufferGeometry();
travellerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3));
const travellerMat = new THREE.PointsMaterial({
  map: sprite, size: 0.13, color: new THREE.Color('#FFF6DE'),
  transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
  depthWrite: false, sizeAttenuation: true,
});
const traveller = new THREE.Points(travellerGeo, travellerMat);
traveller.name = 'counterpartTraveller';
brain.add(traveller);
let travelT = 0;

/* -------------------- selection resonance (shockwave + flash) ---------- */
const resonance = new ResonanceField(brain, sprite);

/* ------------------------------------------------------ ambient starfield */
{
  const N = Math.round(900 * D);
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 12 + rand() * 22;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    arr.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({
    map: sprite, size: 0.16, color: new THREE.Color('#C9A46E'),
    transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
  }));
  stars.name = 'ambientField';
  scene.add(stars);
}

/* ---------------------------------------------------------------- HUD ui */
if (!cfg.embed) {
  const hud = document.createElement('div');
  hud.id = 'sphinx-hud';
  hud.innerHTML = `
    <div class="sc-brand">SPHINX CODE</div>
    <div class="sc-sub">Archetypal Blueprint&reg; &middot; 16 Positions</div>
  `;
  document.body.appendChild(hud);

  const legend = document.createElement('div');
  legend.id = 'sphinx-legend';
  legend.innerHTML = `
    <div class="sc-leg-row"><span class="sc-swatch sc-inc"></span>Incarnation Pyramid &middot; A&ndash;H</div>
    <div class="sc-leg-row"><span class="sc-swatch sc-soul"></span>Soul Pyramid &middot; I&ndash;P</div>
    <div class="sc-leg-row"><span class="sc-swatch sc-path"></span>Transcendental Path &middot; D H L P</div>
    <div class="sc-leg-hint">Drag to orbit &middot; Select a position</div>
  `;
  document.body.appendChild(legend);
}

const axisLabels = buildAxisLabels();

/* ------------------------------------------------- selection & rotation */
let blueprintCtrl = null;
let viewModeUI = null;

const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

let hovered = -1;
let selected = -1;
let lastInteraction = -Infinity;
let userOrbiting = false;

const idleOrbit = new IdleOrbit();
const camSpherical = new THREE.Spherical(FRAMING[mode].distance, 1.42, idleOrbit.sample(0).theta);
camera.position.setFromSpherical(camSpherical);

let targetTheta = camSpherical.theta;
let targetPhi = camSpherical.phi;
let targetRadius = camSpherical.radius;
let orienting = false;

// Framing offsets, eased so breakpoint changes don't snap.
let offX = FRAMING[mode].offsetX;
let offY = FRAMING[mode].offsetY;

const panel = buildPanel(
  LETTERS,
  (letter) => selectNode(nodeByLetter[letter].data.index),
  () => {
    if (selected >= 0) {
      const d = nodeObjects[selected].data;
      const detail = {
        letter: d.letter, title: d.title, pyramid: d.pyramid,
        axis: d.axis, description: d.description, counterpart: d.counterpart,
      };
      window.dispatchEvent(new CustomEvent('sphinx:explore', { detail }));
      // Also notify the host page when embedded.
      try { window.parent.postMessage({ type: 'sphinx:explore', ...detail }, '*'); } catch (e) {}
    }
  }
);
panel.hide();

function markInteraction() { lastInteraction = clock.getElapsedTime(); }

let story = null;

// `fromStory` selections must not reset the inactivity clock, otherwise the
// walk would keep restarting its own resume timer.
function selectNode(i, fromStory) {
  if (i < 0 || i >= nodeObjects.length) return;
  selected = i;
  travelT = 0;
  if (!fromStory) markInteraction();
  const n = nodeObjects[i];
  panel.show(n.data);
  panel.flare(n.letter);

  // The structure answers the touch: rings expand out of the chosen node.
  resonance.trigger(n.group.position);

  const f = framingForNode(n.group.position, brain.rotation.y, mode);
  targetTheta = f.theta;
  targetPhi = f.phi;
  targetRadius = f.radius;
  orienting = true;

  if (story && story.enabled && !fromStory) story.interrupt(i);

  try {
    window.parent.postMessage({ type: 'sphinx:select', letter: n.letter, title: n.data.title }, '*');
  } catch (e) {}
}

function clearSelection() {
  selected = -1;
  orienting = false;
  panel.hide();
  markInteraction();
  if (story && story.enabled) story.interrupt(-1);
}

/* --------------------------------------------------------- node hovering */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-2, -2);
let pointerDownAt = { x: 0, y: 0, moved: false };
let hasHover = window.matchMedia('(hover: hover)').matches;

function setPointerFromEvent(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  setPointerFromEvent(e);
  if (Math.abs(e.clientX - pointerDownAt.x) > 5 || Math.abs(e.clientY - pointerDownAt.y) > 5) {
    pointerDownAt.moved = true;
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownAt = { x: e.clientX, y: e.clientY, moved: false };
  setPointerFromEvent(e);
  userOrbiting = true;
  markInteraction();
  if (story && story.enabled) story.interrupt(selected);
});

renderer.domElement.addEventListener('pointerup', (e) => {
  userOrbiting = false;
  markInteraction();
  if (pointerDownAt.moved) return;
  setPointerFromEvent(e);
  // Touch taps need an immediate pick since there is no hover pass.
  const hit = pickNode();
  if (hit >= 0) selectNode(hit);
  else if (selected >= 0) clearSelection();
});

renderer.domElement.addEventListener('pointerleave', () => {
  if (hasHover) pointer.set(-2, -2);
});

renderer.domElement.addEventListener('wheel', markInteraction, { passive: true });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearSelection(); });

// Screen-space picking.
//
// The previous world-space ray test was fragile: the pick radius was a fixed
// world distance, so a node's effective tap target shrank as it receded and
// nodes behind the camera could still register. We now project each node to
// NDC using the SAME sheared projection the renderer uses, and compare in
// pixels — giving every node an identical, predictable target.
const PICK_PX = { desktop: 26, tablet: 34, mobile: 44 };

function pickNode() {
  // Ignore picks while the blueprint morph owns the layout.
  if (pointer.x < -1.5) return -1;

  const radius = (PICK_PX[mode] || 26);
  const halfW = VW * 0.5;
  const halfH = VH * 0.5;

  // Pointer NDC -> pixel space.
  const px = (pointer.x * 0.5 + 0.5) * VW;
  const py = (-pointer.y * 0.5 + 0.5) * VH;

  let best = -1;
  let bestDist = radius;

  for (let i = 0; i < nodeObjects.length; i++) {
    const n = nodeObjects[i];
    n.group.getWorldPosition(tmpV2);
    tmpV2.project(camera);

    // project() returns z > 1 for points behind the near plane.
    if (tmpV2.z > 1) continue;

    const sx = (tmpV2.x * 0.5 + 0.5) * VW;
    const sy = (-tmpV2.y * 0.5 + 0.5) * VH;
    const d = Math.hypot(sx - px, sy - py);

    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/* ------------------------------------------------------------- animation */
let prevT = 0;
const _projV = new THREE.Vector3();

function project2D(worldPos) {
  _projV.copy(worldPos).project(camera);
  return { x: _projV.x * 0.5 + 0.5, y: -_projV.y * 0.5 + 0.5 };
}

function animate() {
  const t = clock.getElapsedTime();
  const dt = Math.min(Math.max(t - prevT, 0.0001), 0.05);
  prevT = t;
  pmat.uniforms.uTime.value = t;

  const inBlueprint = blueprintCtrl && blueprintCtrl.active;
  const morphT = blueprintCtrl ? blueprintCtrl.t : 0;
  if (blueprintCtrl) {
    controls.enabled = !blueprintCtrl.lockOrbit;
    blueprintCtrl.update(dt);
  }

  const idleSince = t - lastInteraction;

  /* ----------------------------------------------- story mode + resonance */
  if (story && !inBlueprint) story.update(dt, idleSince);
  resonance.update(dt, camera, FRAMING[mode].nodeScale);

  /* ---------------------------------------- brain: gentle inherent motion */
  // The brain itself no longer spins; it breathes. The camera provides the
  // slow orbital drift, which lets us guarantee a flattering silhouette.
  if (inBlueprint || morphT > 0.01) {
    brain.rotation.set(
      damp(brain.rotation.x, 0, 3.5, dt),
      damp(brain.rotation.y, 0, 3.5, dt),
      damp(brain.rotation.z, 0, 3.5, dt)
    );
    brain.position.y = damp(brain.position.y, 0, 3.5, dt);
  } else {
    brain.rotation.x = Math.sin(t * 0.061) * 0.030;
    brain.rotation.y = Math.sin(t * 0.043) * 0.075;
    brain.rotation.z = Math.cos(t * 0.037) * 0.020;
    brain.position.y = Math.sin(t * 0.28) * 0.022;
  }

  /* --------------------------------------------- idle orbit state machine */
  let rate;
  if (selected >= 0) rate = 0;
  else if (hovered >= 0) rate = HOVER_SPEED_FACTOR;
  else if (idleSince < RESUME_DELAY) rate = 0.14;
  else rate = 0.14 + 0.86 * THREE.MathUtils.smoothstep(idleSince, RESUME_DELAY, RESUME_DELAY + 4.5);

  if (!inBlueprint && !userOrbiting) idleOrbit.advance(dt, rate);

  /* ------------------------------------------------------ camera easing */
  if (!inBlueprint && morphT < 0.02) {
    if (userOrbiting) {
      // Let the user drive; just record where they left the camera.
      camSpherical.setFromVector3(tmpV.copy(camera.position).sub(controls.target));
      targetTheta = camSpherical.theta;
      targetPhi = camSpherical.phi;
      targetRadius = camSpherical.radius;
      idleOrbit.phase = Math.asin(
        THREE.MathUtils.clamp(
          (nudgeToGoodAzimuth(camSpherical.theta) - 1.57) / 0.80, -1, 1
        )
      );
    } else {
      if (!orienting && selected < 0) {
        const s = idleOrbit.sample(t);
        targetTheta = s.theta;
        targetPhi = s.phi;
        targetRadius = FRAMING[mode].distance;
      }

      const lam = orienting ? 1.9 : 0.9;
      camSpherical.setFromVector3(tmpV.copy(camera.position).sub(controls.target));
      const nextTheta = camSpherical.theta + shortAngle(camSpherical.theta, targetTheta) * (1 - Math.exp(-lam * dt));
      const nextPhi = THREE.MathUtils.clamp(damp(camSpherical.phi, targetPhi, lam, dt), PHI_MIN, PHI_MAX);
      const nextR = damp(camSpherical.radius, targetRadius, lam, dt);
      camera.position.setFromSpherical(new THREE.Spherical(nextR, nextPhi, nextTheta)).add(controls.target);

      if (orienting) {
        const dTheta = Math.abs(shortAngle(nextTheta, targetTheta));
        if (dTheta < 0.006 && Math.abs(nextPhi - targetPhi) < 0.006) orienting = false;
      }
    }
  }

  /* --------------------------------- projection shear (keep copy clear) */
  const f = FRAMING[mode];
  const targetOffX = inBlueprint || morphT > 0.5 ? 0 : f.offsetX;
  const targetOffY = inBlueprint || morphT > 0.5 ? 0 : f.offsetY;
  offX = damp(offX, targetOffX, 3.0, dt);
  offY = damp(offY, targetOffY, 3.0, dt);
  applyProjectionOffset(camera, offX, offY);

  /* ------------------------------------------- node emphasis + pathway glow */
  const anySelected = selected >= 0;
  const selPyramid = anySelected ? nodeObjects[selected].data.pyramid : null;

  for (let i = 0; i < nodeObjects.length; i++) {
    const n = nodeObjects[i];
    const b = 0.5 + 0.5 * Math.sin(t * 0.75 + n.phase * 2.4);

    const isSelected = selected === i;
    const isHovered = hovered === i;
    const isCounterpart = anySelected && n.letter === nodeObjects[selected].data.counterpart;
    const target = isSelected ? 1 : (isHovered ? 0.62 : (isCounterpart ? 0.30 : 0));
    n.emphasis = damp(n.emphasis, target, 5.0, dt);

    // Selected must read ~25% brighter and larger than anything else.
    const dimTarget = anySelected && !isSelected ? (isCounterpart ? 0.48 : 0.20) : 1;
    n.dim = damp(n.dim, dimTarget, 4.0, dt);

    const e = n.emphasis;
    const d = n.dim;

    // Group scale carries the spatial dominance so the whole marker grows.
    n.group.scale.setScalar(n.baseScale * (1 + e * 0.30));

    n.core.scale.setScalar((n.isPath ? 0.85 : 1) * (0.88 + b * 0.22 + e * 0.42) * (0.78 + d * 0.22));
    n.core.material.opacity = (0.62 + b * 0.26) * d + e * 0.40;

    n.halo.scale.setScalar(0.88 + b * 0.22 + e * 0.80);
    n.halo.material.opacity = (0.26 + b * 0.22) * d + e * 0.50;

    n.ring.material.opacity = (0.30 + b * 0.20) * d + e * 0.48;
    n.halo.quaternion.copy(camera.quaternion);
    n.ring.quaternion.copy(camera.quaternion);
    n.ring.rotateZ(t * (0.25 + e * 0.5) * (n.isPath ? -0.6 : 1) + n.phase);

    n.glyph.quaternion.copy(camera.quaternion);
    n.glyph.material.opacity = damp(n.glyph.material.opacity, e > 0.05 ? 0.88 * e : 0, 6.0, dt);

    const path = pathwayObjects[n.letter];
    if (path) {
      const o = e * (isSelected ? 0.36 : 0.18) * (0.75 + 0.25 * b);
      path.material.opacity = o;
      path.visible = o > 0.004;
    }
  }

  /* ------------------------------------- armature response to the selection */
  const A = armature.parts;
  const incActive = !anySelected || selPyramid === 'INCARNATION PYRAMID';
  const soulActive = !anySelected || selPyramid === 'SOUL PYRAMID';
  const breathe = 0.86 + 0.14 * Math.sin(t * 0.42);

  A.incarnation.material.opacity = damp(A.incarnation.material.opacity, (incActive ? 0.38 : 0.08) * breathe, 3.0, dt);
  A.soul.material.opacity = damp(A.soul.material.opacity, (soulActive ? 0.38 : 0.08) * breathe, 3.0, dt);
  A.path.material.opacity = damp(A.path.material.opacity, anySelected && nodeObjects[selected].isPath ? 0.42 : 0.18, 3.0, dt);
  A.correspondence.material.opacity = damp(A.correspondence.material.opacity, anySelected ? 0.20 : 0.08, 3.0, dt);
  A.arrows.material.opacity = damp(A.arrows.material.opacity, anySelected ? 0.24 : 0.16, 3.0, dt);
  A.faceIncarnation.material.opacity = damp(A.faceIncarnation.material.opacity, incActive ? 0.030 : 0.006, 3.0, dt);
  A.faceSoul.material.opacity = damp(A.faceSoul.material.opacity, soulActive ? 0.030 : 0.006, 3.0, dt);
  A.divide.material.opacity = damp(A.divide.material.opacity, anySelected ? 0.22 : 0.13, 3.0, dt);

  const axis = anySelected ? nodeObjects[selected].data.axis : null;
  A.feminine.material.opacity = damp(A.feminine.material.opacity, axis === 'FEMININE' ? 0.15 : 0.045, 3.0, dt);
  A.masculine.material.opacity = damp(A.masculine.material.opacity, axis === 'MASCULINE' ? 0.15 : 0.045, 3.0, dt);

  if (mode === 'desktop') axisLabels.update(camera, renderer, brain, axis);

  /* --------------------------- counterpart traveller along the correspondence */
  if (anySelected) {
    const from = nodeObjects[selected].data.position;
    const to = nodeByLetter[nodeObjects[selected].data.counterpart].data.position;
    travelT = (travelT + dt * 0.34) % 1;
    const arr = travellerGeo.attributes.position.array;
    for (let k = 0; k < 3; k++) {
      const tt = (travelT + k * 0.14) % 1;
      const ease = Math.sin(tt * Math.PI);
      arr[k * 3] = from.x + (to.x - from.x) * tt;
      arr[k * 3 + 1] = from.y + (to.y - from.y) * tt + ease * 0.09;
      arr[k * 3 + 2] = from.z + (to.z - from.z) * tt;
    }
    travellerGeo.attributes.position.needsUpdate = true;
    travellerMat.opacity = damp(travellerMat.opacity, 0.9, 3.0, dt);
  } else {
    travellerMat.opacity = damp(travellerMat.opacity, 0, 4.0, dt);
  }

  // Dim the field around a selection so the chosen node owns the hierarchy.
  const latticeDim = (anySelected ? 0.46 : 1) * (1 - morphT * 0.88);
  surfaceLines.material.opacity = damp(surfaceLines.material.opacity, 0.5 * latticeDim, 3.0, dt);
  innerLines.material.opacity = damp(innerLines.material.opacity, 0.28 * latticeDim, 3.0, dt);
  constellationLines.material.opacity = damp(constellationLines.material.opacity, 0.2 * latticeDim, 3.0, dt);
  pmat.uniforms.uFade.value = damp(pmat.uniforms.uFade.value, (anySelected ? 0.6 : 1) * (1 - morphT * 0.92), 3.0, dt);
  pulses.material.opacity = damp(pulses.material.opacity, (1 - morphT * 0.95) * (anySelected ? 0.5 : 0.9), 3.0, dt);

  const pa = pulseGeo.attributes.position.array;
  for (let i = 0; i < PULSE_COUNT; i++) {
    const p = pulsePaths[i];
    p.t += p.speed * 0.012;
    if (p.t > 1) {
      p.t = 0;
      const ed = surfaceEdges[Math.floor(rand() * surfaceEdges.length)];
      p.a = outer[ed[0]]; p.b = outer[ed[1]];
      p.speed = 0.25 + rand() * 0.7;
    }
    pa[i * 3] = p.a.x + (p.b.x - p.a.x) * p.t;
    pa[i * 3 + 1] = p.a.y + (p.b.y - p.a.y) * p.t;
    pa[i * 3 + 2] = p.a.z + (p.b.z - p.a.z) * p.t;
  }
  pulseGeo.attributes.position.needsUpdate = true;

  /* ---------------------------------------------------------- hover pick */
  if (hasHover) {
    const best = pickNode();
    if (best !== hovered) {
      hovered = best;
      renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
      if (hovered >= 0) {
        markInteraction();
        if (story && story.enabled) story.interrupt(selected);
      }
    }
  }

  /* ---- column / row label projection (blueprint mode only) ------------ */
  if (viewModeUI && morphT > 0.05) {
    const S = 1.32;
    const colAnchors = {
      path: new THREE.Vector3(-1.72 * S, 1.22 * S, 0),
      fem: new THREE.Vector3(-0.82 * S, 1.22 * S, 0),
      mid: new THREE.Vector3(0.00 * S, 1.22 * S, 0),
      masc: new THREE.Vector3(0.82 * S, 1.22 * S, 0),
    };
    const nodeI = nodeByLetter['I'], nodeA = nodeByLetter['A'];
    const rowAnchors = {
      soul: new THREE.Vector3(-2.3 * S, nodeI ? nodeI.group.position.y : 0.3, 0),
      inc: new THREE.Vector3(-2.3 * S, nodeA ? nodeA.group.position.y : -0.3, 0),
    };
    const colScreen = {}, rowScreen = {};
    Object.entries(colAnchors).forEach(([k, v]) => { colScreen[k] = project2D(v); });
    Object.entries(rowAnchors).forEach(([k, v]) => { rowScreen[k] = project2D(v); });
    viewModeUI.updateLabels(camera, colScreen, rowScreen);
  }

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

/* ------------------------------------------------------------ resizing */
function resize() {
  const s = sizeOf();
  VW = s.w; VH = s.h;
  const nextMode = layoutMode();
  if (nextMode !== mode) {
    mode = applyBodyClasses(cfg);
    camera.fov = FRAMING[mode].fov;
    const ns = FRAMING[mode].nodeScale;
    nodeObjects.forEach((n) => { n.baseScale = ns; });
    targetRadius = FRAMING[mode].distance;
  }
  camera.aspect = VW / VH;
  camera.updateProjectionMatrix();
  renderer.setSize(VW, VH, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
  pmat.uniforms.uSize.value = 12.0 * Math.min(window.devicePixelRatio, pixelRatioCap());
  hasHover = window.matchMedia('(hover: hover)').matches;
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

// Pause rendering when the embed scrolls out of view — saves the host page
// a great deal of GPU time.
if (window.IntersectionObserver) {
  new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting);
    renderer.setAnimationLoop(visible ? animate : null);
    if (visible) { prevT = clock.getElapsedTime(); }
  }, { threshold: 0.01 }).observe(container);
}
document.addEventListener('visibilitychange', () => {
  renderer.setAnimationLoop(document.hidden ? null : animate);
  if (!document.hidden) prevT = clock.getElapsedTime();
});

/* -------- initialise Blueprint2D + view toggle ------------------------- */
document.body.classList.toggle('sc-no-blueprint', !cfg.showBlueprint);
blueprintCtrl = new Blueprint2D(nodeObjects, nodeGroup, brain, camera, controls);
if (cfg.showBlueprint) {
  viewModeUI = buildViewModeButton(() => {
    const isNowBlueprint = blueprintCtrl.toggle();
    if (isNowBlueprint) {
      clearSelection();
      if (story && story.enabled) story.stop();
      if (typeof pyramidMarker !== 'undefined') pyramidMarker.hide();
    }
    markInteraction();
    return isNowBlueprint;
  });
}

/* ---------------------------- story mode ------------------------------- */
const pyramidMarker = new PyramidMarker();

story = new StoryMode(
  LETTERS,
  (letter) => {
    const n = nodeByLetter[letter];
    if (n) selectNode(n.data.index, true);
  },
  () => { clearSelection(); pyramidMarker.hide(); }
);

// Announce the movement change as the walk crosses between the pyramids.
story.onCross = (prev, next) => {
  const dir = crossingDirection(prev, next);
  if (dir) pyramidMarker.show(dir);
};

story.showChip(cfg.showStoryChip);
if (cfg.story) {
  // Give the scene a moment to settle before the walk begins.
  setTimeout(() => story.start(0), 1200);
}

/* --------------------------------- host-page API + deep link on load ---- */
window.SphinxBrain = {
  select(letter) {
    const n = nodeByLetter[String(letter || '').toUpperCase()];
    if (n) selectNode(n.data.index);
  },
  clear: clearSelection,
  story: {
    start() { if (story) story.start(0); },
    stop() { if (story) story.stop(); },
    toggle() { return story ? story.toggle() : false; },
  },
  blueprint: {
    toggle() { return blueprintCtrl ? blueprintCtrl.toggle() : false; },
  },
  positions: LETTERS.map((L) => ({ letter: L, ...nodeByLetter[L].data })),
};

window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'sphinx:select' && d.letter) window.SphinxBrain.select(d.letter);
  if (d.type === 'sphinx:clear') clearSelection();
  if (d.type === 'sphinx:story') {
    d.action === 'stop' ? window.SphinxBrain.story.stop() : window.SphinxBrain.story.start();
  }
  if (d.type === 'sphinx:blueprint') window.SphinxBrain.blueprint.toggle();
});

if (cfg.initialNode && nodeByLetter[cfg.initialNode]) {
  setTimeout(() => window.SphinxBrain.select(cfg.initialNode), 400);
}

markInteraction();
try { window.parent.postMessage({ type: 'sphinx:ready' }, '*'); } catch (e) {}