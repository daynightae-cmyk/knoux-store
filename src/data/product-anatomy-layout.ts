/**
 * Product System Anatomy Layout.
 *
 * Deterministic 3D positions and visual properties for anatomy nodes.
 * Semantic topology uses only stable seeded values.
 */

import type { ProductAnatomyNode, ProductAnatomyNodeKind } from './product-anatomy-data';

export type ProductAnatomyLayout = {
  motif: string;
  nodes: ProductAnatomyPositionedNode[];
  edges: ProductAnatomyEdge[];
  camera: { position: [number, number, number]; target: [number, number, number] };
  bounds: { radius: number; height: number };
};

export type ProductAnatomyPositionedNode = ProductAnatomyNode & {
  position: [number, number, number];
  visualSize: number;
  visualColor: string;
  ringStyle: 'solid' | 'dashed' | 'double' | 'boundary';
};

export type ProductAnatomyEdge = {
  from: string;
  to: string;
  type: 'primary' | 'secondary' | 'boundary';
};

type LayoutStrategy = {
  position: (node: ProductAnatomyNode, index: number, total: number, rand: () => number) => [number, number, number];
};

/**
 * Deterministic seeded random for layout derivation.
 */
function seeded(seed: number) {
  let state = (seed + 0x6d2b79f5) | 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic layout for product anatomy nodes.
 * Same product data always produces same positions, relationships, ordering, initial framing.
 */
export function computeProductAnatomyLayout(
  nodes: ProductAnatomyNode[],
  edges: ProductAnatomyEdge[],
  motif: string
): ProductAnatomyLayout {
  const positionedNodes: ProductAnatomyPositionedNode[] = [];

  // Determine layout strategy by motif
  const strategy = getLayoutStrategy(motif);

  nodes.forEach((node, index) => {
    const rand = seeded(node.layoutSeed);
    const position = strategy(node, index, nodes.length, rand);
    const visualProps = getVisualProperties(node.kind, node.emphasis);

    positionedNodes.push({
      ...node,
      position,
      visualSize: visualProps.size,
      visualColor: visualProps.color,
      ringStyle: visualProps.ringStyle,
    });
  });

  // Compute bounds
  let maxRadius = 0;
  let maxHeight = 0;
  positionedNodes.forEach((node) => {
    const r = Math.sqrt(node.position[0] ** 2 + node.position[2] ** 2);
    maxRadius = Math.max(maxRadius, r + node.visualSize);
    maxHeight = Math.max(maxHeight, Math.abs(node.position[1]) + node.visualSize);
  });

  // Camera framing
  const boundsRadius = Math.max(maxRadius, 4);
  const boundsHeight = Math.max(maxHeight, 3);
  const cameraDistance = Math.max(boundsRadius * 2.5, boundsHeight * 2, 12);

  return {
    motif,
    nodes: positionedNodes,
    edges,
    camera: {
      position: [cameraDistance * 0.42, boundsHeight * 1.8, cameraDistance * 0.78],
      target: [0, 0, 0],
    },
    bounds: { radius: boundsRadius, height: boundsHeight },
  };
}

function getLayoutStrategy(motif: string): LayoutStrategy['position'] {
  switch (motif) {
    case 'system-nucleus':
      return systemNucleusLayout;
    case 'repository-topology':
      return repositoryTopologyLayout;
    case 'diagnostic-rings':
      return diagnosticRingsLayout;
    case 'file-clusters':
      return fileClustersLayout;
    case 'capture-timeline':
      return captureTimelineLayout;
    case 'media-spectrum':
      return mediaSpectrumLayout;
    case 'guarded-clipboard':
      return guardedClipboardLayout;
    default:
      throw new Error(`Unknown product anatomy motif: ${motif}`);
  }
}

/**
 * KNOuX ONE: System nucleus - modular nodes in concentric shells around core
 */
function systemNucleusLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  const shell = Math.floor(index / 5) % 3;
  const angle = (index * 2.39996323) % (Math.PI * 2); // Golden angle approximation
  const radius = 2.5 + shell * 2.2;
  const height = (rand() - 0.5) * 1.5;

  return [
    Math.cos(angle) * radius,
    height,
    Math.sin(angle) * radius,
  ];
}

/**
 * KNOuX Forge: Repository topology - branching graph from core
 */
function repositoryTopologyLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  // Branch from core
  const branchIndex = Math.floor(index / 4);
  const branchAngle = (branchIndex * 2.39996323) % (Math.PI * 2);
  const branchDistance = 3 + (index % 4) * 1.2;
  const branchHeight = (rand() - 0.5) * 2;

  return [
    Math.cos(branchAngle) * branchDistance,
    branchHeight,
    Math.sin(branchAngle) * branchDistance,
  ];
}

/**
 * KNOuX Repair: Diagnostic rings - concentric rings with sector nodes
 */
function diagnosticRingsLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  const ring = Math.floor(index / 6) % 4;
  const ringRadius = 1.8 + ring * 1.5;
  const sectorCount = 6 + ring * 2;
  const sectorIndex = index % sectorCount;
  const angle = (sectorIndex / sectorCount) * Math.PI * 2;
  const height = (rand() - 0.5) * 0.8;

  return [
    Math.cos(angle) * ringRadius,
    height,
    Math.sin(angle) * ringRadius,
  ];
}

/**
 * KNOuX SmartOrganizer: File clusters - organic clusters
 */
function fileClustersLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  const cluster = Math.floor(index / 4) % 3;
  const clusterAngle = cluster * (Math.PI * 2 / 3);
  const clusterRadius = 2.5 + cluster * 1.5;
  const localIndex = index % 4;
  const localAngle = (localIndex / 4) * Math.PI * 2 + rand() * 0.5;
  const localRadius = 0.8 + rand() * 0.6;
  const height = (rand() - 0.5) * 1.2;

  return [
    Math.cos(clusterAngle) * clusterRadius + Math.cos(localAngle) * localRadius,
    height,
    Math.sin(clusterAngle) * clusterRadius + Math.sin(localAngle) * localRadius,
  ];
}

/**
 * KNOuX REC: Capture timeline - horizontal timeline with waveform lanes
 */
function captureTimelineLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  const lane = Math.floor(index / 4) % 3 - 1; // -1, 0, 1
  const position = (index % 4) / 3 - 0.5; // -0.5 to 0.5
  const spread = 3.5;

  return [
    position * spread,
    lane * 1.8 + (rand() - 0.5) * 0.4,
    (rand() - 0.5) * 1.2,
  ];
}

/**
 * KNOuX Player X: Playback/signal - radial spectrum with rings
 */
function mediaSpectrumLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  const ring = Math.floor(index / 5) % 3;
  const ringRadius = 2.2 + ring * 1.8;
  const count = 5 + ring * 3;
  const itemIndex = index % count;
  const angle = (itemIndex / count) * Math.PI * 2;
  const height = (rand() - 0.5) * 0.6;

  return [
    Math.cos(angle) * ringRadius,
    height,
    Math.sin(angle) * ringRadius,
  ];
}

/**
 * KNOuX Clipboard AI: Guarded flow - central boundary with ingress/egress paths
 */
function guardedClipboardLayout(
  node: ProductAnatomyNode,
  index: number,
  total: number,
  rand: () => number
): [number, number, number] {
  if (node.kind === 'core') return [0, 0, 0];

  // Core boundary at z=0, items flow along z-axis
  if (node.kind === 'boundary') {
    return [(rand() - 0.5) * 2, (rand() - 0.5) * 1.5, 0];
  }

  const flowDirection = node.kind === 'capability' || node.kind === 'technology' ? -1 : 1;
  const distance = 2 + rand() * 2.5;
  const angle = rand() * Math.PI * 0.6 - Math.PI * 0.3; // Narrow cone
  const radius = distance * 0.5;

  return [
    Math.cos(angle) * radius,
    (rand() - 0.5) * 1.5,
    flowDirection * distance,
  ];
}

function getVisualProperties(
  kind: ProductAnatomyNodeKind,
  emphasis?: 'primary' | 'secondary' | 'boundary',
): { size: number; color: string; ringStyle: 'solid' | 'dashed' | 'double' | 'boundary' } {
  const baseSize = 0.18;

  switch (kind) {
    case 'core':
      return {
        size: baseSize * 2.2,
        color: '#a18acb', // restrained violet
        ringStyle: 'double',
      };
    case 'capability':
      return {
        size: baseSize * (emphasis === 'primary' ? 1.5 : 1.2),
        color: '#c2b5d8', // violet signal
        ringStyle: 'solid',
      };
    case 'technology':
      return {
        size: baseSize * 1.0,
        color: '#b8b5b4', // silver
        ringStyle: 'dashed',
      };
    case 'boundary':
      return {
        size: baseSize * 1.3,
        color: '#51455b', // violet-gray
        ringStyle: 'boundary',
      };
    case 'evidence':
      return {
        size: baseSize * 1.1,
        color: '#e6e2da', // platinum
        ringStyle: 'dashed',
      };
    case 'related':
      return {
        size: baseSize * 1.2,
        color: '#f1eee8', // off-white
        ringStyle: 'solid',
      };
    default:
      return {
        size: baseSize,
        color: '#9a9899', // muted
        ringStyle: 'solid',
      };
  }
}

/**
 * Compute target camera position for a selected node.
 */
export function computeSelectionTarget(
  selectedNode: ProductAnatomyPositionedNode | null,
  layout: ProductAnatomyLayout
): { position: [number, number, number]; target: [number, number, number] } {
  if (!selectedNode) {
    return layout.camera;
  }

  const distance = Math.max(layout.bounds.radius * 1.8, 8);
  const pos = selectedNode.position;
  const target = [pos[0], pos[1], pos[2]] as [number, number, number];
  const position = [
    pos[0],
    pos[1] + 1.5,
    pos[2] + distance,
  ] as [number, number, number];

  return { position, target };
}
