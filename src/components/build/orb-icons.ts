'use client';

import type { DivisionId, EntityKind } from '@/lib/entities';
import * as THREE from 'three';

/**
 * Semantic icon mapping for the Build Intelligence Orb.
 * Icons are mapped by division, entity kind, and capability — never randomly assigned.
 * Uses CanvasTexture with SVG path data for crisp rendering at any scale.
 */

export const DIVISION_ICON_PATHS: Record<DivisionId, string> = {
  solutions: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  software: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  wordpress: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-9h-2V7h-2v2H8v2h2v2h2v-2h2V7h-2v2h-2V7H8v2H6V7H4v10h2v-2h2v2h2v2h2v-2h2V7h-2v2h-2V7z',
  web: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  growth: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  creative: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  labs: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  institution: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
};

/**
 * Entity kind icon paths - more specific than division icons.
 * These provide visual differentiation at the entity level.
 */
export const KIND_ICON_PATHS: Record<EntityKind, string> = {
  product: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  theme: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  plugin: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  block: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  'starter-site': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  bundle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  'web-system': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  'growth-channel': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  'creative-capability': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  solution: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  experiment: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  route: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
};

/**
 * Nucleus icon - KNOuX mark
 */
export const NUCLEUS_ICON_PATH = 'M156 266.5L156 266.5C156 266.5 156 266.5 156 266.5Z';

/**
 * Generates a CanvasTexture from an SVG path string.
 * This avoids runtime SVG parsing and provides crisp rendering at any DPR.
 */
export function createIconTexture(
  pathData: string,
  viewBox: { width: number; height: number } = { width: 24, height: 24 },
  color: string = '#ffffff',
  size: number = 64
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Scale path to canvas
  const scale = Math.min(size / viewBox.width, size / viewBox.height) * 0.8;
  const offsetX = (size - viewBox.width * scale) / 2;
  const offsetY = (size - viewBox.height * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Parse and draw path
  const commands = parsePath(pathData);
  ctx.beginPath();
  for (const cmd of commands) {
    if (cmd.type === 'M') {
      ctx.moveTo(cmd.x, cmd.y);
    } else if (cmd.type === 'L') {
      ctx.lineTo(cmd.x, cmd.y);
    } else if (cmd.type === 'Z') {
      ctx.closePath();
    }
  }

  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function parsePath(pathData: string): Array<{ type: 'M' | 'L' | 'Z'; x: number; y: number }> {
  const commands: Array<{ type: 'M' | 'L' | 'Z'; x: number; y: number }> = [];
  const tokens = pathData.match(/[MLZmlz]|-?\d*\.?\d+/g) || [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M' || token === 'm') {
      const x = parseFloat(tokens[++i] ?? '0');
      const y = parseFloat(tokens[++i] ?? '0');
      commands.push({ type: 'M', x, y });
    } else if (token === 'L' || token === 'l') {
      const x = parseFloat(tokens[++i] ?? '0');
      const y = parseFloat(tokens[++i] ?? '0');
      commands.push({ type: 'L', x, y });
    } else if (token === 'Z' || token === 'z') {
      commands.push({ type: 'Z', x: 0, y: 0 });
    }
    i++;
  }
  return commands;
}

/**
 * Gets the appropriate icon path for an entity.
 * Priority: kind-specific > division-specific > fallback
 */
export function getEntityIconPath(entity: { division: DivisionId; kind: EntityKind }): string {
  // Try kind-specific first
  if (KIND_ICON_PATHS[entity.kind]) {
    return KIND_ICON_PATHS[entity.kind];
  }
  // Fall back to division icon
  return DIVISION_ICON_PATHS[entity.division] || DIVISION_ICON_PATHS.solutions;
}

/**
 * Gets the division icon path.
 */
export function getDivisionIconPath(division: DivisionId): string {
  return DIVISION_ICON_PATHS[division] || DIVISION_ICON_PATHS.solutions;
}

/**
 * Color palette for the Orb - KNOuX identity colors.
 */
export const ORB_COLORS = {
  nucleus: '#e8e6e3',        // Off-white / platinum
  nucleusGlow: '#7c5cff',    // Restrained KNOuX violet
  division: '#b8b6b3',       // Platinum / silver
  divisionActive: '#e8e6e3', // Off-white
  entity: '#9a9895',         // Graphite
  entityActive: '#e8e6e3',   // Off-white
  entityMuted: '#5a5957',    // Dark graphite
  connectorMuted: '#3a3938', // Deep graphite
  connectorSecondary: '#5a5957',
  connectorPrimary: '#7c5cff', // Violet for selected path
  background: '#0a0a0b',     // Deep KNOuX black
  particle: '#3a3938',       // Subtle ambient
} as const;

/**
 * Creates a sprite material with the entity's icon.
 */
export function createSpriteMaterial(
  texture: THREE.Texture,
  color: string = ORB_COLORS.entity,
  sizeAttenuation: boolean = true
): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.9,
    sizeAttenuation,
    depthTest: true,
    depthWrite: false,
  });
}

/**
 * Creates a ring geometry for division nodes.
 */
export function createDivisionRing(radius: number = 0.15): THREE.RingGeometry {
  return new THREE.RingGeometry(radius * 0.6, radius, 32);
}

/**
 * Creates a sphere geometry for entity nodes.
 */
export function createEntitySphere(radius: number = 0.08): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 16, 16);
}