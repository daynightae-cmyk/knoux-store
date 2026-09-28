'use client';

import { useBuildWorkspace } from './KnouxBuildWorkspace';
import type { BuildCapability, WorkspaceSurface } from '@/lib/build/types';

type Mode = {
  id: WorkspaceSurface;
  label: string;
  /** The capability that must be available for the mode to be usable. */
  requires: BuildCapability | null;
  glyph: string;
};

/**
 * Eight primary modes. `genesis` is the Composer, which is preserved and is the
 * entry point rather than a mode the user is locked into.
 */
export const WORKSPACE_MODES: readonly Mode[] = [
  { id: 'genesis', label: 'Deck', requires: null, glyph: 'deck' },
  { id: 'code', label: 'Code', requires: 'project.files', glyph: 'code' },
  { id: 'preview', label: 'Preview', requires: 'preview.live', glyph: 'preview' },
  { id: 'terminal', label: 'Term', requires: 'terminal.interactive', glyph: 'terminal' },
  { id: 'system', label: 'System', requires: 'project.read', glyph: 'system' },
  { id: 'data', label: 'Data', requires: 'database.read', glyph: 'data' },
  { id: 'tests', label: 'Tests', requires: 'test.run', glyph: 'tests' },
  { id: 'git', label: 'Git', requires: 'git.read', glyph: 'git' },
  { id: 'release', label: 'Release', requires: null, glyph: 'release' },
];

function Glyph({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round' as const };
  return (
    <svg className="bo-rail__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {name === 'deck' && <><path d="M2 4h12M2 8h8M2 12h5" {...common} /></>}
      {name === 'code' && <><path d="M6 4L2 8l4 4M10 4l4 4-4 4" {...common} /></>}
      {name === 'preview' && <><rect x="2" y="3" width="12" height="10" {...common} /><path d="M2 6h12" {...common} /></>}
      {name === 'terminal' && <><rect x="2" y="3" width="12" height="10" {...common} /><path d="M5 7l2 2-2 2M9 11h3" {...common} /></>}
      {name === 'system' && <><rect x="2.5" y="2.5" width="11" height="11" {...common} /><path d="M2.5 6h11M6 6v7.5" {...common} /></>}
      {name === 'data' && <><ellipse cx="8" cy="4.5" rx="5.5" ry="2" {...common} /><path d="M2.5 4.5v7c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-7" {...common} /></>}
      {name === 'tests' && <><path d="M3 2v6a4 4 0 004 4h6" {...common} /><path d="M11 9l2 2-2 2" {...common} /><circle cx="3" cy="2" r="1" {...common} /></>}
      {name === 'git' && <><circle cx="4.5" cy="3.5" r="1.6" {...common} /><circle cx="4.5" cy="12.5" r="1.6" {...common} /><circle cx="11.5" cy="8" r="1.6" {...common} /><path d="M4.5 5.1v5.8M6.1 8h3.8" {...common} /></>}
      {name === 'release' && <><path d="M8 2l5 2.6v5L8 14l-5-4.4v-5z" {...common} /><path d="M3 4.6L8 7.2l5-2.6M8 7.2V14" {...common} /></>}
    </svg>
  );
}

export function WorkspaceModeSwitcher() {
  const { state, dispatch } = useBuildWorkspace();
  const active = state.workspace.activeSurface;

  return (
    <nav className="bo-rail" aria-label="Build OS workspace modes">
      {WORKSPACE_MODES.map((mode) => {
        const isCurrent = active === mode.id;
        const status = mode.requires ? state.adapter.capabilities[mode.requires] : 'available';
        // A blocked mode stays reachable. Hiding it would hide the blocker.
        const reachable = mode.requires === null || status === 'available';
        return (
          <button
            key={mode.id}
            type="button"
            className="bo-rail__btn"
            aria-current={isCurrent}
            title={
              mode.requires === null
                ? mode.label
                : `${mode.label} — ${status}${
                    reachable ? '' : `. ${state.adapter.blockers[mode.requires] ?? 'Not available here.'}`
                  }`
            }
            onClick={() => dispatch({ type: 'surface/active', surface: mode.id })}
          >
            <Glyph name={mode.glyph} />
            <span>{mode.label}</span>
            <span className="bo-rail__dot" aria-hidden="true" data-status={status} />
          </button>
        );
      })}
      <span className="bo-rail__spacer" />
    </nav>
  );
}
