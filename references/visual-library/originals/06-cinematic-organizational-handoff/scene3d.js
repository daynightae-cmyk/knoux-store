import * as THREE from 'three';
import { buildIsland, ISLAND_SPACING } from './islands.js';
import { createStarfield, createArc } from './links.js';
import { createWater, createClouds, createMoon } from './environment.js';
import { createCardFrame } from './cardframe.js';

export function createScene3D(canvas, steps, config, reduced) {
  const P = config.palette;
  const ENV = config.environment || {};

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(P.bg, 1);
  renderer.localClippingEnabled = true;

  const reflectQuality = (window.devicePixelRatio > 2 || window.innerWidth < 760) ? 0.6 : 1;

  const scene = new THREE.Scene();
  scene.name = 'handoffScene';
  scene.fog = new THREE.FogExp2(P.bg, 0.0085);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.5, 600);
  camera.name = 'heroCamera';

  scene.add(new THREE.AmbientLight(0x1d2836, 1.8));

  const key = new THREE.DirectionalLight(0x9fc6ff, 0.95);
  key.position.set(-24, 22, 10);
  key.name = 'moonKeyLight';
  scene.add(key);

  const warm = new THREE.DirectionalLight(0xff9a45, 0.38);
  warm.position.set(16, 6, 18);
  warm.name = 'emberFill';
  scene.add(warm);

  const hemi = new THREE.HemisphereLight(0x4a6b90, 0x0a1018, 0.7);
  hemi.name = 'skyBounce';
  scene.add(hemi);

  const stars = createStarfield(P);
  scene.add(stars);

  /* ---- Environment ---- */
  const spanX = ISLAND_SPACING * steps.length;
  const water = ENV.water !== false
    ? createWater(P, { level: 0, quality: reduced ? 0.6 : reflectQuality })
    : null;
  if (water) scene.add(water.group);
  const clouds = ENV.clouds !== false ? createClouds(P, spanX) : null;
  if (clouds) scene.add(clouds.group);
  const moon = ENV.moon !== false ? createMoon(P) : null;
  if (moon) scene.add(moon.group);

  /* ---- Islands, one per team ---- */
  const islands = steps.map((s, i) => {
    const isl = buildIsland(i, steps.length, P, { lights: ENV.islandLights !== false });
    isl.group.name = `island_${s.team}`;
    scene.add(isl.group);
    return isl;
  });

  /* ---- Arcs between consecutive islands ---- */
  const arcs = [];
  for (let i = 0; i < islands.length - 1; i++) {
    const arc = createArc(islands[i].anchor, islands[i + 1].anchor, P, i);
    arcs.push(arc);
    scene.add(arc.line);
  }

  /* ---- Card frame (sits behind the HTML card) ---- */
  const cardFrame = createCardFrame(P);
  scene.add(cardFrame.group);

  /* ---- State ---- */
  let current = 0;
  let transitioning = false;
  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function framing(i) {
    const a = islands[i].anchor;
    const wide = window.innerWidth < 760;
    camTarget.set(a.x + (wide ? 0 : 3.4), a.y + 1.2, a.z + 3);
    camPos.set(a.x + (wide ? 0 : 3.0), a.y + 4.2, a.z + (wide ? 32 : 26));
  }

  framing(0);
  camera.position.copy(camPos);
  lookAt.copy(camTarget);
  camera.lookAt(lookAt);

  /* Card frame anchored to the card's screen-side, facing the camera */
  function placeCardFrame() {
    const wide = window.innerWidth < 900;
    const a = islands[current].anchor;
    cardFrame.group.position.set(
      a.x + (wide ? 0 : -6.4),
      a.y + (wide ? -1.2 : 0.4),
      a.z + 8.5
    );
  }

  function goTo(next, prev) {
    current = next;
    framing(next);
    islands.forEach((isl, i) => isl.setActive(i === next, i < next));
    arcs.forEach((arc, i) => arc.setActive(i < next));

    if (next !== prev) {
      cardFrame.setVisible(false);
      if (next > prev && arcs[prev]) arcs[prev].pulse();
      if (next < prev && arcs[next]) arcs[next].pulse();
      transitioning = true;
      setTimeout(() => {
        cardFrame.setVisible(true);
        transitioning = false;
      }, (reduced ? 0.35 : config.travelDuration) * 1000 * 0.75);
    }
  }

  /* ---- Pointer parallax ---- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5);
    pointer.ty = (e.clientY / window.innerHeight - 0.5);
  });

  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const et = clock.elapsedTime;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const drift = reduced ? 0 : 1;
    const px = camPos.x + pointer.x * 2.6 * drift + Math.sin(et * 0.22) * 0.5 * drift;
    const py = camPos.y - pointer.y * 1.5 * drift + Math.sin(et * 0.31) * 0.32 * drift;

    camera.position.x += (px - camera.position.x) * 0.045;
    camera.position.y += (py - camera.position.y) * 0.045;
    camera.position.z += (camPos.z - camera.position.z) * 0.045;

    lookAt.lerp(camTarget, 0.06);
    camera.lookAt(lookAt);

    islands.forEach((isl) => isl.update(dt, et));
    arcs.forEach((arc) => arc.update(dt));
    if (water) water.update(dt, et);
    if (clouds) clouds.update(dt, et);
    if (moon) moon.update(dt, et);

    placeCardFrame();
    cardFrame.group.quaternion.copy(camera.quaternion);
    cardFrame.update(dt, et);

    stars.rotation.y += dt * 0.005;

    if (water) {
      water.renderReflection(renderer, scene, camera);
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    framing(current);
  }
  window.addEventListener('resize', resize);
  resize();

  return { goTo, spacing: ISLAND_SPACING };
}