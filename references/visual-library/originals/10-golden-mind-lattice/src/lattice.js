// Builds the wireframe lattice: near-neighbour mesh edges + long constellation
// chords + interior radial pathways.

export function buildEdges(points, opts) {
  const {
    maxDist = 0.26,
    minNeighbors = 2,
    maxNeighbors = 5,
    rand = Math.random,
  } = opts || {};

  const n = points.length;
  const cell = maxDist;
  const grid = new Map();
  const key = (i, j, k) => i + ',' + j + ',' + k;

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const kk = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell));
    if (!grid.has(kk)) grid.set(kk, []);
    grid.get(kk).push(i);
  }

  const seen = new Set();
  const edges = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const gi = Math.floor(p.x / cell), gj = Math.floor(p.y / cell), gk = Math.floor(p.z / cell);
    const cand = [];
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++) {
          const bucket = grid.get(key(gi + a, gj + b, gk + c));
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const q = points[j];
            const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < maxDist * maxDist) cand.push([d2, j]);
          }
        }
    cand.sort((a, b) => a[0] - b[0]);
    const take = Math.min(cand.length, minNeighbors + Math.floor(rand() * (maxNeighbors - minNeighbors + 1)));
    for (let t = 0; t < take; t++) {
      const j = cand[t][1];
      const id = i < j ? i * n + j : j * n + i;
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push([i, j]);
    }
  }
  return edges;
}

// Long-range "constellation" chords across the structure — sparse and elegant.
export function buildConstellationEdges(points, count, rand, minDist = 0.7, maxDist = 1.9) {
  const n = points.length;
  const edges = [];
  const seen = new Set();
  let guard = 0;
  while (edges.length < count && guard < count * 90) {
    guard++;
    const i = Math.floor(rand() * n);
    const j = Math.floor(rand() * n);
    if (i === j) continue;
    const p = points[i], q = points[j];
    const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
    if (d < minDist || d > maxDist) continue;
    const id = i < j ? i * n + j : j * n + i;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push([i, j]);
  }
  return edges;
}