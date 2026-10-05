import * as THREE from 'three';

/* The floating glass frame behind the HTML card — a thin wire rectangle
   in perspective, plus an orbiting generative glyph, echoing the reference. */
export function createCardFrame(P) {
  const group = new THREE.Group();
  group.name = 'cardFrame';

  const w = 15.5, h = 10.2;
  const pts = [
    new THREE.Vector3(-w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, h / 2, 0),
    new THREE.Vector3(-w / 2, h / 2, 0),
    new THREE.Vector3(-w / 2, -h / 2, 0)
  ];
  const frameMat = new THREE.LineBasicMaterial({
    color: 0x9fb4cc, transparent: true, opacity: 0.22, depthWrite: false
  });
  const frame = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), frameMat);
  frame.name = 'cardFrameOutline';
  group.add(frame);

  /* Corner ticks for editorial precision */
  const tickMat = new THREE.LineBasicMaterial({ color: 0xd8e4f2, transparent: true, opacity: 0.38, depthWrite: false });
  const tl = 0.9;
  const corners = [
    [-w / 2, -h / 2, 1, 1], [w / 2, -h / 2, -1, 1],
    [w / 2, h / 2, -1, -1], [-w / 2, h / 2, 1, -1]
  ];
  for (const [cx, cy, sx, sy] of corners) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx + sx * tl, cy, 0),
      new THREE.Vector3(cx, cy, 0),
      new THREE.Vector3(cx, cy + sy * tl, 0)
    ]);
    const l = new THREE.Line(g, tickMat);
    l.name = `cardTick_${cx}_${cy}`;
    group.add(l);
  }

  /* Generative glyph: nested rotating rings, warm ember tone */
  const glyph = new THREE.Group();
  glyph.name = 'cardGlyph';
  glyph.position.set(0, 0, -0.4);
  const glyphMats = [];
  for (let i = 0; i < 5; i++) {
    const r = 1.35 + i * 0.42;
    const seg = 96;
    const p = [];
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const m = new THREE.LineBasicMaterial({
      color: P.accent, transparent: true, opacity: 0.3 - i * 0.035,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    glyphMats.push(m);
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), m);
    ring.name = `glyphRing_${i}`;
    ring.rotation.x = (i * Math.PI) / 7;
    ring.rotation.y = (i * Math.PI) / 5;
    glyph.add(ring);
  }
  group.add(glyph);

  let vis = 0, visTarget = 1;

  return {
    group,
    setVisible(on) { visTarget = on ? 1 : 0; },
    update(dt, et) {
      vis += (visTarget - vis) * Math.min(dt * 3, 1);
      frameMat.opacity = 0.2 * vis;
      tickMat.opacity = 0.34 * vis;
      glyphMats.forEach((m, i) => { m.opacity = (0.3 - i * 0.035) * vis; });
      glyph.rotation.z = et * 0.12;
      glyph.rotation.x = Math.sin(et * 0.24) * 0.3;
      glyph.rotation.y = et * 0.18;
      group.children.forEach((c) => { c.visible = vis > 0.02; });
    }
  };
}