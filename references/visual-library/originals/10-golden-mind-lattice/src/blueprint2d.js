// Blueprint 2D morph module.
//
// When "View Blueprint" mode is engaged, node world-positions are smoothly
// interpolated from their brain-space cortical coordinates to the exact
// flat diagram coordinates of the Archetypal Blueprint®.
//
// The camera simultaneously eases to a front-elevation orthographic-style
// perspective so the diagram reads as a flat plane.
//
// The 2D layout is defined in a [-1, +1] unit square on the XY plane
// (Z = 0), then scaled to match the brain's coordinate space.
//
// BLUEPRINT LAYOUT (facing camera, +X = right, +Y = up):
//
//   PATH col   ·  Matrix col
//
//    P  ←  O                ← apex of Soul Pyramid
//       M    N
//    L  ←  I  J  K          ← crown of Soul / upper Incarnation
//    ——————————————          ← divide rule
//    D  ←  A  B  C          ← base of Incarnation upper
//       E    F
//    H  ←  G                ← base of Incarnation Pyramid
//
// The arrows (G→H and O→P) flow LEFT from the matrix column to the path
// column, exactly as drawn in the original diagram image.

import * as THREE from 'three';

// Scale factor: blueprint unit → Three.js world units.
// The brain spans roughly ±1.3 in X and ±1.1 in Y.
const S = 1.32;

// Column X positions (world units)
const COL_PATH   = -1.72 * S;   // Transcendental Path — far left in flat view
const COL_FEM    = -0.82 * S;   // Feminine column
const COL_MID    =  0.00 * S;   // Essence / midline
const COL_MASC   =  0.82 * S;   // Masculine column

// Row Y positions
const ROW_APEX   =  1.10 * S;   // O / P
const ROW_BEH_S  =  0.66 * S;   // M / N
const ROW_SOUL   =  0.22 * S;   // I J K / L
const ROW_INC    = -0.22 * S;   // A B C / D
const ROW_BEH_I  = -0.66 * S;   // E / F
const ROW_BASE   = -1.10 * S;   // G / H

// Z = 0 — everything flat.
export const BLUEPRINT_2D = {
  // ── Incarnation Pyramid ──────────────────────────────────────────────────
  G: new THREE.Vector3(COL_MID,  ROW_BASE,  0),
  E: new THREE.Vector3(COL_FEM,  ROW_BEH_I, 0),
  F: new THREE.Vector3(COL_MASC, ROW_BEH_I, 0),
  A: new THREE.Vector3(COL_FEM,  ROW_INC,   0),
  B: new THREE.Vector3(COL_MID,  ROW_INC,   0),
  C: new THREE.Vector3(COL_MASC, ROW_INC,   0),
  // ── Soul Pyramid ─────────────────────────────────────────────────────────
  I: new THREE.Vector3(COL_FEM,  ROW_SOUL,  0),
  J: new THREE.Vector3(COL_MID,  ROW_SOUL,  0),
  K: new THREE.Vector3(COL_MASC, ROW_SOUL,  0),
  M: new THREE.Vector3(COL_FEM,  ROW_BEH_S, 0),
  N: new THREE.Vector3(COL_MASC, ROW_BEH_S, 0),
  O: new THREE.Vector3(COL_MID,  ROW_APEX,  0),
  // ── Transcendental Path ──────────────────────────────────────────────────
  H: new THREE.Vector3(COL_PATH, ROW_BASE,  0),
  D: new THREE.Vector3(COL_PATH, ROW_INC,   0),
  L: new THREE.Vector3(COL_PATH, ROW_SOUL,  0),
  P: new THREE.Vector3(COL_PATH, ROW_APEX,  0),
};

// Camera target for blueprint mode:
// pull back along +Z so the flat layout fills the viewport.
export const BLUEPRINT_CAMERA = {
  position: new THREE.Vector3(0, 0, 8.8),
  target:   new THREE.Vector3(0, 0, 0),
};

// Smooth easing helper (exponential decay, same as damp() in interaction.js)
function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// ---------------------------------------------------------------------------
// Blueprint2D controller
// ---------------------------------------------------------------------------
export class Blueprint2D {
  constructor(nodeObjects, nodeGroup, brain, camera, controls) {
    this._nodeObjects = nodeObjects;  // the 16 entry objects from index.js
    this._nodeGroup   = nodeGroup;
    this._brain       = brain;
    this._camera      = camera;
    this._controls    = controls;

    // Saved brain-space positions for each node (THREE.Vector3, world space
    // relative to brain group).
    this._brainPos = {};
    nodeObjects.forEach((n) => {
      this._brainPos[n.letter] = n.group.position.clone();
    });

    // Current interpolation state: 0 = brain, 1 = flat diagram.
    this.t         = 0;      // current morph amount
    this.active    = false;  // is blueprint mode on?

    // Saved camera state to return to.
    this._savedCameraPos    = camera.position.clone();
    this._savedControlsTarget = controls.target.clone();

    // Scratchpad vectors
    this._tmp = new THREE.Vector3();
  }

  /** Called once per frame from the animation loop. */
  update(dt) {
    const target = this.active ? 1 : 0;
    this.t = damp(this.t, target, 2.2, dt);

    const tEased = smootherstep(this.t);

    // ---- morph node positions ----------------------------------------
    this._nodeObjects.forEach((n) => {
      const brain2d = this._brainPos[n.letter];
      const flat    = BLUEPRINT_2D[n.letter];
      if (!brain2d || !flat) return;

      n.group.position.lerpVectors(brain2d, flat, tEased);
    });

    // ---- suppress brain rotation & ghost geometry when morphed ----------
    const brainFade = 1 - tEased;
    this._brain.children.forEach((child) => {
      if (!child.material) return;
      // leave nodeGroup children alone (they are moved above)
      if (child.name === 'consciousnessNodes') return;
      if (child.name === 'archetypalArmature') return;
      if (child.material.opacity !== undefined) {
        child.material.opacity *= brainFade;
      }
    });

    // ---- ease camera ---------------------------------------------------
    if (this.active) {
      this._camera.position.lerp(BLUEPRINT_CAMERA.position, 1 - Math.exp(-2.0 * dt));
      this._controls.target.lerp(BLUEPRINT_CAMERA.target, 1 - Math.exp(-2.0 * dt));
    } else if (this.t < 0.02 && this._returning) {
      // snap-free return: stop nudging once we're basically back
      this._returning = false;
    } else if (this._returning) {
      this._camera.position.lerp(this._savedCameraPos, 1 - Math.exp(-2.0 * dt));
      this._controls.target.lerp(this._savedControlsTarget, 1 - Math.exp(-2.0 * dt));
    }
  }

  /** Toggle flat ↔ brain. */
  toggle() {
    this.active = !this.active;
    if (this.active) {
      // Save current camera for the return journey.
      this._savedCameraPos.copy(this._camera.position);
      this._savedControlsTarget.copy(this._controls.target);
      this._returning = false;
    } else {
      this._returning = true;
    }
    return this.active;
  }

  /** True when the morph is essentially complete in either direction. */
  get settled() {
    return Math.abs(this.t - (this.active ? 1 : 0)) < 0.008;
  }

  /** Disable OrbitControls drag while in blueprint mode. */
  get lockOrbit() {
    return this.t > 0.3;
  }
}

function smootherstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}