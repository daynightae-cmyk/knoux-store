'use client';

import { useRef } from 'react';
import type { ProductAnatomyNode, ProductAnatomyNodeKind } from '@/data/product-anatomy-data';

type Props = {
  nodes: ProductAnatomyNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeHover: (id: string | null) => void;
  onNodeSelect: (id: string | null) => void;
  onClear: () => void;
};

const kindLabels: Record<ProductAnatomyNodeKind, string> = {
  core: 'Core identity', capability: 'Capability', technology: 'Technology',
  boundary: 'Stated limit', evidence: 'Evidence', related: 'Related system',
};

export function ProductAnatomyIndex({ nodes, selectedNodeId, hoveredNodeId, onNodeHover, onNodeSelect, onClear }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const selected = nodes.find((node) => node.id === selectedNodeId);
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'Escape') { onClear(); return; }
    else return;
    event.preventDefault();
    buttons[next]?.focus();
  };
  return <div className="product-anatomy-index" role="region" aria-label="Product system anatomy node index">
    <p className="product-anatomy-index__instructions">Select a node to read its verified details. Use Tab or arrow keys to move, Enter to select, Escape to clear.</p>
    <ul className="product-anatomy-index__list" ref={listRef} onKeyDown={onKeyDown}>
      {nodes.map((node) => <li key={node.id} className={`product-anatomy-index__item product-anatomy-index__item--${node.kind} ${node.id === selectedNodeId ? 'is-selected' : ''} ${node.id === hoveredNodeId ? 'is-hovered' : ''}`}>
        <button type="button" className="product-anatomy-index__button" aria-pressed={node.id === selectedNodeId}
          onClick={() => onNodeSelect(node.id === selectedNodeId ? null : node.id)}
          onFocus={() => onNodeHover(node.id)} onBlur={() => onNodeHover(null)}
          onMouseEnter={() => onNodeHover(node.id)} onMouseLeave={() => onNodeHover(null)}>
          <span className="product-anatomy-index__kind-badge"><span className={`product-anatomy-index__kind product-anatomy-index__kind--${node.kind}`}>{kindLabels[node.kind]}</span></span>
          <span className="product-anatomy-index__label">{node.label}</span>
          {node.id === selectedNodeId ? <span className="product-anatomy-index__selected-indicator" aria-hidden="true">✓</span> : null}
        </button>
      </li>)}
    </ul>
    <p className="product-anatomy-index__live" role="status" aria-live="polite" aria-atomic="true">{selected ? `${kindLabels[selected.kind]} selected: ${selected.label}. ${selected.summary}` : 'No node selected.'}</p>
  </div>;
}
