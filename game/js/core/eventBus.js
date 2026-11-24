// Minimal publish/subscribe so systems (crimes, missions, HUD, audio) stay decoupled.
export function createEventBus() {
  const map = new Map();
  return {
    on(name, fn) { if (!map.has(name)) map.set(name, []); map.get(name).push(fn); },
    emit(name, ...args) { for (const fn of map.get(name) || []) fn(...args); },
  };
}
