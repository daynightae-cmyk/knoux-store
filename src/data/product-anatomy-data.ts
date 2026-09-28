/**
 * Product System Anatomy Data.
 *
 * Derives normalized visual nodes from verified product data.
 * Does not invent nodes. Every node maps to real product data.
 */

import { softwareProducts, type SoftwareProduct } from '@/data/software';

export type ProductAnatomyNodeKind =
  | 'core'
  | 'capability'
  | 'technology'
  | 'boundary'
  | 'evidence'
  | 'related';

export type ProductAnatomyNode = {
  id: string;
  productId: string;
  kind: ProductAnatomyNodeKind;
  label: string;
  summary: string;
  sourceRefs: string[];
  relatedNodeIds: string[];
  route?: string;
  emphasis?: 'primary' | 'secondary' | 'boundary';
  /** Deterministic layout seed component */
  layoutSeed: number;
};

function slugToSeed(slug: string): number {
  let hash = 0x4b4e4f58; // "KNOX"
  for (let i = 0; i < slug.length; i++) {
    hash = Math.imul(hash ^ slug.charCodeAt(i), 0x51ed);
  }
  return hash >>> 0;
}

function stringToSeed(str: string, base: number): number {
  let hash = base;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x51ed);
  }
  return hash >>> 0;
}

/**
 * Cluster long capability prose into presentation nodes.
 * Each cluster retains transparent mapping back to actual source strings.
 */
function clusterCapabilities(capabilities: string[], maxPerCluster = 2): { label: string; summary: string; sources: string[] }[] {
  const clusters: { label: string; summary: string; sources: string[] }[] = [];
  for (let i = 0; i < capabilities.length; i += maxPerCluster) {
    const slice = capabilities.slice(i, i + maxPerCluster);
    clusters.push({
      label: slice[0].split(' ').slice(0, 3).join(' ') + (slice.length > 1 ? '…' : ''),
      summary: slice.join(' · '),
      sources: slice,
    });
  }
  return clusters;
}

/**
 * Derive anatomy nodes from product data.
 * Every node has a transparent mapping to source data.
 */
export function deriveProductAnatomy(product: SoftwareProduct): ProductAnatomyNode[] {
  const nodes: ProductAnatomyNode[] = [];
  const productSeed = slugToSeed(product.slug);

  // CORE node - product identity
  nodes.push({
    id: `${product.slug}-core`,
    productId: product.id,
    kind: 'core',
    label: product.shortName,
    summary: product.statement,
    sourceRefs: ['product.statement', 'product.tagline'],
    relatedNodeIds: [],
    emphasis: 'primary',
    layoutSeed: stringToSeed('core', productSeed),
  });


  // CAPABILITY nodes - clustered from verified capabilities
  const capabilityClusters = clusterCapabilities(product.capabilities, 2);
  capabilityClusters.forEach((cluster, index) => {
    const nodeId = `${product.slug}-capability-${index}`;
    nodes.push({
      id: nodeId,
      productId: product.id,
      kind: 'capability',
      label: cluster.label,
      summary: cluster.summary,
      sourceRefs: cluster.sources,
      relatedNodeIds: [`${product.slug}-core`],
      emphasis: 'secondary',
      layoutSeed: stringToSeed(`capability-${index}`, productSeed),
    });

  });

  // TECHNOLOGY nodes - from verified technologies
  product.technologies.forEach((tech, index) => {
    nodes.push({
      id: `${product.slug}-technology-${index}`,
      productId: product.id,
      kind: 'technology',
      label: tech,
      summary: `Implementation technology: ${tech}`,
      sourceRefs: [tech],
      relatedNodeIds: [`${product.slug}-core`],
      emphasis: 'secondary',
      layoutSeed: stringToSeed(`technology-${tech}`, productSeed),
    });

  });

  // BOUNDARY nodes - from stated limitations
  product.limitations.forEach((limitation, index) => {
    nodes.push({
      id: `${product.slug}-boundary-${index}`,
      productId: product.id,
      kind: 'boundary',
      label: limitation.length > 45 ? `${limitation.slice(0, 42).trimEnd()}…` : limitation,
      summary: limitation,
      sourceRefs: [limitation],
      relatedNodeIds: [`${product.slug}-core`],
      emphasis: 'boundary',
      layoutSeed: stringToSeed(`boundary-${index}`, productSeed),
    });

  });

  // EVIDENCE nodes - from repository artefacts
  product.evidence.forEach((evidence, index) => {
    nodes.push({
      id: `${product.slug}-evidence-${index}`,
      productId: product.id,
      kind: 'evidence',
      label: evidence.source,
      summary: evidence.note,
      sourceRefs: [evidence.source],
      relatedNodeIds: [`${product.slug}-core`],
      route: product.repository,
      emphasis: 'secondary',
      layoutSeed: stringToSeed(`evidence-${evidence.source}`, productSeed),
    });

  });

  // RELATED nodes - from relatedIds
  product.relatedIds.forEach((relatedId, index) => {
    const related = softwareProducts.find((candidate) => candidate.id === relatedId);
    if (!related) return;
    nodes.push({
      id: `${product.slug}-related-${index}`,
      productId: product.id,
      kind: 'related',
      label: related.name,
      summary: related.statement,
      sourceRefs: [relatedId],
      relatedNodeIds: [`${product.slug}-core`],
      route: `/products/${related.slug}`,
      emphasis: 'secondary',
      layoutSeed: stringToSeed(`related-${relatedId}`, productSeed),
    });

  });

  return nodes;
}

/**
 * Derive edges between nodes based on relatedNodeIds.
 */
export type ProductAnatomyEdge = {
  from: string;
  to: string;
  type: 'primary' | 'secondary' | 'boundary';
};

export function deriveProductAnatomyEdges(nodes: ProductAnatomyNode[]): ProductAnatomyEdge[] {
  const edges: ProductAnatomyEdge[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  nodes.forEach((node) => {
    node.relatedNodeIds.forEach((relatedId) => {
      if (nodeMap.has(relatedId)) {
        const type = node.kind === 'boundary' ? 'boundary' : node.kind === 'core' ? 'primary' : 'secondary';
        edges.push({ from: node.id, to: relatedId, type });
      }
    });
  });

  return edges;
}

/**
 * Validate that anatomy data has proper source mappings.
 */
export function validateProductAnatomy(nodes: ProductAnatomyNode[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('No anatomy nodes derived');
    return { valid: false, errors };
  }

  const coreNodes = nodes.filter((n) => n.kind === 'core');
  if (coreNodes.length !== 1) {
    errors.push(`Expected exactly 1 core node, found ${coreNodes.length}`);
  }

  nodes.forEach((node) => {
    if (!node.sourceRefs || node.sourceRefs.length === 0) {
      errors.push(`Node ${node.id} has no sourceRefs`);
    }
    if (!node.summary || node.summary.trim().length === 0) {
      errors.push(`Node ${node.id} has empty summary`);
    }
  });

  return { valid: errors.length === 0, errors };
}
