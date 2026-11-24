// PHPD unit behaviour. Cruisers route along the street grid toward the suspect, close in directly
// when they have sight, ram a fleeing car, back out when stuck and drop officers when the suspect is
// on foot. Officers chase, shoot from cover range at 2+ stars and make arrests at 1 star.
import { nearestGrid, CITY_MIN, CITY_MAX, groundHeight } from '../world/cityPlan.js';
import { clamp, wrapAngle, headingTo, dampAngle } from '../core/mathUtils.js';
import { createHuman } from '../entities/characterModel.js';
import { rng } from '../core/random.js';

// Next waypoint along the road grid from (x,z) toward (tx,tz).
export function routeWaypoint(x, z, tx, tz) {
  const gx = nearestGrid(x), gz = nearestGrid(z);
  const onNS = Math.abs(x - gx) < 9 && z >= CITY_MIN - 9 && z <= CITY_MAX + 9;
  const onEW = Math.abs(z - gz) < 9 && x >= CITY_MIN - 9 && x <= CITY_MAX + 9;
  if (Math.hypot(tx - x, tz - z) < 55) return { x: tx, z: tz };
  if (onNS && onEW) {
    const dx = tx - gx, dz = tz - gz;
    if (Math.abs(dx) > Math.abs(dz)) return { x: clamp(gx + Math.sign(dx) * 100, CITY_MIN, CITY_MAX), z: gz };
    return { x: gx, z: clamp(gz + Math.sign(dz) * 100, CITY_MIN, CITY_MAX) };
  }
  if (onNS) return { x: gx, z: Math.abs(tx - gx) < 30 ? tz : nearestGrid(tz) };
  if (onEW) return { x: Math.abs(tz - gz) < 30 ? tx : nearestGrid(tx), z: gz };
  return { x: tx, z: tz };
}

export function drivePoliceCar(G, car, dt) {
  const p = G.player, ai = car.ai;
  const w = G.wanted;
  car.sirenOn = true;
  const pv = p.vehicle;
  let tx = w.seen ? p.x : w.lastX + Math.sin(G.time * 0.3 + car.id) * 30;
  let tz = w.seen ? p.z : w.lastZ + Math.cos(G.time * 0.3 + car.id) * 30;
  if (pv && w.seen) { tx += pv.vx * 0.7; tz += pv.vz * 0.7; }
  const d = Math.hypot(p.x - car.x, p.z - car.z);
  // drive straight at the suspect only when a car-wide corridor is clear, so cruisers don't clip corners
  const ox = d > 0 ? ((p.z - car.z) / d) * 1.3 : 0, oz = d > 0 ? (-(p.x - car.x) / d) * 1.3 : 0;
  const sight = d < 60 && G.collision.lineOfSight(car.x, car.z, p.x, p.z)
    && G.collision.lineOfSight(car.x + ox, car.z + oz, p.x + ox, p.z + oz) && G.collision.lineOfSight(car.x - ox, car.z - oz, p.x - ox, p.z - oz);
  const wp = sight ? { x: tx, z: tz } : routeWaypoint(car.x, car.z, tx, tz);
  const desired = headingTo(car.x, car.z, wp.x, wp.z);
  let diff = wrapAngle(desired - car.heading);
  let cap = 40;
  if (Math.abs(diff) > 0.7) cap = 13;
  else if (Math.abs(diff) > 0.35) cap = 22;
  // suspect on foot: pull up and deploy officers
  if (!pv && d < 26 && w.seen) {
    cap = 0;
    if (!ai.deployed && Math.abs(car.speed) < 3) deployOfficers(G, car);
  }
  // ram a fleeing car when right behind it
  if (pv && d < 16) { cap = 60; diff = wrapAngle(headingTo(car.x, car.z, p.x, p.z) - car.heading); }
  // reversing out of a jam
  if (ai.reverse > 0) {
    ai.reverse -= dt;
    car.controls.throttle = 0; car.controls.brake = 1; car.controls.steer = clamp(diff * 2, -1, 1); car.controls.handbrake = false;
    return;
  }
  car.controls.steer = clamp(-diff * 2.6, -1, 1);
  const v = car.speed;
  car.controls.handbrake = Math.abs(diff) > 1.1 && v > 14;
  if (v < cap) { car.controls.throttle = 1; car.controls.brake = 0; }
  else { car.controls.throttle = 0; car.controls.brake = clamp((v - cap) / 6, 0.2, 1); }
  ai.stuck = car.controls.throttle > 0 && Math.abs(v) < 1.2 ? ai.stuck + dt : 0;
  if (ai.stuck > 1.4) { ai.reverse = 1.1; ai.stuck = 0; }
}

export function deployOfficers(G, car) {
  car.ai.deployed = true;
  for (const side of [-1, 1]) {
    const r = { x: -Math.cos(car.heading), z: Math.sin(car.heading) };
    const o = createHuman('cop', car.x + r.x * side * 1.8, car.z + r.z * side * 1.8, car.heading);
    o.car = car; o.shootT = rng.range(0.6, 1.6); o.weapon = 'pistol';
    G.police.officers.push(o);
    G.humans.push(o);
  }
}

export function updateOfficer(G, o, dt) {
  if (!o.alive) { o.deadT -= dt; return; }
  const p = G.player, w = G.wanted;
  const d = Math.hypot(p.x - o.x, p.z - o.z);
  let tx = p.x, tz = p.z, speed = 0;
  const goHome = w.stars === 0 || (p.vehicle && d > 22) || !p.alive;
  if (goHome && o.car && !o.car.removed) {
    tx = o.car.x; tz = o.car.z;
    if (Math.hypot(tx - o.x, tz - o.z) < 2.4) { o.done = true; return; }
    speed = 5;
  } else if (w.stars >= 2 || p.vehicle) {
    if (d > 13) speed = 5.2;
    o.shootT -= dt;
    if (d < 40 && o.shootT <= 0 && p.alive && G.collision.lineOfSight(o.x, o.z, p.x, p.z)) {
      o.shootT = rng.range(0.8, 1.5);
      o.heading = headingTo(o.x, o.z, p.x, p.z);
      G.combat.npcShoot(o, p, 0.22 + w.stars * 0.04);
    }
  } else {
    // one star: walk up and cuff
    if (d > 1.6) speed = 4.6;
    else G.police.arrestProgress(dt);
  }
  o.heading = dampAngle(o.heading, headingTo(o.x, o.z, tx, tz), 8, dt);
  o.x += Math.sin(o.heading) * speed * dt;
  o.z += Math.cos(o.heading) * speed * dt;
  G.collision.resolveCircle(o, o.radius);
  o.y = groundHeight(o.x, o.z);
  o.pose = speed > 4 ? 'run' : speed > 0 ? 'walk' : w.stars >= 2 ? 'aim' : 'idle';
  o.phase += speed * dt * 2.3;
}
