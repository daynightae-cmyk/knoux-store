'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { softwareProducts, softwareAuditDate } from '@/data/software';
import { track } from '@/lib/analytics';
import { buildStarField, type Star } from '@/lib/knouxField';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';
import {
  NODE_RADIUS,
  UNIVERSE_CORE_ID,
  UNIVERSE_ORBITS,
  buildUniverseGraph,
  clampCameraTarget,
  connectorControl,
  pointOnCurve,
  projectNode,
  visibleEdges,
  visibleUniverse,
  type UniverseEdge,
  type UniverseNode,
} from '@/lib/universeGraph';
import {
  UNIVERSE_DENSITY,
  UNIVERSE_DUST,
  UNIVERSE_NODE_INK,
  UNIVERSE_PALETTE,
} from '@/lib/universePalette';

/**
 * KNOuX Universe.
 *
 * The second chapter of the Hero. The Hero resolves one mark out of a particle
 * field; this block resolves the institution out of one: a core, the verified
 * systems standing around it, and the capability layer each system publishes
 * about itself, opened only when a visitor deliberately asks for it.
 *
 * It is Canvas 2D and DOM rather than WebGL. The Hero already holds the site's
 * one permanent renderer, and a second WebGL context for a graph of seven
 * systems would cost far more than the depth it bought. Depth here is a real
 * perspective projection over three world coordinates, so systems genuinely
 * scale and fade with distance, and it is paid for by one animation loop that
 * parks itself when the block leaves the viewport or the tab is hidden.
 *
 * Nothing about the registry is reinterpreted to make the picture work.
 * Positions come from each product's own `topology`, cross-links from its own
 * `relatedIds`, and the second layer is the capability statements the
 * repositories publish. `Math.random()` appears nowhere, so the same registry
 * renders the same composition on every load, at every width, in every build.
 */

/**
 * The reference frames, in reference pixels.
 *
 * A frame is a camera choice, not a data one: the same world positions are
 * framed wide on a desktop and turned on its side for a phone, so the shallow
 * plane is read along whichever axis the viewport can actually carry. The field
 * carries its frame's aspect ratio, so one reference pixel is a predictable
 * fraction of the rendered field and the composition never has to be measured
 * before it can be laid out. Server and client therefore agree, and the graph
 * is in the right place on first paint.
 */
const VIEW = {
  wide: { width: 1040, height: 660 },
  tall: { width: 760, height: 780 },
} as const;

type Frame = keyof typeof VIEW;

/** A phone reads the plane along its other axis. The registry never moves. */
function isTurned(frame: Frame): boolean {
  return frame === 'tall';
}

/** The scene plane is larger than the frame, so camera motion never finds an edge. */
const PLANE_SCALE = 1.6;
const MAX_DPR = 2;
const FRAME_QUERY = '(max-width: 880px)';
const ZOOM_STEPS = [0.9, 1, 1.16] as const;
const INSPECTOR_ID = 'universe-inspector';
const HINT_ID = 'universe-hint';

type Tier = Exclude<QualityTier, 'auto'>;

/** Everything the painter needs, resolved once per interaction rather than per frame. */
type Composition = {
  visible: ReadonlySet<string>;
  edges: readonly UniverseEdge[];
  focusId: string | null;
  selectedId: string | null;
  frame: Frame;
  zoom: number;
};

type Painter = {
  step: (composition: Composition, seconds: number) => void;
  still: (composition: Composition) => void;
  retune: (tier: Tier) => void;
  measure: (composition: Composition) => void;
};

/** A world point projected into the scene, in plane pixels. */
type Projected = { screenX: number; screenY: number; scale: number; depth: number };

/** Convert a 6-digit hex token into a valid rgba() canvas colour. */
function hexWithAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return hex;
  const parsed = Number.parseInt(value, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** A node's offset from the centre, as a fraction of the oversized scene plane. */
function planeFraction(offset: number, extent: number): number {
  return 0.5 + offset / (extent * PLANE_SCALE);
}

/** A stand-in node for the architectural datum rings, which carry no registry entry. */
const DATUM = {
  id: 'datum',
  layer: 'product',
  depth: 1,
  parentId: UNIVERSE_CORE_ID,
  x: 0,
  y: 0,
  z: 0,
  label: '',
  code: '',
  productId: '',
  relatedIds: [],
  phase: 0,
} as UniverseNode;

/**
 * One projection, shared by the canvas and the DOM node layer.
 *
 * Returning the same reference-pixel offsets to both is what keeps a system and
 * its connector locked together. The camera is deliberately not part of it: the
 * plane's own CSS transform carries the pan and the zoom.
 */
function projectInFrame(node: UniverseNode, frame: Frame) {
  const turned = isTurned(frame);
  return projectNode(
    turned ? { ...node, x: -node.y, y: node.x } : node,
    { x: 0, y: 0, zoom: 1 },
  );
}

/**
 * The canvas painter.
 *
 * One closure, one loop. The camera lives here as two eased numbers that are
 * published onto a single CSS custom property, so a focus transition is a
 * transform on one element rather than a React render. Node placement inside
 * the canvas deliberately ignores the camera: the plane's own transform carries
 * the pan and the zoom, which is what keeps the canvas and the DOM labels
 * locked to each other by construction rather than by agreement.
 */
function buildPainter(
  canvas: HTMLCanvasElement,
  plane: HTMLDivElement,
  graph: ReturnType<typeof buildUniverseGraph>,
  initialTier: Tier,
): Painter {
  const context = canvas.getContext('2d');
  const index = new Map(graph.nodes.map((node) => [node.id, node]));

  if (!context) {
    return { step: () => {}, still: () => {}, retune: () => {}, measure: () => {} };
  }

  let tier = initialTier;
  let stars: Star[] = [];
  let starCount = -1;
  let ratio = 1;
  let planeWidth = 0;
  let planeHeight = 0;
  let view: (typeof VIEW)[Frame] = VIEW.wide;
  let turned = false;
  /** Plane pixels per reference pixel. The field carries the view's aspect ratio. */
  let scaleX = 1;
  let scaleY = 1;
  let cameraX = 0;
  let cameraY = 0;
  let cameraZoom = 1;
  let targetX = 0;
  let targetY = 0;
  let targetZoom = 1;
  let assembly = 0;

  const measure = (composition: Composition) => {
    ratio = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    planeWidth = canvas.clientWidth || 1;
    planeHeight = canvas.clientHeight || 1;
    canvas.width = Math.max(1, Math.floor(planeWidth * ratio));
    canvas.height = Math.max(1, Math.floor(planeHeight * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    view = VIEW[composition.frame];
    turned = isTurned(composition.frame);
    scaleX = planeWidth / (view.width * PLANE_SCALE);
    scaleY = planeHeight / (view.height * PLANE_SCALE);

    const next = composition.frame === 'wide' ? UNIVERSE_DENSITY[tier] : UNIVERSE_DENSITY.low;
    if (next !== starCount) {
      starCount = next;
      stars = buildStarField(next);
    }
  };

  const project = (node: UniverseNode): Projected => {
    const sample = projectInFrame(node, turned ? 'tall' : 'wide');
    return {
      screenX: planeWidth / 2 + sample.screenX * scaleX,
      screenY: planeHeight / 2 + sample.screenY * scaleY,
      scale: sample.scale * scaleX,
      depth: sample.depth,
    };
  };

  /** A bare world point, for the architectural datum rings. */
  const projectPoint = (x: number, y: number): Projected => {
    const sample = projectInFrame(
      { ...DATUM, x: turned ? -y : x, y: turned ? x : y },
      turned ? 'tall' : 'wide',
    );
    return {
      screenX: planeWidth / 2 + sample.screenX * scaleX,
      screenY: planeHeight / 2 + sample.screenY * scaleY,
      scale: sample.scale * scaleX,
      depth: sample.depth,
    };
  };

  const drawField = (seconds: number, reveal: number) => {
    for (const star of stars) {
      const depth = star.layer === 'near' ? 1 : star.layer === 'mid' ? 0.5 : 0.18;
      const x = star.x * planeWidth + star.driftX * seconds * planeWidth * 620 * reveal;
      const y =
        star.y * planeHeight +
        star.driftY * seconds * planeHeight * 620 * reveal +
        Math.sin(seconds * 0.05 + star.phase) * 2.2 * depth;
      const alpha = Math.max(
        0,
        Math.min(1, (star.alpha + star.amplitude * Math.sin(seconds * star.speed + star.phase)) * reveal),
      );
      if (alpha <= 0.03) continue;
      context.beginPath();
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fillStyle = `${star.violet ? UNIVERSE_DUST.violet : UNIVERSE_DUST.neutral}${alpha.toFixed(3)})`;
      context.fill();
    }
  };

  /**
   * The registry's declared orbit radii, projected rather than drawn flat, so
   * the framework bends with the same perspective as the systems standing on it.
   */
  const drawOrbits = (reveal: number) => {
    context.setLineDash([2, 7]);
    context.lineWidth = 1;
    for (const radius of UNIVERSE_ORBITS) {
      context.beginPath();
      for (let step = 0; step <= 96; step += 1) {
        const angle = (step / 96) * Math.PI * 2;
        const point = projectPoint(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.66);
        if (step === 0) context.moveTo(point.screenX, point.screenY);
        else context.lineTo(point.screenX, point.screenY);
      }
      context.closePath();
      context.strokeStyle = `rgba(41,42,45,${(0.8 * reveal).toFixed(3)})`;
      context.stroke();
    }
    context.setLineDash([]);
  };

  const relatedTo = (id: string, other: string): boolean => {
    if (id === other) return true;
    const node = index.get(id);
    if (!node) return false;
    if (node.relatedIds.includes(other)) return true;
    return node.parentId === other || index.get(other)?.parentId === node.id;
  };

  const drawEdges = (composition: Composition, seconds: number, reveal: number) => {
    const points = new Map<string, Projected>();
    for (const node of graph.nodes) {
      if (composition.visible.has(node.id)) points.set(node.id, project(node));
    }
    const at = (point: Projected) => ({ x: point.screenX, y: point.screenY });

    for (const edge of composition.edges) {
      const a = points.get(edge.source);
      const b = points.get(edge.target);
      if (!a || !b) continue;

      const active = Boolean(
        composition.focusId &&
          (edge.source === composition.focusId || edge.target === composition.focusId),
      );
      const capabilityLink =
        index.get(edge.source)?.layer === 'capability' || index.get(edge.target)?.layer === 'capability';
      const control = connectorControl(at(a), at(b), edge.phase);
      const fade = 0.4 + Math.min(a.depth, b.depth) * 0.6;
      const alpha = (active ? 0.52 : capabilityLink ? 0.19 : 0.15) * fade * reveal;
      if (alpha < 0.02) continue;

      context.beginPath();
      context.moveTo(a.screenX, a.screenY);
      context.quadraticCurveTo(control.x, control.y, b.screenX, b.screenY);
      context.lineWidth = active ? 1.3 : 0.8;
      context.strokeStyle = active
        ? `${UNIVERSE_PALETTE.violet}${(alpha * 1.75).toFixed(3)})`
        : `${UNIVERSE_PALETTE.connector}${(alpha * 0.9).toFixed(3)})`;
      context.stroke();

      // A signal travels a relationship only while that relationship is part of
      // what is being read. Everything else stays quiet, so the field never
      // becomes a light show.
      if (active) {
        const travel = pointOnCurve(at(a), control, at(b), (edge.phase + seconds * 0.2) % 1);
        context.beginPath();
        context.arc(travel.x, travel.y, 1.8, 0, Math.PI * 2);
        context.fillStyle = `${UNIVERSE_PALETTE.violetSoft}0.9)`;
        context.fill();
      }
    }
  };

  const drawNodes = (composition: Composition, reveal: number) => {
    for (const node of graph.nodes) {
      if (!composition.visible.has(node.id)) continue;
      const ink = UNIVERSE_NODE_INK[node.layer];
      const point = project(node);
      const selected = node.id === composition.selectedId;
      const engaged = node.id === composition.focusId;
      // Unrelated systems step back rather than vanish, so the context a visitor
      // expanded into is still there when they look away.
      const present =
        composition.focusId && !relatedTo(node.id, composition.focusId) ? 0.42 : 1;
      const radius = Math.max(1.3, NODE_RADIUS[node.layer] * (engaged ? 1.2 : 1) * point.scale);

      // Bloom is reserved. Only the core and whatever is being read receive it.
      if (node.layer === 'core' || engaged) {
        const halo = ink.halo * point.scale;
        if (halo > 1) {
          const glow = context.createRadialGradient(
            point.screenX,
            point.screenY,
            0,
            point.screenX,
            point.screenY,
            halo,
          );
          glow.addColorStop(0, hexWithAlpha(ink.accent, 0.19 * present * reveal));
          glow.addColorStop(0.55, hexWithAlpha(ink.accent, 0.05 * present * reveal));
          glow.addColorStop(1, hexWithAlpha(ink.accent, 0));
          context.fillStyle = glow;
          context.beginPath();
          context.arc(point.screenX, point.screenY, halo, 0, Math.PI * 2);
          context.fill();
        }
      }

      // A graphite body keeps the interior dark, so the field never resolves
      // into a scatter of bright discs.
      context.beginPath();
      context.arc(point.screenX, point.screenY, radius, 0, Math.PI * 2);
      context.fillStyle = ink.body;
      context.globalAlpha = ink.alpha * present * reveal;
      context.fill();
      context.lineWidth = selected ? 1.7 : 1;
      context.strokeStyle = selected
        ? UNIVERSE_PALETTE.violetSoft
        : engaged
          ? ink.accent
          : ink.rim;
      context.globalAlpha = present * reveal * 0.8;
      context.stroke();
      context.globalAlpha = 1;

      if (ink.ring) {
        context.beginPath();
        context.arc(point.screenX, point.screenY, radius * (node.layer === 'core' ? 2 : 2.5), 0, Math.PI * 2);
        context.lineWidth = 0.8;
        context.strokeStyle = UNIVERSE_PALETTE.connector;
        context.globalAlpha = 0.26 * present * reveal;
        context.stroke();
        context.globalAlpha = 1;
      }
    }
  };

  const aim = (composition: Composition) => {
    targetZoom = composition.zoom;
    if (!composition.focusId) {
      targetX = 0;
      targetY = 0;
      return;
    }
    const node = index.get(composition.focusId);
    if (!node) return;
    // A small, bounded drift toward what is being read, in the frame's own
    // orientation. The camera never inverts, never orbits and never leaves the
    // field.
    const held = composition.frame === 'tall' ? -node.y : node.x;
    const depth = composition.frame === 'tall' ? node.x : node.y;
    const clamped = clampCameraTarget(held * 0.34, depth * 0.34);
    targetX = clamped.x;
    targetY = clamped.y;
  };

  const publishCamera = () => {
    if (!plane.isConnected) return;
    plane.style.setProperty(
      '--universe-camera',
      `translate3d(${(-cameraX * scaleX).toFixed(2)}px, ${(-cameraY * scaleY).toFixed(
        2,
      )}px, 0) scale(${cameraZoom.toFixed(4)})`,
    );
  };

  const paint = (composition: Composition, seconds: number, reveal: number) => {
    context.clearRect(0, 0, planeWidth, planeHeight);
    drawField(seconds, reveal);
    drawOrbits(reveal);
    drawEdges(composition, seconds, reveal);
    drawNodes(composition, reveal);
  };

  return {
    step(composition, seconds) {
      measure(composition);
      aim(composition);
      const ease = composition.frame === 'tall' ? 0.14 : 0.075;
      cameraX += (targetX - cameraX) * ease;
      cameraY += (targetY - cameraY) * ease;
      cameraZoom += (targetZoom - cameraZoom) * ease;
      assembly += (1 - assembly) * 0.055;
      paint(composition, seconds, 0.4 + assembly * 0.6);
      publishCamera();
    },
    still(composition) {
      measure(composition);
      aim(composition);
      cameraX = targetX;
      cameraY = targetY;
      cameraZoom = targetZoom;
      assembly = 1;
      paint(composition, 0, 1);
      publishCamera();
    },
    retune(next) {
      tier = next;
      starCount = -1;
    },
    measure,
  };
}

export function UniverseConstellation() {
  const graph = useMemo(() => buildUniverseGraph(), []);
  const products = useMemo(() => new Map(softwareProducts.map((product) => [product.id, product])), []);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [engaged, setEngaged] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [frame, setFrame] = useState<Frame>('wide');

  const planeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painterRef = useRef<Painter | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const reducedRef = useRef(false);
  const loopRef = useRef(0);
  const runningRef = useRef(false);
  const armedRef = useRef(false);
  const firstProductId = graph.nodes.find((node) => node.layer === 'product')?.id ?? '';

  const composition = useMemo<Composition>(() => {
    const visible = visibleUniverse(graph, expanded);
    return {
      visible,
      edges: visibleEdges(graph, visible),
      focusId: engaged ?? selectedId,
      selectedId,
      frame,
      zoom,
    };
  }, [graph, expanded, engaged, selectedId, frame, zoom]);

  const compositionRef = useRef(composition);

  // Declared before the painter is built, so the painter's first frame already
  // reads a settled composition rather than a render-time snapshot.
  useEffect(() => {
    compositionRef.current = composition;
    // A reduced-motion visitor has no loop, so a changed composition is asked
    // for a fresh frame explicitly.
    if (reducedRef.current) painterRef.current?.still(composition);
  }, [composition]);

  // The painter is created once. Every later input arrives through refs, so
  // expanding a layer or opening the inspector never rebuilds the field.
  useEffect(() => {
    const canvas = canvasRef.current;
    const plane = planeRef.current;
    if (!canvas || !plane) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia(FRAME_QUERY);
    const readTier = (): Tier => {
      const saved = localStorage.getItem('knoux-quality');
      if (saved === 'high' || saved === 'balanced' || saved === 'low') return saved;
      const cores = navigator.hardwareConcurrency || 8;
      return cores <= 4 ? 'low' : cores >= 12 ? 'high' : 'balanced';
    };

    const painter = buildPainter(canvas, plane, graph, readTier());
    painterRef.current = painter;
    reducedRef.current = motion.matches;
    setFrame(narrow.matches ? 'tall' : 'wide');

    let onScreen = true;

    const tick = (now: number) => {
      painter.step(compositionRef.current, now / 1000);
      loopRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (runningRef.current || motion.matches || !armedRef.current || !onScreen || document.hidden) {
        return;
      }
      runningRef.current = true;
      loopRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!runningRef.current) return;
      runningRef.current = false;
      cancelAnimationFrame(loopRef.current);
    };

    const still = () => {
      stop();
      painter.still(compositionRef.current);
    };

    const onMotion = () => {
      reducedRef.current = motion.matches;
      if (motion.matches) still();
      else start();
    };

    const onLayout = () => {
      setFrame(narrow.matches ? 'tall' : 'wide');
      painter.measure(compositionRef.current);
      if (motion.matches) painter.still(compositionRef.current);
    };

    const onQuality = (event: Event) => {
      const detail = (event as CustomEvent<QualityTier>).detail;
      if (detail && detail !== 'auto') painter.retune(detail);
      painter.measure(compositionRef.current);
      if (motion.matches) painter.still(compositionRef.current);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = (entries[0]?.isIntersecting ?? false) && !document.hidden;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    observer.observe(plane);

    motion.addEventListener('change', onMotion);
    narrow.addEventListener('change', onLayout);
    window.addEventListener('resize', onLayout);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);

    painter.still(compositionRef.current);
    armedRef.current = true;
    start();

    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener('change', onMotion);
      narrow.removeEventListener('change', onLayout);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener(qualityEvent, onQuality);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [graph]);

  const rememberNode = useCallback(
    (id: string) => (element: HTMLButtonElement | null) => {
      if (element) nodeRefs.current.set(id, element);
      else nodeRefs.current.delete(id);
    },
    [],
  );

  const returnFocus = useCallback(
    (preferred?: string) => {
      const target =
        (preferred && nodeRefs.current.get(preferred)) || nodeRefs.current.get(firstProductId);
      target?.focus();
    },
    [firstProductId],
  );

  const openProduct = useCallback((id: string, method: 'pointer' | 'keyboard') => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedId((previous) => (previous === id ? null : id));
    setZoom((previous) => (previous === 1 ? 1.16 : previous));
    track({ type: 'product_node_focused', id, method });
  }, []);

  const openCapability = useCallback(
    (node: UniverseNode, method: 'pointer' | 'keyboard') => {
      setExpanded((previous) =>
        previous.has(node.productId) ? previous : new Set(previous).add(node.productId),
      );
      setSelectedId(node.id);
      const product = products.get(node.productId);
      if (product) track({ type: 'product_node_focused', id: product.id, method });
    },
    [products],
  );

  const restore = useCallback(() => {
    setExpanded(new Set<string>());
    setSelectedId(null);
    setZoom(1);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') return;
      if (!selectedId && expanded.size === 0) return;
      event.stopPropagation();
      const node = graph.nodes.find((entry) => entry.id === selectedId);
      const fallback = node && node.layer === 'capability' ? node.productId : node?.id;
      restore();
      returnFocus(fallback ?? firstProductId);
    },
    [graph, selectedId, expanded.size, restore, returnFocus, firstProductId],
  );

  const selectedNode = selectedId ? graph.nodes.find((node) => node.id === selectedId) : undefined;
  const selectedProduct = selectedNode ? products.get(selectedNode.productId) : undefined;
  const selectedIsCapability = selectedNode?.layer === 'capability';
  const expandedProducts = useMemo(
    () => graph.nodes.filter((node) => node.layer === 'capability' && expanded.has(node.productId)),
    [graph, expanded],
  );

  const renderNode = (node: UniverseNode) => {
    if (!composition.visible.has(node.id)) return null;
    const view = VIEW[frame];
    const sample = projectInFrame(node, frame);
    const product = products.get(node.productId);
    const isProduct = node.layer === 'product';
    const isOpen = isProduct && expanded.has(node.id);
    const isCurrent = node.id === composition.focusId;
    const isSelected = node.id === selectedId;
    // Labels read outward from the core, and upward for what sits above it, so
    // two systems at a similar height never contend for the same band of text.
    const side = sample.screenX < -12 ? 'left' : 'right';
    const vertical = sample.screenY < -18 ? 'above' : 'below';

    return (
      <li
        key={node.id}
        className="universe-node"
        data-node={node.id}
        data-layer={node.layer}
        data-side={side}
        data-vertical={vertical}
        data-open={isOpen ? '' : undefined}
        data-engaged={isCurrent ? '' : undefined}
        data-selected={isSelected ? '' : undefined}
        style={{
          left: `${planeFraction(sample.screenX, view.width) * 100}%`,
          top: `${planeFraction(sample.screenY, view.height) * 100}%`,
        }}
      >
        <button
          type="button"
          ref={rememberNode(node.id)}
          className="universe-node__hit"
          aria-expanded={isProduct ? isOpen : undefined}
          aria-pressed={isProduct ? undefined : isSelected}
          aria-controls={isProduct ? INSPECTOR_ID : undefined}
          onPointerEnter={() => setEngaged(node.id)}
          onPointerLeave={() => setEngaged((current) => (current === node.id ? null : current))}
          onFocus={() => setEngaged(node.id)}
          onBlur={() => setEngaged((current) => (current === node.id ? null : current))}
          onClick={() => {
            if (isProduct) openProduct(node.id, 'pointer');
            else openCapability(node, 'pointer');
          }}
        >
          <span className="universe-node__code">{node.code}</span>
          <span className="universe-node__name">
            {isProduct ? (product?.name ?? node.label) : node.label}
          </span>
          {node.statement ? <span className="visually-hidden">{node.statement}</span> : null}
        </button>
      </li>
    );
  };

  return (
    <div className="universe" onKeyDown={onKeyDown}>
      <div className="universe__body">
        <div className="universe__stage">
          <div
            className="universe__field spatial-surface"
            data-spatial
            data-frame={frame}
            role="group"
            aria-label="KNOuX software universe map"
          >
            <div className="universe__plane" ref={planeRef}>
              <div className="universe__depth">
                <canvas className="universe__canvas" ref={canvasRef} aria-hidden="true" />
                <ul className="universe__nodes" role="list">
                  {graph.nodes
                    .filter((node) => node.layer === 'product')
                    .map((node) => renderNode(node))}
                  {expandedProducts.map((node) => renderNode(node))}
                </ul>
                <span className="universe__core-label" aria-hidden="true">
                  <strong>KNOuX</strong>
                  <small>CORE</small>
                </span>
              </div>
            </div>
            <div className="universe__frame" aria-hidden="true">
              <span className="universe__corner universe__corner--tl" />
              <span className="universe__corner universe__corner--tr" />
              <span className="universe__corner universe__corner--bl" />
              <span className="universe__corner universe__corner--br" />
              <span className="universe__datum universe__datum--tl">KN / U-00</span>
              <span className="universe__datum universe__datum--br">
                {String(softwareProducts.length).padStart(2, '0')} VERIFIED SYSTEMS / AUDITED{' '}
                {softwareAuditDate}
              </span>
            </div>
          </div>

          <div className="universe__controls">
            <div className="universe__zoom" role="group" aria-label="Field depth">
              <span className="mono">DEPTH</span>
              {ZOOM_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className={zoom === step ? 'is-current' : ''}
                  aria-pressed={zoom === step}
                  onClick={() => setZoom(step)}
                >
                  {step.toFixed(2)}×
                </button>
              ))}
            </div>
            <button
              type="button"
              className="universe__reset"
              onClick={restore}
              disabled={!selectedId && expanded.size === 0 && zoom === 1}
            >
              RESTORE FIELD
            </button>
            <p className="universe__hint" id={HINT_ID}>
              Tab reaches every system. Enter opens its verified capability layer. Escape restores the
              opening field.
            </p>
          </div>
        </div>

        <aside
          className="universe__inspector"
          id={INSPECTOR_ID}
          aria-labelledby="universe-inspector-title"
        >
          {selectedNode && selectedProduct ? (
            <div className="universe__inspector-body" aria-live="polite" aria-describedby={HINT_ID}>
              <div className="universe__inspector-head">
                <span className="mono">{selectedNode.code}</span>
                <span className={`mark mark--${selectedProduct.status}`}>
                  {selectedProduct.status.replace('-', ' ')}
                </span>
              </div>
              <h3 id="universe-inspector-title">{selectedProduct.name}</h3>
              <p className="universe__lede">{selectedProduct.tagline}</p>

              {selectedIsCapability ? (
                <>
                  <span className="label label--signal">VERIFIED CAPABILITY</span>
                  <p className="universe__statement">{selectedNode.statement}</p>
                </>
              ) : (
                <>
                  <span className="label label--signal">
                    VERIFIED CAPABILITIES / {String(selectedProduct.capabilities.length).padStart(2, '0')}
                  </span>
                  <ul className="universe__capabilities">
                    {selectedProduct.capabilities.map((capability, index) => (
                      <li key={capability}>
                        <span className="mono">{`C${index + 1}`}</span>
                        {capability}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <span className="label label--signal">STATED LIMITATIONS</span>
              <ul className="universe__limits">
                {selectedProduct.limitations.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>

              <dl className="universe__meta">
                <div>
                  <dt>Family</dt>
                  <dd>{selectedProduct.family}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{selectedProduct.platform}</dd>
                </div>
                {selectedProduct.version ? (
                  <div>
                    <dt>Declared version</dt>
                    <dd>
                      {selectedProduct.version}
                      <small>{selectedProduct.versionSource}</small>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Repository</dt>
                  <dd>
                    <a href={selectedProduct.repository} target="_blank" rel="noopener noreferrer">
                      {selectedProduct.repository.split('/').pop()}
                    </a>
                  </dd>
                </div>
              </dl>

              <span className="label label--signal">EVIDENCE IN THE REPOSITORY</span>
              <ul className="universe__evidence">
                {selectedProduct.evidence.map((item) => (
                  <li key={item.source}>
                    <span className="mono">{item.source}</span>
                    <p>{item.note}</p>
                  </li>
                ))}
              </ul>

              <div className="universe__actions">
                <Link
                  href={`/products/${selectedProduct.slug}`}
                  className="action"
                  onClick={() =>
                    track({
                      type: 'product_opened',
                      id: selectedProduct.id,
                      slug: selectedProduct.slug,
                    })
                  }
                >
                  Open dossier
                  <span className="action-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
                {selectedProduct.liveUrl ? (
                  <a
                    className="universe__link"
                    href={selectedProduct.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Repository-declared preview ↗
                  </a>
                ) : null}
                <button
                  type="button"
                  className="universe__close"
                  onClick={() => {
                    const fallback =
                      selectedIsCapability && selectedNode ? selectedNode.productId : selectedNode?.id;
                    restore();
                    returnFocus(fallback);
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          ) : (
            <div className="universe__idle">
              <span className="label label--signal">SYSTEM TOPOLOGY</span>
              <h3 id="universe-inspector-title">
                {String(softwareProducts.length).padStart(2, '0')} verified systems, one practice.
              </h3>
              <p>
                The field opens with the KNOuX core and its audited systems. Choosing one reveals only
                the capability layer that system publishes about itself. The inspector repeats the
                same registry entry in text, so the map is never the only way to read it.
              </p>
              <dl className="universe__meta">
                <div>
                  <dt>Registry audit</dt>
                  <dd>{softwareAuditDate}</dd>
                </div>
                <div>
                  <dt>Systems</dt>
                  <dd>{String(softwareProducts.length).padStart(2, '0')}</dd>
                </div>
                <div>
                  <dt>Capability layers</dt>
                  <dd>
                    {String(
                      softwareProducts.reduce(
                        (total, product) => total + product.capabilities.length,
                        0,
                      ),
                    ).padStart(2, '0')}
                  </dd>
                </div>
              </dl>
              <Link href="/products" className="universe__link">
                OPEN THE FULL REGISTRY ↗
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
