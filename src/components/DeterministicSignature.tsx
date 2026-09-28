import type { CSSProperties } from 'react';

const signatureKinds = [
  'orbit',
  'topology',
  'data-field',
  'architecture-grid',
  'particle-cloud',
  'relationship-map',
  'signal-wave',
] as const;

type SignatureKind = (typeof signatureKinds)[number];

function point(seed: number, index: number) {
  const x = 8 + ((seed * 29 + index * 37) % 84);
  const y = 10 + ((seed * 43 + index * 23) % 80);
  return { x, y };
}

export function DeterministicSignature({
  seed,
  label,
  compact = false,
}: {
  seed: number;
  label: string;
  compact?: boolean;
}) {
  const kind: SignatureKind = signatureKinds[Math.abs(seed) % signatureKinds.length];
  const points = Array.from({ length: compact ? 8 : 12 }, (_, index) => point(seed + 11, index));
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div
      className={`signature-field ${compact ? 'signature-field--compact' : ''}`}
      data-signature={kind}
      aria-hidden="true"
      style={
        {
          '--signature-phase': `${(seed * 47) % 360}deg`,
          '--signature-shift': `${((seed * 13) % 9) - 4}px`,
        } as CSSProperties
      }
    >
      <svg className="signature-field__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle className="signature-field__orbit signature-field__orbit--outer" cx="50" cy="50" r="34" />
        <circle className="signature-field__orbit signature-field__orbit--inner" cx="50" cy="50" r="19" />
        <path className="signature-field__axis" d="M8 50 H92 M50 8 V92" />
        <polyline className="signature-field__trace" points={polyline} />
        {points.map(({ x, y }, index) => (
          <circle
            className="signature-field__node"
            key={`${x}-${y}-${index}`}
            cx={x}
            cy={y}
            r={index % 4 === 0 ? 1.8 : 0.85}
          />
        ))}
      </svg>
      <span className="signature-field__code">
        {label} / {kind.replaceAll('-', ' ').toUpperCase()}
      </span>
    </div>
  );
}
