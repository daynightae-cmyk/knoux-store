/**
 * Chamber boot marker.
 *
 * The rise is an enhancement, so it is armed before the first paint rather than
 * after it. Without this the interface would render visible, then hide itself
 * once React mounted, and a visitor with scripting unavailable or reduced motion
 * requested would be left looking at an empty chamber.
 *
 * The marker is set only when the visitor actually wants the sequence, so the
 * default state of every element on this route is the finished, readable
 * chamber.
 */
export function ChamberBoot() {
  const script = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.chamber='armed'}}catch(e){}`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
