'use client';

import Link from 'next/link';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LivingParticleField } from '@/components/three/LivingParticleMark';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

type AnchorId = 'identity' | 'build' | 'work' | 'method' | 'founder';
type Phase = 'closed' | 'waking' | 'ready';

const anchors: ReadonlyArray<{
  id: AnchorId;
  index: string;
  label: string;
  title: string;
  body: string;
  href?: string;
  action?: string;
}> = [
  {
    id: 'identity',
    index: '01',
    label: 'LIVING MARK',
    title: 'Who we are',
    body: 'KNOuX is a digital headquarters. Eight divisions share one data model, one motion grammar and one engineering practice.',
  },
  {
    id: 'build',
    index: '02',
    label: 'WORKBENCH',
    title: 'What we build',
    body: 'Software, WordPress services, web systems, growth and creative disciplines are organised as connected capabilities, with solutions composed from those divisions.',
    href: '/build',
    action: 'Open the Composer',
  },
  {
    id: 'work',
    index: '03',
    label: 'ARCHIVE',
    title: 'Verified work',
    body: 'The Work archive holds KNOuX product and engineering records. Software claims are tied to repository evidence, with documented limits kept visible.',
    href: '/work',
    action: 'Read the Work archive',
  },
  {
    id: 'method',
    index: '04',
    label: 'SCHEMATIC',
    title: 'How we build',
    body: 'Audit the source, build to the evidence, verify the result, then ship. Claims stop where the available record stops.',
    href: '/engineering',
    action: 'Explore engineering',
  },
  {
    id: 'founder',
    index: '05',
    label: 'SIGNATURE',
    title: 'Founder',
    body: 'Sadek Elgazar — Founder & Software Developer, KNOuX.',
    href: '/contact',
    action: 'Contact KNOuX',
  },
];

const positions: Record<AnchorId, [number, number, number]> = {
  identity: [0.85, -0.05, -1.7],
  build: [-2.55, -1.2, -1.05],
  work: [3.55, -0.65, -2.8],
  method: [-4.15, 1.15, -4.95],
  founder: [4.15, 1.2, -4.9],
};

const hitSizes: Record<AnchorId, [number, number, number]> = {
  identity: [2.4, 4.8, 1.2],
  build: [4.0, 2.7, 2.2],
  work: [3.1, 4.1, 1.2],
  method: [2.9, 2.0, 0.7],
  founder: [2.1, 2.8, 0.7],
};

function anchorPosition(id: AnchorId, mobile: boolean): [number, number, number] {
  const [x, y, z] = positions[id];
  if (!mobile) return [x, y, z];
  return [x * 0.58, y * 0.76, z + 0.2];
}

function Line({
  position,
  scale,
  violet = false,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  violet?: boolean;
}) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={violet ? '#84758f' : '#5e6068'}
        emissive={violet ? '#1c1622' : '#000000'}
        metalness={0.16}
        roughness={0.74}
      />
    </mesh>
  );
}

function ReferenceLamp({
  mobile,
  bulb,
}: {
  mobile: boolean;
  bulb: React.RefObject<THREE.MeshStandardMaterial | null>;
}) {
  const scale = mobile ? 0.82 : 1.14;
  return (
    <group position={mobile ? [-1.75, -1.78, -0.9] : [-2.65, -1.47, -1.0]} scale={scale}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.08, 24]} />
        <meshStandardMaterial color="#35363c" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 0.08, 20]} />
        <meshStandardMaterial color="#8c8e96" metalness={0.82} roughness={0.23} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.78, 12]} />
        <meshStandardMaterial color="#777a83" metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <sphereGeometry args={[0.07, 14, 10]} />
        <meshStandardMaterial color="#9b9da6" metalness={0.72} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.42, 12]} />
        <meshStandardMaterial color="#777a83" metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <cylinderGeometry args={[0.19, 0.46, 0.5, 32, 1, true]} />
        <meshStandardMaterial color="#d8d6dc" side={THREE.DoubleSide} roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.012, 8, 32]} />
        <meshStandardMaterial color="#8b8d94" metalness={0.5} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial
          ref={bulb}
          color="#d9d5df"
          emissive="#eeeaf4"
          emissiveIntensity={0}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, 0.68, 0]} rotation={[0, 0, 0]} scale={[1, 1.8, 1]}>
        <coneGeometry args={[0.6, 1.5, 28, 1, true]} />
        <meshBasicMaterial
          color="#d9d3e4"
          transparent
          opacity={0.018}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function RoomArchitecture({ mobile }: { mobile: boolean }) {
  const tableX = mobile ? -1.7 : -2.55;
  return (
    <group>
      <mesh position={[0, -2.75, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial color="#090a0c" roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.35, -5.55]}>
        <planeGeometry args={[18, 8.2]} />
        <meshStandardMaterial color="#08090b" roughness={1} />
      </mesh>
      {!mobile && (
        <>
          <mesh position={[-7.1, 0, -1.6]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[8, 7.2]} />
            <meshStandardMaterial color="#07080a" roughness={1} />
          </mesh>
          <mesh position={[7.1, 0, -1.6]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[8, 7.2]} />
            <meshStandardMaterial color="#07080a" roughness={1} />
          </mesh>
        </>
      )}

      <group position={[tableX, 0, -1.15]}>
        <mesh position={[0, -1.55, 0]}>
          <boxGeometry args={[mobile ? 2.9 : 3.7, 0.15, 1.48]} />
          <meshStandardMaterial color="#343740" emissive="#0b0c10" emissiveIntensity={0.34} metalness={0.34} roughness={0.64} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={String(sx) + String(sz)}
              position={[sx * (mobile ? 1.15 : 1.55), -2.15, sz * 0.5]}
            >
              <boxGeometry args={[0.08, 1.2, 0.08]} />
              <meshStandardMaterial color="#3e4148" metalness={0.55} roughness={0.5} />
            </mesh>
          )),
        )}
        <Line position={[0, -1.45, 0.73]} scale={[mobile ? 2.3 : 3.0, 0.018, 0.02]} violet />
      </group>

      <group position={mobile ? [2.2, -0.72, -3.05] : [3.55, -0.72, -3.05]}>
        <mesh>
          <boxGeometry args={[mobile ? 2.0 : 2.65, 3.45, 0.62]} />
          <meshStandardMaterial color="#292c34" emissive="#0b0c10" emissiveIntensity={0.28} metalness={0.16} roughness={0.78} />
        </mesh>
        {[-1.05, -0.35, 0.35, 1.05].map((y, index) => (
          <group key={y} position={[0, y, 0.33]}>
            <Line position={[0, 0, 0]} scale={[mobile ? 1.7 : 2.3, 0.018, 0.02]} />
            <Line position={[-0.72, 0.17, 0.01]} scale={[0.08, 0.08, 0.02]} violet={index === 1} />
            <Line position={[-0.2, 0.17, 0.01]} scale={[0.72, 0.012, 0.018]} />
          </group>
        ))}
      </group>

      {!mobile && (
        <>
          <group position={[-4.15, 1.15, -5.1]}>
            <mesh>
              <boxGeometry args={[2.65, 1.72, 0.1]} />
              <meshStandardMaterial color="#272a31" emissive="#090a0d" emissiveIntensity={0.25} roughness={0.84} metalness={0.14} />
            </mesh>
            <Line position={[-0.82, 0.52, 0.06]} scale={[0.58, 0.016, 0.012]} />
            <Line position={[0.25, 0.52, 0.06]} scale={[1.2, 0.016, 0.012]} violet />
            <Line position={[0.15, -0.52, 0.06]} scale={[1.4, 0.014, 0.012]} />
            {[-0.68, -0.2, 0.28, 0.76].map((x) => (
              <mesh key={x} position={[x, -0.02, 0.07]}>
                <boxGeometry args={[0.16, 0.16, 0.02]} />
                <meshStandardMaterial color="#6f6678" emissive="#17131b" />
              </mesh>
            ))}
          </group>
          <group position={[4.15, 1.2, -5.05]}>
            <mesh>
              <boxGeometry args={[1.75, 2.35, 0.11]} />
              <meshStandardMaterial color="#272a31" emissive="#090a0d" emissiveIntensity={0.25} roughness={0.86} metalness={0.16} />
            </mesh>
            <Line position={[-0.48, 0.82, 0.065]} scale={[0.38, 0.02, 0.012]} violet />
            <Line position={[0, 0.25, 0.065]} scale={[1.05, 0.014, 0.012]} />
            <Line position={[-0.15, -0.05, 0.065]} scale={[0.72, 0.012, 0.012]} />
            <Line position={[0, -0.8, 0.065]} scale={[1.05, 0.012, 0.012]} />
          </group>
        </>
      )}

      <mesh position={[0.85, -2.48, -1.75]}>
        <cylinderGeometry args={[0.82, 0.95, 0.16, 40]} />
        <meshStandardMaterial color="#15171b" metalness={0.48} roughness={0.52} />
      </mesh>
    </group>
  );
}

function AnchorTarget({
  id,
  selected,
  hovered,
  mobile,
  onSelect,
  onHover,
}: {
  id: AnchorId;
  selected: boolean;
  hovered: boolean;
  mobile: boolean;
  onSelect: (id: AnchorId) => void;
  onHover: (id: AnchorId | null) => void;
}) {
  const active = selected || hovered;
  const position = anchorPosition(id, mobile);
  const size = hitSizes[id];
  return (
    <group position={position}>
      <mesh
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(id);
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[size[0] * (mobile ? 0.72 : 1), size[1] * (mobile ? 0.82 : 1), size[2]]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, -size[1] * 0.36, 0.5]} visible={active}>
        <ringGeometry args={[0.1, 0.15, 24]} />
        <meshBasicMaterial
          color="#b6a9c4"
          transparent
          opacity={selected ? 0.92 : 0.58}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Chamber({
  phase,
  reduced,
  selected,
  onSelect,
  onReady,
  budget,
  mobile,
}: {
  phase: Phase;
  reduced: boolean;
  selected: AnchorId | null;
  onSelect: (id: AnchorId) => void;
  onReady: () => void;
  budget: number;
  mobile: boolean;
}) {
  const { camera } = useThree();
  const [hovered, setHovered] = useState<AnchorId | null>(null);
  const pointer = useRef(new THREE.Vector3(999, 999, 0));
  const hovering = useRef(0);
  const wake = useRef(0);
  const notified = useRef(false);
  const look = useRef(new THREE.Vector3(0, -0.15, -1.8));
  const cameraTarget = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const lampLight = useRef<THREE.PointLight>(null);
  const markFill = useRef<THREE.PointLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const coolFill = useRef<THREE.DirectionalLight>(null);
  const bulb = useRef<THREE.MeshStandardMaterial>(null);

  const select = useCallback(
    (id: AnchorId) => {
      if (phase === 'ready') onSelect(id);
    },
    [onSelect, phase],
  );

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    const targetWake = phase === 'closed' ? 0 : 1;
    wake.current = THREE.MathUtils.damp(wake.current, targetWake, reduced ? 35 : 2.35, step);
    const amount = wake.current;
    const architecture = THREE.MathUtils.smoothstep(amount, 0.18, 1);
    const markStage = THREE.MathUtils.smoothstep(amount, 0.22, 1);

    if (lampLight.current) lampLight.current.intensity = 7.2 * Math.pow(amount, 1.45);
    if (ambient.current) ambient.current.intensity = 0.01 + 0.22 * architecture;
    if (coolFill.current) coolFill.current.intensity = 0.05 + 0.72 * architecture;
    if (markFill.current) markFill.current.intensity = 0.42 * markStage;
    if (bulb.current) bulb.current.emissiveIntensity = 0.02 + 4.8 * amount;

    if (phase === 'waking' && amount > 0.965 && !notified.current) {
      notified.current = true;
      onReady();
    }

    if (phase === 'closed') notified.current = false;

    const focus = selected ? anchorPosition(selected, mobile) : ([0.45, -0.15, -1.8] as [number, number, number]);
    const xTravel = mobile ? 0.18 : 0.22;
    cameraTarget.current.set(
      focus[0] * xTravel,
      0.45 + focus[1] * 0.12,
      selected ? (mobile ? 11.6 : 10.7) : (mobile ? 12.2 : 11.6),
    );
    camera.position.lerp(cameraTarget.current, reduced ? 1 : 1 - Math.exp(-2.4 * step));
    lookTarget.current.set(
      focus[0] * (mobile ? 0.28 : 0.34),
      focus[1] * 0.2 - 0.1,
      focus[2] * 0.28,
    );
    look.current.lerp(lookTarget.current, reduced ? 1 : 1 - Math.exp(-2.6 * step));
    camera.lookAt(look.current);
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.008} />
      <pointLight
        ref={lampLight}
        position={mobile ? [-1.75, -0.5, -0.7] : [-2.65, -0.15, -0.8]}
        color="#ece9f2"
        intensity={0}
        distance={7.4}
        decay={2}
        castShadow={!mobile}
      />
      <directionalLight
        ref={coolFill}
        position={[4.2, 5.5, 5]}
        color="#c5c8d2"
        intensity={0.04}
      />
      <pointLight
        ref={markFill}
        position={[1.1, 0.25, -0.7]}
        color="#88799a"
        intensity={0}
        distance={5.5}
        decay={2}
      />

      <RoomArchitecture mobile={mobile} />
      <ReferenceLamp mobile={mobile} bulb={bulb} />

      <group position={mobile ? [0.5, -0.08, -1.7] : [0.85, -0.08, -1.7]} scale={mobile ? 0.5 : 0.64}>
        <LivingParticleField
          budget={budget}
          progress={0}
          reduced={reduced}
          pointer={pointer}
          hovering={hovering}
          onSettled={() => {}}
          awake={phase !== 'closed'}
        />
      </group>

      {anchors.map((anchor) => (
        <AnchorTarget
          key={anchor.id}
          id={anchor.id}
          mobile={mobile}
          selected={selected === anchor.id}
          hovered={hovered === anchor.id}
          onSelect={select}
          onHover={setHovered}
        />
      ))}
    </>
  );
}

export function AboutOriginRoom() {
  const host = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const [selected, setSelected] = useState<AnchorId | null>(null);
  const [reduced, setReduced] = useState(false);
  const [quality, setQuality] = useState<QualityTier>('auto');
  const [supported, setSupported] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [mobile, setMobile] = useState(false);
  const selectedAnchor = anchors.find((anchor) => anchor.id === selected);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px)');
    const sync = () => {
      setReduced(motion.matches);
      setMobile(compact.matches);
    };
    const probe = window.setTimeout(() => {
      sync();
      try {
        const canvas = document.createElement('canvas');
        setSupported(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
      } catch {
        setSupported(false);
      }
      const saved = localStorage.getItem('knoux-quality');
      if (saved && ['auto', 'high', 'balanced', 'low'].includes(saved)) setQuality(saved as QualityTier);
    }, 0);
    const onQuality = (event: Event) => setQuality((event as CustomEvent<QualityTier>).detail);
    const onVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting) && !document.hidden),
      { threshold: 0.01 },
    );
    if (host.current) observer.observe(host.current);
    motion.addEventListener('change', sync);
    compact.addEventListener('change', sync);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(probe);
      observer.disconnect();
      motion.removeEventListener('change', sync);
      compact.removeEventListener('change', sync);
      window.removeEventListener(qualityEvent, onQuality);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [selected]);

  useEffect(() => {
    if (supported !== false || phase !== 'waking') return;
    const timer = window.setTimeout(() => setPhase('ready'), reduced ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [supported, phase, reduced]);

  const enter = () => {
    setSelected(null);
    setPhase('waking');
  };

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  const tier = quality === 'auto' ? (cores <= 4 ? 'low' : 'balanced') : quality;
  const budget = reduced
    ? 5000
    : mobile
      ? Math.min(tier === 'low' ? 6500 : 9000, 9000)
      : tier === 'high'
        ? 26000
        : tier === 'balanced'
          ? 15000
          : 6500;

  const classes = [
    'origin-room',
    'origin-room--' + phase,
    selected ? 'origin-room--inspecting' : '',
    selected === 'work' || selected === 'founder' ? 'origin-room--focus-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section ref={host} className={classes} aria-labelledby="origin-title">
      <div className="origin-room__scene" aria-hidden="true">
        {supported && (
          <Canvas
            camera={{ position: [0.3, 0.45, mobile ? 12.2 : 11.6], fov: 42, near: 0.1, far: 80 }}
            dpr={tier === 'high' && !mobile ? [1, 1.5] : [1, 1.2]}
            frameloop={visible ? (reduced && phase === 'ready' ? 'demand' : 'always') : 'never'}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: tier === 'low' ? 'low-power' : 'high-performance',
            }}
            onCreated={({ gl }) => gl.setClearColor('#030405')}
            onPointerMissed={() => setSelected(null)}
          >
            <Chamber
              phase={phase}
              reduced={reduced}
              selected={selected}
              onSelect={setSelected}
              onReady={() => setPhase('ready')}
              budget={budget}
              mobile={mobile}
            />
          </Canvas>
        )}
        {supported === false && (
          <svg
            className="origin-room__fallback-mark"
            viewBox={'0 0 ' + MARK_VIEW_BOX.width + ' ' + MARK_VIEW_BOX.height}
            focusable="false"
          >
            {MARK_PATHS.map((path) => (
              <path key={path.id} d={path.d} />
            ))}
          </svg>
        )}
      </div>

      <div className="origin-room__hud">
        <span>INSTITUTION / 001</span>
        <span>LIGHT / EVIDENCE / PRACTICE</span>
      </div>

      {phase === 'closed' ? (
        <div className="origin-room__entry">
          <span className="origin-room__signal" aria-hidden="true" />
          <p className="origin-room__kicker">KNOuX / INSTITUTION</p>
          <h1 id="origin-title">
            The Origin Room<span>.</span>
          </h1>
          <p className="origin-room__statement">
            Enter the room. The lamp wakes first. The institution follows.
          </p>
          <div className="origin-room__entry-actions">
            <button type="button" onClick={enter}>
              ENTER KNOuX <span aria-hidden="true">↗</span>
            </button>
            <a href="#about-point-of-view">CONTINUE TO ABOUT ↓</a>
          </div>
        </div>
      ) : (
        <>
          <div className="origin-room__heading">
            <span>ABOUT / KNOuX</span>
            <h1 id="origin-title">
              The Origin Room<span>.</span>
            </h1>
            <p>Five records. One institution. Select an object to inspect the evidence behind it.</p>
          </div>

          {phase === 'ready' && (
            <>
              <div className="origin-room__anchors" role="group" aria-label="Inspect the institution">
                {anchors.map((anchor) => (
                  <button
                    key={anchor.id}
                    type="button"
                    aria-pressed={selected === anchor.id}
                    onClick={() => setSelected(anchor.id)}
                  >
                    <span>
                      {anchor.index} / {anchor.label}
                    </span>
                    <strong>{anchor.title}</strong>
                  </button>
                ))}
              </div>

              {selectedAnchor && (
                <aside className="origin-room__panel" aria-label={selectedAnchor.title + ' details'}>
                  <div className="origin-room__panel-meta">
                    <span>
                      {selectedAnchor.index} / {selectedAnchor.label}
                    </span>
                    <button type="button" onClick={() => setSelected(null)} aria-label="Return to room">
                      ×
                    </button>
                  </div>
                  <h2>{selectedAnchor.title}</h2>
                  <p>{selectedAnchor.body}</p>
                  {selectedAnchor.href && (
                    <Link href={selectedAnchor.href}>
                      {selectedAnchor.action} <span aria-hidden="true">↗</span>
                    </Link>
                  )}
                  <button className="origin-room__return" type="button" onClick={() => setSelected(null)}>
                    ← RETURN TO ROOM
                  </button>
                </aside>
              )}
            </>
          )}
        </>
      )}

      <div className="origin-room__bottom">
        <span>
          {phase === 'ready'
            ? 'SELECT A RECORD TO INSPECT'
            : phase === 'waking'
              ? 'LIGHTING THE ROOM'
              : 'A KNOuX INSTITUTIONAL SPACE'}
        </span>
        <a href="#about-point-of-view">EXPLORE THE INSTITUTION ↓</a>
      </div>
    </section>
  );
}
