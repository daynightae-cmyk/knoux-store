import type { ProductTopology } from './types';

/** Fixed semantic lanes; normalized coordinates stay bounded on every viewport. */
export function layoutTopology(topology: ProductTopology) {
  const laneFor = (kind: ProductTopology['nodes'][number]['kind']) => kind === 'route' ? 0 : kind === 'data' ? 1 : ['architecture', 'module'].includes(kind) ? 2 : 3;
  const counts = [0, 0, 0, 0];
  for (const node of topology.nodes) counts[laneFor(node.kind)]++;
  const maximum = Math.max(1, ...counts);
  const positions = [0, 0, 0, 0];
  return topology.nodes.map((node) => {
    const lane = laneFor(node.kind);
    const row = positions[lane]++;
    return { ...node, x: 14 + lane * 24, y: 8 + row / maximum * 84 };
  });
}
