/** Bounded damped spring, advanced only while the pointer target is unsettled. */
export function sentinelSpring(position: number, velocity: number, target: number, seconds: number) {
  const dt = Math.max(1 / 240, Math.min(1 / 30, seconds));
  const nextVelocity = velocity + ((target - position) * 160 - velocity * 25) * dt;
  return { position: position + nextVelocity * dt, velocity: nextVelocity };
}
