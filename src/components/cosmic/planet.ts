export type CosmicColor = [number, number, number];

export function mixColor(from: CosmicColor, to: CosmicColor, amount: number): CosmicColor {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

export function rgba(tone: CosmicColor, alpha: number) {
  return `rgba(${Math.round(tone[0])},${Math.round(tone[1])},${Math.round(tone[2])},${alpha})`;
}

export function paintPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tone: CosmicColor, illumination: number, ring: boolean) {
  // ResizeObserver can briefly report a hidden or subpixel surface. Canvas
  // rejects negative arc radii; skip worlds with no area and keep the limb
  // inside even when its minimum one-pixel stroke exceeds the world radius.
  if (!Number.isFinite(radius) || radius <= 0) return;
  const lit = mixColor(tone, [243, 229, 255], .68);
  const shade = mixColor(tone, [7, 4, 22], .88);
  const glow = ctx.createRadialGradient(x, y, radius * .8, x, y, radius * 2.4);
  glow.addColorStop(0, rgba(tone, .34 * illumination));
  glow.addColorStop(1, rgba(tone, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 2.4, y - radius * 2.4, radius * 4.8, radius * 4.8);
  if (ring) paintRings(ctx, x, y, radius, lit, false);

  const body = ctx.createRadialGradient(x - radius * .53, y - radius * .54, radius * .05, x + radius * .23, y + radius * .24, radius * 1.2);
  body.addColorStop(0, rgba(lit, .94));
  body.addColorStop(.39, rgba(tone, .88));
  body.addColorStop(.82, rgba(shade, .95));
  body.addColorStop(1, rgba(shade, .96));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  const horizon = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  horizon.addColorStop(0, rgba(lit, .95 * illumination));
  horizon.addColorStop(.42, rgba(lit, .52 * illumination));
  horizon.addColorStop(.74, rgba(tone, .12 * illumination));
  horizon.addColorStop(1, rgba(tone, 0));
  ctx.strokeStyle = horizon;
  ctx.lineWidth = Math.max(1, radius * .038);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius - ctx.lineWidth / 2), 0, Math.PI * 2);
  ctx.stroke();
  if (ring) paintRings(ctx, x, y, radius, lit, true);
}

function paintRings(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tone: CosmicColor, front: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.32);
  for (const [spread, opacity] of [[1.56, .34], [1.75, .58], [1.98, .28]]) {
    ctx.strokeStyle = rgba(tone, opacity * (front ? 1 : .56));
    ctx.lineWidth = Math.max(.55, radius * .044);
    ctx.beginPath();
    const majorAxis = radius * spread;
    ctx.ellipse(0, 0, majorAxis, majorAxis * .28, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
