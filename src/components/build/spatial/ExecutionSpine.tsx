'use client';

/**
 * Execution Spine.
 *
 * The vertical engineering timeline. It owns a bounded, normalised progress
 * value and nothing else.
 *
 * Two mechanics from the reference prototype are deliberately rejected:
 *   - the 6000vh scroll space that turned the page into a slider
 *   - the `scrollTo` call inside the scrub handler
 *
 * Both are scroll hijacking, and both are replaced here by a stage selector
 * that lives on the surface it belongs to. Page scroll is never touched, so
 * the workspace remains a document and not a viewport trick.
 *
 * Accessibility: it is a real `tablist`. Click, drag, arrow keys, Home/End and
 * PageUp/PageDown all move the stage, and every tick has an accessible name.
 */

import { useCallback, useRef } from 'react';
import { STAGES, type StageId } from '@/lib/build/stages';
import { clamp01, progressFromPointer } from '@/lib/build/spatial';

type Props = {
  progress: number;
  activeStage: StageId;
  /** Whether a stage's capability is actually available here. */
  stageAvailable: (stageId: StageId) => boolean;
  onProgress: (progress: number) => void;
  onSelect: (stageId: StageId) => void;
};

export function ExecutionSpine({ progress, activeStage, stageAvailable, onProgress, onSelect }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const scrub = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      onProgress(progressFromPointer(clientY, rect));
    },
    [onProgress],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      scrub(event.clientY);
    },
    [scrub],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      scrub(event.clientY);
    },
    [scrub],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const current = STAGES.findIndex((stage) => stage.id === activeStage);
      const last = STAGES.length - 1;
      let next = current;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = current + 1;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = current - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      else if (event.key === 'PageDown') next = current + 2;
      else if (event.key === 'PageUp') next = current - 2;
      else return;
      event.preventDefault();
      const clamped = Math.max(0, Math.min(last, next));
      onSelect(STAGES[clamped].id);
    },
    [activeStage, onSelect],
  );

  const current = STAGES.find((stage) => stage.id === activeStage) ?? STAGES[0];
  const pct = clamp01(progress) * 100;

  return (
    <div className="sp-spine">
      <div
        className="sp-spine__track"
        ref={trackRef}
        role="tablist"
        aria-label="Engineering stages"
        aria-orientation="vertical"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="sp-spine__trackline" aria-hidden="true" />
        <span className="sp-spine__fill" style={{ height: `${pct}%` }} aria-hidden="true" />

        {STAGES.map((stage) => {
          const isActive = stage.id === current.id;
          const isPast = stage.index < current.index;
          const available = stageAvailable(stage.id);
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${stage.name}${available ? '' : ' — capability unavailable here'}`}
              className="sp-spine__tick"
              data-active={isActive}
              data-past={isPast}
              data-available={available}
              style={{ top: `${(stage.index / (STAGES.length - 1)) * 100}%` }}
              onClick={(event) => {
                // A click on the rail must not also start a drag.
                event.stopPropagation();
                onSelect(stage.id);
              }}
            >
              <span className="sp-spine__dot" aria-hidden="true" />
              <span className="sp-spine__label">{stage.name}</span>
            </button>
          );
        })}

        <span className="sp-spine__indicator" style={{ top: `${pct}%` }} aria-hidden="true" />
      </div>
      <span className="bo-visually-hidden" role="status" aria-live="polite">
        Stage {current.index + 1} of {STAGES.length}: {current.name}
      </span>
    </div>
  );
}
