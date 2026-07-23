/**
 * Linear interpolation between two numbers
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

/**
 * Shortest angle interpolation in degrees (0 - 359).
 * Prevents full 360 degree spin artifacts when crossing 0 / 360 boundary (e.g. 350° -> 10°).
 */
export function lerpAngle(startAngle: number, endAngle: number, t: number): number {
  // Normalize angles into [0, 360)
  const normStart = ((startAngle % 360) + 360) % 360;
  const normEnd = ((endAngle % 360) + 360) % 360;

  // Shortest angular difference (-180 to +180)
  let delta = normEnd - normStart;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }

  const interpolated = normStart + delta * Math.max(0, Math.min(1, t));
  return ((interpolated % 360) + 360) % 360;
}

/**
 * Smooth ease-in-out cubic timing function for organic vehicle acceleration/deceleration
 */
export function easeInOutCubic(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return clampedT < 0.5
    ? 4 * clampedT * clampedT * clampedT
    : 1 - Math.pow(-2 * clampedT + 2, 3) / 2;
}

/**
 * Linear timing function for uniform movement speed
 */
export function linear(t: number): number {
  return Math.max(0, Math.min(1, t));
}
