'use client';

/**
 * Live preview.
 *
 * The only runtime that exists in the hosted product is the deployment itself,
 * so the default target is its own origin. That is a real, reachable URL
 * rendering real pages — not a screenshot and not a mock.
 *
 * The visual inspector reports only what a browser genuinely knows: tag, id,
 * class list, box, computed styles, role and DOM label/text. Component-to-
 * source mapping is reported as unavailable because no source map for React
 * components exists in this build.
 */

import { useEffect, useRef, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Chips, Empty, Pane, Section, StatusBadge } from '../workspace/Primitives';
import type { PreviewViewport } from '@/lib/build/types';

const VIEWPORTS: PreviewViewport[] = [
  { id: 'desktop', label: 'DESKTOP', width: 1600, height: 1000 },
  { id: 'laptop', label: 'LAPTOP', width: 1440, height: 900 },
  { id: 'laptop-sm', label: '1366', width: 1366, height: 768 },
  { id: 'tablet-l', label: '1024', width: 1024, height: 768 },
  { id: 'tablet', label: 'TABLET', width: 768, height: 1024 },
  { id: 'phone-lg', label: '430', width: 430, height: 932 },
  { id: 'phone', label: '390', width: 390, height: 844 },
  { id: 'phone-sm', label: '375', width: 375, height: 812 },
];

const ROUTES = ['/', '/about', '/work', '/products', '/build', '/engineering', '/contact'];

type Inspected = {
  tag: string;
  id: string | null;
  classes: string[];
  box: { width: number; height: number; top: number; left: number };
  role: string | null;
  accessibleName: string | null;
  styles: { property: string; value: string }[];
};

export function PreviewSurface({ cinematic = false }: { cinematic?: boolean }) {
  const { state, dispatch } = useBuildWorkspace();
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const [inspectorReady, setInspectorReady] = useState(false);
  const [frameLoad, setFrameLoad] = useState(0);

  const origin = state.runtime.url;
  const route = state.workspace.selectedRoute ?? '/';
  const target = origin ? `${origin}${route}` : null;
  const livePreviewCapability = state.adapter.capabilities['preview.live'];
  const viewport = state.preview.viewport;
  const scale = Math.min(1, (availableWidth || viewport.width) / viewport.width, 620 / viewport.height);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, livePreviewCapability]);

  useEffect(() => {
    if (!inspecting || !inspectorReady) return;
    let document: Document | null = null;
    try { document = frame.current?.contentDocument ?? null; } catch { return; }
    if (!document) return;
    const inspect = (event: MouseEvent) => {
      const element = event.target as Element | null;
      const view = document?.defaultView;
      if (!element?.getBoundingClientRect || !view) return;
      event.preventDefault();
      event.stopPropagation();
      const box = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      setInspected({
        tag: element.tagName.toLowerCase(), id: element.id || null, classes: Array.from(element.classList),
        box: { width: box.width, height: box.height, top: box.top, left: box.left },
        role: element.getAttribute('role'),
        accessibleName: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 160) ?? null,
        styles: ['color', 'background-color', 'font-size', 'display', 'padding', 'border-radius'].map((property) => ({ property, value: style.getPropertyValue(property) })),
      });
    };
    document.addEventListener('click', inspect, true);
    return () => document?.removeEventListener('click', inspect, true);
  }, [inspecting, inspectorReady, frameLoad]);

  if (state.adapter.capabilities['preview.live'] !== 'available') {
    return (
      <Pane title="Preview">
        <Blocked
          title="NO ACTIVE RUNTIME"
          body="No runtime URL is available in this environment, so there is nothing real to load."
          requirement={state.adapter.blockers['preview.live']}
        />
      </Pane>
    );
  }

  return (
    <Pane
      title="Preview"
      meta={
        <>
          <span>{viewport.width}×{viewport.height}</span>
          <StatusBadge status="available" label="LIVE" />
        </>
      }
      actions={
        <button
          type="button"
          className="bo-chip"
          aria-pressed={inspecting}
          onClick={() => setInspecting((value) => !value)}
          disabled={!inspectorReady || state.adapter.capabilities['preview.inspect'] !== 'available'}
          title={inspectorReady ? 'Report the DOM facts a browser can confirm' : 'Inspection requires a loaded same-origin preview'}
        >
          INSPECT
        </button>
      }
    >
      <div className="bo-splitbar">
        <Chips
          ariaLabel="Preview route"
          options={ROUTES.map((item) => ({ id: item, label: item }))}
          value={route}
          onChange={(id) => dispatch({ type: 'route/select', route: id })}
        />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="bo-chip"
            onClick={() => dispatch({ type: 'preview/refresh' })}
            title="Reload the frame"
          >
            REFRESH
          </button>
        </span>
      </div>

      {cinematic ? <details className="dev-preview-evidence">
        <summary>More viewport sizes · current {viewport.width}×{viewport.height}</summary>
        <Chips ariaLabel="Additional preview viewports" options={VIEWPORTS.filter((item) => !['desktop', 'tablet', 'phone'].includes(item.id)).map((item) => ({ id: item.id, label: item.label }))} value={viewport.id} onChange={(id) => {
          const found = VIEWPORTS.find((item) => item.id === id);
          if (found) dispatch({ type: 'preview/viewport', viewport: found });
        }} />
      </details> : null}
      <div className="bo-splitbar">
        <Chips
          ariaLabel="Preview viewport"
          options={(cinematic ? VIEWPORTS.filter((item) => ['desktop', 'tablet', 'phone'].includes(item.id)) : VIEWPORTS).map((item) => ({ id: item.id, label: item.id === 'phone' && cinematic ? 'MOBILE' : item.label }))}
          value={viewport.id}
          onChange={(id) => {
            const found = VIEWPORTS.find((item) => item.id === id);
            if (found) dispatch({ type: 'preview/viewport', viewport: found });
          }}
        />
      </div>

      <div className="bo-preview">
        {target ? (
          <div className="bo-preview__stage" ref={stage}>
            <div className="bo-preview__scaled" style={{ width: viewport.width * scale, height: viewport.height * scale }}>
              <div className="bo-preview__frame" style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})` }}>
                <iframe
                  key={`${target}-${state.preview.refreshKey}`}
                  ref={frame}
                  onLoad={() => {
                    let readable = false;
                    try { readable = !!frame.current?.contentDocument?.body; } catch { /* Cross-origin documents cannot be inspected. */ }
                    setInspectorReady(readable);
                    setInspected(null);
                    setFrameLoad((count) => count + 1);
                  }}
                  src={target}
                  title={`Live preview of ${route}`}
                  width={viewport.width}
                  height={viewport.height}
                  style={{ width: viewport.width, height: viewport.height }}
                  sandbox="allow-same-origin allow-scripts allow-popups"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        ) : (
          <Empty title="NO ACTIVE RUNTIME" body="No reachable URL was reported for this environment." />
        )}

        <details className="dev-preview-evidence" open={cinematic ? undefined : true}>
        <summary>Runtime & preview evidence</summary>
        <dl className="bo-kv" style={{ width: '100%' }}>
          <dt>Runtime URL</dt>
          <dd>{target ?? 'NONE'}</dd>
          <dt>Source</dt>
          <dd>The deployment itself. There is no separate dev server to start in the hosted product.</dd>
          <dt>Viewport</dt>
          <dd>
            {viewport.width}×{viewport.height}
          </dd>
          <dt>Process control</dt>
          <dd>
            <StatusBadge status="blocked" label="BLOCKED" /> {state.runtime.blocker}
          </dd>
          <dt>Component source mapping</dt>
          <dd>
            <StatusBadge status="unavailable" label="UNAVAILABLE" /> No React component-to-source map exists in
            this build, so the inspector reports DOM facts only and does not claim a line number.
          </dd>
        </dl>
        </details>

        {inspecting ? (
          <Section label="Visual inspector">
            {inspected ? (
              <dl className="bo-kv">
                <dt>Element</dt>
                <dd>{inspected.tag}</dd>
                <dt>Id</dt>
                <dd>{inspected.id ?? 'NONE'}</dd>
                <dt>Classes</dt>
                <dd>{inspected.classes.length ? inspected.classes.join(' ') : 'NONE'}</dd>
                <dt>Box</dt>
                <dd>
                  {Math.round(inspected.box.width)}×{Math.round(inspected.box.height)} at {Math.round(inspected.box.left)},
                  {Math.round(inspected.box.top)}
                </dd>
                <dt>Role</dt>
                <dd>{inspected.role ?? 'IMPLICIT'}</dd>
                <dt>DOM label / text</dt>
                <dd>{inspected.accessibleName ?? 'NONE'}</dd>
                {inspected.styles.map((style) => (
                  <div key={style.property} style={{ display: 'contents' }}>
                    <dt>{style.property}</dt>
                    <dd>{style.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="bo-note">
                Click an element inside the frame while inspection is armed. The frame reports only tag, id, classes,
                box, computed styles, role and DOM label/text.
              </p>
            )}
          </Section>
        ) : null}
      </div>
    </Pane>
  );
}
