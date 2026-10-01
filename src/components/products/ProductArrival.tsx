'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { visualProfileFor, resolveProductLogo } from '@/data/product-visuals';
import type { SoftwareProduct } from '@/data/software';

const STAGE_DURATION = 900;
const TOTAL_STAGES = 5;

function slugToSeed(slug: string): number {
  let hash = 0x4b4e4f58;
  for (let i = 0; i < slug.length; i++) {
    hash = Math.imul(hash ^ slug.charCodeAt(i), 0x51ed);
  }
  return hash >>> 0;
}

/** Simple seeded LCG pseudo-random generator. */
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

interface ProductArrivalProps {
  product: SoftwareProduct;
  onComplete: () => void;
}

export function ProductArrival({ product, onComplete }: ProductArrivalProps) {
  const profile = visualProfileFor(product.slug);
  const logoPath = resolveProductLogo(product.slug);
  const seed = slugToSeed(product.slug);
  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);
  const reducedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* --- cleanup on unmount ------------------------------------------ */
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* --- staged deterministic reveal --------------------------------- */
  useEffect(() => {
    if (reducedRef.current) {
      stageRef.current = TOTAL_STAGES;
      setStage(TOTAL_STAGES);
      onComplete();
      return;
    }

    const advanceStage = (nextStage: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stageRef.current = nextStage;
      setStage(nextStage);
      if (nextStage >= TOTAL_STAGES) {
        onComplete();
        return;
      }
      const duration = STAGE_DURATION * (nextStage === 0 ? 1.2 : 1);
      timerRef.current = setTimeout(() => advanceStage(nextStage + 1), duration);
    };

    timerRef.current = setTimeout(() => advanceStage(1), STAGE_DURATION * 1.2);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [product.slug, onComplete]);

  /* --- ambient particle field (canvas) ----------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PARTICLE_COUNT = 60;
    const rand = makePrng(seed);

    type Particle = { x: number; y: number; r: number; opacity: number; speed: number };
    let particles: Particle[] = [];
    let raf: number;
    let mounted = true;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: rand() * canvas.width,
        y: rand() * canvas.height,
        r: 0.5 + rand() * 1.5,
        opacity: 0.04 + rand() * 0.1,
        speed: 0.08 + rand() * 0.14,
      }));
    };
    initParticles();

    const draw = () => {
      if (!mounted) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(161,138,203,${p.opacity})`;
        ctx.fill();
        // Drift upward slowly and wrap
        p.y -= p.speed;
        if (p.y < -4) p.y = canvas.height + 4;
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      resize();
      initParticles();
    });
    ro.observe(canvas);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seed]);

  const stages = [
    { label: 'KNOuX', sub: 'Institutional field' },
    { label: profile?.loaderVerb ?? 'Resolving product workspace', sub: product.family },
    { label: product.shortName, sub: `Code ${product.code}` },
    { label: product.name, sub: profile?.sceneLabel ?? 'Product scene assembling' },
    { label: 'Ready', sub: 'Transitioning to product hero' },
  ];

  const currentStage = stages[Math.min(stage, stages.length - 1)];

  return (
    <div
      className="product-arrival"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${product.name} product page`}
      style={{ '--arrival-seed': seed.toString() } as React.CSSProperties}
    >
      <div className="product-arrival__field" aria-hidden="true">
        <canvas ref={canvasRef} className="product-arrival__canvas" />
      </div>

      <div className="product-arrival__copy">
        {logoPath && (
          <Image
            className="product-arrival__logo"
            src={logoPath}
            alt={`${product.name} logo`}
            aria-hidden="true"
            width={48}
            height={48}
            unoptimized
          />
        )}
        {!logoPath && (
          <svg
            className="product-arrival__mark"
            viewBox="0 0 312 532"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M 5 39 L 1 53 L 1 73 L 4 85 L 10 97 L 17 106 L 73 157 L 124 106 L 135 99 L 149 94 L 171 93 L 186 97 L 198 103 L 212 116 L 105 17 L 96 10 L 86 5 L 71 1 L 55 1 L 37 6 L 24 14 L 14 24 Z" />
            <path d="M 200 104 L 199 105 L 187 98 L 172 94 L 154 94 L 139 98 L 125 106 L 20 211 L 9 228 L 5 242 L 4 254 L 5 264 L 9 277 L 17 291 L 28 302 L 41 310 L 59 315 L 80 314 L 100 306 L 108 300 L 210 198 L 218 187 L 222 178 L 225 167 L 226 152 L 224 140 L 217 123 L 213 119 L 213 117 L 200 106 Z" />
            <path d="M 242 210 L 241 211 L 233 213 L 229 216 L 224 218 L 219 223 L 218 223 L 210 232 L 209 235 L 207 237 L 204 243 L 203 249 L 201 253 L 201 262 L 201 263 L 201 265 L 201 275 L 202 276 L 204 284 L 209 294 L 212 297 L 212 298 L 225 310 L 230 312 L 234 315 L 237 315 L 244 318 L 251 318 L 252 319 L 267 318 L 274 315 L 277 315 L 279 313 L 286 310 L 289 307 L 290 307 L 302 294 L 307 284 L 307 282 L 309 278 L 309 275 L 310 274 L 310 265 L 310 264 L 310 262 L 310 254 L 309 253 L 309 250 L 307 246 L 307 243 L 305 239 L 303 237 L 301 232 L 296 227 L 296 226 L 287 218 L 280 215 L 278 213 L 276 213 L 269 210 L 265 210 L 264 209 L 247 209 L 246 210 Z" />
            <path d="M 204 325 L 186 314 L 169 310 L 150 311 L 130 319 L 123 324 L 19 428 L 9 444 L 5 458 L 4 470 L 5 480 L 9 493 L 18 508 L 28 518 L 39 525 L 60 531 L 80 530 L 100 522 L 109 515 L 209 415 L 216 406 L 223 391 L 225 382 L 225 363 L 219 344 L 211 332 Z" />
          </svg>
        )}
        <div className="product-arrival__verb">{currentStage.label}</div>
        <div className="product-arrival__sub">{currentStage.sub}</div>
      </div>
    </div>
  );
}
