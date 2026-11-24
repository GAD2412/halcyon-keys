// City-wide signal timing: north-south and east-west roads take turns, with a short all-red gap.
const CYCLE = 20;

export function isGreen(axis, time) {
  const t = time % CYCLE;
  return axis === 'ns' ? t < 9 : t >= 10 && t < 19;
}

export function signalState(axis, time) {
  const t = time % CYCLE;
  const green = isGreen(axis, time);
  const amber = axis === 'ns' ? t >= 8 && t < 9 : t >= 18 && t < 19;
  return green ? (amber ? 'amber' : 'green') : 'red';
}
