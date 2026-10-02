export type WorkspacePreferences = { compact: boolean; showEvidence: boolean; motion: 'auto' | 'reduced'; density: 'low' | 'balanced'; viewport: 'laptop' | 'tablet' | 'phone'; editorWrap: boolean; evidence: boolean };
export const DEFAULT_PREFERENCES: WorkspacePreferences = { compact: false, showEvidence: true, motion: 'auto', density: 'balanced', viewport: 'laptop', editorWrap: true, evidence: true };
export const PREFERENCES_KEY = 'knoux-dev-preferences';
export function parsePreferences(raw: unknown): WorkspacePreferences {
  const p = typeof raw === 'object' && raw !== null ? raw as Partial<WorkspacePreferences> : {};
  return { compact: p.compact === true, showEvidence: p.showEvidence !== false, motion: p.motion === 'reduced' ? 'reduced' : 'auto', density: p.density === 'low' ? 'low' : 'balanced', viewport: p.viewport === 'tablet' || p.viewport === 'phone' ? p.viewport : 'laptop', editorWrap: p.editorWrap !== false, evidence: p.evidence !== false };
}
