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
    id: 'identity', index: '01', label: 'LIVING MARK', title: 'Who we are',
    body: 'KNOuX is a digital headquarters. Eight divisions share one data model, one motion grammar and one engineering practice.',
  },
  {
    id: 'build', index: '02', label: 'WORKBENCH', title: 'What we build',
    body: 'Software, WordPress services, web systems, growth and creative disciplines are organised as connected capabilities, with solutions composed from those divisions.',
    href: '/build', action: 'Open the Composer',
  },
  {
    id: 'work', index: '03', label: 'ARCHIVE', title: 'Verified work',
    body: 'The Work archive holds KNOuX product and engineering records. Software claims are tied to repository evidence, with documented limits kept visible.',
    href: '/work', action: 'Read the Work archive',
  },
  {
    id: 'method', index: '04', label: 'SCHEMATIC', title: 'How we build',
    body: 'Audit the source, build to the evidence, verify the result, then ship. Claims stop where the available record stops.',
    href: '/engineering', action: 'Explore engineering',
  },
  {
    id: 'founder', index: '05', label: 'SIGNATURE', title: 'Founder',
    body: 'Sadek Elgazar — Founder & Software Developer, KNOuX.',
    href: '/contact', action: 'Contact KNOuX',
  },
];

const location: Record<AnchorId, [number, number, number]> = {
  identity: [0, 0, 0],
  build: [-4.1, -1.55, -1.35],
  work: [4.1, -1.55, -1.35],
  method: [-4.25, 1.6, -2.5],
  founder: [4.25, 1.6, -2.5],
};

function anchorPosition(id: AnchorId, mobile: boolean): [number, number, number] {
  const [x, y, z] = location[id];
  return mobile ? [x * 0.62, y * 0.75, z] : [x, y, z];
}

function Edge({ position, scale, violet = false }: { position: [number, number, number]; scale: [number, number, number]; violet?: boolean }) {
  return <mesh position={position} scale={scale}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={violet ? '#8e809e' : '#aaaab1'} metalness={0.12} roughness={0.74} /></mesh>;
}

function Artifact({ id, selected, hovered, mobile, onSelect, onHover }: {
  id: AnchorId;
  selected: boolean;
  hovered: boolean;
  mobile: boolean;
  onSelect: (id: AnchorId) => void;
  onHover: (id: AnchorId | null) => void;
}) {
  const active = selected || hovered;
  const handlers = {
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(id); },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(id); },
    onPointerOut: () => onHover(null),
  };
  const shell = active ? '#34323c' : '#1b1d21';
  const metal = active ? '#aea5bb' : '#595a61';
  const place = anchorPosition(id, mobile);
  const size = mobile ? 0.7 : 1;
  if (id === 'identity') {
    return <mesh position={[0, 0, 0.05]} {...handlers}><boxGeometry args={[mobile ? 1.8 : 2.45, mobile ? 3.8 : 5.1, 0.3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>;
  }
  if (id === 'build') {
    return <group position={place} scale={size} {...handlers}>
      <mesh position={[0, -0.55, 0]}><boxGeometry args={[3.0, 0.14, 1.35]} /><meshStandardMaterial color={shell} metalness={0.3} roughness={0.7} /></mesh>
      <mesh position={[0, 0.06, -0.38]} rotation={[-0.15, 0, 0]}><boxGeometry args={[2.45, 1.07, 0.1]} /><meshStandardMaterial color={shell} metalness={0.3} roughness={0.6} /></mesh>
      <Edge position={[0, 0.38, -0.31]} scale={[1.85, 0.018, 0.014]} violet />
      <Edge position={[-0.2, 0.06, -0.27]} scale={[1.45, 0.012, 0.014]} />
      <Edge position={[-0.47, -0.15, -0.22]} scale={[0.9, 0.012, 0.014]} />
      <mesh position={[0, -0.44, 0.65]}><boxGeometry args={[2.5, 0.28, 0.015]} /><meshStandardMaterial color={metal} metalness={0.7} roughness={0.35} /></mesh>
    </group>;
  }
  if (id === 'work') {
    return <group position={place} scale={size} {...handlers}>
      <mesh><boxGeometry args={[2.4, 1.7, 0.62]} /><meshStandardMaterial color={shell} metalness={0.2} roughness={0.75} /></mesh>
      {[-0.5, 0, 0.5].map((y) => <group key={y} position={[0, y, 0.32]}>
        <Edge position={[0, 0, 0]} scale={[2.1, 0.018, 0.018]} />
        <Edge position={[-0.82, 0.17, 0.005]} scale={[0.07, 0.07, 0.018]} violet />
        <Edge position={[-0.25, 0.17, 0.005]} scale={[0.7, 0.012, 0.018]} />
      </group>)}
    </group>;
  }
  if (id === 'method') {
    return <group position={place} scale={size} rotation={[0.04, 0.17, -0.04]} {...handlers}>
      <mesh><boxGeometry args={[2.55, 1.65, 0.09]} /><meshStandardMaterial color={shell} metalness={0.25} roughness={0.8} /></mesh>
      <Edge position={[-0.86, 0.55, 0.052]} scale={[0.52, 0.015, 0.01]} />
      <Edge position={[0.2, 0.55, 0.052]} scale={[1.34, 0.015, 0.01]} />
      <Edge position={[0.2, -0.55, 0.052]} scale={[1.34, 0.015, 0.01]} />
      {[-0.72, -0.23, 0.26, 0.75].map((x) => <group key={x}>
        <mesh position={[x, 0, 0.065]}><boxGeometry args={[0.21, 0.21, 0.012]} /><meshStandardMaterial color={metal} emissive={active ? '#352c40' : '#050505'} /></mesh>
        {x < 0.7 && <Edge position={[x + 0.25, 0, 0.063]} scale={[0.28, 0.012, 0.01]} violet />}
      </group>)}
    </group>;
  }
  return <group position={place} scale={size} {...handlers}>
    <mesh><boxGeometry args={[1.55, 2.25, 0.65]} /><meshStandardMaterial color={shell} metalness={0.37} roughness={0.68} /></mesh>
    <Edge position={[-0.45, 0.76, 0.34]} scale={[0.35, 0.02, 0.014]} violet />
    <Edge position={[0, 0.15, 0.34]} scale={[0.95, 0.015, 0.014]} />
    <Edge position={[-0.14, -0.08, 0.34]} scale={[0.68, 0.012, 0.014]} />
    <Edge position={[0, -0.72, 0.34]} scale={[0.95, 0.012, 0.014]} />
  </group>;
}

function Chamber({ phase, reduced, selected, onSelect, onReady, budget, mobile }: {
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
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const cameraTarget = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const keyLight = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  const side = useRef<THREE.DirectionalLight>(null);
  const violet = useRef<THREE.PointLight>(null);
  const select = useCallback((id: AnchorId) => { if (phase === 'ready') onSelect(id); }, [onSelect, phase]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    wake.current = THREE.MathUtils.damp(wake.current, phase === 'closed' ? 0 : 1, reduced ? 30 : 2.1, step);
    const amount = wake.current;
    // The mark emits the first useful light. Architecture fills come in after it.
    if (keyLight.current) keyLight.current.intensity = 9.5 * Math.pow(amount, 1.3);
    const architecture = Math.max(0, (amount - 0.25) / 0.75);
    if (fill.current) fill.current.intensity = 0.3 * architecture;
    if (side.current) side.current.intensity = 1.05 * architecture;
    if (violet.current) violet.current.intensity = 0.7 * Math.max(0, (amount - 0.55) / 0.45);
    if (phase === 'waking' && amount > 0.96 && !notified.current) { notified.current = true; onReady(); }

    const target = selected ? anchorPosition(selected, mobile) : [0, 0, 0] as [number, number, number];
    const travel = mobile ? 0.32 : 0.24;
    cameraTarget.current.set(target[0] * travel, target[1] * travel + (mobile ? 0 : 0.25), selected ? (mobile ? 12.4 : 11.4) : (mobile ? 12.8 : 13.2));
    camera.position.lerp(cameraTarget.current, reduced ? 1 : 1 - Math.exp(-2.8 * step));
    lookTarget.current.set(target[0] * (mobile ? 0.45 : 0.38), target[1] * 0.35, target[2] * 0.1);
    look.current.lerp(lookTarget.current, reduced ? 1 : 1 - Math.exp(-2.8 * step));
    camera.lookAt(look.current);
  });

  return <>
    <ambientLight ref={fill} intensity={0} />
    <pointLight ref={keyLight} position={[0, 0, 1.3]} color="#e7e3f0" intensity={0} distance={11} decay={2} />
    <directionalLight ref={side} position={[2, 5, 2]} color="#bfc1cd" intensity={0} />
    <pointLight ref={violet} position={[-4, 1.5, 0]} color="#80708d" intensity={0} distance={9} decay={2} />
    <group position={[0, 0, -3.8]}>
      <mesh position={[0, -3.85, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[17, 10]} /><meshStandardMaterial color="#111317" roughness={0.9} /></mesh>
      <mesh position={[0, 0, -2]}><planeGeometry args={[17, 8]} /><meshStandardMaterial color="#121417" roughness={1} /></mesh>
      <Edge position={[0, -2.85, 0.02]} scale={[13.7, 0.018, 0.02]} />
      <Edge position={[-6.85, 0, 0.02]} scale={[0.018, 5.7, 0.02]} />
      <Edge position={[6.85, 0, 0.02]} scale={[0.018, 5.7, 0.02]} />
      <Edge position={[0, 2.85, 0.02]} scale={[13.7, 0.018, 0.02]} />
      {!mobile && <>
        <Edge position={[-2.9, 0, -0.8]} scale={[0.016, 5.3, 0.016]} />
        <Edge position={[2.9, 0, -0.8]} scale={[0.016, 5.3, 0.016]} />
        <Edge position={[0, -2.3, -0.8]} scale={[5.8, 0.012, 0.016]} />
        <Edge position={[0, 2.3, -0.8]} scale={[5.8, 0.012, 0.016]} />
      </>}
    </group>
    <mesh position={[0, 0, -0.8]}><boxGeometry args={[mobile ? 2.5 : 3.35, mobile ? 4.2 : 5.65, 0.4]} /><meshStandardMaterial color="#282a30" metalness={0.32} roughness={0.78} /></mesh>
    <Edge position={[0, mobile ? 2.22 : 2.95, -0.5]} scale={[mobile ? 2.7 : 3.6, 0.018, 0.02]} />
    <Edge position={[0, mobile ? -2.22 : -2.95, -0.5]} scale={[mobile ? 2.7 : 3.6, 0.018, 0.02]} />
    <group scale={mobile ? 0.72 : 1}><LivingParticleField budget={budget} progress={0} reduced={reduced} pointer={pointer} hovering={hovering} onSettled={() => {}} awake={phase !== 'closed'} /></group>
    {anchors.map((anchor) => <Artifact key={anchor.id} id={anchor.id} mobile={mobile} selected={selected === anchor.id} hovered={hovered === anchor.id} onSelect={select} onHover={setHovered} />)}
  </>;
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
    const sync = () => { setReduced(motion.matches); setMobile(compact.matches); };
    const probe = window.setTimeout(() => {
      sync();
      try { const canvas = document.createElement('canvas'); setSupported(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))); }
      catch { setSupported(false); }
      const saved = localStorage.getItem('knoux-quality');
      if (saved && ['auto', 'high', 'balanced', 'low'].includes(saved)) setQuality(saved as QualityTier);
    }, 0);
    const onQuality = (event: Event) => setQuality((event as CustomEvent<QualityTier>).detail);
    const onVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting) && !document.hidden), { threshold: 0.01 });
    if (host.current) observer.observe(host.current);
    motion.addEventListener('change', sync);
    compact.addEventListener('change', sync);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearTimeout(probe); observer.disconnect(); motion.removeEventListener('change', sync); compact.removeEventListener('change', sync); window.removeEventListener(qualityEvent, onQuality); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [selected]);

  useEffect(() => {
    if (supported !== false || phase !== 'waking') return;
    const timer = window.setTimeout(() => setPhase('ready'), reduced ? 0 : 600);
    return () => window.clearTimeout(timer);
  }, [supported, phase, reduced]);

  const enter = () => setPhase('waking');
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  // The chamber adds lit geometry to the mark; AUTO therefore caps at balanced
  // even on many-core machines, since CPU count is not a reliable GPU signal.
  const tier = quality === 'auto' ? (cores <= 4 ? 'low' : 'balanced') : quality;
  const budget = reduced ? 5000 : mobile ? Math.min(tier === 'low' ? 6500 : 9000, 9000) : tier === 'high' ? 26000 : tier === 'balanced' ? 15000 : 6500;

  return <section ref={host} className={`origin-room origin-room--${phase}${selected ? ' origin-room--inspecting' : ''}${selected === 'work' || selected === 'founder' ? ' origin-room--focus-right' : ''}`} aria-labelledby="origin-title">
    <div className="origin-room__scene" aria-hidden="true">
      {supported && phase !== 'closed' && <Canvas
        camera={{ position: [0, 0, mobile ? 12.8 : 13.2], fov: 38, near: 0.1, far: 60 }}
        dpr={tier === 'high' && !mobile ? [1, 1.6] : [1, 1.25]}
    frameloop={visible ? (reduced && phase === 'ready' ? 'demand' : 'always') : 'never'}
        gl={{ antialias: false, alpha: false, powerPreference: tier === 'low' ? 'low-power' : 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor('#050607'); }}
      >
        <Chamber phase={phase} reduced={reduced} selected={selected} onSelect={setSelected} onReady={() => setPhase('ready')} budget={budget} mobile={mobile} />
      </Canvas>}
      {supported === false && <svg className="origin-room__fallback-mark" viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} focusable="false">{MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}</svg>}
    </div>
    <div className="origin-room__top"><span>INSTITUTION / 001</span><span>THE KNOuX ORIGIN ROOM</span></div>
    {phase === 'closed' ? <div className="origin-room__entry">
      <span className="origin-room__signal" aria-hidden="true" />
      <p className="origin-room__kicker">KNOuX / INSTITUTION</p>
      <h1 id="origin-title">The Origin Room<span>.</span></h1>
      <p className="origin-room__statement">Built, not claimed.</p>
      <div className="origin-room__entry-actions"><button type="button" onClick={enter}>ENTER KNOuX <span aria-hidden="true">↗</span></button><a href="#about-point-of-view">CONTINUE TO ABOUT ↓</a></div>
    </div> : <>
      <div className="origin-room__heading"><span>ABOUT / KNOuX</span><h1 id="origin-title">The Origin Room<span>.</span></h1></div>
      {phase === 'ready' && <>
        <div className="origin-room__anchors" role="group" aria-label="Inspect the institution">
          {anchors.map((anchor) => <button key={anchor.id} type="button" aria-pressed={selected === anchor.id} onClick={() => setSelected(anchor.id)}><span>{anchor.index} / {anchor.label}</span><strong>{anchor.title}</strong></button>)}
        </div>
        {selectedAnchor && <aside className="origin-room__panel" aria-label={`${selectedAnchor.title} details`}>
          <div className="origin-room__panel-meta"><span>{selectedAnchor.index} / {selectedAnchor.label}</span><button type="button" onClick={() => setSelected(null)} aria-label="Return to room">×</button></div>
          <h2>{selectedAnchor.title}</h2><p>{selectedAnchor.body}</p>
          {selectedAnchor.href && <Link href={selectedAnchor.href}>{selectedAnchor.action} ↗</Link>}
          <button className="origin-room__return" type="button" onClick={() => setSelected(null)}>← RETURN TO ROOM</button>
        </aside>}
      </>}
    </>}
    <div className="origin-room__bottom"><span>{phase === 'ready' ? 'SELECT A RECORD TO INSPECT' : phase === 'waking' ? 'ESTABLISHING THE ROOM' : 'A KNOuX INSTITUTIONAL SPACE'}</span><a href="#about-point-of-view">EXPLORE BELOW ↓</a></div>
  </section>;
}
