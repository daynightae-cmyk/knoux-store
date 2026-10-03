// Sphinx Code — camera choreography.
//
// Two responsibilities:
//
// 1. IDLE ORBIT — a slow, gravitational drift that deliberately AVOIDS
//    edge-on views. The brain's narrow axis is Z (left/right hemispheres),
//    so a camera sitting near ±Z sees the brain face-on-narrow. We keep the
//    azimuth inside two generous three-quarter arcs and ease the camera
//    away whenever the drift approaches a bad angle.
//
// 2. SELECTION FRAMING — eases the orbit so a chosen node faces the viewer
//    while still respecting the good-angle constraint, and offsets the
//    projection so the brain never sits under the information copy.

import * as THREE from 'three';
import { FRAMING } from './embed.js';

export const TWO_PI = Math.PI * 2;

// Preferred azimuth band, measured as theta in THREE.Spherical where
// theta = atan2(x, z).  theta = 0 -> camera on +Z (dead side-on to the
// hemisphere split = narrow). theta = ±PI/2 -> camera on ±X (front/back of
// the brain = long axis, widest silhouette).
//
// The most flattering views are three-quarter: roughly 35°–75° either side
// of the long axis. We therefore allow two mirrored windows and let the
// idle drift ping-pong inside them.
const GOOD_MIN = 0.62;   // ~35°
const GOOD_MAX = 2.52;   // ~144°

export function isGoodAzimuth(theta) {
  const a = Math.abs(normalizeAngle(theta));
  return a > GOOD_MIN && a < GOOD_MAX;
}

export function normalizeAngle(a) {
  let x = a % TWO_PI;
  if (x > Math.PI) x -= TWO_PI;
  if (x < -Math.PI) x += TWO_PI;
  return x;
}

// Push a theta out of the "narrow" zones toward the nearest good angle.
export function nudgeToGoodAzimuth(theta) {
  const a = normalizeAngle(theta);
  const sign = a >= 0 ? 1 : -1;
  const abs = Math.abs(a);
  if (abs <= GOOD_MIN) return sign * GOOD_MIN;
  if (abs >= GOOD_MAX) return sign * GOOD_MAX;
  return a;
}

// Polar limits — never look straight down the crown or up the brainstem.
export const PHI_MIN = 0.78;
export const PHI_MAX = 2.18;

/* ------------------------------------------------------------------ */
/* Idle orbit                                                          */
/* ------------------------------------------------------------------ */
// Rather than rotating the mesh forever (which produces turntable feel and
// unavoidable edge-on phases), we sweep the CAMERA back and forth inside the
// good-azimuth band on a long sine, and add a slow, tiny polar breath. One
// full there-and-back sweep takes ~62s, so the local angular rate matches the
// requested ~30s-per-revolution feel without ever going narrow.
export class IdleOrbit {
  constructor() {
    this.phase = Math.PI * 0.28;   // start on a right three-quarter view
    this.speed = TWO_PI / 62;      // sweep period, seconds
    this.enabled = true;
  }

  // Returns { theta, phi } for a given elapsed time.
  sample(t) {
    const s = Math.sin(this.phase);
    const mid = (GOOD_MIN + GOOD_MAX) * 0.5;
    const half = (GOOD_MAX - GOOD_MIN) * 0.42;   // stay inside the band
    const theta = mid + s * half;
    const phi = 1.42 + Math.sin(t * 0.061) * 0.16 + Math.sin(t * 0.023) * 0.07;
    return { theta, phi: THREE.MathUtils.clamp(phi, PHI_MIN, PHI_MAX) };
  }

  advance(dt, rate) {
    this.phase += this.speed * rate * dt;
  }
}

/* ------------------------------------------------------------------ */
/* Projection offset (keeps the brain clear of the copy)               */
/* ------------------------------------------------------------------ */
// Rather than moving the camera target (which distorts the orbit), we shear
// the projection matrix. This slides the rendered brain horizontally /
// vertically in the frame without changing the orbit maths.
export function applyProjectionOffset(camera, offsetX, offsetY) {
  camera.updateProjectionMatrix();
  const m = camera.projectionMatrix;
  m.elements[8] += offsetX;    // x shear
  m.elements[9] += offsetY;    // y shear

  // CRITICAL: updateProjectionMatrix() refreshed projectionMatrixInverse from
  // the UNSHEARED matrix, and we have just mutated the matrix after the fact.
  // Raycaster.setFromCamera() and Vector3.unproject() both read the inverse,
  // so without this re-inversion every pick is cast through the unsheared
  // frustum while the scene renders sheared — nodes become unclickable by
  // exactly the offset amount. Keep the pair in sync.
  camera.projectionMatrixInverse.copy(m).invert();
}

/* ------------------------------------------------------------------ */
/* Selection framing                                                   */
/* ------------------------------------------------------------------ */
// Given a node's LOCAL position on the brain and the brain's current
// rotation, work out the camera azimuth that puts the node toward the
// viewer — then clamp that into the flattering band so we never swing to a
// narrow silhouette just to satisfy a node.
export function framingForNode(localPos, brainRotationY, mode) {
  const f = FRAMING[mode] || FRAMING.desktop;

  const v = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), brainRotationY);

  const s = new THREE.Spherical().setFromVector3(v);

  // Bias slightly off dead-centre so the node reads as three-quarter rather
  // than flat-on, then clamp into the good band.
  const biased = s.theta + (s.theta >= 0 ? -0.22 : 0.22);
  const theta = nudgeToGoodAzimuth(biased);

  const phi = THREE.MathUtils.clamp(s.phi * 0.72 + 1.40 * 0.28, PHI_MIN, PHI_MAX);

  return { theta, phi, radius: f.distance * 0.92 };
}