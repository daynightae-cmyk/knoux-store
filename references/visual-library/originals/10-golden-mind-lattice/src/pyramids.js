// Superimposed Archetypal Blueprint® armatures.
//
// Two wireframe pyramids are overlaid on the neural network:
//   INCARNATION PYRAMID (A–H) — points DOWNWARD, warm base gold
//   SOUL PYRAMID (I–P)        — points UPWARD, pale champagne
// plus the Transcendental Path column, the two lateral arrows (G→H, O→P),
// the horizontal divide rule, and the feminine / masculine hemisphere planes.

import * as THREE from 'three';
import { PYRAMID_EDGES } from './nodes.js';

const GOLD = new THREE.Color('#BD9865');
const CHAMPAGNE = new THREE.Color('#F2DFB8');
const MARBLE = new THREE.Color('#FBF1E8');

function lineMat(color, opacity) {
  return new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// A slightly sagging chord so the armature reads as drawn through space
// rather than as flat CAD geometry.
function chord(a, b, sag = 0.055, seg = 18) {
  const pts = [];
  const va = new THREE.Vector3(a.x, a.y, a.z);
  const vb = new THREE.Vector3(b.x, b.y, b.z);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const out = mid.clone().normalize().multiplyScalar(mid.length() * sag + sag * 0.4);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = va.clone().lerp(vb, t);
    p.addScaledVector(out, Math.sin(t * Math.PI));
    pts.push(p);
  }
  return pts;
}

function edgeLines(nodeByLetter, pairs, color, opacity, sag, name) {
  const verts = [];
  for (const [x, y] of pairs) {
    const A = nodeByLetter[x], B = nodeByLetter[y];
    if (!A || !B) continue;
    const pts = chord(A.position, B.position, sag);
    for (let i = 0; i < pts.length - 1; i++) {
      verts.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const l = new THREE.LineSegments(g, lineMat(color, opacity));
  l.name = name;
  return l;
}

// Small open arrowhead at the far end of a chord.
function arrowHead(from, to, color, opacity, name) {
  const a = new THREE.Vector3(from.x, from.y, from.z);
  const b = new THREE.Vector3(to.x, to.y, to.z);
  const dir = b.clone().sub(a).normalize();
  const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  const tip = b.clone().sub(dir.clone().multiplyScalar(0.055));
  const back = tip.clone().sub(dir.clone().multiplyScalar(0.085));
  const p1 = back.clone().add(side.clone().multiplyScalar(0.045));
  const p2 = back.clone().sub(side.clone().multiplyScalar(0.045));
  const verts = [
    tip.x, tip.y, tip.z, p1.x, p1.y, p1.z,
    tip.x, tip.y, tip.z, p2.x, p2.y, p2.z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const l = new THREE.LineSegments(g, lineMat(color, opacity));
  l.name = name;
  return l;
}

// A faint filled triangle so each pyramid reads as a plane, not just edges.
function pyramidFace(nodeByLetter, letters, color, opacity, name) {
  const [a, b, c] = letters.map((L) => nodeByLetter[L].position);
  const verts = new Float32Array([
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = name;
  return mesh;
}

// The horizontal SOUL / INCARNATION divide, drawn as a broad ring around
// the brain's equator at the pyramid boundary.
function divideRule(nodeByLetter) {
  const yA = nodeByLetter.A.position.y;
  const yI = nodeByLetter.I.position.y;
  const y = (yA + yI) * 0.5;
  const pts = [];
  const R = 1.52;
  const SEG = 220;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const th = t * Math.PI * 2;
    // dashed: skip alternate short arcs
    if (Math.floor(t * 44) % 2 === 1) continue;
    pts.push(
      Math.cos(th) * R * 1.06, y, Math.sin(th) * R * 0.92,
      Math.cos(th + 0.012) * R * 1.06, y, Math.sin(th + 0.012) * R * 0.92
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, lineMat(GOLD, 0.17));
  l.name = 'pyramidDivideRule';
  return l;
}

// Faint vertical planes marking the feminine (left) and masculine (right)
// hemispheres — rendered as sparse vertical filaments, not solid sheets.
function hemispherePlane(sign, color, opacity, name) {
  const verts = [];
  const z = 1.06 * sign;
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = -1.5 + t * 2.9;
    const h = Math.sqrt(Math.max(0, 1 - Math.pow((x + 0.05) / 1.55, 2))) * 1.18;
    if (h < 0.05) continue;
    verts.push(x, -h * 0.85, z, x, h, z);
  }
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = -0.95 + t * 2.05;
    const w = Math.sqrt(Math.max(0, 1 - Math.pow(y / 1.3, 2))) * 1.5;
    verts.push(-0.05 - w, y, z, -0.05 + w, y, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const l = new THREE.LineSegments(g, lineMat(color, opacity));
  l.name = name;
  return l;
}

export function buildPyramidArmature(nodes) {
  const byLetter = {};
  nodes.forEach((n) => { byLetter[n.letter] = n; });

  const group = new THREE.Group();
  group.name = 'archetypalArmature';

  const parts = {};

  parts.incarnation = edgeLines(byLetter, PYRAMID_EDGES.incarnation, GOLD, 0.34, 0.05, 'incarnationPyramid');
  parts.soul = edgeLines(byLetter, PYRAMID_EDGES.soul, CHAMPAGNE, 0.34, 0.05, 'soulPyramid');
  parts.path = edgeLines(byLetter, PYRAMID_EDGES.path, MARBLE, 0.24, 0.02, 'transcendentalPath');
  parts.correspondence = edgeLines(byLetter, PYRAMID_EDGES.correspondence, GOLD, 0.10, 0.09, 'pyramidCorrespondence');
  parts.arrows = edgeLines(byLetter, PYRAMID_EDGES.arrows, MARBLE, 0.20, 0.03, 'blueprintArrows');

  group.add(parts.incarnation, parts.soul, parts.path, parts.correspondence, parts.arrows);

  for (const [a, b] of PYRAMID_EDGES.arrows) {
    const head = arrowHead(byLetter[a].position, byLetter[b].position, MARBLE, 0.26, 'arrowHead_' + a + b);
    group.add(head);
    if (!parts.arrowHeads) parts.arrowHeads = [];
    parts.arrowHeads.push(head);
  }

  parts.faceIncarnation = pyramidFace(byLetter, ['A', 'C', 'G'], GOLD, 0.030, 'incarnationFace');
  parts.faceSoul = pyramidFace(byLetter, ['I', 'K', 'O'], CHAMPAGNE, 0.030, 'soulFace');
  group.add(parts.faceIncarnation, parts.faceSoul);

  parts.divide = divideRule(byLetter);
  group.add(parts.divide);

  parts.feminine = hemispherePlane(-1, GOLD, 0.055, 'feminineHemispherePlane');
  parts.masculine = hemispherePlane(1, GOLD, 0.055, 'masculineHemispherePlane');
  group.add(parts.feminine, parts.masculine);

  return { group, parts };
}