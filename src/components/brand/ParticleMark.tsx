import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

/**
 * The canonical KNOuX mark rendered as luminous particles.
 *
 * One component, one geometry: every surface that carries the mark (the
 * provider hero, the WordPress arrival gateway, future gateways) imports
 * this instead of re-drawing the paths. `patternId` must be unique per
 * rendered instance because SVG defs are document-global.
 */
export function ParticleMark({ patternId, className, dense = false }: Readonly<{
  patternId: string;
  className?: string;
  /** Tighter particle cell for large hero-scale renders. */
  dense?: boolean;
}>) {
  const cell = dense
    ? { w: 8, h: 9, dots: [[2, 2, 1.9, '#fff'], [6, 6, 1.3, '#c6a4ff'], [1, 7, 0.9, '#fff'], [6, 1, 0.7, '#b486ff']] as ReadonlyArray<readonly [number, number, number, string]> }
    : { w: 12, h: 13, dots: [[3, 3, 1.6, '#fff'], [9, 9, 1, '#c6a4ff'], [1, 10, 0.7, '#fff'], [8, 2, 0.5, '#b486ff']] as ReadonlyArray<readonly [number, number, number, string]> };
  return (
    <svg className={className} viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} aria-hidden="true">
      <defs>
        <pattern id={patternId} width={cell.w} height={cell.h} patternUnits="userSpaceOnUse">
          {cell.dots.map(([cx, cy, r, fill]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
          ))}
        </pattern>
      </defs>
      {MARK_PATHS.map(({ id, d }) => (
        <path key={id} d={d} fill={`url(#${patternId})`} stroke="#f3e8ff" strokeWidth="3.5" strokeDasharray="2 3" />
      ))}
    </svg>
  );
}
