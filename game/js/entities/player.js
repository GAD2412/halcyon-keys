// Nico Vale, the player: camera-relative running, sprint and jump on foot, entering and stealing cars
// (dragging the driver out), driving with throttle, brake, steering, handbrake and horn, weapon choice
// and aiming/firing through the combat system.
import { createHuman, randomLook } from './characterModel.js';
import { groundHeight } from '../world/cityPlan.js';
import { clamp, dampAngle, rightOf, headingTo } from '../core/mathUtils.js';
import { WEAPON_ORDER } from '../systems/weapons.js';

export function createPlayer(G, x, z) {
  const p = createHuman('player', x, z, 0, randomLook('player'));
  Object.assign(p, {
    name: 'Nico Vale', health: 100, armor: 50, vehicle: null, armed: false,
    ammo: { fists: Infinity, pistol: 60, smg: 0 }, weapon: 'fists', owned: new Set(['fists', 'pistol']),
    aiming: false, fireCooldown: 0, vy: 0, scale: 1.1, nearVehicle: null, stamina: 1,
  });

  function nearestEnterable() {
    let best = null, bd = 4.2;
    for (const v of G.vehicles) {
      if (v.wrecked) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z) - v.spec.len / 2 + 1.2;
      if (d < bd && Math.abs(v.speed) < 9) { bd = d; best = v; }
    }
    return best;
  }

  function enter(v) {
    if (v.driver === 'ai') {
      // carjack: the driver is thrown out and runs
      const r = rightOf(v.heading);
      const ped = G.peds.spawn(G.focus, { x: v.x - r.x * 2.2, z: v.z - r.z * 2.2 });
      if (ped) { G.peds.scare(ped, p.x, p.z, 10); if (v.spec.police) ped.look = randomLook('cop'); }
      G.events.emit('crime', v.spec.police ? 'stealPolice' : 'carjack', v.x, v.z);
      G.notify?.(`Stole a ${v.spec.name}`);
    }
    if (v.ai?.kind === 'police') G.police?.release(v);
    v.driver = 'player'; v.ai = null;
    if (v.role !== 'mission') v.role = 'player';
    p.vehicle = v; p.visible = false; p.aiming = false;
    G.audio?.door();
    G.events.emit('enterVehicle', v);
  }

  function exit() {
    const v = p.vehicle;
    const r = rightOf(v.heading);
    p.x = v.x - r.x * (v.spec.wid / 2 + 0.9); p.z = v.z - r.z * (v.spec.wid / 2 + 0.9);
    p.heading = v.heading;
    v.driver = null; v.controls.throttle = 0; v.controls.brake = 1; v.controls.steer = 0; v.controls.handbrake = false;
    if (v.role === 'player') v.role = 'parked';
    p.vehicle = null; p.visible = true;
    G.collision.resolveCircle(p, p.radius);
    G.audio?.door();
    G.events.emit('exitVehicle', v);
  }

  p.selectWeapon = (w) => { if (p.owned.has(w)) { p.weapon = w; p.armed = w !== 'fists'; } };

  p.update = (dt, input) => {
    if (!p.alive) return;
    p.fireCooldown -= dt;
    const owned = WEAPON_ORDER.filter((w) => p.owned.has(w));
    if (input.pressed('Digit1')) p.selectWeapon('fists');
    if (input.pressed('Digit2')) p.selectWeapon('pistol');
    if (input.pressed('Digit3')) p.selectWeapon('smg');
    if (input.mouse.wheel && !p.vehicle) p.selectWeapon(owned[(owned.indexOf(p.weapon) + input.mouse.wheel + owned.length) % owned.length]);

    if (p.vehicle) {
      const v = p.vehicle;
      p.x = v.x; p.z = v.z; p.heading = v.heading;
      const c = v.controls;
      c.throttle = input.held('KeyW') || input.held('ArrowUp') ? 1 : 0;
      c.brake = input.held('KeyS') || input.held('ArrowDown') ? 1 : 0;
      c.steer = (input.held('KeyD') || input.held('ArrowRight') ? 1 : 0) - (input.held('KeyA') || input.held('ArrowLeft') ? 1 : 0);
      c.handbrake = input.held('Space');
      if (input.pressed('KeyH')) G.audio?.horn(v.x, v.z, true);
      if (input.pressed('KeyF') && Math.abs(v.speed) < 10) exit();
      if (v.wrecked) exit();
      return;
    }

    // on foot
    const yaw = G.cameraRig.yaw;
    const fwd = (input.held('KeyW') ? 1 : 0) - (input.held('KeyS') ? 1 : 0);
    const side = (input.held('KeyD') ? 1 : 0) - (input.held('KeyA') ? 1 : 0);
    const r = rightOf(yaw);
    let mx = Math.sin(yaw) * fwd + r.x * side, mz = Math.cos(yaw) * fwd + r.z * side;
    const len = Math.hypot(mx, mz);
    const sprint = input.held('ShiftLeft') || input.held('ShiftRight');
    p.aiming = input.mouse.right || (input.mouse.left && p.weapon !== 'fists');
    let speed = 0;
    if (len > 0.01) {
      mx /= len; mz /= len;
      speed = p.aiming ? 2.6 : sprint && p.stamina > 0.05 ? 7.6 : 4.4;
      if (!p.aiming) p.heading = dampAngle(p.heading, Math.atan2(mx, mz), 12, dt);
    }
    p.stamina = clamp(p.stamina + (sprint && speed > 5 ? -0.12 : 0.2) * dt, 0, 1);
    if (p.aiming) p.heading = dampAngle(p.heading, yaw, 20, dt);
    p.x += mx * speed * dt; p.z += mz * speed * dt;
    // jump
    const ground = groundHeight(p.x, p.z);
    if (input.pressed('Space') && p.y <= ground + 0.02) p.vy = 5.2;
    p.vy -= 16 * dt;
    p.y = Math.max(ground, p.y + p.vy * dt);
    if (p.y <= ground) p.vy = 0;
    // walls and parked cars
    G.collision.resolveCircle(p, p.radius);
    for (const v of G.vehicles) {
      for (const c of v.circles()) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = v.radius + p.radius;
        if (d < rr && d > 1e-4) { p.x = c.x + (dx / d) * rr; p.z = c.z + (dz / d) * rr; }
      }
    }
    p.pose = p.aiming ? 'aim' : speed > 5 ? 'run' : speed > 0.1 ? 'walk' : 'idle';
    p.phase += speed * dt * 2.3;
    p.aimPitch = -G.cameraRig.pitch * 0.8;

    p.nearVehicle = nearestEnterable();
    if (input.pressed('KeyF') && p.nearVehicle) enter(p.nearVehicle);

    if (input.mouse.left && p.fireCooldown <= 0) G.combat.playerAttack();
  };

  p.respawn = (x, z) => {
    if (p.vehicle) exit();
    Object.assign(p, { x, z, y: 0.16, health: 100, armor: 0, alive: true, pose: 'idle', visible: true, vy: 0 });
  };
  p.enter = enter;
  p.exit = () => p.vehicle && exit();
  p.headingTo = (x, z) => headingTo(p.x, p.z, x, z);
  return p;
}
