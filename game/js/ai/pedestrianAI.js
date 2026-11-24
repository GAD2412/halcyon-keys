// Pedestrians: stroll around block sidewalks and the beach boardwalk, sunbathe on the sand, flee from
// gunfire, explosions and speeding cars, cower with hands up, and go down when shot or run over.
import { createHuman } from '../entities/characterModel.js';
import { groundHeight, CITY_MIN, CITY_MAX, PITCH } from '../world/cityPlan.js';
import { headingTo, dampAngle } from '../core/mathUtils.js';
import { rng } from '../core/random.js';

const RING = 41; // sidewalk centre line around a block centre

function ringPoint(bx, bz, s) {
  const side = RING * 2, per = side * 4;
  s = ((s % per) + per) % per;
  const k = Math.floor(s / side), t = s - k * side - RING;
  if (k === 0) return { x: bx + t, z: bz - RING };
  if (k === 1) return { x: bx + RING, z: bz + t };
  if (k === 2) return { x: bx - t, z: bz + RING };
  return { x: bx - RING, z: bz - t };
}

export function createPedestrians(G) {
  const peds = [];
  const target = { count: 46 };
  let spawnT = 0;

  function spawn(near, { minD = 35, maxD = 120, x = null, z = null, path = null } = {}) {
    const p = rng.next();
    let ped;
    if (x !== null) {
      ped = createHuman('ped', x, z, rng.range(-3, 3));
      ped.path = path || { type: 'idle' };
    } else if (p < 0.22 && near.x < CITY_MIN + 160) {
      // boardwalk stroller along the beach
      const bz = near.z + rng.range(-maxD, maxD);
      ped = createHuman('ped', CITY_MIN - 12 + rng.range(-3, 3), Math.max(CITY_MIN - 60, Math.min(CITY_MAX + 60, bz)), 0);
      ped.path = { type: 'line', axis: 'z', dir: rng.chance(0.5) ? 1 : -1, lat: ped.x };
    } else if (p < 0.32 && near.x < CITY_MIN + 160) {
      ped = createHuman('ped', rng.range(-466, -425), near.z + rng.range(-maxD, maxD), rng.range(-3, 3));
      ped.path = { type: 'idle' };
    } else {
      const bx = Math.round((near.x + rng.range(-maxD, maxD) - 50) / PITCH) * PITCH + 50;
      const bz = Math.round((near.z + rng.range(-maxD, maxD) - 50) / PITCH) * PITCH + 50;
      if (bx < CITY_MIN || bx > CITY_MAX || bz < CITY_MIN || bz > CITY_MAX) return null;
      const s = rng.range(0, RING * 8);
      const pt = ringPoint(bx, bz, s);
      ped = createHuman('ped', pt.x + rng.range(-1.2, 1.2), pt.z + rng.range(-1.2, 1.2), 0);
      ped.path = { type: 'ring', bx, bz, s, dir: rng.chance(0.5) ? 1 : -1, off: rng.range(-1.3, 1.3) };
    }
    const d = Math.hypot(ped.x - near.x, ped.z - near.z);
    if (x === null && (d < minD || d > maxD + 30 || G.collision.pointBlocked(ped.x, ped.z))) return null;
    ped.walkSpeed = rng.range(1.15, 1.6);
    ped.mode = 'walk';
    ped.fear = 0;
    peds.push(ped);
    G.humans.push(ped);
    return ped;
  }

  function kill(ped, fromX, fromZ, force = 0) {
    if (!ped.alive) return;
    ped.alive = false; ped.health = 0; ped.pose = 'dead'; ped.deadT = 25; ped.mode = 'dead';
    if (fromX !== undefined) { ped.heading = headingTo(ped.x, ped.z, fromX, fromZ); ped.vx = (ped.x - fromX) * force; ped.vz = (ped.z - fromZ) * force; }
    G.effects?.blood(ped.x, 1, ped.z);
  }

  function update(ped, dt) {
    if (!ped.alive) {
      ped.deadT -= dt;
      ped.x += ped.vx * dt; ped.z += ped.vz * dt; ped.vx *= 0.9; ped.vz *= 0.9;
      return;
    }
    let speed = 0, tx = null, tz = null;
    if (ped.mode === 'flee') {
      ped.fear -= dt;
      const away = headingTo(ped.threatX, ped.threatZ, ped.x, ped.z) + Math.sin(ped.phase * 0.3) * 0.3;
      ped.heading = dampAngle(ped.heading, away, 8, dt);
      speed = 5.6;
      if (ped.fear <= 0) ped.mode = 'walk';
    } else if (ped.mode === 'cower') {
      ped.fear -= dt;
      ped.pose = 'cower';
      if (ped.fear <= 0) ped.mode = 'walk';
      return;
    } else if (ped.path.type === 'ring') {
      const pp = ped.path;
      pp.s += pp.dir * ped.walkSpeed * dt;
      const pt = ringPoint(pp.bx, pp.bz, pp.s + pp.dir * 2);
      tx = pt.x + pp.off * 0.5; tz = pt.z + pp.off * 0.5;
      speed = ped.walkSpeed;
    } else if (ped.path.type === 'line') {
      tx = ped.path.lat; tz = ped.z + ped.path.dir * 3;
      if (ped.z > CITY_MAX + 60 || ped.z < CITY_MIN - 60) ped.path.dir *= -1;
      speed = ped.walkSpeed;
    }
    if (tx !== null) {
      const dist = Math.hypot(tx - ped.x, tz - ped.z);
      if (dist > 0.2) ped.heading = dampAngle(ped.heading, headingTo(ped.x, ped.z, tx, tz), 6, dt);
      if (dist > 6) speed = Math.max(speed, 1.6);
    }
    ped.x += Math.sin(ped.heading) * speed * dt;
    ped.z += Math.cos(ped.heading) * speed * dt;
    G.collision.resolveCircle(ped, ped.radius);
    ped.y = groundHeight(ped.x, ped.z);
    ped.pose = speed > 4 ? 'run' : speed > 0.1 ? 'walk' : 'idle';
    ped.phase += speed * dt * 2.4;
  }

  // Cars that touch people: slow nudges push them aside, fast hits kill.
  function checkVehicleHits(ped) {
    for (const v of G.vehicles) {
      const dx = ped.x - v.x, dz = ped.z - v.z;
      if (dx * dx + dz * dz > 16) continue;
      const f = v.forward;
      const along = dx * f.x + dz * f.z, lat = dx * -f.z + dz * f.x;
      if (Math.abs(along) < v.spec.len / 2 + 0.3 && Math.abs(lat) < v.spec.wid / 2 + 0.3) {
        const spd = Math.hypot(v.vx, v.vz);
        if (spd > 6) {
          kill(ped, v.x, v.z, 2.5);
          G.effects?.sparks(ped.x, 1, ped.z, 4);
          if (v.driver === 'player') G.events?.emit('crime', 'runover', ped.x, ped.z, ped);
        } else {
          ped.x += (lat >= 0 ? 1 : -1) * -f.z * 0.4; ped.z += (lat >= 0 ? 1 : -1) * f.x * 0.4;
          if (spd > 2) scare(ped, v.x, v.z, 6);
        }
      }
    }
  }

  function scare(ped, x, z, time = 7) {
    if (!ped.alive || ped.kind !== 'ped') return;
    ped.threatX = x; ped.threatZ = z;
    if (ped.mode !== 'flee' && ped.mode !== 'cower' && rng.chance(0.18)) { ped.mode = 'cower'; ped.fear = time * 0.6; return; }
    ped.mode = 'flee'; ped.fear = time + rng.range(0, 3);
  }

  return {
    peds, target, spawn, kill, scare,
    alarm(x, z, radius) { for (const p of peds) if (Math.hypot(p.x - x, p.z - z) < radius) scare(p, x, z); },
    update(dt) {
      const near = G.focus;
      spawnT -= dt;
      const alive = peds.reduce((n, p) => n + (p.alive ? 1 : 0), 0);
      if (alive < target.count && spawnT <= 0) { for (let i = 0; i < 4; i++) spawn(near); spawnT = 0.2; }
      for (let i = peds.length - 1; i >= 0; i--) {
        const p = peds[i];
        const d = Math.hypot(p.x - near.x, p.z - near.z);
        if (d > 170 || (!p.alive && p.deadT <= 0)) {
          peds.splice(i, 1);
          G.humans.splice(G.humans.indexOf(p), 1);
          continue;
        }
        update(p, dt);
        if (p.alive) checkVehicleHits(p);
      }
    },
  };
}
