'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

const FLOWS = {
  growth: { label: 'GROWTH / THE CONNECTED WORK', title: 'A signal becomes a system.', statement: 'The operating sequence, from a business objective to measured improvement. This describes the architecture; campaign metrics appear only in the authenticated Command workspace.', nodes: [
    ['Strategy', '/growth#flow', 'Define the objective and constraints.'], ['Content', '/growth/content', 'Build the editorial substance.'], ['Creative', '/creative/campaign-creative', 'Shape the message for its medium.'], ['Distribution', '/growth/social', 'Connect publishing and community.'], ['Campaign', '/growth/meta-ads', 'Configure the paid acquisition layer.'], ['Analytics', '/command/analytics', 'Inspect attributed, scoped evidence.'], ['Optimization', '/command/intelligence', 'Use measured results to choose the next action.'],
  ] },
  wordpress: { label: 'WORDPRESS / LIVING INFRASTRUCTURE', title: 'Every layer has an owner.', statement: 'Select the name, connect the infrastructure, compose the editorial system, then operate the real install through a trusted executor.', nodes: [
    ['Domain', '#domain', 'Search first. Registration requires an operator.'], ['Host', '#infrastructure', 'A configured hosting provider and site.'], ['WordPress', '#library', 'The actual editorial runtime.'], ['Theme', '/wordpress/themes', 'The visual foundation.'], ['Plugins', '/wordpress/plugins', 'Named, versioned capabilities.'], ['Content', '/wordpress/patterns', 'Reusable editorial composition.'], ['Security', '#operate', 'Scope access, updates and recovery.'], ['Deploy', '#operate', 'Explicitly approve a trusted operation.'],
  ] },
} as const;

export function ProcessArchitecture({ kind }: { kind: keyof typeof FLOWS }) {
  const flow = FLOWS[kind];
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
    }, { threshold: 0.65 });
    root.current?.querySelectorAll('li').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return <section ref={root} className={`process-architecture process-architecture--${kind}`} aria-label={`${kind} process architecture`}><header><div><span className="label label--signal">{flow.label}</span><h2>{flow.title}</h2></div><p>{flow.statement}</p></header><ol>{flow.nodes.map(([name, href, detail], index) => <li key={name}><Link href={href}><span className="process-architecture__index">{String(index + 1).padStart(2, '0')}</span><strong>{name}</strong><p>{detail}</p><span className="process-architecture__open" aria-hidden="true">↗</span></Link></li>)}</ol></section>;
}
