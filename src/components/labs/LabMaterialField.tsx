'use client';

/**
 * LabMaterialField — KNOuX Labs / Science Lab SDF Dot-Matrix Instrument
 *
 * Implements the computational visualization mechanics extracted from
 * the authorized reference 02-science-lab-sdf-dot-matrix:
 *   - Procedural Signed Distance Field (SDF) raymarching in raw Three.js
 *   - Monochrome precision dot-matrix rasterization with subtle scanlines
 *   - LAB-01 (KNOuX Quill): Generative / linguistic flow, layered folds, converging streams
 *   - LAB-02 (KNOuX Crypt): Encrypted core, hollow shielding shells, rotating key boundaries
 *   - Interactive pointer influence with smooth damping (zero React state updates on pointermove)
 *   - Pressure / click expansion of influence sphere
 *   - Adaptive GPU quality tiers (low / mid / high) with DPR cap (<= 1.5)
 *   - Robust WebGL fallback to Canvas 2D
 *   - Full RAF lifecycle: pauses on offscreen (IntersectionObserver) & hidden tab (visibilitychange)
 *   - prefers-reduced-motion: single deterministic static frame, zero continuous loop
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface LabMaterialFieldProps {
  activeExperimentId: 'lab-quill' | 'lab-crypt' | string;
  className?: string;
}

type GpuTier = 'low' | 'mid' | 'high';

interface QualityPreset {
  pixelRatio: number;
  marchSteps: number;
  dotSize: number;
  dotGap: number;
  scanlines: number;
}

const QUALITY_PRESETS: Record<GpuTier, QualityPreset> = {
  low: { pixelRatio: 1.0, marchSteps: 36, dotSize: 6.0, dotGap: 3.0, scanlines: 0.45 },
  mid: { pixelRatio: 1.25, marchSteps: 48, dotSize: 5.0, dotGap: 2.5, scanlines: 0.65 },
  high: { pixelRatio: 1.5, marchSteps: 64, dotSize: 4.8, dotGap: 2.4, scanlines: 0.75 },
};

function detectGpuTier(): GpuTier {
  if (typeof window === 'undefined') return 'mid';
  const isMobile =
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  if (isMobile) return 'low';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'low';
    const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'mid';
    const gpu = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
    if (/swiftshader|llvmpipe|mali-4|adreno 3/i.test(gpu)) return 'low';
    if (/intel(?!.*(iris|uhd|arc))/i.test(gpu)) return 'low';
    if (/mali-g[567]|adreno [45]|intel (iris|uhd)|geforce (mx|gt)/i.test(gpu)) return 'mid';
    return 'high';
  } catch {
    return 'mid';
  }
}

/* ─────────────────────────────────────────────────────────────
   SDF RAYMARCHING + DOT-MATRIX SHADER
───────────────────────────────────────────────────────────── */

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uExperiment;      // 0.0 = Quill, 1.0 = Crypt, morphable
  uniform vec3 uMouseSpherePos;
  uniform float uMouseSphereRadius;
  uniform float uDotSize;
  uniform float uDotGap;
  uniform float uScanlines;
  uniform int uMarchSteps;

  varying vec2 vUv;

  // Smooth minimum for organic SDF blending
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // --- LAB-01: KNOuX Quill (Generative / Linguistic Flow) ---
  float sdQuill(vec3 p, float t) {
    vec3 q = p;
    // Undulating spine of thought
    q.x += sin(q.y * 2.1 + t * 0.85) * 0.26;
    q.z += cos(q.y * 1.7 + t * 0.65) * 0.20;

    float dCore = length(q.xz) - 0.24 + sin(q.y * 5.0 + t) * 0.05;
    dCore = max(dCore, abs(q.y) - 1.35);

    // Flowing linguistic satellite strand A
    vec3 s1 = p;
    float a1 = t * 0.75 + p.y * 1.4;
    s1.xz -= vec2(cos(a1), sin(a1)) * 0.52;
    float dStrand1 = length(s1.xz) - 0.085;
    dStrand1 = max(dStrand1, abs(s1.y) - 1.15);

    // Flowing linguistic satellite strand B
    vec3 s2 = p;
    float a2 = -t * 0.55 + p.y * 1.1 + 3.14159;
    s2.xz -= vec2(cos(a2), sin(a2)) * 0.68;
    float dStrand2 = length(s2.xz) - 0.065;
    dStrand2 = max(dStrand2, abs(s2.y) - 1.05);

    float d = smin(dCore, dStrand1, 0.26);
    d = smin(d, dStrand2, 0.22);

    // Procedural textual folds
    d += sin(p.y * 9.0 + p.x * 4.5 + t * 0.4) * 0.022;
    return d;
  }

  // --- LAB-02: KNOuX Crypt (Local Encryption / Sealed Volumes) ---
  float sdCrypt(vec3 p, float t) {
    vec3 q = p;
    float c = cos(t * 0.30);
    float s = sin(t * 0.30);
    mat2 rot = mat2(c, -s, s, c);
    q.xz = rot * q.xz;

    // Secure inner core sphere
    float dCore = length(p) - 0.40;

    // Inner orbital key boundary ring
    vec2 tRing1 = vec2(length(q.xz) - 0.76, q.y);
    float dRing1 = length(tRing1) - 0.075;

    // Orthogonal protective barrier ring
    vec3 q2 = p;
    q2.yz = rot * q2.yz;
    vec2 tRing2 = vec2(length(q2.xy) - 0.92, q2.z);
    float dRing2 = length(tRing2) - 0.065;

    // Outer hollow segmented box boundary
    vec3 boxP = abs(q) - vec3(0.70);
    float dBox = length(max(boxP, 0.0)) + min(max(boxP.x, max(boxP.y, boxP.z)), 0.0) - 0.10;
    float dHollowBox = abs(dBox) - 0.038;

    // Cutaway aperture revealing inner structure
    float dSlot = max(abs(q.x) - 0.16, abs(q.z) - 1.2);
    dHollowBox = max(dHollowBox, -dSlot);

    float d = min(dCore, dRing1);
    d = min(d, dRing2);
    d = smin(d, dHollowBox, 0.11);
    return d;
  }

  float sceneSDF(vec3 p) {
    float dQ = sdQuill(p, uTime);
    float dC = sdCrypt(p, uTime);
    float d = mix(dQ, dC, clamp(uExperiment, 0.0, 1.0));

    // Pointer disturbance in 3D space
    if (uMouseSphereRadius > 0.01) {
      float dMouse = length(p - uMouseSpherePos) - uMouseSphereRadius;
      d = smin(d, dMouse, 0.32);
    }
    return d;
  }

  vec3 calcNormal(vec3 p) {
    const float eps = 0.003;
    const vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
      sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
      sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
      sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
    ));
  }

  void main() {
    // 1. Dot-Matrix Grid Quantization
    vec2 pixelCoord = vUv * uResolution;
    float spacing = uDotSize + uDotGap;
    vec2 cell = floor(pixelCoord / spacing);
    vec2 cellCenter = (cell + 0.5) * spacing;
    vec2 cellUV = cellCenter / uResolution;

    // Normalized camera ray through the center of each dot cell
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 pNorm = (cellUV - 0.5) * vec2(aspect, 1.0) * 2.0;

    vec3 ro = vec3(0.0, 0.0, 3.6);
    vec3 rd = normalize(vec3(pNorm, -1.85));

    // 2. Raymarching
    float tDist = 0.0;
    vec3 hitP;
    bool hit = false;
    for (int i = 0; i < 64; i++) {
      if (i >= uMarchSteps) break;
      hitP = ro + rd * tDist;
      float d = sceneSDF(hitP);
      if (d < 0.003) {
        hit = true;
        break;
      }
      tDist += d * 0.88;
      if (tDist > 8.5) break;
    }

    // 3. Shading & Scientific Monochrome Tone
    vec3 col = vec3(0.02, 0.02, 0.028); // deep graphite background
    float lum = 0.0;
    vec3 dotTint = vec3(0.92, 0.90, 0.94); // off-white / silver

    if (hit) {
      vec3 nor = calcNormal(hitP);
      vec3 viewDir = normalize(ro - hitP);

      vec3 keyLight = normalize(vec3(2.5, 3.2, 3.8));
      vec3 rimLight = normalize(vec3(-3.2, 1.2, -2.4));

      float diff = max(dot(nor, keyLight), 0.0);
      float rim = pow(clamp(1.0 - max(dot(nor, viewDir), 0.0), 0.0, 1.0), 2.8);

      // Specular highlight
      vec3 halfDir = normalize(keyLight + viewDir);
      float spec = pow(max(dot(nor, halfDir), 0.0), 32.0);

      // Experiment accent signal:
      // Quill has subtle lavender along flow creases, Crypt has signal at the core
      vec3 violetSignal = vec3(0.63, 0.54, 0.79);
      float signalStrength = mix(
        clamp(abs(hitP.x) * 0.5, 0.0, 0.5),
        clamp((1.0 - length(hitP)) * 0.8, 0.0, 0.7),
        uExperiment
      );

      dotTint = mix(vec3(0.92, 0.90, 0.94), violetSignal, signalStrength * 0.55);

      lum = diff * 0.75 + spec * 0.55 + rim * 0.65 + 0.12;
    }

    // 4. Dot-Matrix Rasterization
    float distToCenter = length(pixelCoord - cellCenter);
    float dotRadius = (uDotSize * 0.5) * sqrt(clamp(lum, 0.0, 1.0));
    float dotAlpha = smoothstep(dotRadius + 0.5, max(0.0, dotRadius - 0.5), distToCenter);

    // 5. Scientific CRT Scanline Modulation
    float scanline = sin(pixelCoord.y * 0.75) * 0.5 + 0.5;
    float scanlineFactor = 1.0 - uScanlines * 0.3 * (1.0 - scanline);

    // Vignette
    vec2 vigUV = vUv * (1.0 - vUv);
    float vig = clamp(pow(vigUV.x * vigUV.y * 16.0, 0.25), 0.0, 1.0);

    vec3 finalDotColor = dotTint * scanlineFactor;
    vec3 finalColor = mix(col, finalDotColor, dotAlpha * vig);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────
   CANVAS 2D FALLBACK (WebGL Unavailable)
───────────────────────────────────────────────────────────── */

function render2DFallback(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  experimentId: string,
  t: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#08080b';
  ctx.fillRect(0, 0, w, h);

  const isCrypt = experimentId === 'lab-crypt';
  const cols = Math.floor(w / 8);
  const rows = Math.floor(h / 8);

  const centerX = w * 0.5;
  const centerY = h * 0.5;

  ctx.fillStyle = '#9e96a5';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * 8 + 4;
      const y = r * 8 + 4;
      const dx = (x - centerX) / (w * 0.5);
      const dy = (y - centerY) / (h * 0.5);

      let intensity = 0;
      if (!isCrypt) {
        // Quill flow pattern
        const wave = Math.sin(dy * 4.0 + t * 0.8) * 0.35;
        const dist = Math.abs(dx - wave);
        intensity = Math.max(0, 1.0 - dist * 3.5);
      } else {
        // Crypt ring/core pattern
        const rad = Math.sqrt(dx * dx + dy * dy);
        const ring1 = Math.abs(rad - 0.45);
        const ring2 = Math.abs(rad - 0.75);
        intensity = Math.max(0, 1.0 - Math.min(ring1, ring2) * 6.0);
      }

      if (intensity > 0.08) {
        const radius = Math.min(3.5, intensity * 2.8);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Instrument watermark
  ctx.fillStyle = '#a18acb';
  ctx.font = '8px monospace';
  ctx.fillText(`KNOuX LABS // 2D FALLBACK [${isCrypt ? 'LAB-02' : 'LAB-01'}]`, 16, h - 16);
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT IMPLEMENTATION
───────────────────────────────────────────────────────────── */

export function LabMaterialField({ activeExperimentId, className }: LabMaterialFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [webGlSupported] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  });

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Mutable pointer state — read in RAF loop without React rerenders
  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    pressed: false,
    radius: 0.0,
    targetRadius: 0.0,
  });

  const isCrypt = activeExperimentId === 'lab-crypt';

  // Listen to reduced-motion preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Main Three.js / WebGL Lifecycle
  useEffect(() => {
    if (!webGlSupported) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gpuTier = detectGpuTier();
    const quality = QUALITY_PRESETS[gpuTier];

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let quad: THREE.Mesh | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio, 1.5));
    } catch {
      return;
    }

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uExperiment: { value: isCrypt ? 1.0 : 0.0 },
      uMouseSpherePos: { value: new THREE.Vector3(0, 0, 0) },
      uMouseSphereRadius: { value: 0.0 },
      uDotSize: { value: quality.dotSize },
      uDotGap: { value: quality.dotGap },
      uScanlines: { value: quality.scanlines },
      uMarchSteps: { value: quality.marchSteps },
    };

    material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    let isVisible = true;
    let isIntersecting = true;
    let rafId = 0;
    const startTime = performance.now();


    const resize = () => {
      if (!container || !renderer || !material) return;
      const width = container.clientWidth || 400;
      const height = container.clientHeight || 450;
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width, height);
    };

    resize();

    // Render single frame
    const renderFrame = (timeSec: number) => {
      if (!renderer || !scene || !camera || !material) return;

      const p = pointerRef.current;
      // Smooth damping
      p.x += (p.targetX - p.x) * 0.12;
      p.y += (p.targetY - p.y) * 0.12;
      p.radius += (p.targetRadius - p.radius) * 0.12;

      const aspect = (container?.clientWidth || 400) / Math.max(1, container?.clientHeight || 450);
      material.uniforms.uMouseSpherePos.value.set(p.x * aspect * 1.5, p.y * 1.5, 0.0);
      material.uniforms.uMouseSphereRadius.value = p.radius;

      // Smooth experiment morphing
      const targetExp = isCrypt ? 1.0 : 0.0;
      const curExp = material.uniforms.uExperiment.value;
      material.uniforms.uExperiment.value += (targetExp - curExp) * 0.08;

      material.uniforms.uTime.value = timeSec;
      renderer.render(scene, camera);
    };

    // If reduced-motion, render one static frame and stop
    if (reducedMotion) {
      renderFrame(1.0);
      return () => {
        geometry.dispose();
        material?.dispose();
        renderer?.dispose();
      };
    }

    // Animation Loop
    const animate = (timestamp: number) => {
      if (!isVisible || !isIntersecting) return;
      const elapsed = (timestamp - startTime) * 0.001;
      renderFrame(elapsed);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    // Observers & Events
    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion) renderFrame(1.0);
    });
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && isVisible && !reducedMotion) {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && isIntersecting && !reducedMotion) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(rafId);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Pointer events (passive, in-place mutable ref)
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerRef.current.targetX = normX;
      pointerRef.current.targetY = normY;
      pointerRef.current.active = true;
      if (!pointerRef.current.pressed) {
        pointerRef.current.targetRadius = 0.45;
      }
    };

    const onPointerDown = () => {
      pointerRef.current.pressed = true;
      pointerRef.current.targetRadius = 0.85;
    };

    const onPointerUp = () => {
      pointerRef.current.pressed = false;
      pointerRef.current.targetRadius = pointerRef.current.active ? 0.45 : 0.0;
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
      pointerRef.current.pressed = false;
      pointerRef.current.targetRadius = 0.0;
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);

      geometry.dispose();
      material?.dispose();
      renderer?.dispose();
      scene?.clear();
    };
  }, [isCrypt, reducedMotion, webGlSupported]);


  // Fallback Canvas 2D when WebGL fails
  useEffect(() => {
    if (webGlSupported) return;
    const canvas = fallbackCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = container.clientWidth || 400);
    const h = (canvas.height = container.clientHeight || 450);

    let rafId = 0;
    const start = performance.now();

    const loop = (ts: number) => {
      const elapsed = (ts - start) * 0.001;
      render2DFallback(ctx, w, h, activeExperimentId, elapsed);
      if (!reducedMotion) {
        rafId = requestAnimationFrame(loop);
      }
    };

    if (reducedMotion) {
      render2DFallback(ctx, w, h, activeExperimentId, 1.0);
    } else {
      rafId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(rafId);
  }, [webGlSupported, activeExperimentId, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`lab-material-field ${className || ''}`}
      data-experiment={activeExperimentId}
    >
      {webGlSupported ? (
        <canvas
          ref={canvasRef}
          className="lab-material-field__canvas"
          aria-hidden="true"
        />
      ) : (
        <canvas
          ref={fallbackCanvasRef}
          className="lab-material-field__fallback"
          aria-hidden="true"
        />
      )}

      {/* Scientific Instrument Overlay / Telemetry */}
      <div className="lab-material-field__hud" aria-hidden="true">
        <span className="lab-material-field__hud-code">
          {isCrypt ? 'LAB-02 // CRYPT' : 'LAB-01 // QUILL'}
        </span>
        <span className="lab-material-field__hud-mode">
          SDF.DOT-MATRIX : {reducedMotion ? 'STATIC' : 'ACTIVE'}
        </span>
        <span className="lab-material-field__hud-axis">
          AXIS 001—{isCrypt ? 'ENCRYPTION' : 'SEMANTICS'}
        </span>
      </div>
    </div>
  );
}
