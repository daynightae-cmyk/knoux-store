'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { MARK_PATHS, MARK_VIEW_BOX, buildMarkSamples } from '@/lib/knouxMark';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';

const BUDGETS = { high: 26000, balanced: 15000, low: 6500, reduced: 5000 } as const;

/**
 * Perspective camera framing. The stage is sized to the mark's 312:532 aspect,
 * so a fixed camera distance fits the mark exactly at any viewport without
 * re-fitting on resize.
 */
const CAMERA_FOV = 38;
const CAMERA_Z = 8;
const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

/**
 * Port of the reference particle engine. Every uniform name, force and curve is
 * taken from that shader: radial breathing, mouse push, mouse swirl, the Z orbit
 * and the organic jitter, depth-attenuated point size and depth-weighted alpha.
 *
 * All offsets are derived from the base `position` attribute rather than
 * accumulated, so releasing the pointer returns every particle exactly onto its
 * canonical target with no drift.
 */
const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aRandom;
attribute float aDelay;
attribute float aContour;
attribute float aCurve;
attribute vec3 aColor;
attribute vec3 aDestination;

uniform float uTime;
uniform float uPixelRatio;
uniform float uArrival;
uniform float uTransition;
uniform float uMorph;
uniform float uMotion;
uniform float uAwake;

uniform vec3 uMouse3D;
uniform float uMouseActive;

varying vec3 vColor;
varying float vAlpha;

void main() {
    vColor = aColor;
    vec3 pos = position;

    // Assembly: a distant, sparse field resolves onto the canonical mark,
    // outside in, so the identity appears to compute itself into existence.
    float travel = clamp((uArrival - aDelay * 0.55) / 0.45, 0.0, 1.0);
    travel = travel * travel * (3.0 - 2.0 * travel);
    float apart = 1.0 - travel;
    pos += normalize(pos + vec3(0.0011, 0.0017, 0.0)) * apart * (0.5 + aRandom * 1.45);
    pos.xy += vec2(sin(aRandom * 41.0), cos(aRandom * 29.0)) * apart * 0.85;
    pos.z -= apart * (1.3 + aRandom * 2.6);

    // Subtle breathing, along the radial direction.
    float breath = sin(uTime * 0.5 + aRandom * 6.28) * 0.02 * uMotion * travel;
    pos += normalize(pos + vec3(0.001)) * breath;

    // Micro movement and depth drift.
    pos.xy += vec2(sin(uTime * 0.27 + aRandom * 12.7), cos(uTime * 0.23 + aRandom * 8.3)) * 0.008 * uMotion * travel;
    pos.z += sin(uTime * 0.33 + aRandom * 10.4) * 0.05 * uMotion * travel;

    // Mouse influence: swirl and push, using only the XY distance so depth never
    // reduces influence. Squared falloff keeps the reach tight and the edges calm.
    vec3 toParticle = pos - uMouse3D;
    float xyDist = length(toParticle.xy);
    float fullDist = length(toParticle);
    float mouseRadius = 1.7;
    float influence = 1.0 - smoothstep(0.0, mouseRadius, xyDist);
    influence = influence * influence * uMouseActive * travel * (1.0 - uTransition * 0.6);

    if (influence > 0.001) {
        // Push away from the pointer.
        vec3 pushDir = fullDist > 0.001 ? normalize(toParticle) : vec3(0.0, 1.0, 0.0);
        float pushStrength = influence * 0.30;
        pos += pushDir * pushStrength;

        // Controlled tangential swirl in the XY plane around the pointer.
        float swirlSpeed = uTime * 2.0 + aRandom * 6.28;
        float swirlStrength = influence * 0.25;
        vec2 radial = pos.xy - uMouse3D.xy;
        float angle = swirlStrength * (1.0 + sin(swirlSpeed) * 0.3);
        float cosA = cos(angle);
        float sinA = sin(angle);
        pos.xy = uMouse3D.xy + vec2(radial.x * cosA - radial.y * sinA, radial.x * sinA + radial.y * cosA);

        // Gentle Z orbit for depth.
        pos.z += sin(swirlSpeed * 0.7 + aRandom * 3.14) * influence * 0.15;

        // Organic jitter.
        float jitter = sin(uTime * 4.0 + aRandom * 18.0) * 0.02 * influence;
        pos += pushDir * jitter;
    }

    // KNOuX Core and the product universe: the components separate along curved
    // paths, the circular node contracting into the Core ring.
    float route = smoothstep(0.0, 1.0, uTransition);
    vec2 toTarget = aDestination.xy - pos.xy;
    vec2 control = mix(pos.xy, aDestination.xy, 0.5) + vec2(-toTarget.y, toTarget.x) * 0.17 * aCurve;
    pos.xy = (1.0 - route) * (1.0 - route) * pos.xy
           + 2.0 * (1.0 - route) * route * control
           + route * route * aDestination.xy;
    pos.z = mix(pos.z, aDestination.z, route);

    // Reference morph dispersion, so the routed field never reads as a hard snap.
    pos += normalize(pos + vec3(0.001)) * sin(route * 3.14159) * 0.26 * aRandom * uMotion;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * 500.0 / -mvPos.z;
    gl_PointSize = clamp(gl_PointSize, 1.7, 10.0);
    gl_Position = projectionMatrix * mvPos;

    // The silhouette is the bright element; the interior falls away so the mark
    // keeps dark negative space instead of reading as a filled surface.
    vAlpha = (0.86 + 0.14 * (1.0 - smoothstep(0.0, 14.0, -mvPos.z)))
           * (0.42 + 0.58 * aContour)
           * (0.15 + 0.85 * travel) * uAwake;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    // Colour arrives already graded, so the violet accents keep their hue
    // instead of being clipped to white by an additive overdrive.
    gl_FragColor = vec4(vColor, alpha);
}`;

// Silver through ivory-white carries the mark. KNOuX violet is a rare energy
// accent and is deliberately held below the clipping point.
const SILVER = new THREE.Color(0.56, 0.585, 0.63);
const IVORY = new THREE.Color(1.0, 0.985, 0.955);
const VIOLET = new THREE.Color(0.5, 0.3, 0.94);
const OVERDRIVE = 2.15;
const LIFT = 0.16;

export function LivingParticleField({
  budget,
  progress,
  reduced,
  pointer,
  hovering,
  onSettled,
  awake = true,
}: {
  budget: number;
  progress: number;
  reduced: boolean;
  pointer: React.RefObject<THREE.Vector3>;
  hovering: React.RefObject<number>;
  onSettled: () => void;
  awake?: boolean;
}) {
  const settled = useRef(false);

  const samples = useMemo(() => buildMarkSamples(budget), [budget]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    const count = samples.length;
    const position = new Float32Array(count * 3);
    const colour = new Float32Array(count * 3);
    const destination = new Float32Array(count * 3);
    const pointSize = new Float32Array(count);
    const contour = new Float32Array(count);
    const randomness = new Float32Array(count);
    const delay = new Float32Array(count);
    const curve = new Float32Array(count);
    const scratch = new THREE.Color();

    samples.forEach((sample, index) => {
      position[index * 3] = sample.x;
      position[index * 3 + 1] = sample.y;
      position[index * 3 + 2] = sample.z;
      destination[index * 3] = sample.destination[0];
      destination[index * 3 + 1] = sample.destination[1];
      destination[index * 3 + 2] = sample.destination[2];

      // Silver, ivory and soft grey carry the mark; KNOuX violet is a sparse
      // energy accent, never a surface. Grading happens here so the shader can
      // stay a pure radial falloff.
      const base = sample.violet
        ? scratch.copy(VIOLET).multiplyScalar(1.18)
        : scratch.copy(SILVER).lerp(IVORY, Math.pow(sample.glow, 0.8)).multiplyScalar(OVERDRIVE).addScalar(LIFT);
      colour[index * 3] = base.r;
      colour[index * 3 + 1] = base.g;
      colour[index * 3 + 2] = base.b;

      pointSize[index] = sample.size;
      contour[index] = sample.contour;
      randomness[index] = sample.random;
      delay[index] = sample.delay;
      curve[index] = sample.curve;
    });

    next.setAttribute('position', new THREE.BufferAttribute(position, 3));
    next.setAttribute('aColor', new THREE.BufferAttribute(colour, 3));
    next.setAttribute('aDestination', new THREE.BufferAttribute(destination, 3));
    next.setAttribute('aSize', new THREE.BufferAttribute(pointSize, 1));
    next.setAttribute('aContour', new THREE.BufferAttribute(contour, 1));
    next.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 1));
    next.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    next.setAttribute('aCurve', new THREE.BufferAttribute(curve, 1));
    next.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    return next;
  }, [samples]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uArrival: { value: reduced ? 1 : 0 },
          uTransition: { value: 0 },
          uMorph: { value: 0 },
          uMotion: { value: reduced ? 0 : 1 },
          uAwake: { value: 0 },
          uMouse3D: { value: new THREE.Vector3(999, 999, 0) },
          uMouseActive: { value: 0 },
        },
      }),
    [reduced],
  );

  // The uniforms are driven from the frame loop, so the material reaches the
  // loop through a ref written by the JSX rather than by an effect.
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = useRef(0);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const uniforms = materialRef.current?.uniforms;
    if (!uniforms) return;
    const step = Math.min(delta, 0.05);
    if (pixelRatio.current !== state.gl.getPixelRatio()) {
      pixelRatio.current = state.gl.getPixelRatio();
      uniforms.uPixelRatio.value = pixelRatio.current;
    }
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uArrival.value = THREE.MathUtils.damp(uniforms.uArrival.value, awake ? 1 : 0, reduced ? 40 : 2.3, step);
    uniforms.uAwake.value = THREE.MathUtils.damp(uniforms.uAwake.value, awake ? 1 : 0, reduced ? 40 : 2.5, step);
    uniforms.uTransition.value = THREE.MathUtils.damp(uniforms.uTransition.value, progress, 2.4, step);
    uniforms.uMorph.value = uniforms.uTransition.value;
    uniforms.uMotion.value = THREE.MathUtils.damp(uniforms.uMotion.value, reduced ? 0 : 1, 4, step);
    uniforms.uMouse3D.value.lerp(pointer.current, 1 - Math.exp(-8 * step));
    uniforms.uMouseActive.value = THREE.MathUtils.damp(uniforms.uMouseActive.value, hovering.current, 6, step);
    if (!settled.current && uniforms.uArrival.value > 0.94) {
      settled.current = true;
      onSettled();
    }
  });

  return (
    <points frustumCulled={false} geometry={geometry}>
      <primitive ref={materialRef} object={material} attach="material" />
    </points>
  );
}

export type LivingParticleMarkProps = { progress?: number; onSettled?: () => void };

/** Static canonical identity, used only when WebGL is unavailable. */
function FallbackGlyph({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return (
    <svg
      className="mark-fallback"
      viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}
      aria-hidden="true"
      focusable="false"
    >
      {MARK_PATHS.map((path) => (
        <path key={path.id} d={path.d} />
      ))}
    </svg>
  );
}

export function LivingParticleMark({ progress = 0, onSettled }: LivingParticleMarkProps) {
  const host = useRef<HTMLDivElement>(null);
  const pointer = useRef(new THREE.Vector3(999, 999, 0));
  const hovering = useRef(0);
  const [quality, setQuality] = useState<QualityTier>('auto');
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [supported, setSupported] = useState<boolean | null>(null);
  const markSettled = useCallback(() => onSettled?.(), [onSettled]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    const detect = () => {
      try {
        const probe = document.createElement('canvas');
        setSupported(Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl')));
      } catch {
        setSupported(false);
      }
    };
    const restore = () => {
      const saved = localStorage.getItem('knoux-quality');
      if (saved && ['auto', 'high', 'balanced', 'low'].includes(saved)) setQuality(saved as QualityTier);
    };
    const onQuality = (event: Event) => setQuality((event as CustomEvent<QualityTier>).detail);
    const onVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(
      (entries) => setVisible((entries[0]?.isIntersecting ?? false) && !document.hidden),
      { threshold: 0.01 },
    );
    if (host.current) observer.observe(host.current);

    // WebGL support, the motion preference and the saved tier are all read from
    // the browser rather than from props, so the probe is deferred by a tick.
    const probe = window.setTimeout(() => {
      detect();
      sync();
      restore();
    }, 0);
    media.addEventListener('change', sync);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(probe);
      media.removeEventListener('change', sync);
      observer.disconnect();
      window.removeEventListener(qualityEvent, onQuality);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  const tier: Exclude<QualityTier, 'auto'> =
    quality === 'auto' ? (cores <= 4 ? 'low' : cores >= 12 ? 'high' : 'balanced') : quality;
  const budget = reduced ? BUDGETS.reduced : BUDGETS[tier];

  const move = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      // Stage pixels to world units, matching the fixed camera framing.
      const unit = VISIBLE_HEIGHT / bounds.height;
      pointer.current.set(
        ((event.clientX - bounds.left) / bounds.width - 0.5) * bounds.width * unit,
        (0.5 - (event.clientY - bounds.top) / bounds.height) * bounds.height * unit,
        0,
      );
      hovering.current = 1;
    },
    [reduced],
  );

  const release = useCallback(() => {
    hovering.current = 0;
    pointer.current.set(999, 999, 0);
  }, []);

  return (
    <div
      ref={host}
      className="mark-stage"
      role="img"
      aria-label="KNOuX Living Mark: the KNOuX symbol drawn in white particle light"
      onPointerMove={move}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {supported === false && (
        // Dignified static identity when WebGL is unavailable. The Canvas never
        // owns essential information, so the surrounding DOM stays complete, and
        // the wordmark must still resolve rather than waiting on an arrival
        // that will never happen.
        <FallbackGlyph onReady={markSettled} />
      )}
      {supported && (
        <Canvas
          className="mark-canvas"
          camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 100 }}
          dpr={tier === 'high' ? [1, 1.75] : [1, 1.25]}
          frameloop={visible ? (reduced ? 'demand' : 'always') : 'never'}
          gl={{ antialias: false, alpha: true, depth: false, stencil: false, powerPreference: tier === 'low' ? 'low-power' : 'high-performance' }}
        >
          <LivingParticleField
            budget={budget}
            progress={progress}
            reduced={reduced}
            pointer={pointer}
            hovering={hovering}
            onSettled={markSettled}
          />
        </Canvas>
      )}
    </div>
  );
}
