'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import type { EngineeringPlan } from '@/lib/build/engineering-plan';
import styles from './generator.module.css';
import previewStyles from './preview-workspace.module.css';

const Preview = dynamic(() => import('../surfaces/PreviewSurface').then((mod) => mod.PreviewSurface), { ssr: false });

type Props = {
  plan: EngineeringPlan;
  onClose: () => void;
  onBackToPlan: () => void;
};

export function SplitView({ plan, onClose, onBackToPlan }: Props) {
  const [activeEntry, setActiveEntry] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('split');
  const proposals = plan['FILES / MODULES'];
  const proposal = activeEntry === null ? undefined : proposals[activeEntry];

  return (
    <section className={styles.splitView} role="region" aria-label="Generation result: preview and code">
      <header className={styles.splitViewHeader}>
        <div className={styles.splitViewTitle}>
          <span className={styles.splitViewBadge}>PLAN READY</span>
          <h2>Preview & Code</h2>
        </div>
        <div className={styles.splitViewActions}>
          <button
            type="button"
            className={`${styles.splitViewModeBtn} ${viewMode === 'preview' ? styles.active : ''}`}
            onClick={() => setViewMode('preview')}
            aria-pressed={viewMode === 'preview'}
          >
            <span aria-hidden="true">▦</span> Preview
          </button>
          <button
            type="button"
            className={`${styles.splitViewModeBtn} ${viewMode === 'split' ? styles.active : ''}`}
            onClick={() => setViewMode('split')}
            aria-pressed={viewMode === 'split'}
          >
            <span aria-hidden="true">⛶</span> Split
          </button>
          <button
            type="button"
            className={`${styles.splitViewModeBtn} ${viewMode === 'code' ? styles.active : ''}`}
            onClick={() => setViewMode('code')}
            aria-pressed={viewMode === 'code'}
          >
            <span aria-hidden="true">▤</span> Code
          </button>
          <button type="button" className={styles.splitViewClose} onClick={onClose} aria-label="Close split view">
            ✕
          </button>
        </div>
      </header>

      <div className={styles.splitViewBody} data-view={viewMode}>
      {viewMode !== 'code' && (
        <div className={`${styles.splitViewPreview} ${previewStyles.preview}`}>
          <Preview cinematic workspace />
        </div>
      )}

      {viewMode !== 'preview' && (
      <div className={styles.splitViewCode}>
        <aside className={styles.splitViewFileTree}>
          <h3>Proposed files and modules</h3>
          <ul className={styles.splitViewFileList}>
              {proposals.map((entry, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className={`${styles.splitViewFileBtn} ${activeEntry === index ? styles.active : ''}`}
                    aria-pressed={activeEntry === index}
                    onClick={() => setActiveEntry(index)}
                  >
                    <span>{entry.length > 85 ? `${entry.slice(0, 84)}…` : entry}</span>
                  </button>
                </li>
              ))}
            </ul>
        </aside>

        {proposal && (
          <div className={styles.splitViewEditor}>
            <header className={styles.splitViewEditorHeader}>
              <span className={styles.splitViewEditorFilename}>Plan entry</span>
              <button type="button" className={styles.splitViewEditorClose} onClick={() => setActiveEntry(null)} aria-label="Close plan entry">✕</button>
            </header>
            <pre className={styles.splitViewEditorContent}>
              {proposal}
            </pre>
          </div>
        )}

        {!proposal && (
          <div className={styles.splitViewEditorPlaceholder}>
            <span aria-hidden="true">▤</span>
            <p>Select a proposal to read its full plan entry.</p>
          </div>
        )}
      </div>
      )}
      </div>

      <footer className={styles.splitViewFooter}>
        <button type="button" className={styles.splitViewBackBtn} onClick={onBackToPlan}>
          <span aria-hidden="true">←</span> Back to Plan
        </button>
        <Link href="/build/pipeline" target="_blank" rel="noopener noreferrer" className={styles.splitViewVerifyBtn}>
          <span aria-hidden="true">⌁</span> Verify in Pipeline
        </Link>
      </footer>
    </section>
  );
}
