// Procedural brain scalar field + point sampling.
// Anatomically-weighted silhouette: two hemispheres divided by a true
// longitudinal fissure, frontal / temporal / parietal / occipital lobes,
// a foliated cerebellum and a brainstem — built purely from math.
//
// Axes:  +X = anterior (front)   +Y = superior (up)   +Z = right lateral

function smin(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

function ellipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const ax = (x - cx) / rx, ay = (y - cy) / ry, az = (z - cz) / rz;
  return Math.sqrt(ax * ax + ay * ay + az * az) - 1.0;
}

export function brainSDF(p) {
  const x = p.x, y = p.y, z = p.z;
  const az = Math.abs(z);
  const side = z >= 0 ? 1 : -1;

  // ---- one cerebral hemisphere, mirrored across the midline -------------
  // Hemisphere body: an ovoid offset laterally so the pair leaves a fissure.
  let d = ellipsoid(x, y, az, 0.0, 0.10, 0.46, 1.24, 0.86, 0.50);

  // frontal pole — narrower, tipped slightly down
  d = smin(d, ellipsoid(x, y, az, 0.80, 0.02, 0.40, 0.60, 0.60, 0.40), 0.30);
  // parietal crown
  d = smin(d, ellipsoid(x, y, az, -0.06, 0.50, 0.44, 0.78, 0.52, 0.44), 0.30);
  // occipital pole — tapered
  d = smin(d, ellipsoid(x, y, az, -0.92, 0.02, 0.36, 0.48, 0.50, 0.36), 0.26);
  // temporal lobe — a low forward-pointing finger under the sylvian fissure
  d = smin(d, ellipsoid(x, y, az, 0.16, -0.60, 0.60, 0.78, 0.28, 0.28), 0.20);
  // temporal pole (blunt front tip of the temporal lobe)
  d = smin(d, ellipsoid(x, y, az, 0.74, -0.50, 0.54, 0.26, 0.22, 0.24), 0.14);

  // ---- cerebellum: low, rear, strongly foliated -------------------------
  let cb = ellipsoid(x, y, az, -0.92, -0.74, 0.34, 0.52, 0.32, 0.40);
  cb += 0.030 * Math.sin(x * 26.0) * Math.cos(az * 8.0);   // horizontal foliation
  d = smin(d, cb, 0.13);

  // ---- brainstem --------------------------------------------------------
  const sx = (x + 0.46) / 0.17, sz = z / 0.17;
  const stem = Math.max(
    Math.sqrt(sx * sx + sz * sz) - 1.0,
    Math.max(-y - 1.36, y + 0.42) * 2.2
  );
  d = smin(d, stem * 0.30, 0.14);

  // ---- sylvian fissure: a slanted groove separating temporal from frontal
  const syl = Math.abs((y + 0.30) - (x * 0.20) - 0.02) - 0.045;
  d += Math.max(0, 0.055 - Math.max(0, syl) * 0.9) * (az > 0.20 ? 1 : 0);

  // ---- gyral folding ----------------------------------------------------
  // Layered anisotropic ridges. Stronger over the cerebrum, muted on the
  // stem so the silhouette still reads cleanly at distance.
  const fold =
    0.062 * Math.sin(x * 8.2 + az * 4.4) * Math.cos(y * 7.1 - x * 2.6) +
    0.040 * Math.sin(y * 11.0 + x * 5.2) * Math.cos(az * 9.4 + y * 2.1) +
    0.026 * Math.sin(az * 14.6 - y * 6.2 + x * 1.4) +
    0.014 * Math.sin(x * 19.0 + y * 3.0);
  d += fold;

  // ---- longitudinal (interhemispheric) fissure --------------------------
  // Carve a real vertical cleft down the top midline; it shallows toward the
  // base where the corpus callosum joins the hemispheres.
  const depth = Math.max(0, y + 0.32) * 0.85 + 0.10;
  const cleft = (0.085 - Math.min(az, 0.085)) / 0.085;   // 1 at midline -> 0
  d += cleft * cleft * depth * 0.55;

  // flatten the underside
  d = Math.max(d, -(y + 1.34));

  // keep the two hemispheres from bulging outward past the skull line
  d = Math.max(d, az - 1.16);

  return d * (side === 0 ? 1 : 1);
}

export function surfaceNormal(p, eps = 0.02) {
  const dx = brainSDF({ x: p.x + eps, y: p.y, z: p.z }) - brainSDF({ x: p.x - eps, y: p.y, z: p.z });
  const dy = brainSDF({ x: p.x, y: p.y + eps, z: p.z }) - brainSDF({ x: p.x, y: p.y - eps, z: p.z });
  const dz = brainSDF({ x: p.x, y: p.y, z: p.z + eps }) - brainSDF({ x: p.x, y: p.y, z: p.z - eps });
  const l = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / l, y: dy / l, z: dz / l };
}

// Deterministic PRNG so the structure is stable across reloads.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Project a point onto the isosurface by walking along the gradient.
export function projectToSurface(p, iso = 0, steps = 28) {
  let q = { x: p.x, y: p.y, z: p.z };
  for (let i = 0; i < steps; i++) {
    const d = brainSDF(q) - iso;
    if (Math.abs(d) < 0.0015) break;
    const n = surfaceNormal(q);
    const step = d * 0.58;
    q = { x: q.x - n.x * step, y: q.y - n.y * step, z: q.z - n.z * step };
  }
  return q;
}

// Blue-noise-ish surface sampling: reject points that crowd their neighbours.
export function sampleShell(count, iso, minDist, seed) {
  const rand = makeRng(seed);
  const pts = [];
  const cell = Math.max(minDist, 0.04);
  const grid = new Map();
  const key = (i, j, k) => i + ',' + j + ',' + k;

  let guard = 0;
  while (pts.length < count && guard < count * 280) {
    guard++;
    const p = {
      x: (rand() * 2 - 1) * 1.85,
      y: (rand() * 2 - 1) * 1.55,
      z: (rand() * 2 - 1) * 1.30,
    };
    if (Math.abs(brainSDF(p) - iso) > 0.34) continue;
    const s = projectToSurface(p, iso);
    if (!isFinite(s.x) || Math.abs(s.x) > 2.4 || Math.abs(s.y) > 2.0 || Math.abs(s.z) > 1.8) continue;

    const gi = Math.floor(s.x / cell), gj = Math.floor(s.y / cell), gk = Math.floor(s.z / cell);
    let ok = true;
    for (let a = -1; a <= 1 && ok; a++)
      for (let b = -1; b <= 1 && ok; b++)
        for (let c = -1; c <= 1 && ok; c++) {
          const bucket = grid.get(key(gi + a, gj + b, gk + c));
          if (!bucket) continue;
          for (const o of bucket) {
            const dx = o.x - s.x, dy = o.y - s.y, dz = o.z - s.z;
            if (dx * dx + dy * dy + dz * dz < minDist * minDist) { ok = false; break; }
          }
        }
    if (!ok) continue;

    const kk = key(gi, gj, gk);
    if (!grid.has(kk)) grid.set(kk, []);
    grid.get(kk).push(s);
    pts.push(s);
  }
  return pts;
}