'use client';

import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { StoreStarfieldPhase } from '@/lib/build/generator-state';

type SkyVisual = { phase: StoreStarfieldPhase; nodes: { id: string; x: number; y: number }[]; edges: { from: string; to: string }[] };
const AMBIENT: SkyVisual = { phase: 'ambient', nodes: [], edges: [] };
const VisualContext = createContext<SkyVisual>(AMBIENT);
const SetVisualContext = createContext<Dispatch<SetStateAction<SkyVisual>> | null>(null);

/** No DOM wrapper: the root sky and native page structure remain persistent. */
export function StoreStarfieldProvider({ children }: { children: ReactNode }) {
  const [visual, setVisual] = useState(AMBIENT);
  return <SetVisualContext.Provider value={setVisual}><VisualContext.Provider value={visual}>{children}</VisualContext.Provider></SetVisualContext.Provider>;
}
export function useStarfieldVisual() { return useContext(VisualContext); }
export function useSetStarfieldVisual() { return useContext(SetVisualContext); }
