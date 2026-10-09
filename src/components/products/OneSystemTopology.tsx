import type { SoftwareProduct } from '@/data/software';
import { ProductScene } from './ProductScene';

const paths = [
  ['Desktop shell', '19 modules · bilingual search'],
  ['Typed commands', 'Rust allowlist · no arbitrary shell'],
  ['Native workspaces', 'Maintenance · repair · development'],
  ['Protected data', 'Copy → flush → BLAKE3 → remove'],
  ['Developer Studio', 'Recognised caches · no credentials'],
] as const;

/** The labels index repository capabilities; they are not runtime status. */
export function OneSystemTopology({ product }: { product: SoftwareProduct }) {
  return (
    <figure className="one-topology">
      <div className="one-topology__object" aria-hidden="true">
        <ProductScene product={product} height={520} />
      </div>
      <svg className="one-topology__paths" viewBox="0 0 600 520" aria-hidden="true" focusable="false">
        <path d="M300 250 C250 150 150 125 95 85" />
        <path d="M300 250 C360 150 455 130 500 85" />
        <path d="M300 250 C390 225 430 245 515 270" />
        <path d="M300 250 C335 350 400 370 420 430" />
        <path d="M300 250 C225 290 160 325 80 365" />
      </svg>
      <nav className="one-topology__nodes" aria-label="ONE capability paths">
        {paths.map(([label, detail], index) => (
          <a key={label} className={`one-topology__node one-topology__node--${index + 1}`}
            href={`#${product.slug}-capability-${index + 1}`} title={product.capabilities[index]}>
            <span className="one-topology__number" aria-hidden="true">0{index + 1}</span>
            <strong>{label}</strong>
            <span>{detail}</span>
          </a>
        ))}
      </nav>
      <figcaption>One shell. Connected capabilities.<span>Repository evidence · Windows runtime unverified</span></figcaption>
    </figure>
  );
}
