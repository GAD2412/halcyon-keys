// Keyboard and mouse state: held keys, keys pressed this frame, mouse look deltas, buttons, wheel.

const held = new Set();
const pressed = new Set();
const mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0 };
let canvasEl = null;

export const input = {
  held: (code) => held.has(code),
  pressed: (code) => pressed.has(code),
  axis: (neg, pos) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0),
  mouse,
  locked: () => document.pointerLockElement === canvasEl,
  lock: () => { if (canvasEl && !input.locked()) canvasEl.requestPointerLock?.(); },
  unlock: () => { if (document.pointerLockElement) document.exitPointerLock(); },
  endFrame() {
    pressed.clear();
    mouse.dx = 0; mouse.dy = 0; mouse.wheel = 0; mouse.leftPressed = false;
  },
  // Lets shot mode and tests drive the game like a player would.
  simulateKey(code, down) { if (down) { held.add(code); pressed.add(code); } else held.delete(code); },
};

export function attachInput(canvas) {
  canvasEl = canvas;
  addEventListener('keydown', (e) => {
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());
  addEventListener('mousemove', (e) => {
    if (!input.locked()) return;
    mouse.dx += e.movementX; mouse.dy += e.movementY;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
    if (e.button === 2) mouse.right = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
}
