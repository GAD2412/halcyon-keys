// Small math helpers shared by every system. Headings: forward = (sin h, cos h) on the x/z plane.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dist2 = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export const headingTo = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);

export function dampAngle(a, b, lambda, dt) {
  return a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
}

// Right-hand side of a heading (where traffic drives).
export const rightOf = (h) => ({ x: -Math.cos(h), z: Math.sin(h) });

export function formatMoney(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
