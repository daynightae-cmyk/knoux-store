'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';
import { seededUnit } from '@/lib/signal/seeded';
import type { SignalVisualMode } from '@/lib/signal/sceneState';
import styles from '@/app/signal/signal.module.css';

const BUDGETS = {
  high: { inner: 500, outer: 200 },
  balanced: { inner: 320, outer: 128 },
  low: { inner: 180, outer: 72 },
  reduced: { inner: 140, outer: 48 },
} as const;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const INNER_RADIUS = 2;
const OUTER_RADIUS = 2.35;

type GlobeNode = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  base: THREE.Vector3;
  radius: number;
  phase: number;
  speed: number;
  amount: number;
  scale: number;
  outer: boolean;
};

function createGlyphTexture(kind: number) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5) / size - 0.5;
      const y = (py + 0.5) / size - 0.5;
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      const radial = Math.sqrt(x * x + y * y);
      let distance = 1;
      if (kind === 0) distance = Math.abs(radial - 0.28);
      if (kind === 1) distance = Math.min(ax, ay) + Math.max(0, Math.max(ax, ay) - 0.31);
      if (kind === 2) distance = Math.abs(ax + ay - 0.34);
      if (kind === 3) distance = Math.abs(Math.max(ax, ay) - 0.29);
      const edge = kind === 1 ? 0.055 : 0.045;
      const alpha = THREE.MathUtils.clamp(1 - distance / edge, 0, 1);
      const offset = (py * size + px) * 4;
      data[offset] = 244;
      data[offset + 1] = 242;
      data[offset + 2] = 248;
      data[offset + 3] = Math.round(alpha * 235);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeLayer(
  count: number,
  radius: number,
  outer: boolean,
  textures: THREE.Texture[],
  offset = 0,
) {
  const nodes: GlobeNode[] = [];
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index + offset;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    const material = new THREE.SpriteMaterial({
      map: textures[(index + (outer ? 2 : 0)) % textures.length],
      transparent: true,
      opacity: outer ? 0.44 : 0.82,
      depthWrite: false,
      color: new THREE.Color(0xf1efeb),
    });
    const sprite = new THREE.Sprite(material);
    const scale = outer ? 0.11 + seededUnit(index, 13) * 0.09 : 0.15 + seededUnit(index, 7) * 0.11;
    sprite.scale.setScalar(scale);
    sprite.position.set(x * radius, y * radius, z * radius);
    nodes.push({
      sprite, material, base: new THREE.Vector3(x, y, z), radius,
      phase: seededUnit(index, outer ? 43 : 29) * Math.PI * 2,
      speed: (outer ? 0.18 : 0.26) + seededUnit(index, 61) * 0.36,
      amount: (outer ? 0.008 : 0.012) + seededUnit(index, 79) * 0.025,
      scale, outer,
    });
  }
  return nodes;
}

function SignalField({
  inner,
  outer,
  reduced,
  evidenceCount,
  mode,
  inputSignal,
}: {
  inner: number;
  outer: number;
  reduced: boolean;
  evidenceCount: number;
  mode: SignalVisualMode;
  inputSignal: number;
}) {
  const field = useMemo(() => {
    const textures = [0, 1, 2, 3].map(createGlyphTexture);
    const nodes = [
      ...makeLayer(inner, INNER_RADIUS, false, textures),
      ...makeLayer(outer, OUTER_RADIUS, true, textures, 0.5),
    ];
    return { nodes, textures };
  }, [inner, outer]);

  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef(field.nodes);
  const typingPulse = useRef(0);
  useEffect(() => {
    nodesRef.current = field.nodes;
  }, [field.nodes]);
  useEffect(() => {
    if (inputSignal > 0) typingPulse.current = 1;
  }, [inputSignal]);

  useEffect(() => {
    const total = field.nodes.length;
    const activeBudget = Math.min(Math.max(0, evidenceCount * 4), Math.floor(total * 0.18));
    field.nodes.forEach((node, index) => {
      const active = activeBudget > 0 && seededUnit(index, 101) < activeBudget / total;
      node.material.color.set(active ? 0xcbbbe8 : 0xf1efeb);
      node.material.opacity = active ? 1 : node.outer ? 0.42 : 0.78;
      node.sprite.scale.setScalar(node.scale * (active ? 1.34 : 1));
      node.sprite.userData.active = active;
    });
  }, [evidenceCount, field]);

  useEffect(() => () => {
    field.nodes.forEach((node) => node.material.dispose());
    field.textures.forEach((texture) => texture.dispose());
  }, [field]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const elapsed = state.clock.elapsedTime;
    const targetScale = mode === 'searching' ? 0.92 : mode === 'resolved' ? 1.03 : mode === 'sparse' ? 0.96 : 1;
    const scale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, reduced ? 0.16 : 0.06);
    groupRef.current.scale.setScalar(scale);
    if (reduced) return;

    const rotationSpeed = mode === 'searching' ? 0.13 : mode === 'resolved' ? 0.035 : 0.08;
    groupRef.current.rotation.y = elapsed * rotationSpeed;
    typingPulse.current *= 0.9;
    nodesRef.current.forEach((node, index) => {
      const floatFactor = mode === 'searching' ? 0.45 : 1;
      const float = Math.sin(elapsed * node.speed + node.phase) * node.amount * floatFactor;
      const reacts = inputSignal > 0 && index % 13 === inputSignal % 13;
      const attraction = reacts ? typingPulse.current * 0.055 : 0;
      const currentRadius = node.radius + float - attraction;
      node.sprite.position.set(
        node.base.x * currentRadius,
        node.base.y * currentRadius,
        node.base.z * currentRadius,
      );
      if (node.sprite.userData.active) {
        const pulse = 1 + Math.sin(elapsed * 1.8 + node.phase) * 0.07;
        node.sprite.scale.setScalar(node.scale * 1.34 * pulse);
      }
    });
  });

  return (
    <>
      <group ref={groupRef}>
        {field.nodes.map((node, index) => (
          <primitive key={index} object={node.sprite} />
        ))}
      </group>
      <ambientLight intensity={0.72} />
      <directionalLight position={[15, 10, 20]} intensity={1.35} />
      <pointLight position={[0, 0, 0]} intensity={0.36} distance={6} color="#9277c7" />
    </>
  );
}

export function SignalGlobeScene({
  evidenceCount = 0,
  mode = 'idle',
  inputSignal = 0,
}: {
  evidenceCount?: number;
  mode?: SignalVisualMode;
  inputSignal?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<QualityTier>('auto');
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduced(motion.matches);
    const syncQuality = () => {
      const saved = localStorage.getItem('knoux-quality');
      if (saved && ['auto', 'high', 'balanced', 'low'].includes(saved)) {
        setQuality(saved as QualityTier);
      }
    };
    const onQuality = (event: Event) => setQuality((event as CustomEvent<QualityTier>).detail);
    const onVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(
      (entries) => setVisible((entries[0]?.isIntersecting ?? false) && !document.hidden),
      { threshold: 0.01 },
    );

    const probeTimer = window.setTimeout(() => {
      try {
        const probe = document.createElement('canvas');
        setSupported(Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl')));
      } catch {
        setSupported(false);
      }
    }, 0);
    syncMotion();
    syncQuality();
    if (host.current) observer.observe(host.current);
    motion.addEventListener('change', syncMotion);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(probeTimer);
      motion.removeEventListener('change', syncMotion);
      window.removeEventListener(qualityEvent, onQuality);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, []);

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  const tier: Exclude<QualityTier, 'auto'> =
    quality === 'auto' ? (cores <= 4 ? 'low' : cores >= 12 ? 'high' : 'balanced') : quality;
  const budget = reduced ? BUDGETS.reduced : BUDGETS[tier];

  return (
    <div ref={host} className={styles.globeStage} aria-hidden="true">
      {supported === false ? <div className={styles.globeFallback} /> : null}
      {supported ? (
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 75, near: 0.1, far: 1000 }}
          dpr={tier === 'high' ? [1, 1.5] : [1, 1.15]}
          frameloop={visible ? (reduced ? 'demand' : 'always') : 'never'}
          gl={{
            antialias: tier !== 'low',
            alpha: true,
            powerPreference: tier === 'low' ? 'low-power' : 'high-performance',
          }}
        >
          <SignalField
            inner={budget.inner}
            outer={budget.outer}
            reduced={reduced}
            evidenceCount={evidenceCount}
            mode={mode}
            inputSignal={inputSignal}
          />
          <OrbitControls
            enabled={!reduced}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            minDistance={4.5}
            maxDistance={8}
            rotateSpeed={0.34}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
