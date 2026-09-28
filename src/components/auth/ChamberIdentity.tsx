/**
 * Chamber identity.
 *
 * The same wordmark construction the site header uses — a violet signal dot and
 * the letters — set at panel scale, with the route's index in the site's
 * monospace metadata style. The reference's branded app icon and its pill badge
 * are deliberately absent: this is KNOuX, and the mark is the one the header
 * already carries.
 */
export function ChamberIdentity({ index }: { index: string }) {
  return (
    <div className="auth-identity" data-stagger="identity">
      <span className="auth-identity__mark" aria-hidden="true">
        <span className="brand-dot" />
        KNOuX
        <span className="brand-end">r</span>
      </span>
      <span className="auth-identity__code">
        KN / AUTH — {index}
      </span>
    </div>
  );
}
