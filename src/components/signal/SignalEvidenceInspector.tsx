'use client';

import type { EvidenceNode } from '@/lib/signal/evidenceLayout';
import styles from '@/app/signal/signal.module.css';

const CATEGORY_LABEL: Record<EvidenceNode['category'], string> = {
  VERIFIED_CLAIM: 'Verified profile',
  COMMUNITY_ALIAS: 'Community label',
  BUSINESS_IDENTITY: 'Business identity',
  PUBLIC_WEB_MENTION: 'Public mention',
  REPUTATION: 'Reputation',
};

export function SignalEvidenceInspector({
  node,
  onClose,
}: {
  node: EvidenceNode | null;
  onClose: () => void;
}) {
  if (!node) return null;

  return (
    <aside className={styles.inspector} role="dialog" aria-label="Evidence inspector">
      <button
        type="button"
        className={styles.inspectorClose}
        onClick={onClose}
        aria-label="Close evidence inspector"
      >
        ×
      </button>

      <span className={styles.micro}>
        EVIDENCE INSPECTOR · {CATEGORY_LABEL[node.category]}
      </span>
      <h2>{node.label}</h2>

      <dl>
        {node.details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {node.url ? (
        <a href={node.url} target="_blank" rel="noopener noreferrer">
          OPEN SOURCE ↗
        </a>
      ) : null}

      <p className={styles.inspectorTruth}>
        Public evidence does not establish registered ownership.
      </p>
    </aside>
  );
}
