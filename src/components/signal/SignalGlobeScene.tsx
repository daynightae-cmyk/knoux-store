'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';
import {
  ATLAS_GRID,
  ATLAS_ROWS,
  buildIconAtlas,
} from '@/lib/signal/iconAtlas';
import {
  fibonacciSphere,
  hashString,
  mulberry32,
  seededUnit,
} from '@/lib/signal/seeded';
import type { SignalVisualMode } from '@/lib/signal/sceneState';
import styles from '@/app/signal/signal.module.css';

const BUDGETS = {
  high: { inner: 500, outer: 200 },
  balanced: { inner: 320, outer: 128 },
  low: { inner: 180, outer: 72 },
  reduced: { inner: 140, outer: 48 },
} as const;
const INNER_RADIUS = 2;
const OUTER_RADIUS = 2.35;
const ATLAS_CELLS = ATLAS_GRID * ATLAS_ROWS;

const VERTEX_SHADER = /* glsl */ `
attribute vec2 aCell;
attribute float aScale;
attribute float aPhase;
attribute float aAlpha;
attribute float aActive;

uniform float uTime;
uniform float uContract;
uniform float uExpand;
uniform float uPulse;
uniform float uPulseKey;
uniform float uReduced;
uniform float uDpr;

varying vec2 vCell;
varying float vAlpha;
varying float vActive;

void main() {
  vec3 base = position;
  float breath = sin(uTime * 0.34 + aPhase) * 0.018 * (1.0 - uReduced);
  vec3 fieldPos = base * (1.0 + breath);

  float bucket = floor(fract(aPhase / 6.28318530718) * 13.0);
  float reacts = 1.0 - step(0.5, abs(bucket - uPulseKey));
  fieldPos += normalize(base + 0.0001)
    * uPulse
    * reacts
    * 0.052
    * (1.0 - uReduced);

  fieldPos *= (1.0 - uContract * 0.08);
  fieldPos *= (1.0 + uExpand * 0.028);

  vec4 mv = modelViewMatrix * vec4(fieldPos, 1.0);
  float depth = smoothstep(9.0, 2.4, -mv.z);
  float sizeBoost = 1.0 + aActive * 0.28 + reacts * uPulse * 0.18;

  gl_PointSize = aScale * 0.32 * sizeBoost * uDpr
    * (300.0 / max(0.1, -mv.z));
  gl_Position = projectionMatrix * mv;

  vCell = aCell;
  vAlpha = aAlpha * (0.42 + 0.58 * depth);
  vActive = aActive;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2 uGrid;

varying vec2 vCell;
varying float vAlpha;
varying float vActive;

void main() {
  vec2 uv = gl_PointCoord;
  uv.y = 1.0 - uv.y;
  vec2 cellUv = (vCell + uv) / uGrid;
  float alpha = texture2D(uAtlas, cellUv).a * vAlpha;
  if (alpha < 0.015) discard;

  vec3 base = vec3(0.92, 0.91, 0.94);
  vec3 activeColor = vec3(0.76, 0.69, 0.88);
  vec3 color = mix(base, activeColor, vActive);

  gl_FragColor = vec4(color, alpha);
}
`;

type FieldProps = {
  inner: number;
  outer: number;
  reduced: boolean;
  evidenceCount: number;
  mode: SignalVisualMode;
  inputSignal: number;
};

function buildGeometry(inner: number, outer: number) {
  const total = inner + outer;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(total * 3);
  const cells = new Float32Array(total * 2);
  const scales = new Float32Array(total);
  const phases = new Float32Array(total);
  const alphas = new Float32Array(total);
  const active = new Float32Array(total);

  const innerPositions = fibonacciSphere(inner, INNER_RADIUS, hashString('signal-inner'));
  const outerPositions = fibonacciSphere(outer, OUTER_RADIUS, hashString('signal-outer'));
  positions.set(innerPositions, 0);
  positions.set(outerPositions, inner * 3);
  const random = mulberry32(hashString('knoux-signal-atlas'));

  for (let index = 0; index < total; index += 1) {
    const isOuter = index >= inner;
    const cell = Math.floor(random() * ATLAS_CELLS);
    cells[index * 2] = cell % ATLAS_GRID;
    cells[index * 2 + 1] = Math.floor(cell / ATLAS_GRID);
    scales[index] = isOuter
      ? 0.62 + random() * 0.34
      : 0.86 + random() * 0.46;
    phases[index] = random() * Math.PI * 2;
    alphas[index] = isOuter
      ? 0.32 + random() * 0.26
      : 0.62 + random() * 0.32;
    active[index] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cells, 2));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aActive', new THREE.BufferAttribute(active, 1));

  return geometry;
}

function SignalPointField({
  inner,
  outer,
  reduced,
  evidenceCount,
  mode,
  inputSignal,
}: FieldProps) {
  const group = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => buildGeometry(inner, outer), [inner, outer]);
  const atlas = useMemo(() => buildIconAtlas(), []);
  const uniforms = useMemo(() => ({
    uAtlas: { value: atlas.texture },
    uGrid: { value: new THREE.Vector2(ATLAS_GRID, ATLAS_ROWS) },
    uTime: { value: 0 },
    uContract: { value: 0 },
    uExpand: { value: 0 },
    uPulse: { value: 0 },
    uPulseKey: { value: 0 },
    uReduced: { value: reduced ? 1 : 0 },
    uDpr: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
  }), [atlas.texture, reduced]);

  useEffect(() => {
    const active = geometry.getAttribute('aActive') as THREE.BufferAttribute;
    const total = inner + outer;
    const budget = Math.min(
      Math.max(0, evidenceCount * 4),
      Math.floor(total * 0.18),
    );
    for (let index = 0; index < total; index += 1) {
      const enabled = budget > 0
        && seededUnit(index, 101) < budget / total;
      active.setX(index, enabled ? 1 : 0);
    }
    active.needsUpdate = true;
  }, [evidenceCount, geometry, inner, outer]);

  useEffect(() => {
    if (inputSignal <= 0 || !materialRef.current) return;
    materialRef.current.uniforms.uPulse.value = 1;
    materialRef.current.uniforms.uPulseKey.value = inputSignal % 13;
  }, [inputSignal]);

  useEffect(() => () => {
    geometry.dispose();
    atlas.dispose();
  }, [atlas, geometry]);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const frameUniforms = material.uniforms;
    frameUniforms.uTime.value = state.clock.elapsedTime;

    const searching = mode === 'searching' ? 1 : 0;
    const expanded = mode === 'resolved' ? 1 : 0;
    const sparse = mode === 'sparse' ? 0.35 : 0;
    const easing = 1 - Math.pow(0.001, delta);

    frameUniforms.uContract.value += (
      Math.max(searching, sparse) - frameUniforms.uContract.value
    ) * easing * 0.72;
    frameUniforms.uExpand.value += (
      expanded - frameUniforms.uExpand.value
    ) * easing * 0.55;
    frameUniforms.uPulse.value *= Math.pow(0.018, delta);

    if (!group.current || reduced) return;
    const speed = mode === 'searching'
      ? 0.13
      : mode === 'resolved'
        ? 0.035
        : 0.08;
    group.current.rotation.y += delta * speed;
  });

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          uniforms={uniforms}
        />
      </points>
    </group>
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
    const onQuality = (event: Event) => {
      setQuality((event as CustomEvent<QualityTier>).detail);
    };
    const onVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((entries[0]?.isIntersecting ?? false) && !document.hidden);
      },
      { threshold: 0.01 },
    );

    const probeTimer = window.setTimeout(() => {
      try {
        const probe = document.createElement('canvas');
        setSupported(Boolean(
          probe.getContext('webgl2') ?? probe.getContext('webgl'),
        ));
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

  const cores = typeof navigator !== 'undefined'
    ? navigator.hardwareConcurrency || 8
    : 8;
  const tier: Exclude<QualityTier, 'auto'> = quality === 'auto'
    ? cores <= 4
      ? 'low'
      : cores >= 12
        ? 'high'
        : 'balanced'
    : quality;
  const budget = reduced ? BUDGETS.reduced : BUDGETS[tier];

  return (
    <div ref={host} className={styles.globeStage} aria-hidden="true">
      {supported === false ? <div className={styles.globeFallback} /> : null}
      {supported ? (
        <Canvas
          camera={{
            position: [0, 0, 5.5],
            fov: 75,
            near: 0.1,
            far: 1000,
          }}
          dpr={tier === 'high' ? [1, 1.5] : [1, 1.15]}
          frameloop={visible ? (reduced ? 'demand' : 'always') : 'never'}
          gl={{
            antialias: tier !== 'low',
            alpha: true,
            powerPreference: tier === 'low'
              ? 'low-power'
              : 'high-performance',
          }}
        >
          <SignalPointField
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
