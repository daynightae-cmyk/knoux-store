'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, type ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ProductAnatomyLayout } from '@/data/product-anatomy-layout';

type Props = {
  layout: ProductAnatomyLayout;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeHover: (id: string | null) => void;
  onNodeSelect: (id: string | null) => void;
  reduced: boolean;
  visible: boolean;
  quality: 'high' | 'balanced' | 'low' | 'reduced';
};

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="product-anatomy-scene__fallback" role="status">3D view unavailable. Explore every system node in the index below.</div>
      : this.props.children;
  }
}

function CameraRig({ layout, selectedNodeId, reduced, orbit, cameraRef }: Pick<Props, 'layout' | 'selectedNodeId' | 'reduced'> & {
  orbit: React.RefObject<{ theta: number; phi: number; active: boolean; lastInput: number }>;
  cameraRef: React.RefObject<THREE.Camera | null>;
}) {
  const { camera, invalidate } = useThree();
  const neutral = useMemo(() => new THREE.Vector3(...layout.camera.position), [layout.camera.position]);
  const target = useMemo(() => new THREE.Vector3(...layout.camera.target), [layout.camera.target]);
  const lookAt = useRef(target.clone());

  useEffect(() => {
    cameraRef.current = camera;
    camera.position.copy(neutral);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    lookAt.current.copy(target);
    invalidate();
  }, [camera, cameraRef, neutral, target, invalidate]);

  useEffect(() => {
    if (!reduced) return;
    const node = layout.nodes.find((item) => item.id === selectedNodeId);
    const focus = node ? new THREE.Vector3(...node.position) : target;
    camera.position.copy(focus).add(neutral.clone().sub(target));
    camera.lookAt(focus);
    camera.updateMatrixWorld();
    lookAt.current.copy(focus);
    invalidate();
  }, [camera, invalidate, layout.nodes, neutral, reduced, selectedNodeId, target]);

  useFrame((state, delta) => {
    if (reduced) return;
    const node = layout.nodes.find((item) => item.id === selectedNodeId);
    const focus = node ? new THREE.Vector3(...node.position) : target;
    const control = orbit.current;
    const idle = !node && !control.active && performance.now() / 1000 - control.lastInput > 2;
    const theta = idle ? control.theta + Math.sin(state.clock.elapsedTime * 0.12) * 0.09 : control.theta;
    const spherical = new THREE.Spherical().setFromVector3(neutral.clone().sub(target));
    spherical.theta += theta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + control.phi, 0.35, Math.PI - 0.35);
    const factor = 1 - Math.exp(-Math.min(delta, 0.05) * 3.5);
    camera.position.lerp(focus.clone().add(new THREE.Vector3().setFromSpherical(spherical)), factor);
    lookAt.current.lerp(focus, factor);
    camera.lookAt(lookAt.current);
    camera.updateMatrixWorld();
  });
  return null;
}

function AnatomyGeometry({ layout, selectedNodeId, hoveredNodeId }: Pick<Props, 'layout' | 'selectedNodeId' | 'hoveredNodeId'>) {
  const activeId = hoveredNodeId ?? selectedNodeId;
  const connected = useMemo(() => new Set(layout.edges.filter((edge) => edge.from === activeId || edge.to === activeId).flatMap((edge) => [edge.from, edge.to])), [layout.edges, activeId]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  return <group>
    <MotifGuides motif={layout.motif} />
    {layout.edges.map((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) return null;
      const lit = activeId && (edge.from === activeId || edge.to === activeId);
      return <lineSegments key={`${edge.from}-${edge.to}`}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([...from.position, ...to.position]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={lit ? '#c2b5d8' : '#51455b'} transparent opacity={lit ? 0.9 : activeId ? 0.12 : 0.36} depthWrite={false} />
      </lineSegments>;
    })}
    {layout.nodes.map((node) => {
      const selected = node.id === selectedNodeId;
      const hovered = node.id === hoveredNodeId;
      const related = connected.has(node.id);
      const dim = Boolean(activeId && !selected && !hovered && !related);
      const scale = node.visualSize * (selected ? 1.45 : hovered ? 1.3 : related ? 1.12 : 1);
      return <group key={node.id} position={node.position}>
        <mesh scale={scale}>
          {node.kind === 'boundary' ? <octahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 0]} />}
          <meshBasicMaterial color={selected || hovered ? '#e6e2da' : node.visualColor} transparent opacity={dim ? 0.23 : 0.94} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={scale * (node.ringStyle === 'double' ? 2.2 : 1.75)}>
          <torusGeometry args={[1, node.kind === 'boundary' ? 0.025 : 0.014, 4, node.kind === 'boundary' ? 4 : 36]} />
          <meshBasicMaterial color={node.visualColor} transparent opacity={dim ? 0.08 : selected || hovered ? 0.75 : 0.32} depthWrite={false} />
        </mesh>
      </group>;
    })}
  </group>;
}

function MotifGuides({ motif }: { motif: string }) {
  const rings = motif === 'system-nucleus' ? [2.5, 4.7, 6.9]
    : motif === 'diagnostic-rings' ? [1.8, 3.3, 4.8, 6.3]
    : motif === 'media-spectrum' ? [2.2, 4, 5.8] : [];
  const lanes = motif === 'capture-timeline' ? [-1.8, 0, 1.8] : [];
  return <group>
    {rings.map((radius) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 3, 80]} />
      <meshBasicMaterial color="#51455b" transparent opacity={0.2} depthWrite={false} />
    </mesh>)}
    {lanes.map((height) => <lineSegments key={height}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-4.5, height, 0, 4.5, height, 0]), 3]} /></bufferGeometry>
      <lineBasicMaterial color="#51455b" transparent opacity={0.38} depthWrite={false} />
    </lineSegments>)}
    {motif === 'guarded-clipboard' ? <mesh>
      <planeGeometry args={[3.5, 3.5]} />
      <meshBasicMaterial color="#51455b" wireframe transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
    </mesh> : null}
    {motif === 'file-clusters' ? [0, 1, 2].map((index) => <mesh key={index} position={[Math.cos(index * Math.PI * 2 / 3) * (2.5 + index * 1.5), 0, Math.sin(index * Math.PI * 2 / 3) * (2.5 + index * 1.5)]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 0.72, 4]} />
      <meshBasicMaterial color="#51455b" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>) : null}
    {motif === 'repository-topology' ? [-1, 0, 1].map((row) => <lineSegments key={row}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-5, row * 1.6, -2, 5, row * 1.6, -2]), 3]} /></bufferGeometry>
      <lineBasicMaterial color="#51455b" transparent opacity={0.13} depthWrite={false} />
    </lineSegments>) : null}
  </group>;
}

export function ProductAnatomyScene({ layout, selectedNodeId, hoveredNodeId, onNodeHover, onNodeSelect, reduced, visible, quality }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const orbit = useRef({ theta: 0, phi: 0, active: false, lastInput: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        setWebgl(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')));
      } catch { setWebgl(false); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const pick = useCallback((x: number, y: number, pointerType: string) => {
    const rect = hostRef.current?.getBoundingClientRect();
    const camera = cameraRef.current;
    if (!rect || !camera || rect.width === 0 || rect.height === 0) return null;
    const radius = pointerType === 'touch' ? 34 : rect.width < 700 ? 29 : 20;
    let nearest: string | null = null;
    let distance = radius * radius;
    for (const node of layout.nodes) {
      const screen = new THREE.Vector3(...node.position).project(camera);
      if (screen.z < -1 || screen.z > 1) continue;
      const px = rect.left + (screen.x + 1) * rect.width / 2;
      const py = rect.top + (1 - screen.y) * rect.height / 2;
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < distance) { distance = d; nearest = node.id; }
    }
    return nearest;
  }, [layout.nodes]);

  return <div ref={hostRef} className="product-anatomy-scene" style={{ cursor: hoveredNodeId ? 'pointer' : 'auto' }}
    onPointerDown={(event) => {
      drag.current = { x: event.clientX, y: event.clientY, moved: false };
      if (event.pointerType === 'mouse') {
        orbit.current.active = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }}
    onPointerMove={(event) => {
      const start = drag.current;
      if (start && event.pointerType === 'mouse' && event.buttons === 1) {
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) start.moved = true;
        if (start.moved) {
          orbit.current.theta += dx * 0.004;
          orbit.current.phi = THREE.MathUtils.clamp(orbit.current.phi + dy * 0.004, -0.65, 0.65);
          start.x = event.clientX;
          start.y = event.clientY;
        }
      } else if (event.pointerType === 'mouse') onNodeHover(pick(event.clientX, event.clientY, 'mouse'));
    }}
    onPointerUp={(event) => {
      const start = drag.current;
      orbit.current.active = false;
      orbit.current.lastInput = performance.now() / 1000;
      drag.current = null;
      if (start && !start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) {
        const id = pick(event.clientX, event.clientY, event.pointerType);
        if (id) onNodeSelect(id === selectedNodeId ? null : id);
      }
    }}
    onPointerLeave={() => { orbit.current.active = false; onNodeHover(null); }}>
    {webgl === false ? <div className="product-anatomy-scene__fallback" role="status">3D view unavailable. Explore every system node in the index below.</div> : null}
    {webgl ? <CanvasBoundary><Canvas camera={{ position: layout.camera.position, fov: 45, near: 0.1, far: 100 }}
      dpr={quality === 'high' ? [1, 1.5] : [1, 1.25]}
      frameloop={visible && !reduced ? 'always' : 'demand'}
      gl={{ antialias: false, alpha: true, powerPreference: quality === 'low' || quality === 'reduced' ? 'low-power' : 'default' }}
      onCreated={(state) => { cameraRef.current = state.camera; }}>
      <CameraRig layout={layout} selectedNodeId={selectedNodeId} reduced={reduced} orbit={orbit} cameraRef={cameraRef} />
      <AnatomyGeometry layout={layout} selectedNodeId={selectedNodeId} hoveredNodeId={hoveredNodeId} />
    </Canvas></CanvasBoundary> : null}
  </div>;
}
