'use client';

/**
 * ExperimentChamberV2 — KNOuX Labs / Science Lab SDF Dot-Matrix Chamber
 *
 * Replaces the simplistic decorative ring/seed field with the living
 * Science Lab SDF dot-matrix computational instrument.
 *
 * Three-zone structure:
 *   LEFT / CENTER : Interactive LabMaterialField (Three.js SDF Dot-Matrix)
 *   RIGHT DOSSIER : Research record, evidence, stack, repository link
 *   BOTTOM SELECTOR: LAB-01 Quill vs LAB-02 Crypt (keyboard-accessible buttons)
 *
 * Truth integrity:
 *   - Only two real research experiments: LAB-01 KNOuX Quill and LAB-02 KNOuX Crypt
 *   - Preserves research status (never claimed as released software)
 *   - Synchronizes selection with URL hash (#lab-quill, #lab-crypt)
 */

import { useEffect, useState, useCallback } from 'react';
import { labExperiments } from '@/data/software';
import { LabMaterialField } from './LabMaterialField';

export function ExperimentChamberV2() {
  const [active, setActive] = useState(0);

  // Hash-based synchronization
  useEffect(() => {
    const selectFromHash = () => {
      const index = labExperiments.findIndex((entry) => `#${entry.id}` === window.location.hash);
      if (index >= 0) setActive(index);
    };

    selectFromHash();
    window.addEventListener('hashchange', selectFromHash);
    return () => window.removeEventListener('hashchange', selectFromHash);
  }, []);

  const selectExperiment = useCallback((index: number) => {
    setActive(index);
    const experiment = labExperiments[index];
    if (experiment && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${experiment.id}`);
    }
  }, []);

  const experiment = labExperiments[active] || labExperiments[0];

  return (
    <div
      className="experiment-chamber experiment-chamber--v2 spatial-surface"
      data-spatial
      data-experiment={experiment.id}
    >
      {/* LEFT / CENTER: Scientific SDF Dot-Matrix Field */}
      <div className="experiment-chamber__field" aria-hidden="true">
        <LabMaterialField activeExperimentId={experiment.id} />
        <small className="experiment-chamber__meta-note">
          PROTOTYPE FIELD / NOT A RELEASE
        </small>
      </div>

      {/* RIGHT DOSSIER: Real Research Facts */}
      <div className="experiment-chamber__body" key={experiment.id}>
        <span className="label label--signal">
          EXPERIMENT {String(active + 1).padStart(2, '0')} / {experiment.status.toUpperCase()}
        </span>
        <h3>{experiment.name}</h3>
        <p>{experiment.statement}</p>

        <div className="experiment-chamber__evidence">
          <small>EVIDENCE</small>
          <span>{experiment.evidence}</span>
        </div>

        <div className="experiment-chamber__stack">
          <small>STACK</small>
          <span>{experiment.stack}</span>
        </div>

        <a
          href={experiment.repository}
          target="_blank"
          rel="noopener noreferrer"
          className="action"
        >
          INSPECT REPOSITORY <span className="action-arrow" aria-hidden="true">↗</span>
        </a>
      </div>

      {/* BOTTOM / EDGE SELECTOR */}
      <div
        className="experiment-chamber__selector"
        role="group"
        aria-label="Choose a lab experiment"
      >
        {labExperiments.map((entry, index) => (
          <button
            id={entry.id}
            key={entry.id}
            type="button"
            onClick={() => selectExperiment(index)}
            aria-pressed={active === index}
            className={active === index ? 'is-active' : ''}
            aria-label={`Select ${entry.code} ${entry.name}`}
          >
            {entry.code}
            <span>{entry.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
