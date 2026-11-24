// Civilian traffic: cars keep to the right-hand lanes of the grid, stop at red signals, follow the car
// ahead, turn at junctions, honk, and speed off in a panic when shooting or a police chase is near.
// Spawns ahead of the player and recycles cars that fall far behind.
import { Vehicle } from '../entities/vehicle.js';
import { TRAFFIC_MIX } from '../entities/vehicleCatalog.js';
import { GRID, CITY_MIN, CITY_MAX, LANE_OFFSETS, PITCH } from '../world/cityPlan.js';
import { isGreen } from './trafficSignals.js';
import { clamp, wrapAngle, headingTo, rightOf } from '../core/mathUtils.js';
import { rng } from '../core/random.js';

const headingFor = (axis, dir) => (axis === 'ns' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2);
const lateralFor = (axis, coord, dir, lane) => (axis === 'ns' ? coord - dir * LANE_OFFSETS[lane] : coord + dir * LANE_OFFSETS[lane]);
const roadExists = (v) => v >= CITY_MIN - 1 && v <= CITY_MAX + 1;

export function lanePoint(axis, coord, dir, lane, along) {
  const lat = lateralFor(axis, coord, dir, lane);
  return axis === 'ns' ? { x: lat, z: along } : { x: along, z: lat };
}

// Put a car (e.g. a police cruiser whose chase ended) back on the nearest lane matching its heading.
export function snapToLane(car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const axis = Math.abs(fz) > Math.abs(fx) ? 'ns' : 'ew';
  const dir = axis === 'ns' ? Math.sign(fz) || 1 : Math.sign(fx) || 1;
  const coord = Math.max(CITY_MIN, Math.min(CITY_MAX, Math.round((axis === 'ns' ? car.x : car.z) / PITCH) * PITCH));
  car.ai = { kind: 'traffic', axis, coord, dir, lane: rng.int(0, 1), turn: null, decidedAt: null, cruise: rng.range(10, 13.5), stuck: 0, panic: 0, honk: 0 };
}

export function createTraffic(G) {
  const cars = [];
  const target = { count: 24 };
  let spawnT = 0;

  function spawnCar(near, minD = 70, maxD = 210, type = null) {
    for (let tries = 0; tries < 12; tries++) {
      const axis = rng.chance(0.5) ? 'ns' : 'ew';
      const coord = clamp(Math.round(((axis === 'ns' ? near.x : near.z) + rng.range(-180, 180)) / PITCH) * PITCH, CITY_MIN, CITY_MAX);
      const dir = rng.chance(0.5) ? 1 : -1, lane = rng.int(0, 1);
      const base = axis === 'ns' ? near.z : near.x;
      let along = base + rng.range(-maxD, maxD);
      along = clamp(along, CITY_MIN + 12, CITY_MAX - 12);
      const m = ((along % 100) + 100) % 100;
      if (m < 14 || m > 86) continue;
      const p = lanePoint(axis, coord, dir, lane, along);
      const d = Math.hypot(p.x - near.x, p.z - near.z);
      if (d < minD || d > maxD + 40) continue;
      if (G.vehicles.some((v) => Math.hypot(v.x - p.x, v.z - p.z) < 9)) continue;
      const car = new Vehicle(G, type || rng.pick(TRAFFIC_MIX), p.x, p.z, headingFor(axis, dir));
      car.driver = 'ai';
      car.ai = { kind: 'traffic', axis, coord, dir, lane, turn: null, decidedAt: null, cruise: rng.range(10, 13.5), stuck: 0, panic: 0, honk: 0 };
      const f = car.forward; car.vx = f.x * 9; car.vz = f.z * 9;
      G.vehicles.push(car); cars.push(car);
      return car;
    }
    return null;
  }

  function drive(car, dt) {
    const ai = car.ai;
    const along = ai.axis === 'ns' ? car.z : car.x;
    const next = ai.dir > 0 ? Math.floor(along / PITCH + 1e-6) * PITCH + PITCH : Math.ceil(along / PITCH - 1e-6) * PITCH - PITCH;
    const toInter = (next - along) * ai.dir;
    let tgt;
    let speedCap = ai.cruise + (ai.panic > 0 ? 9 : 0);
    ai.panic = Math.max(0, ai.panic - dt);

    if (ai.turn) {
      tgt = ai.turn.point;
      speedCap = Math.min(speedCap, 7.5);
      if (Math.hypot(tgt.x - car.x, tgt.z - car.z) < 4) {
        Object.assign(ai, ai.turn.road);
        ai.turn = null;
      }
    } else {
      // decide what to do at the next junction
      if (toInter < 16 && ai.decidedAt !== next) {
        ai.decidedAt = next;
        const h = headingFor(ai.axis, ai.dir);
        const opts = [];
        if (roadExists(next + ai.dir * PITCH)) opts.push('straight', 'straight');
        for (const side of ['left', 'right']) {
          const nh = h + (side === 'right' ? -Math.PI / 2 : Math.PI / 2);
          const naxis = ai.axis === 'ns' ? 'ew' : 'ns';
          const ndir = naxis === 'ns' ? Math.sign(Math.round(Math.cos(nh))) : Math.sign(Math.round(Math.sin(nh)));
          if (roadExists(ai.coord + ndir * PITCH)) opts.push({ side, naxis, ndir });
        }
        const pick = opts.length ? rng.pick(opts) : 'straight';
        ai.plan = pick;
      }
      // signals
      if (ai.panic <= 0 && toInter > 8 && toInter < 22 && !isGreen(ai.axis, G.time) && roadExists(next)) speedCap = Math.min(speedCap, Math.max(0, (toInter - 10) * 0.9));
      if (ai.plan && ai.plan !== 'straight' && toInter < 9.5 && ai.decidedAt === next) {
        const { naxis, ndir } = ai.plan;
        const nlane = ai.plan.side === 'right' ? 0 : ai.lane;
        const pt = lanePoint(naxis, next, ndir, nlane, ai.coord + ndir * 11);
        ai.turn = { point: pt, road: { axis: naxis, coord: next, dir: ndir, lane: nlane } };
        ai.plan = null;
        tgt = pt;
      } else {
        tgt = lanePoint(ai.axis, ai.coord, ai.dir, ai.lane, along + ai.dir * 11);
      }
      if (!roadExists(next) && toInter < 12) { // end of the grid: U-turn onto the opposite carriageway
        ai.dir = -ai.dir;
        ai.turn = { point: lanePoint(ai.axis, ai.coord, ai.dir, 1, along + ai.dir * 6), road: { axis: ai.axis, coord: ai.coord, dir: ai.dir, lane: 1 } };
      }
    }

    // follow the car or person ahead
    const f = car.forward, r = rightOf(car.heading);
    for (const o of G.vehicles) {
      if (o === car) continue;
      const dx = o.x - car.x, dz = o.z - car.z;
      if (Math.abs(dx) > 26 || Math.abs(dz) > 26) continue;
      const fwd = dx * f.x + dz * f.z, lat = Math.abs(dx * r.x + dz * r.z);
      const stop = 3 + (car.spec.len + o.spec.len) / 2;   // bumper-to-bumper gap, so buses get room too
      if (fwd > 0 && fwd < stop + 14 && lat < 2.6) speedCap = Math.min(speedCap, Math.max(0, (fwd - stop) * 1.1));
    }
    for (const h of G.humansOnRoad) {
      const dx = h.x - car.x, dz = h.z - car.z;
      const fwd = dx * f.x + dz * f.z, lat = Math.abs(dx * r.x + dz * r.z);
      if (fwd > 0 && fwd < 14 && lat < 1.8) {
        speedCap = Math.min(speedCap, Math.max(0, (fwd - 4.5) * 1.2));
        if (h === G.player && ai.honk <= 0 && car.speed < 2) { ai.honk = 4; G.audio?.horn(car.x, car.z); }
      }
    }
    ai.honk -= dt;

    const desired = headingTo(car.x, car.z, tgt.x, tgt.z);
    const diff = wrapAngle(desired - car.heading);
    car.controls.steer = clamp(-diff * 2.4, -1, 1);
    const v = car.speed;
    car.controls.handbrake = false;
    if (v < speedCap - 0.4) { car.controls.throttle = clamp((speedCap - v) / 4, 0.25, 1); car.controls.brake = 0; }
    else if (v > speedCap + 0.8) { car.controls.throttle = 0; car.controls.brake = clamp((v - speedCap) / 5, 0.2, 1); }
    else { car.controls.throttle = 0.15; car.controls.brake = 0; }
    ai.stuck = speedCap > 3 && Math.abs(v) < 0.6 ? ai.stuck + dt : 0;
  }

  return {
    cars, target,
    spawnCar,
    alarm(x, z, radius) {
      for (const c of cars) if (Math.hypot(c.x - x, c.z - z) < radius && c.ai?.kind === 'traffic') c.ai.panic = 8;
    },
    update(dt) {
      const p = G.focus;
      spawnT -= dt;
      const live = cars.filter((c) => !c.removed && c.driver === 'ai');
      if (live.length < target.count && spawnT <= 0) { spawnCar(p); spawnT = 0.25; }
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        if (c.removed) { cars.splice(i, 1); continue; }
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        const owned = c.driver === 'player' || c.role === 'mission';
        if (!owned && (d > 280 || (c.wrecked && d > 120) || (c.ai?.stuck > 6 && d > 50))) {
          c.remove();
          G.vehicles.splice(G.vehicles.indexOf(c), 1);
          cars.splice(i, 1);
          continue;
        }
        if (c.driver === 'ai' && c.ai?.kind === 'traffic' && !c.wrecked) drive(c, dt);
        else if (c.driver !== 'player' && c.ai?.kind !== 'police') { c.controls.throttle = 0; c.controls.brake = 1; c.controls.steer = 0; }
      }
    },
  };
}
