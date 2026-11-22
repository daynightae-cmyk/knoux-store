'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { buildMarkSamples } from '@/lib/knouxMark';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';

/** Persistent canonical identity; routes change the scatter impulse, never the pool. */
export function BuildLivingMarkBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const transition = useRef(0);
  const pathname = usePathname();
  const { state } = useBuildWorkspace();
  const stage = useRef(state.engineering.stage);
  const landing = useRef(pathname === '/build');
  // The entry can swap between the constellation and the workspace without a
  // route change; the aperture placement must follow that swap.
  const [surfaceKey, setSurfaceKey] = useState(0);
  useEffect(() => {
    const bump = () => setSurfaceKey((key) => key + 1);
    window.addEventListener('knoux:build-surface', bump);
    return () => window.removeEventListener('knoux:build-surface', bump);
  }, []);

  useEffect(() => { stage.current = state.engineering.stage; landing.current = pathname === '/build'; transition.current = performance.now(); window.dispatchEvent(new Event('knoux:engineering-visual-state')); }, [pathname, state.engineering.stage]);

  // Keep the canonical particle pool mounted while positioning it over the
  // landing engine aperture. Layout changes never imply runtime transitions.
  useEffect(() => {
    const mark = canvas.current?.parentElement;
    const aperture = document.querySelector('.dev-engine');
    const container = mark?.parentElement;
    if (!mark || !container) return;
    if (!aperture) { mark.style.cssText = ''; return; }
    let x = NaN, y = NaN, width = NaN, height = NaN;
    const place = () => {
      const target = aperture.getBoundingClientRect();
      const parent = container.getBoundingClientRect();
      const overlap = Math.min(56, Math.round(target.width * (target.width < 390 ? .1 : .14)));
      const left = Math.round(target.left - parent.left);
      const top = Math.round(target.top - parent.top) - overlap;
      if (left !== x || top !== y) {
        x = left; y = top;
        Object.assign(mark.style, { inset: 'auto', left: `${x}px`, top: `${y}px` });
      }
      if (target.width !== width || target.height + overlap !== height) {
        width = target.width; height = target.height + overlap;
        Object.assign(mark.style, { width: `${width}px`, height: `${height}px` });
      }
    };
    const observer = new ResizeObserver(place);
    observer.observe(aperture); observer.observe(container);
    const content = container.querySelector('main');
    content?.addEventListener('scroll', place, { passive: true });
    content?.addEventListener('toggle', place, true);
    place();
    // Font swaps shift the aperture after first layout; size observers alone
    // never fire for a pure position change.
    let live = true;
    document.fonts?.ready.then(() => { if (live) place(); }, () => {});
    return () => { live = false; observer.disconnect(); content?.removeEventListener('scroll', place); content?.removeEventListener('toggle', place, true); };
  }, [pathname, state.workspace.activeSurface, surfaceKey]);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    const context = surface.getContext('2d');
    if (!context) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const isCompact = window.innerWidth < 700;
    const budget = Math.min(isCompact ? 1200 : 3200, navigator.hardwareConcurrency <= 4 || state.preferences.density === 'low' ? 1700 : 3200);
    const started = performance.now();
    const samples = buildMarkSamples(budget);
    surface.dataset.particles = String(samples.length);
    surface.dataset.sampleMs = (performance.now() - started).toFixed(1);

    let width = 0, height = 0, frame = 0, last = 0, elapsed = 0;
    let visible = true; let paints = 0; let totalPaintMs = 0;
    const reduced = () => motion.matches || state.preferences.motion === 'reduced';

    const draw = (now: number) => {
      // The IntersectionObserver callback is asynchronous; a frame queued
      // before it lands must not paint into a surface that is already hidden.
      // offsetParent is null for display:none, so the pause is synchronous.
      if (document.hidden || !visible || surface.offsetParent === null) {
        frame = 0;
        return;
      }

      if (!reduced()) frame = requestAnimationFrame(draw); else frame = 0;
      if (!reduced() && now - last < 24) return;
      if (!reduced()) elapsed += Math.min((now - last) / 1000, 0.05);
      last = now;

      const paintStarted = performance.now();
      const active = ['RESOLVING', 'ROUTING', 'GENERATING', 'EXECUTING', 'VERIFYING'].includes(stage.current);
      const blocked = ['AUTH_REQUIRED', 'CONFIG_REQUIRED', 'PROVIDER_BLOCKED', 'EXECUTOR_NOT_CONNECTED'].includes(stage.current);
      const resolved = ['PLANNED', 'REVIEWING', 'COMPLETE'].includes(stage.current);
      const centered = landing.current;
      const centerX = width * (centered ? 0.5 : 0.69);
      const scale = Math.min(width * 0.68 / 3, height * (centered ? 0.82 : 0.8) / 5);
      const centerY = centered ? height - 37 - scale * 2.5 : height * 0.48;
      surface.dataset.state = stage.current;
      context.clearRect(0, 0, width, height);

      const halo = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        centered ? height * 0.6 : Math.max(width, height) * 0.78,
      );
      halo.addColorStop(0, centered ? 'rgba(192,146,255,0.46)' : 'rgba(206,196,244,0.25)');
      halo.addColorStop(0.2, centered ? 'rgba(151,110,231,0.25)' : 'rgba(151,130,204,0.18)');
      halo.addColorStop(0.52, 'rgba(91,78,128,0.10)');
      halo.addColorStop(1, 'rgba(6,8,14,0)');
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      const impulse = reduced() ? 0 : Math.exp(-Math.max(0, now - transition.current) / 900) * 0.11;
      const scatter = reduced() || blocked || resolved ? 0 : Math.pow(Math.max(0, Math.sin(elapsed / (active ? 3 : 6.2))), 10) * (active ? 0.1 : 0.025) + impulse;
      const pulse = reduced() || blocked ? 1 : 1 + Math.sin(elapsed * (active ? 2 : 0.8)) * (active ? 0.08 : 0.025);
      const wave = reduced() ? 0 : Math.sin(elapsed * 0.9) * 0.018;

      context.save();
      context.fillStyle = blocked ? '#a89fac' : resolved ? '#fff7e7' : centered ? '#f4eaff' : '#eef1ff';
      context.shadowBlur = reduced() ? 8 : isCompact ? 17 : 24;
      context.shadowColor = centered ? 'rgba(172, 120, 255, 0.98)' : 'rgba(170, 157, 216, 0.9)';
      context.beginPath();

      for (const particle of samples) {
        const phase = particle.random * Math.PI * 2;
        const breath = reduced() ? 1 : 1 + Math.sin(elapsed / 4.8 + particle.random * 6) * 0.014;
        const driftX = reduced() || blocked || resolved ? 0 : Math.sin(now * 0.0005 + particle.random * 10) * 0.035;
        const driftY = reduced() || blocked || resolved ? 0 : Math.cos(now * 0.00042 + particle.random * 12) * 0.03;
        const x = centerX + (particle.x * breath + Math.cos(phase) * (scatter + wave) * 5 + driftX) * scale;
        const y = centerY - (particle.y * breath + Math.sin(phase) * (scatter + wave) * 5 + driftY) * scale;
        const size = Math.max(0.6, particle.size * scale * 0.24 * pulse * (centered ? 1.35 : isCompact ? 0.9 : 1.1));
        context.rect(x, y, size, size);
      }

      context.fill();
      context.restore();

      totalPaintMs += performance.now() - paintStarted;
      surface.dataset.paints = String(++paints);
      surface.dataset.meanPaintMs = (totalPaintMs / paints).toFixed(2);
      surface.dataset.motion = reduced() ? 'stable' : 'animated';
    };

    const resize = () => {
      width = surface.clientWidth;
      height = surface.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const wake = () => {
      cancelAnimationFrame(frame);
      resize();
      frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // While paused, never re-arm the loop on resize or state events; only a
      // fresh visibility callback may restart painting.
      if (!visible) { cancelAnimationFrame(frame); frame = 0; return; }
      wake();
    });

    observer.observe(surface);
    const sizeObserver = new ResizeObserver(wake);
    sizeObserver.observe(surface);
    wake();
    document.addEventListener('visibilitychange', wake);
    motion.addEventListener('change', wake);
    window.addEventListener('resize', wake);
    window.addEventListener('knoux:engineering-visual-state', wake);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener('visibilitychange', wake);
      motion.removeEventListener('change', wake);
      window.removeEventListener('resize', wake);
      window.removeEventListener('knoux:engineering-visual-state', wake);
    };
  }, [state.preferences.motion, state.preferences.density]);

  return <div className="dev-living-mark" data-engineering-stage={state.engineering.stage} aria-hidden="true"><canvas ref={canvas} data-state={state.engineering.stage} /></div>;
}
