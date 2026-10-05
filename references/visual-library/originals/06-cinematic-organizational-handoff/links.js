import * as THREE from 'three';

/* Dotted bridge arc between two islands */
export function createArc(from, to, P, index) {
  const SEGMENTS = 90;
  const mid = new THREE.Vector3(
    (from.x + to.x) / 2,
    Math.max(from.y, to.y) + 6.5,
    (from.z + to.z) / 2 - 1.5
  );
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
  const pts = curve.getPoints(SEGMENTS);

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color: P.link,
    transparent: true,
    opacity: 0.32,
    dashSize: 0.55,
    gapSize: 0.75
  });
  const line = new THREE.Line(geo, mat);
  line.name = `arcLink_${index}`;
  line.computeLineDistances();

  let pulse = 0, active = 0, targetActive = 0;
  const colA = new THREE.Color(P.link);
  const colB = new THREE.Color(P.accent);
  const tmp = new THREE.Color();

  return {
    line,
    setActive(on) { targetActive = on ? 1 : 0; },
    pulse() { pulse = 1; },
    update(dt) {
      active += (targetActive - active) * Math.min(dt * 2.6, 1);
      pulse *= Math.pow(0.22, dt);
      const amt = Math.max(active * 0.6, pulse);
      tmp.copy(colA).lerp(colB, amt);
      mat.color.copy(tmp);
      mat.opacity = 0.14 + amt * 0.55;
      mat.dashOffset = (mat.dashOffset || 0) - dt * 1.6;
    }
  };
}

/* Sparse background starfield for depth */
export function createStarfield(P) {
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = 90 + Math.random() * 120;
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = Math.sin(b) * Math.cos(a) * r;
    pos[i * 3 + 1] = Math.abs(Math.cos(b) * r) * 0.55 - 10;
    pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x6d8bab, size: 0.35, transparent: true, opacity: 0.4,
    depthWrite: false, sizeAttenuation: true
  });
  const stars = new THREE.Points(geo, mat);
  stars.name = 'backgroundStars';
  return stars;
}