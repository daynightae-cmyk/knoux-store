/**
 * The arrival figure.
 *
 * A KNOuX operator: an abstract technical silhouette drawn in the same language
 * as the Living Particle Mark — a dark graphite body, thin silver edges, a
 * single violet signal seam, and no face. It is drawn rather than imported, so
 * it costs nothing to render and carries no third-party brand, artwork or
 * likeness.
 *
 * The figure walks in from off-screen left, stops on the floor line, and the
 * signal node it carries activates. That beat replaces the reference's
 * handbag drop with something that belongs to this institution: an engineer
 * arriving at their own headquarters and opening the door.
 *
 * The walk cycle is CSS, so it costs no JavaScript per frame, and it stops
 * cleanly by removing the animation rather than looping.
 *
 * Proportions are drawn at roughly eight heads tall so the silhouette reads as
 * an adult standing figure rather than a mascot, while the internal detail stays
 * schematic.
 */

/**
 * Limb pivots, in viewBox units.
 *
 * Written onto the elements themselves rather than duplicated in the
 * stylesheet, so a change to the geometry cannot leave the walk cycle rotating
 * about a point that is no longer the hip or the shoulder.
 */
const pivot = (x: number, y: number) => ({
  transformBox: 'view-box',
  transformOrigin: `${x}px ${y}px`,
}) as const;

const PIVOTS = {
  hipNear: pivot(46, 104),
  hipFar: pivot(62, 104),
  shoulderNear: pivot(35, 50),
  shoulderFar: pivot(72, 50),
} as const;

export function ArrivalFigure({ arrived }: { arrived: boolean }) {
  return (
    <div className={`arrival-figure ${arrived ? 'is-arrived' : 'is-travelling'}`} aria-hidden="true">
      <svg className="arrival-figure__svg" viewBox="0 0 108 190" fill="none">
        <ellipse className="arrival-figure__shadow" cx="54" cy="186" rx="23" ry="2.8" />

        {/* Far leg. Drawn first so the near leg reads in front of it. */}
        <g className="arrival-figure__leg arrival-figure__leg--far" style={PIVOTS.hipFar}>
          <path d="M58 104h9l-1.5 70H58.5z" />
          <path d="M56 174h11l.5 8H55z" />
        </g>

        {/* Far arm. Both arms hang from the shoulder line, meeting the torso
            edge exactly, so the counter-swing stays readable and the limbs
            never read as detached boxes. */}
        <g className="arrival-figure__arm arrival-figure__arm--far" style={PIVOTS.shoulderFar}>
          <path d="M72.5 49h8.5l.7 47h-8.5z" />
        </g>

        {/* Torso. Shoulders wider than the waist, so the silhouette is a
            technical vest rather than a rectangle. */}
        <g className="arrival-figure__torso">
          <path d="M37 47c0-4 3-6 7-6h20c4 0 7 2 7 6l3 51c0 4-3 6-7 6H41c-4 0-7-2-7-6z" />
          <path className="arrival-figure__seam" d="M54 42v62" />
          <path className="arrival-figure__belt" d="M34 98h40" />
          {/* Shoulder harness: the figure reads as equipped, not as a mascot. */}
          <path className="arrival-figure__harness" d="M42 44l12 14 12-14" />
          <path className="arrival-figure__collar" d="M46 41h16" />
        </g>

        {/* Near leg, with a knee line so the stride has a readable joint. */}
        <g className="arrival-figure__leg arrival-figure__leg--near" style={PIVOTS.hipNear}>
          <path d="M41 104h9l.5 70H41z" />
          <path className="arrival-figure__knee" d="M41.5 138h9" />
          <path d="M39 174h11.5l.5 8H38z" />
        </g>

        {/* Neck and head. The head carries a signal band instead of a face. */}
        <g className="arrival-figure__head">
          <path d="M49 33h10v9H49z" />
          <ellipse cx="54" cy="22" rx="10.5" ry="12.5" />
          <path className="arrival-figure__visor" d="M45 19.5h18" />
        </g>

        {/* Near arm, and the signal node it carries. */}
        <g className="arrival-figure__arm arrival-figure__arm--near" style={PIVOTS.shoulderNear}>
          <path d="M26 49h8.5l-.7 47h-8.5z" />
        </g>

        {/* The KNOuX signal node. Dark while carried, lit once the figure stops. */}
        <g className="arrival-figure__node">
          <path className="arrival-figure__node-body" d="M16 93l8 4.5v9l-8 4.5-8-4.5v-9z" />
          <circle className="arrival-figure__node-core" cx="16" cy="102" r="3" />
        </g>
      </svg>
    </div>
  );
}
