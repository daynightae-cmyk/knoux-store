'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const PARTICLE = { count: 28000, mobileCount: 14000, size: 1.6, sizeVariation: 2.4, repelRadius: 5.5, force: 1.9, friction: 0.84, returnSpeed: 0.10, turbulence: 0.20, driftSpeed: 0.70, sceneScale: 0.91, color: '#d8d4d4', morphDuration: 0.55, seed: 40 };

function random(seed: number) { let value = seed; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }

function sampleText(word: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 360;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [] as [number, number][];
  context.fillStyle = '#fff'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `900 ${word === 'DEV' ? 300 : 260}px Arial, Helvetica, sans-serif`;
  context.fillText(word, 600, 180);
  const pixels = context.getImageData(0, 0, 1200, 360).data;
  const points: [number, number][] = [];
  for (let y = 5; y < 355; y += 3) for (let x = 5; x < 1195; x += 3) if (pixels[(y * 1200 + x) * 4 + 3] > 90) points.push([(x - 600) / 60, (180 - y) / 60]);
  return points;
}

function ParticleText({ morph, visible, reduced }: { morph: boolean; visible: boolean; reduced: boolean }) {
  const { size, pointer } = useThree();
  const points = useRef<THREE.Points>(null);
  const count = size.width < 700 ? PARTICLE.mobileCount : PARTICLE.count;
  const data = useMemo(() => {
    const from = sampleText('KNOuX');
    const to = sampleText('DEV');
    const rand = random(PARTICLE.seed);
    const positions = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const ends = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      if (i >= count * .88) {
        const x = (rand() - .5) * 31;
        const y = (rand() - .5) * 8;
        starts[i * 3] = x; starts[i * 3 + 1] = y; starts[i * 3 + 2] = (rand() - .5) * 3;
        ends.set(starts.subarray(i * 3, i * 3 + 3), i * 3);
        positions.set(starts.subarray(i * 3, i * 3 + 3), i * 3);
        continue;
      }
      const a = from[Math.floor(rand() * from.length)] ?? [0, 0];
      const b = to[Math.floor(rand() * to.length)] ?? [0, 0];
      const jitter = (rand() - .5) * .17;
      starts[i * 3] = a[0] + jitter; starts[i * 3 + 1] = a[1] + (rand() - .5) * .15; starts[i * 3 + 2] = (rand() - .5) * 1.5;
      ends[i * 3] = b[0] + (rand() - .5) * .17; ends[i * 3 + 1] = b[1] + (rand() - .5) * .15; ends[i * 3 + 2] = (rand() - .5) * 1.5;
      positions.set(starts.subarray(i * 3, i * 3 + 3), i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry, positions, starts, ends, velocities };
  }, [count]);
  const progress = useRef(0);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => () => data.geometry.dispose(), [data]);
  useFrame((_, delta) => {
    if (!visible || reduced) return;
    const step = Math.min(delta, .05);
    const target = morph ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, step / PARTICLE.morphDuration * 4);
    const { positions, starts, ends, velocities, geometry } = dataRef.current;
    const px = pointer.x * (size.width / 75);
    const py = pointer.y * (size.height / 75);
    for (let i = 0; i < positions.length; i += 3) {
      const homeX = starts[i] + (ends[i] - starts[i]) * progress.current;
      const homeY = starts[i + 1] + (ends[i + 1] - starts[i + 1]) * progress.current;
      const dx = positions[i] - px; const dy = positions[i + 1] - py;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const repel = distance < PARTICLE.repelRadius ? (1 - distance / PARTICLE.repelRadius) * PARTICLE.force * step : 0;
      velocities[i] = (velocities[i] + (homeX - positions[i]) * PARTICLE.returnSpeed + dx / distance * repel) * PARTICLE.friction;
      velocities[i + 1] = (velocities[i + 1] + (homeY - positions[i + 1]) * PARTICLE.returnSpeed + dy / distance * repel) * PARTICLE.friction;
      positions[i] += velocities[i]; positions[i + 1] += velocities[i + 1];
    }
    geometry.attributes.position.needsUpdate = true;
    if (points.current) points.current.rotation.y = Math.sin(performance.now() * .0002 * PARTICLE.driftSpeed) * .018;
  });
  const scale = Math.min(1, size.width / 950) * PARTICLE.sceneScale;
  return <points ref={points} geometry={data.geometry} scale={scale} aria-hidden="true"><pointsMaterial color={PARTICLE.color} size={PARTICLE.size} sizeAttenuation={false} transparent opacity={.91} depthWrite={false} /></points>;
}

export function KnouxDevParticleHero() {
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const element = document.getElementById('dev-particle-hero');
    if (!element) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden));
    const onVisibility = () => { const rect = element.getBoundingClientRect(); setVisible(!document.hidden && rect.bottom > 0 && rect.top < window.innerHeight); };
    updateMotion(); observer.observe(element); media.addEventListener('change', updateMotion); document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); media.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  return <section id="dev-particle-hero" className="dev-hero" onPointerEnter={() => setHover(window.innerWidth >= 700)} onPointerLeave={() => setHover(false)} aria-label="KNOuX DEV">
    <div className="dev-hero__micro"><span>KN / DEV — 001</span><span>DIGITAL HEADQUARTERS</span><span>SCROLL TO EXPLORE ↓</span></div>
    <div className="dev-hero__canvas" aria-hidden="true"><Canvas orthographic camera={{ position: [0, 0, 30], zoom: 50 }} dpr={[1, typeof window !== 'undefined' && window.innerWidth < 700 ? 1.5 : 2]} frameloop={visible && !reduced ? 'always' : 'demand'} gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}><ParticleText morph={hover} visible={visible} reduced={reduced} /></Canvas></div>
    <div className="dev-hero__word" aria-hidden="true">KNOuX <span>DEV</span></div>
    <div className="dev-hero__bottom"><div>CREATE. <span>RUN.</span> PREVIEW. <span>DEPLOY.</span></div><p>Build applications, services, previews, knowledge and tools in one connected workspace.</p></div>
  </section>;
}
