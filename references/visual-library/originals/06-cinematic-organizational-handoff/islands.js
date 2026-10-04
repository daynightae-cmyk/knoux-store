import * as THREE from 'three';

export const ISLAND_SPACING = 30;

/* A single wireframe "island": a ridged massif rising out of the water,
   ringed by ember lights and drifting motes. */
export function buildIsland(index, total, P, opts = {}) {
  const group = new THREE.Group();

  const x = (index - (total - 1) / 2) * ISLAND_SPACING;
  const y = index * 3.1;            // each handoff climbs higher
  const baseDrop = 2.6 + index * 3.1; // skirt reaches back down to sea level
  const z = index % 2 === 0 ? 0 : -4.0;
  group.position.set(x, y, z);

  const anchor = new THREE.Vector3(x, y + 8.4, z);

  /* --- terrain: displaced radial lattice with satellite peaks --- */
  const seg = 48, rings = 13, radius = 11.5;
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const idx = [];

  const rand = mulberry(index * 9871 + 13);
  const peaks = [];
  const peakCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < peakCount; i++) {
    peaks.push({
      a: rand() * Math.PI * 2,
      r: 0.25 + rand() * 0.6,
      h: 2.2 + rand() * 4.4,
      w: 0.18 + rand() * 0.22
    });
  }

  function heightAt(a, k) {
    // k = 0 at centre, 1 at rim
    let h = Math.pow(1 - k, 2.4) * 7.2;
    for (const p of peaks) {
      let da = Math.abs(((a - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const dk = Math.abs(k - p.r);
      const fall = Math.exp(-(da * da) / (p.w * 2.2) - (dk * dk) / 0.045);
      h += p.h * fall;
    }
    h += Math.sin(a * 6 + index) * 0.5 * (1 - k) + Math.sin(a * 13 + k * 9) * 0.3 * (1 - k * 0.6);
    h *= 1 - Math.pow(k, 6);
    return h;
  }

  for (let r = 0; r < rings; r++) {
    const k = r / (rings - 1);
    const rr = Math.pow(k, 0.85) * radius;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const jitter = (rand() - 0.5) * 0.35 * (1 - k * 0.5);
      const h = heightAt(a, k) + jitter;
      pos.push(Math.cos(a) * rr, h, Math.sin(a) * rr);
    }
  }
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < seg; s++) {
      const a0 = r * seg + s;
      const a1 = r * seg + ((s + 1) % seg);
      const b0 = (r + 1) * seg + s;
      const b1 = (r + 1) * seg + ((s + 1) % seg);
      idx.push(a0, a1, b1, a0, b1, b0);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  /* Solid, lit rock surface first — flat shaded so every facet catches the
     moonlight and the ridges read clearly against the sky. */
  const shadeGeo = geo.clone();
  shadeGeo.deleteAttribute('normal');
  shadeGeo.computeVertexNormals();

  const solidMat = new THREE.MeshLambertMaterial({
    color: P.rock ?? 0x2c3c50,
    emissive: 0x0b1622,
    flatShading: true,
    transparent: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const solid = new THREE.Mesh(shadeGeo, solidMat);
  solid.name = `terrainSolid_${index}`;
  group.add(solid);

  /* Contour wireframe on top, bright enough to define the mesh */
  const wireMat = new THREE.MeshBasicMaterial({
    color: P.terrain, wireframe: true, transparent: true, opacity: 0.5, depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, wireMat);
  mesh.name = `terrainWire_${index}`;
  mesh.scale.setScalar(1.002);
  group.add(mesh);

  /* --- submerged skirt so each island meets the water --- */
  const skirtGeo = new THREE.CylinderGeometry(radius * 1.0, radius * 0.55, baseDrop, 48, 1, true);
  const skirtMat = new THREE.MeshLambertMaterial({
    color: P.rock ?? 0x26344a,
    emissive: 0x060d16,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.name = `islandSkirt_${index}`;
  skirt.position.y = -baseDrop / 2 + 0.1;
  group.add(skirt);

  /* --- shoreline ring --- */
  const ringGeo = new THREE.RingGeometry(radius * 0.97, radius * 1.03, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: P.link, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = `shoreRing_${index}`;
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -baseDrop + 0.35;
  group.add(ring);

  /* --- island lights: warm points scattered on the slopes --- */
  let lightMat = null, lights = null;
  if (opts.lights !== false) {
    const lCount = 26;
    const lPos = new Float32Array(lCount * 3);
    for (let i = 0; i < lCount; i++) {
      const a = rand() * Math.PI * 2;
      const k = 0.35 + rand() * 0.5;
      const rr = Math.pow(k, 0.85) * radius;
      lPos[i * 3] = Math.cos(a) * rr;
      lPos[i * 3 + 1] = heightAt(a, k) + 0.18;
      lPos[i * 3 + 2] = Math.sin(a) * rr;
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    lightMat = new THREE.PointsMaterial({
      color: P.accent, size: 0.2, transparent: true, opacity: 0.35,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    lights = new THREE.Points(lGeo, lightMat);
    lights.name = `islandLights_${index}`;
    group.add(lights);
  }

  /* --- ambient particle cloud --- */
  const pCount = 110;
  const pPos = new Float32Array(pCount * 3);
  const pSeed = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 2 + rand() * radius * 0.95;
    pPos[i * 3] = Math.cos(a) * rr;
    pPos[i * 3 + 1] = 0.5 + rand() * 9;
    pPos[i * 3 + 2] = Math.sin(a) * rr;
    pSeed[i] = rand() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: P.particle, size: 0.085, transparent: true, opacity: 0.28,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  const points = new THREE.Points(pGeo, pMat);
  points.name = `islandParticles_${index}`;
  group.add(points);

  /* --- ember glow at the summit of the active island --- */
  const glowMat = new THREE.SpriteMaterial({
    color: P.accent, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Sprite(glowMat);
  glow.name = `summitGlow_${index}`;
  glow.scale.set(9, 9, 1);
  glow.position.y = 6.4;
  group.add(glow);

  let activeAmt = 0, target = 0, doneAmt = 0, doneTarget = 0;

  function setActive(isActive, isDone) {
    target = isActive ? 1 : 0;
    doneTarget = isDone ? 1 : 0;
  }

  const colA = new THREE.Color(P.terrain);
  const colB = new THREE.Color(P.terrainActive);
  const tmpCol = new THREE.Color();
  const rockA = new THREE.Color(P.rock ?? 0x26344a);
  const rockB = new THREE.Color(P.rockActive ?? 0x3f5f86);
  const rockTmp = new THREE.Color();

  function update(dt, et) {
    activeAmt += (target - activeAmt) * Math.min(dt * 3.2, 1);
    doneAmt += (doneTarget - doneAmt) * Math.min(dt * 2.4, 1);

    const lift = activeAmt * 0.28 + doneAmt * 0.08;
    tmpCol.copy(colA).lerp(colB, Math.max(activeAmt, doneAmt * 0.45));
    wireMat.color.copy(tmpCol);
    wireMat.opacity = 0.3 + lift * 1.15;

    rockTmp.copy(rockA).lerp(rockB, Math.max(activeAmt, doneAmt * 0.35));
    solidMat.color.copy(rockTmp);
    skirtMat.color.copy(rockTmp).multiplyScalar(0.55);
    solidMat.emissive.setRGB(0.035 + activeAmt * 0.03, 0.06 + activeAmt * 0.05, 0.095 + activeAmt * 0.07);

    ringMat.opacity = 0.14 + activeAmt * 0.42;
    pMat.opacity = 0.12 + activeAmt * 0.4;
    pMat.size = 0.07 + activeAmt * 0.04;
    glowMat.opacity = activeAmt * 0.2 + doneAmt * 0.04;
    glow.scale.setScalar(8 + Math.sin(et * 0.9 + index) * 0.6 + activeAmt * 2);

    if (lightMat) {
      lightMat.opacity = 0.22 + activeAmt * 0.55 + Math.sin(et * 2.1 + index) * 0.04;
      lightMat.size = 0.17 + activeAmt * 0.09;
    }

    group.position.y = y + Math.sin(et * 0.42 + index) * 0.1 + activeAmt * 0.3;
    points.rotation.y = et * 0.045 + index;

    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < pCount; i++) {
      arr[i * 3 + 1] += Math.sin(et * 0.75 + pSeed[i]) * dt * 0.35;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  return { group, anchor, setActive, update, radius };
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}