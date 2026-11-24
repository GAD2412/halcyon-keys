// PHPD dispatch: sends units by star level (1★ patrol, 2★ cruisers, 3★ MANTA-1 helicopter, 4★
// Barracuda interceptors and roadblocks, 5★ everything), keeps the unit roster for the HUD, decides
// whether police can see the suspect, handles arrests and stands units down when the heat is gone.
import { Vehicle } from '../entities/vehicle.js';
import { createHelicopter } from '../entities/helicopter.js';
import { drivePoliceCar, updateOfficer, deployOfficers } from './policeAI.js';
import { snapToLane, lanePoint } from './trafficAI.js';
import { CITY_MIN, CITY_MAX, PITCH } from '../world/cityPlan.js';
import { clamp } from '../core/mathUtils.js';
import { rng } from '../core/random.js';

const DESIRED = [0, 2, 3, 4, 5, 6];
let callsignN = 10;

export function createPoliceDispatch(G) {
  const units = [];
  const officers = [];
  const roadblocks = [];
  let heli = null, spawnT = 0, roadblockT = 6, arrest = 0, arrestDecay = 0;

  function makeUnit(type, x, z, heading) {
    const car = new Vehicle(G, type, x, z, heading);
    car.driver = 'ai'; car.role = 'police'; car.sirenOn = true;
    car.ai = { kind: 'police', stuck: 0, reverse: 0, deployed: false };
    car.callsign = `${type === 'barracuda' ? 'BARRACUDA' : 'REEF'}-${callsignN++}`;
    G.vehicles.push(car);
    units.push(car);
    return car;
  }

  function spawnUnit() {
    const p = G.player;
    const pf = p.vehicle ? p.vehicle.forward : { x: Math.sin(p.heading), z: Math.cos(p.heading) };
    for (let tries = 0; tries < 16; tries++) {
      const axis = rng.chance(0.5) ? 'ns' : 'ew';
      const coord = clamp(Math.round(((axis === 'ns' ? p.x : p.z) + rng.range(-150, 150)) / PITCH) * PITCH, CITY_MIN, CITY_MAX);
      const along = clamp((axis === 'ns' ? p.z : p.x) + rng.range(-170, 170), CITY_MIN + 15, CITY_MAX - 15);
      const pt = lanePoint(axis, coord, 1, 0, along);
      const dx = pt.x - p.x, dz = pt.z - p.z, d = Math.hypot(dx, dz);
      if (d < 85 || d > 190) continue;
      if ((dx * pf.x + dz * pf.z) / d > 0.6 && tries < 10) continue; // prefer arriving from behind or the side
      if (G.vehicles.some((v) => Math.hypot(v.x - pt.x, v.z - pt.z) < 8)) continue;
      const type = G.wanted.stars >= 4 && rng.chance(0.5) ? 'barracuda' : 'reef';
      const heading = Math.atan2(p.x - pt.x, p.z - pt.z);
      return makeUnit(type, pt.x, pt.z, heading);
    }
    return null;
  }

  function placeRoadblock() {
    const p = G.player, v = p.vehicle;
    if (!v || Math.abs(v.speed) < 8) return;
    const f = v.forward;
    const axis = Math.abs(f.z) > Math.abs(f.x) ? 'ns' : 'ew';
    const dir = axis === 'ns' ? Math.sign(f.z) : Math.sign(f.x);
    const coord = Math.round((axis === 'ns' ? v.x : v.z) / PITCH) * PITCH;
    const along = (axis === 'ns' ? v.z : v.x) + dir * rng.range(90, 130);
    if (along < CITY_MIN + 10 || along > CITY_MAX - 10) return;
    const h = axis === 'ns' ? Math.PI / 2 : 0;
    for (const side of [-1, 1]) {
      const pt = lanePoint(axis, coord, 1, 0, along);
      const x = axis === 'ns' ? coord + side * 3.4 : along, z = axis === 'ns' ? along : coord + side * 3.4;
      const car = makeUnit('reef', x, z, h + (side > 0 ? 0.25 : -0.25));
      car.ai.kind = 'roadblock';
      car.ai.deployed = true;
      roadblocks.push(car);
      void pt;
    }
    G.notify?.('Roadblock ahead');
  }

  function release(car) {
    const i = units.indexOf(car);
    if (i >= 0) units.splice(i, 1);
  }

  return {
    units, officers, roadblocks,
    get heli() { return heli; },
    setHeli(h) { heli = h; },
    makeUnit, release, deployOfficers: (car) => deployOfficers(G, car),
    anyNear(x, z, r) { return units.some((u) => Math.hypot(u.x - x, u.z - z) < r) || officers.some((o) => o.alive && Math.hypot(o.x - x, o.z - z) < r); },
    canSee(x, z) {
      if (heli && heli.sees(x, z)) return true;
      for (const u of units) if (!u.wrecked && Math.hypot(u.x - x, u.z - z) < 80 && G.collision.lineOfSight(u.x, u.z, x, z)) return true;
      for (const o of officers) if (o.alive && Math.hypot(o.x - x, o.z - z) < 55 && G.collision.lineOfSight(o.x, o.z, x, z)) return true;
      return false;
    },
    arrestProgress(dt) { arrest += dt * 2; arrestDecay = 0.3; },
    roster() {
      const p = G.player;
      const list = units.filter((u) => !u.wrecked).map((u) => ({ name: u.callsign, d: Math.hypot(u.x - p.x, u.z - p.z), status: u.ai?.kind === 'roadblock' ? 'ROADBLOCK' : u.ai?.deployed ? 'ON FOOT' : Math.hypot(u.x - p.x, u.z - p.z) < 18 ? 'RAMMING' : 'PURSUIT' }));
      if (heli && !heli.leaving) list.push({ name: 'MANTA-1', d: Math.hypot(heli.x - p.x, heli.z - p.z), status: 'AIR' });
      return list.sort((a, b) => a.d - b.d).slice(0, 5);
    },
    update(dt) {
      const stars = G.wanted.stars;
      const p = G.player;
      // patrol cruisers in traffic join the chase
      if (stars > 0) for (const c of G.traffic.cars) {
        if (c.spec.police && c.driver === 'ai' && c.ai?.kind === 'traffic' && Math.hypot(c.x - p.x, c.z - p.z) < 160) {
          c.ai = { kind: 'police', stuck: 0, reverse: 0, deployed: false }; c.role = 'police'; c.callsign = `REEF-${callsignN++}`;
          units.push(c);
        }
      }
      spawnT -= dt;
      const active = units.filter((u) => !u.wrecked && u.ai?.kind === 'police').length;
      if (stars > 0 && active < DESIRED[stars] && spawnT <= 0 && p.alive) { spawnUnit(); spawnT = 2.5; }
      // roadblocks from 4 stars
      roadblockT -= dt;
      if (stars >= 4 && roadblockT <= 0 && roadblocks.length < 4) { placeRoadblock(); roadblockT = 22; }
      for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        const d = Math.hypot(u.x - p.x, u.z - p.z);
        if (u.removed) { units.splice(i, 1); continue; }
        if (stars === 0 || u.wrecked) {
          // stand down: rejoin traffic, or vanish when far
          u.sirenOn = false;
          if (u.wrecked || d > 120 || u.ai?.kind === 'roadblock') {
            if (d > 90 || u.wrecked && d > 60) { u.remove(); G.vehicles.splice(G.vehicles.indexOf(u), 1); units.splice(i, 1); const rb = roadblocks.indexOf(u); if (rb >= 0) roadblocks.splice(rb, 1); }
            else { u.controls.throttle = 0; u.controls.brake = 1; }
            continue;
          }
          snapToLane(u); u.role = 'traffic';
          G.traffic.cars.push(u);
          units.splice(i, 1);
          continue;
        }
        if (u.ai?.kind === 'roadblock') {
          u.controls.throttle = 0; u.controls.brake = 1; u.controls.steer = 0;
          if (d > 260) { u.remove(); G.vehicles.splice(G.vehicles.indexOf(u), 1); units.splice(i, 1); roadblocks.splice(roadblocks.indexOf(u), 1); }
          continue;
        }
        if (d > 330) { u.remove(); G.vehicles.splice(G.vehicles.indexOf(u), 1); units.splice(i, 1); continue; }
        if (u.ai?.kind === 'police' && u.driver === 'ai') drivePoliceCar(G, u, dt);
      }
      // officers on foot
      for (let i = officers.length - 1; i >= 0; i--) {
        const o = officers[i];
        updateOfficer(G, o, dt);
        if (o.done || (!o.alive && o.deadT <= 0) || Math.hypot(o.x - p.x, o.z - p.z) > 200) {
          if (o.car && o.done) o.car.ai && (o.car.ai.deployed = officers.some((x) => x !== o && x.car === o.car && !x.done));
          officers.splice(i, 1);
          G.humans.splice(G.humans.indexOf(o), 1);
        }
      }
      // air unit
      if (stars >= 3 && (!heli || heli.removed)) { heli = createHelicopter(G, p.x + 250, p.z - 250); }
      if (heli && !heli.removed) { if (stars < 3) heli.leaving = true; heli.update(dt); }
      // arrests: on foot when cuffed, or boxed in while stopped in a car
      arrestDecay -= dt;
      if (arrestDecay <= 0) arrest = Math.max(0, arrest - dt);
      if (p.vehicle && stars > 0 && stars <= 2 && Math.abs(p.vehicle.speed) < 1.2 && units.some((u) => Math.hypot(u.x - p.x, u.z - p.z) < 7.5)) { arrest += dt; arrestDecay = 0.2; }
      if (arrest > 3 && p.alive) { arrest = 0; G.events.emit('busted'); }
    },
    clearAll() {
      for (const u of [...units]) { u.remove(); G.vehicles.splice(G.vehicles.indexOf(u), 1); }
      units.length = 0; roadblocks.length = 0;
      for (const o of officers) G.humans.splice(G.humans.indexOf(o), 1);
      officers.length = 0;
      if (heli) { heli.remove(); heli = null; }
    },
    drawGlows(glows) { if (heli && !heli.removed) heli.drawGlows(glows); },
    get arrest() { return arrest; },
  };
}
