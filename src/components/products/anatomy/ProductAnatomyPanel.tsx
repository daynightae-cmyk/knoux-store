'use client';

import type { ProductAnatomyNode, ProductAnatomyNodeKind } from '@/data/product-anatomy-data';

interface ProductAnatomyPanelProps {
  node: ProductAnatomyNode | null;
  onClear: () => void;
}

const kindLabels: Record<ProductAnatomyNodeKind, string> = {
  core: 'Core Identity',
  capability: 'Capability',
  technology: 'Technology',
  boundary: 'Boundary',
  evidence: 'Evidence',
  related: 'Related System',
};

const kindDescriptions: Record<ProductAnatomyNodeKind, string> = {
  core: 'The central product identity and purpose.',
  capability: 'A verified capability as stated by the repository.',
  technology: 'An implementation technology used by the product.',
  boundary: 'A stated limitation or safety constraint.',
  evidence: 'A repository artefact supporting product claims.',
  related: 'A related product in the KNOuX universe.',
};

export function ProductAnatomyPanel({ node, onClear }: ProductAnatomyPanelProps) {
  if (!node) {
    return (
      <div className="product-anatomy-panel product-anatomy-panel--idle">
        <div className="product-anatomy-panel__idle">
          <span className="label label--signal">SYSTEM ANATOMY</span>
          <h3>Explore the system</h3>
          <p>Select a node in the constellation to inspect its role, evidence, and relationships.</p>
          <ul className="product-anatomy-panel__hints">
            <li><kbd>Click</kbd> or <kbd>Tap</kbd> a node to select</li>
            <li><kbd>Drag</kbd> to orbit the view</li>
            <li><kbd>Esc</kbd> to clear selection</li>
          </ul>
        </div>
      </div>
    );
  }

  const kindLabel = kindLabels[node.kind];
  const kindDescription = kindDescriptions[node.kind];

  return (
    <div className="product-anatomy-panel" role="region" aria-label={`${kindLabel} details`}>
      <div className="product-anatomy-panel__header">
        <div className="product-anatomy-panel__kind-badge">
          <span className={`product-anatomy-panel__kind product-anatomy-panel__kind--${node.kind}`}>
            {kindLabel}
          </span>
          {node.emphasis && (
            <span className={`product-anatomy-panel__emphasis product-anatomy-panel__emphasis--${node.emphasis}`}>
              {node.emphasis}
            </span>
          )}
        </div>
        <button
          className="product-anatomy-panel__clear"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <h3 className="product-anatomy-panel__title">{node.label}</h3>

      <p className="product-anatomy-panel__description">{kindDescription}</p>

      <div className="product-anatomy-panel__summary">
        <h4>Summary</h4>
        <p>{node.summary}</p>
      </div>

      {node.sourceRefs.length > 0 && (
        <div className="product-anatomy-panel__evidence">
          <h4>Evidence Sources</h4>
          <ul>
            {node.sourceRefs.map((ref) => (
              <li key={ref}>
                <code>{ref}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.kind === 'boundary' && (
        <div className="product-anatomy-panel__boundary">
          <h4>Stated Limitation</h4>
          <p>{node.summary}</p>
        </div>
      )}

      {node.kind === 'evidence' && node.route && (
        <div className="product-anatomy-panel__action">
          <a
            href={node.route}
            target="_blank"
            rel="noreferrer noopener"
            className="action"
          >
            View Repository
            <span className="action-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      {node.kind === 'related' && node.route && (
        <div className="product-anatomy-panel__action">
          <a
            href={node.route}
            className="action"
          >
            Open Related Dossier
            <span className="action-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      {node.relatedNodeIds.length > 0 && (
        <div className="product-anatomy-panel__relations">
          <h4>Connections</h4>
          <ul>
            {node.relatedNodeIds.map((id) => (
              <li key={id}>
                <span className="mono">{id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}