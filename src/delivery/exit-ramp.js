// World metres along a shallow exit. Scenery and traffic share this curve so
// cars stay on the pavement instead of turning across a decorative side road.
export const rampLength = 120;
export function exitRamp(distance, side, startX = 0) {
  const forward = Math.max(0, distance);
  const t = Math.min(1, forward / 60);
  const merge = t * t * (3 - 2 * t);
  const mergeSlope = t < 1 ? (6 * t * (1 - t)) / 60 : 0;
  const bend = Math.min(forward, 60);
  const center = 0.003 * bend * bend + 3.4 * merge + Math.max(0, forward - 60) * 0.36;
  const slope = side * (0.006 * bend + 3.4 * mergeSlope) - startX * mergeSlope;
  return {
    x: side * center + startX * (1 - merge),
    forward,
    yaw: Math.PI / 2 - Math.atan(slope),
    halfWidth: 6 - 3 * merge
  };
}
