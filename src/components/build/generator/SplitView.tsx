'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import type { EngineeringPlan } from '@/lib/build/engineering-plan';
import { PLAN_SECTIONS } from '@/lib/build/engineering-plan';
import styles from './generator.module.css';
import previewStyles from './preview-workspace.module.css';

const Preview = dynamic(() => import('../surfaces/PreviewSurface').then((mod) => mod.PreviewSurface), { ssr: false });

type Props = {
  plan: EngineeringPlan;
  onClose: () => void;
  onBackToPlan: () => void;
};

function extractFiles(plan: EngineeringPlan): Map<string, string> {
  const files = new Map<string, string>();
  PLAN_SECTIONS.forEach((section) => {
    const items = plan[section] || [];
    items.forEach((item) => {
      const pathMatch = item.match(/(?:file|path|create|write)\s+[:=]\s*[`"']?([\w/.-]+)/i);
      if (pathMatch) {
        files.set(pathMatch[1], item);
      }
    });
  });
  return files;
}

export function SplitView({ plan, onClose, onBackToPlan }: Props) {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('split');
  const filesMap = extractFiles(plan);
  const fileList = Array.from(filesMap.keys());
  const fileProposal = activeFile ? filesMap.get(activeFile) : undefined;

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
          <h3>Proposed files</h3>
          {fileList.length === 0 ? (
            <p className={styles.splitViewEmpty}>No files extracted from plan. Open the plan sections for details.</p>
          ) : (
            <ul className={styles.splitViewFileList}>
              {fileList.map((file) => (
                <li key={file}>
                  <button
                    type="button"
                    className={`${styles.splitViewFileBtn} ${activeFile === file ? styles.active : ''}`}
                    onClick={() => setActiveFile(file)}
                  >
                    <span aria-hidden="true">📄</span>
                    <span>{file}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {activeFile && fileProposal && (
          <div className={styles.splitViewEditor}>
            <header className={styles.splitViewEditorHeader}>
              <span className={styles.splitViewEditorFilename}>{activeFile}</span>
              <button type="button" className={styles.splitViewEditorClose} onClick={() => setActiveFile(null)} aria-label="Close file">✕</button>
            </header>
            <pre className={styles.splitViewEditorContent}>
              <code>{fileProposal}</code>
            </pre>
          </div>
        )}

        {!fileProposal && fileList.length > 0 && (
          <div className={styles.splitViewEditorPlaceholder}>
            <span aria-hidden="true">▤</span>
            <p>Select a file to read its plan entry.</p>
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
