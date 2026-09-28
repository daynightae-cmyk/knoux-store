'use client';

/**
 * Workspace canvas.
 *
 * Owns the split geometry and nothing else. The split is one of three
 * deterministic values rather than an arbitrary nested layout tree, because a
 * free-form pane system is a large amount of state that buys nothing at this
 * stage and cannot be made responsive without degrading into a mess on a phone.
 *
 * On a narrow viewport the secondary surface is dropped entirely: a phone gets
 * one surface at a time, which is the correct answer rather than a squeezed
 * four-pane IDE.
 */

import { useEffect, useState } from 'react';
import { useBuildWorkspace } from './KnouxBuildWorkspace';
import { Pane } from './Primitives';
import { CodeSurface } from '../surfaces/CodeSurface';
import { PreviewSurface } from '../surfaces/PreviewSurface';
import {
  TerminalSurface,
  SystemSurface,
  DataSurface,
  TestSurface,
  GitSurface,
  ReleaseSurface,
} from '../surfaces/CoreSurfaces';
import { ArchitectureSurface, ImpactRadar } from '../surfaces/ArchitectureSurface';
import {
  SenshialSurface,
  ProviderCenter,
  RealityLedger,
  ProjectHealth,
  ExecutionHistory,
} from '../surfaces/AiSurfaces';
import { DiagnosticsSurface } from '../surfaces/DiagnosticsSurface';
import { CommandDeck } from './CommandDeck';
import type { WorkspaceSurface } from '@/lib/build/types';

function renderSurface(surface: WorkspaceSurface) {
  switch (surface) {
    case 'genesis':
      return <CommandDeck onCompile={() => {}} />;
    case 'code':
      return <CodeSurface />;
    case 'preview':
      return <PreviewSurface />;
    case 'terminal':
      return <TerminalSurface />;
    case 'system':
      return <SystemSurface />;
    case 'data':
      return <DataSurface />;
    case 'tests':
      return <TestSurface />;
    case 'git':
      return <GitSurface />;
    case 'release':
      return <ReleaseSurface />;
    default:
      return <Pane title="Unknown surface">{null}</Pane>;
  }
}

const SPLITS = [
  { id: 'single', label: 'SINGLE' },
  { id: 'horizontal', label: 'SIDE BY SIDE' },
  { id: 'vertical', label: 'STACKED' },
] as const;

/** Senshial and the verification surfaces are useful as a second pane. */
const SECONDARY_CHOICES: { id: WorkspaceSurface; label: string }[] = [
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview' },
  { id: 'system', label: 'System' },
  { id: 'git', label: 'Git' },
  { id: 'tests', label: 'Tests' },
  { id: 'data', label: 'Data' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'release', label: 'Release' },
];

export function WorkspaceCanvas() {
  const { state, dispatch } = useBuildWorkspace();
  const { activeSurface, secondarySurface, splitMode } = state.workspace;
  const [wide, setWide] = useState(true);

  // The split collapses on a narrow viewport. Measured rather than assumed, and
  // re-measured on resize so a rotated tablet behaves correctly.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1181px)');
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const effectiveSplit = wide ? splitMode : 'single';
  const showSecondary = effectiveSplit !== 'single' && secondarySurface !== null;

  // Surfaces that own the whole canvas when they are the only one.
  if (effectiveSplit === 'single') {
    return <SurfaceSwitch surface={activeSurface} />;
  }

  return (
    <>
      <div className="bo-splitbar">
        <div className="bo-seg" role="group" aria-label="Split layout">
          {SPLITS.map((split) => (
            <button
              key={split.id}
              type="button"
              aria-pressed={splitMode === split.id}
              onClick={() => dispatch({ type: 'split/set', mode: split.id })}
            >
              {split.label}
            </button>
          ))}
        </div>
        <div className="bo-seg" role="group" aria-label="Secondary surface">
          {SECONDARY_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              aria-pressed={secondarySurface === choice.id}
              onClick={() => dispatch({ type: 'surface/secondary', surface: choice.id })}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bo-split" data-split={effectiveSplit}>
        <SurfaceSwitch surface={activeSurface} />
        {showSecondary ? <SurfaceSwitch surface={secondarySurface} key={secondarySurface} /> : null}
      </div>
    </>
  );
}

function SurfaceSwitch({ surface }: { surface: WorkspaceSurface }) {
  // The AI and verification surfaces are reachable as panes rather than rail
  // entries, so the rail stays at the eight primary modes the brief requires.
  if (surface === 'system') return <SystemCluster />;
  return renderSurface(surface);
}

function SystemCluster() {
  const [tab, setTab] = useState<'system' | 'cortex' | 'health' | 'ledger' | 'senshial' | 'providers' | 'diagnostics' | 'impact' | 'history'>('system');
  const tabs = [
    { id: 'system', label: 'System' },
    { id: 'cortex', label: 'Cortex' },
    { id: 'health', label: 'Health' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'senshial', label: 'Senshial' },
    { id: 'providers', label: 'Providers' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'impact', label: 'Impact' },
    { id: 'history', label: 'History' },
  ] as const;

  return (
    <div className="bo-pane" style={{ minHeight: 420 }}>
      <div className="bo-splitbar" role="tablist" aria-label="System cluster views">
        <div className="bo-seg">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bo-pane__body">
        {tab === 'system' ? <SystemSurface /> : null}
        {tab === 'cortex' ? <ArchitectureSurface /> : null}
        {tab === 'health' ? <ProjectHealth /> : null}
        {tab === 'ledger' ? <RealityLedger /> : null}
        {tab === 'senshial' ? <SenshialSurface /> : null}
        {tab === 'providers' ? <ProviderCenter /> : null}
        {tab === 'diagnostics' ? <DiagnosticsSurface /> : null}
        {tab === 'impact' ? <ImpactRadar /> : null}
        {tab === 'history' ? <ExecutionHistory /> : null}
      </div>
    </div>
  );
}
