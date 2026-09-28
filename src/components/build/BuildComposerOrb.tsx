'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

import type { BuildComposerOrbProps, ComposerOrbNode, BuildComposerOrbModel } from './orb-types';
import { createSeededRandom } from './orb-types';
import { computeConnectors, LAYOUT } from './orb-layout';
import {
  createIconTexture,
  getEntityIconPath,
  getDivisionIconPath,
  ORB_COLORS,
  createDivisionRing,
  createEntitySphere,
} from './orb-icons';

/**
 * Build Intelligence Orb - the central visual component for /build.
 * Visualizes the real Composer result deterministically.
 * Never generates recommendations itself - only visualizes what evaluateComposer() returns.
 */
export function BuildComposerOrb({
  model,
  onSelect,
  onActivate,
  reducedMotion,
  active = true,
}: BuildComposerOrbProps) {
  const { nucleus, divisions, entities, selectedId, resolved, typing } = model;

  // Create textures for all nodes
  const nucleusTexture = useMemo(() => createIconTexture('M12 2L2 7l10 5 10-5-10-5z', { width: 24, height: 24 }, ORB_COLORS.nucleus, 128), []);
  const divisionTextures = useMemo(() => {
    const textures = new Map<string, THREE.CanvasTexture>();
    for (const div of divisions) {
      textures.set(div.id, createIconTexture(getDivisionIconPath(div.division), { width: 24, height: 24 }, ORB_COLORS.division, 64));
    }
    return textures;
  }, [divisions]);
  const entityTextures = useMemo(() => {
    const textures = new Map<string, THREE.CanvasTexture>();
    for (const entity of entities) {
      textures.set(entity.id, createIconTexture(getEntityIconPath({ division: entity.division, kind: entity.entityKind ?? 'route' }), { width: 24, height: 24 }, ORB_COLORS.entity, 48));
    }
    return textures;
  }, [entities]);

  useEffect(() => () => nucleusTexture.dispose(), [nucleusTexture]);
  useEffect(() => () => { divisionTextures.forEach((texture) => texture.dispose()); }, [divisionTextures]);
  useEffect(() => () => { entityTextures.forEach((texture) => texture.dispose()); }, [entityTextures]);

  // Connector geometry
  const connectorPositions = useMemo(() => {
    const connectors = computeConnectors(nucleus, divisions, entities);
    const positions = new Float32Array(connectors.length * 2 * 3);
    const colors = new Float32Array(connectors.length * 2 * 3);
    connectors.forEach((conn, i) => {
      const baseIdx = i * 6;
      positions[baseIdx] = conn.start[0];
      positions[baseIdx + 1] = conn.start[1];
      positions[baseIdx + 2] = conn.start[2];
      positions[baseIdx + 3] = conn.end[0];
      positions[baseIdx + 4] = conn.end[1];
      positions[baseIdx + 5] = conn.end[2];

      const color = conn.emphasis === 'primary' ? new THREE.Color(ORB_COLORS.connectorPrimary)
        : conn.emphasis === 'secondary' ? new THREE.Color(ORB_COLORS.connectorSecondary)
        : new THREE.Color(ORB_COLORS.connectorMuted);

      colors[baseIdx] = color.r;
      colors[baseIdx + 1] = color.g;
      colors[baseIdx + 2] = color.b;
      colors[baseIdx + 3] = color.r;
      colors[baseIdx + 4] = color.g;
      colors[baseIdx + 5] = color.b;
    });
    return { positions, colors, count: connectors.length * 2 };
  }, [nucleus, divisions, entities]);

  // Keyboard clearing is mirrored by the semantic DOM controls below.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect]);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 40 }}
      dpr={[1, 1.5]}
      frameloop={active && !reducedMotion ? 'always' : 'demand'}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onPointerMissed={() => onSelect(null)}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      shadows={false}
    >
      <color attach="background" args={[ORB_COLORS.background]} />
      <fog attach="fog" args={[ORB_COLORS.background, 5, 15]} />

      {/* Subtle ambient particles */}
      {!reducedMotion && <AmbientParticles count={Math.min(entities.length * 2, 200)} />}

      {/* Connectors */}
      <ConnectorLines positions={connectorPositions.positions} colors={connectorPositions.colors} count={connectorPositions.count} />

      {/* Nucleus */}
      <OrbNode
        node={nucleus}
        texture={nucleusTexture}
        color={ORB_COLORS.nucleus}
        scale={1.2}
        isNucleus
        pulse={typing || resolved}
        onSelect={onSelect}
        onActivate={onActivate}
      />

      {/* Division nodes */}
      {divisions.map((div) => (
        <OrbNode
          key={div.id}
          node={div}
          texture={divisionTextures.get(div.id)!}
          color={div.id === selectedId ? ORB_COLORS.divisionActive : ORB_COLORS.division}
          scale={0.8}
          ring
          onSelect={onSelect}
          onActivate={onActivate}
        />
      ))}

      {/* Entity nodes */}
      {entities.map((ent) => (
        <OrbNode
          key={ent.id}
          node={ent}
          texture={entityTextures.get(ent.id)!}
          color={ent.id === selectedId ? ORB_COLORS.entityActive : ent.emphasis === 'muted' ? ORB_COLORS.entityMuted : ORB_COLORS.entity}
          scale={0.5}
          sphere
          onSelect={onSelect}
          onActivate={onActivate}
        />
      ))}

      {/* Orbit controls - drag to rotate, no zoom, no pan */}
      <OrbitControls
        enableDamping={!reducedMotion}
        dampingFactor={LAYOUT.DRAG_DAMPING}
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        autoRotate={!reducedMotion && resolved}
        autoRotateSpeed={LAYOUT.AUTO_ROTATION_SPEED}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </Canvas>
  );
}

/**
 * Individual node component - handles mesh creation and animation
 */
function OrbNode({
  node,
  texture,
  color,
  scale = 1,
  isNucleus = false,
  ring = false,
  sphere = false,
  pulse = false,
  onSelect,
  onActivate,
}: {
  node: ComposerOrbNode & { meshRef?: React.RefObject<THREE.Object3D> };
  texture: THREE.CanvasTexture;
  color: string;
  scale?: number;
  isNucleus?: boolean;
  ring?: boolean;
  sphere?: boolean;
  pulse?: boolean;
  onSelect: (node: ComposerOrbNode | null) => void;
  onActivate: (node: ComposerOrbNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { position } = node;

  // Create geometry based on node type
  const geometry = useMemo(() => {
    if (ring) return createDivisionRing(0.15 * scale);
    if (sphere) return createEntitySphere(0.08 * scale);
    if (isNucleus) return new THREE.SphereGeometry(0.25 * scale, 32, 32);
    return new THREE.SphereGeometry(0.1 * scale, 16, 16);
  }, [ring, sphere, isNucleus, scale]);

  const material = useMemo(() => {
    if (isNucleus) {
      return new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: true,
      });
    }
    if (ring) {
      return new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      });
    }
    if (sphere) {
      return new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.9,
        depthTest: true,
        depthWrite: true,
      });
    }
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: true,
    });
  }, [texture, color, isNucleus, ring, sphere]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group
      position={position}
      userData={{ nodeId: node.id }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node);
        onActivate(node);
      }}
    >
      <mesh geometry={geometry} material={material}>
        {isNucleus && <GlowPulse active={pulse} />}
      </mesh>
      {/* Halo on hover */}
      {hovered && !isNucleus && (
        <mesh
          geometry={ring ? createDivisionRing(0.22 * scale) : createEntitySphere(0.12 * scale)}
          material={new THREE.MeshBasicMaterial({
            color: new THREE.Color(ORB_COLORS.nucleusGlow),
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          })}
        />
      )}
    </group>
  );
}

/**
 * Glow pulse effect for the nucleus
 */
function GlowPulse({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as THREE.MeshBasicMaterial;
    if (!active) {
      mesh.scale.setScalar(1);
      material.opacity = 0.16;
      return;
    }
    const time = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(time * 1.6) * 0.08;
    mesh.scale.setScalar(pulse);
    material.opacity = 0.16 + (Math.sin(time * 1.6) + 1) * 0.04;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshBasicMaterial
        color={ORB_COLORS.nucleusGlow}
        transparent
        opacity={0.16}
        side={THREE.BackSide}
        depthTest
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Connector lines between nodes
 */
function ConnectorLines({
  positions,
  colors,
  count,
}: {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    next.setDrawRange(0, count);
    return next;
  }, [positions, colors, count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.4}
        depthTest
        depthWrite={false}
      />
    </lineSegments>
  );
}

/**
 * Subtle ambient particles for atmosphere
 */
function AmbientParticles({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const random = createSeededRandom(0x4b4e4f58 ^ count);

    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const radius = 4 + random() * 3;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return next;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={ORB_COLORS.particle}
        size={0.025}
        transparent
        opacity={0.45}
        depthTest
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Canvas wrapper with proper sizing and lazy loading
 */
interface BuildComposerOrbCanvasProps {
  model: BuildComposerOrbModel;
  onSelect: (node: ComposerOrbNode | null) => void;
  onActivate: (node: ComposerOrbNode) => void;
  reducedMotion: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Main exported component - wraps Canvas in a sized container
 * with proper accessibility and fallback
 */
export function BuildComposerOrbCanvas({
  model,
  onSelect,
  onActivate,
  reducedMotion,
  className = '',
  style,
}: BuildComposerOrbCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglAvailable] = useState(() => {
    if (typeof document === 'undefined') return true;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  });
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '160px 0px', threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Fallback DOM representation for accessibility and no-WebGL
  const fallbackNodes = useMemo(() => {
    const nodes: ComposerOrbNode[] = [model.nucleus, ...model.divisions, ...model.entities];
    return nodes.map((node) => ({
      ...node,
      selected: node.id === model.selectedId,
    }));
  }, [model]);

  if (!webglAvailable) {
    return (
      <div
        ref={containerRef}
        className={`build-composer-orb ${className}`}
        style={{
          width: '100%',
          minHeight: 400,
          background: ORB_COLORS.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          ...style,
        }}
        role="region"
        aria-label="KNOuX Build Intelligence Orb - WebGL not available"
      >
        <div style={{ color: ORB_COLORS.nucleus, fontSize: 24, fontWeight: 600 }}>KNOuX / COMPOSER</div>
        <div style={{ color: ORB_COLORS.division, fontSize: 14 }}>
          {model.resolved ? (
            <>
              {model.divisions.length} division{model.divisions.length === 1 ? '' : 's'},
              {model.entities.length} entit{model.entities.length === 1 ? 'y' : 'ies'}
            </>
          ) : (
            'Awaiting input…'
          )}
        </div>
        <OrbAccessibilityList nodes={fallbackNodes} onSelect={onSelect} onActivate={onActivate} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`build-composer-orb ${className}`}
      style={{ width: '100%', background: ORB_COLORS.background, ...style }}
      role="region"
      aria-label={model.resolved
        ? `KNOuX Build Intelligence Orb showing ${model.divisions.length} divisions and ${model.entities.length} entities`
        : 'KNOuX Build Intelligence Orb - awaiting input'}
    >
      <div className="build-composer-orb__viewport" aria-hidden="true">
        <BuildComposerOrb
          model={model}
          onSelect={onSelect}
          onActivate={onActivate}
          reducedMotion={reducedMotion}
          active={inView && pageVisible}
        />
      </div>
      <OrbAccessibilityList nodes={fallbackNodes} onSelect={onSelect} onActivate={onActivate} />
    </div>
  );
}

/**
 * Visible semantic DOM index mirroring the Orb nodes for keyboard and touch.
 * The canvas is progressive enhancement; this index remains fully operable.
 */
function OrbAccessibilityList({
  nodes,
  onSelect,
  onActivate,
}: {
  nodes: ComposerOrbNode[];
  onSelect: (node: ComposerOrbNode | null) => void;
  onActivate: (node: ComposerOrbNode) => void;
}) {
  return (
    <ul className="build-composer-orb__index" role="list" aria-label="Composer system nodes">
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            className="build-composer-orb__node"
            aria-pressed={node.selected}
            onClick={() => {
              onSelect(node);
              onActivate(node);
            }}
            onFocus={() => onSelect(node)}
          >
            {node.kind === 'nucleus' && 'KNOuX / COMPOSER — '}
            {node.kind === 'division' && 'Division: '}
            {node.kind === 'entity' && 'Entity: '}
            {node.label}
            {node.division && ` (${node.division})`}
            {node.summary && ` — ${node.summary}`}
            {node.reason && ` — Matched: ${node.reason}`}
          </button>
        </li>
      ))}
    </ul>
  );
}