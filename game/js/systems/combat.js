// Shooting and damage: hitscan bullets against people, cars and walls, melee punches, explosions,
// health and armor, and the crimes and panic that gunfire causes.
import * as THREE from 'three';
import { WEAPONS } from './weapons.js';
import { rng } from '../core/random.js';

const v3 = new THREE.Vector3();

export function createCombat(G) {
  // Ray vs a person's body (a vertical capsule approximated by a sphere at chest height and one at the head).
  function rayHuman(o, d, h, maxT) {
    let best = Infinity;
    for (const [cy, r] of [[1.1, 0.45], [1.65, 0.22], [0.5, 0.35]]) {
      const ox = o.x - h.x, oy = o.y - ((h.y || 0) + cy), oz = o.z - h.z;
      const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < best && t < maxT) best = t;
    }
    return best;
  }
  function rayVehicle(o, d, v, maxT) {
    const ox = o.x - v.x, oy = o.y - 0.9, oz = o.z - v.z, r = v.spec.len * 0.45;
    const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - c;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t > 0 && t < maxT ? t : Infinity;
  }

  function damageHuman(h, amount, attacker) {
    if (!h.alive) return;
    if (h === G.player) {
      if (G.godMode) return;
      const soak = Math.min(h.armor, amount * 0.7);
      h.armor -= soak; h.health -= amount - soak;
      G.hud?.flashDamage();
      if (h.health <= 0) { h.health = 0; G.events.emit('playerDied'); }
      return;
    }
    h.health -= amount;
    G.effects.blood(h.x, (h.y || 0) + 1.2, h.z);
    if (h.health <= 0) {
      if (h.kind === 'ped') G.peds.kill(h, attacker?.x, attacker?.z, 1.2);
      else { h.alive = false; h.pose = 'dead'; h.deadT = 20; }
      if (attacker === G.player) {
        G.events.emit('crime', h.kind === 'cop' ? 'killCop' : h.kind === 'gang' ? 'killGang' : 'killPed', h.x, h.z, h);
        G.events.emit('kill', h);
      }
    } else if (attacker === G.player) {
      G.events.emit('crime', h.kind === 'cop' ? 'shootCop' : 'assault', h.x, h.z, h);
      if (h.kind === 'ped') G.peds.scare(h, attacker.x, attacker.z, 9);
    }
  }

  // Fire one shot from a shooter along a direction. Returns the hit point.
  function fire(shooter, origin, dir, weaponId, { ignore = null, muzzle = null } = {}) {
    const w = WEAPONS[weaponId];
    const d = v3.copy(dir);
    d.x += rng.range(-w.spread, w.spread); d.y += rng.range(-w.spread, w.spread) * 0.6; d.z += rng.range(-w.spread, w.spread);
    d.normalize();
    let maxT = G.collision.rayDistance(origin.x, origin.z, d.x, d.z, w.range, origin.y) / Math.max(0.05, Math.hypot(d.x, d.z));
    maxT = Math.min(maxT, w.range);
    if (d.y < -0.01) maxT = Math.min(maxT, (origin.y - 0.05) / -d.y);
    let hitH = null, hitV = null, t = maxT;
    for (const h of G.humans) {
      if (h === shooter || h === ignore || !h.alive || !h.visible) continue;
      const th = rayHuman(origin, d, h, t);
      if (th < t) { t = th; hitH = h; hitV = null; }
    }
    if (G.player.visible === false && shooter !== G.player && G.player.vehicle) {
      // shots at the player's car can wound the driver
      const tv = rayVehicle(origin, d, G.player.vehicle, t);
      if (tv < t) { t = tv; hitV = G.player.vehicle; hitH = null; }
    }
    for (const v of G.vehicles) {
      if (v === hitV || (shooter === G.player && v === G.player.vehicle)) continue;
      const tv = rayVehicle(origin, d, v, t);
      if (tv < t) { t = tv; hitV = v; hitH = null; }
    }
    const hx = origin.x + d.x * t, hy = origin.y + d.y * t, hz = origin.z + d.z * t;
    const m = muzzle || origin;
    G.effects.tracer(m.x, m.y, m.z, hx, hy, hz);
    G.effects.flash(m.x, m.y, m.z, 5);
    G.audio?.gunshot(w.sound || 'pistol', m.x, m.z);
    if (hitH) damageHuman(hitH, w.damage * (rng.chance(0.15) ? 2 : 1), shooter);
    else if (hitV) {
      hitV.health -= w.damage * 0.12;
      G.effects.sparks(hx, hy, hz, 5);
      if (hitV === G.player.vehicle && shooter !== G.player && rng.chance(0.35)) damageHuman(G.player, w.damage * 0.4, shooter);
      if (shooter === G.player && hitV.spec.police) G.events.emit('crime', 'shootCop', hx, hz);
    } else if (t < maxT + 0.01 && t < w.range) G.effects.sparks(hx, hy, hz, 3);
    // everyone nearby panics
    G.peds.alarm(m.x, m.z, 45);
    G.traffic.alarm(m.x, m.z, 40);
    return { x: hx, y: hy, z: hz, hitH, hitV };
  }

  function melee(attacker) {
    const w = WEAPONS.fists;
    const fx = Math.sin(attacker.heading), fz = Math.cos(attacker.heading);
    let best = null, bd = w.range;
    for (const h of G.humans) {
      if (h === attacker || !h.alive || !h.visible) continue;
      const dx = h.x - attacker.x, dz = h.z - attacker.z, d = Math.hypot(dx, dz);
      if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.5) { bd = d; best = h; }
    }
    G.audio?.punch();
    if (best) { damageHuman(best, w.damage, attacker); best.x += fx * 0.6; best.z += fz * 0.6; }
  }

  return {
    fire, damageHuman, melee,
    playerAttack() {
      const p = G.player;
      const w = WEAPONS[p.weapon];
      p.fireCooldown = w.rate;
      if (w.melee) { melee(p); return; }
      if (p.ammo[p.weapon] <= 0) { G.audio?.click(); p.fireCooldown = 0.3; return; }
      p.ammo[p.weapon]--;
      const ray = G.cameraRig.aimRay();
      // soft lock-on: bend the shot toward a person within a few degrees of the crosshair
      let best = null, bestA = 0.07;
      for (const h of G.humans) {
        if (h === p || !h.alive || !h.visible) continue;
        const dx = h.x - ray.origin.x, dy = (h.y || 0) + 1.15 - ray.origin.y, dz = h.z - ray.origin.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > WEAPONS[p.weapon].range) continue;
        const a = Math.acos(Math.min(1, (dx * ray.dir.x + dy * ray.dir.y + dz * ray.dir.z) / d));
        if (a < bestA) { bestA = a; best = { dx: dx / d, dy: dy / d, dz: dz / d }; }
      }
      if (best) ray.dir.set(best.dx, best.dy, best.dz);
      // start the ray at the player's depth so walls behind the camera never block it
      const along = Math.max(0, (p.x - ray.origin.x) * ray.dir.x + (p.z - ray.origin.z) * ray.dir.z);
      const o = { x: ray.origin.x + ray.dir.x * along, y: ray.origin.y + ray.dir.y * along, z: ray.origin.z + ray.dir.z * along };
      const muzzle = { x: p.x + Math.sin(p.heading) * 0.7 - Math.cos(p.heading) * 0.3, y: p.y + 1.45, z: p.z + Math.cos(p.heading) * 0.7 + Math.sin(p.heading) * 0.3 };
      const hit = fire(p, o, ray.dir, p.weapon, { muzzle });
      G.hud?.hitMarker(!!(hit.hitH || hit.hitV));
      G.events.emit('crime', 'gunfire', p.x, p.z);
      G.cameraRig.shake = Math.max(G.cameraRig.shake, 0.05);
    },
    // NPC shooting at a target person with a hit chance.
    npcShoot(shooter, target, accuracy = 0.3) {
      const mx = shooter.x + Math.sin(shooter.heading) * 0.7, mz = shooter.z + Math.cos(shooter.heading) * 0.7, my = (shooter.y || 0) + 1.45;
      const ty = (target.y || 0) + 1.1;
      const dir = new THREE.Vector3(target.x - mx, ty - my, target.z - mz).normalize();
      if (!rng.chance(accuracy)) { dir.x += rng.range(-0.12, 0.12); dir.y += rng.range(0.02, 0.1); dir.z += rng.range(-0.12, 0.12); dir.normalize(); }
      fire(shooter, { x: mx, y: my, z: mz }, dir, shooter.weapon || 'pistol', { muzzle: { x: mx, y: my, z: mz } });
    },
    explosion(x, z, radius, source) {
      G.cameraRig.shake = Math.max(G.cameraRig.shake, Math.max(0, 1.2 - Math.hypot(G.camera.position.x - x, G.camera.position.z - z) / 60));
      G.audio?.explosion(x, z);
      for (const h of G.humans) {
        const d = Math.hypot(h.x - x, h.z - z);
        if (d < radius && h.alive) damageHuman(h, 120 * (1 - d / radius), source?.driver === 'player' ? G.player : null);
      }
      if (G.player.vehicle && Math.hypot(G.player.vehicle.x - x, G.player.vehicle.z - z) < 0.5) damageHuman(G.player, 200);
      for (const v of G.vehicles) {
        if (v === source) continue;
        const d = Math.hypot(v.x - x, v.z - z);
        if (d < radius) { v.health -= 60 * (1 - d / radius); v.vx += (v.x - x) * 2; v.vz += (v.z - z) * 2; }
      }
      G.peds.alarm(x, z, 70);
      G.traffic.alarm(x, z, 60);
    },
  };
}
