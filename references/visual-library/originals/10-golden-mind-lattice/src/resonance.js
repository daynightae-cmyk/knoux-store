// Sphinx Code — selection resonance.
//
// When a consciousness position is chosen the structure should answer: a set
// of concentric shockwave rings expands outward from the node, a brief flash
// burst blooms at its centre, and a short-lived sympathetic shimmer runs
// through the node's own pathway bundle.
//
// Everything is pooled and additive — no allocation during interaction.

import * as THREE from 'three';

const RING_COUNT = 3;

export class ResonanceField {
  constructor(parent, sprite) {
    this.group = new THREE.Group();
    this.group.name = 'resonanceField';
    parent.add(this.group);

    // Flat rings billboarded to the camera, expanding and thinning.
    const geo = new THREE.RingGeometry(0.5, 0.54, 64);
    this.rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#F2DFB8'),
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      m.name = 'resonanceRing_' + i;
      m.visible = false;
      m.scale.setScalar(0.001);
      this.group.add(m);
      this.rings.push({ mesh: m, t: 1, delay: i * 0.14 });
    }

    // Central flash — a soft billboarded bloom, not a lens flare.
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: sprite,
        color: new THREE.Color('#FFF6DE'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.flash.name = 'resonanceFlash';
    this.flash.visible = false;
    this.group.add(this.flash);

    // Radiating spokes: sacred-geometric, twelve-fold, very brief.
    const spokeVerts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spokeVerts.push(
        Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0,
        Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0
      );
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(spokeVerts, 3));
    this.spokes = new THREE.LineSegments(
      sg,
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#FBF1E8'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.spokes.name = 'resonanceSpokes';
    this.spokes.visible = false;
    this.group.add(this.spokes);

    this.flashT = 1;
    this.spokeT = 1;
    this.active = false;
  }

  // Fire the resonance at a local-space position inside the brain group.
  trigger(position) {
    this.group.position.copy(position);
    for (const r of this.rings) {
      r.t = -r.delay;
      r.mesh.visible = true;
    }
    this.flashT = 0;
    this.flash.visible = true;
    this.spokeT = 0;
    this.spokes.visible = true;
    this.active = true;
  }

  update(dt, camera, scale) {
    if (!this.active) return;
    const s = scale || 1;
    let alive = false;

    for (const r of this.rings) {
      if (r.t >= 1) { r.mesh.visible = false; continue; }
      r.t += dt * 1.05;
      alive = true;
      if (r.t < 0) { r.mesh.visible = false; continue; }
      r.mesh.visible = true;
      // easeOutQuart expansion, so it leaps then settles.
      const e = 1 - Math.pow(1 - Math.min(r.t, 1), 4);
      r.mesh.scale.setScalar((0.10 + e * 1.55) * s);
      r.mesh.material.opacity = Math.max(0, 0.85 * (1 - r.t) * (1 - r.t));
      r.mesh.quaternion.copy(camera.quaternion);
    }

    if (this.flashT < 1) {
      this.flashT += dt * 2.4;
      alive = true;
      const ft = Math.min(this.flashT, 1);
      const bloom = Math.sin(Math.min(ft * 1.6, 1) * Math.PI);
      this.flash.visible = true;
      this.flash.scale.setScalar((0.30 + ft * 0.55) * s);
      this.flash.material.opacity = bloom * 0.9;
      this.flash.quaternion.copy(camera.quaternion);
    } else {
      this.flash.visible = false;
    }

    if (this.spokeT < 1) {
      this.spokeT += dt * 1.7;
      alive = true;
      const st = Math.min(this.spokeT, 1);
      const e = 1 - Math.pow(1 - st, 3);
      this.spokes.visible = true;
      this.spokes.scale.setScalar((0.35 + e * 1.15) * s);
      this.spokes.material.opacity = Math.max(0, 0.55 * (1 - st) * (1 - st * 0.4));
      this.spokes.quaternion.copy(camera.quaternion);
      this.spokes.rotateZ(st * 0.4);
    } else {
      this.spokes.visible = false;
    }

    this.active = alive;
  }
}
