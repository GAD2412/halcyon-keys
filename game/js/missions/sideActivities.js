// Side activities between story missions: three street races (drive into a blue marker in any car,
// beat three rival drivers through the checkpoints; the HUD shows position, checkpoint and time) and
// Halcyon Cabs fares (press T in a cab, pick up the passenger, drop them off fast for a bigger tip).
import { makeMarkerBeam } from '../render/markerBeam.js';
import { DISTRICTS, districtAt } from '../world/cityPlan.js';
import { rng } from '../core/random.js';
import { Vehicle } from '../entities/vehicle.js';
import { routeWaypoint } from '../ai/policeAI.js';
import { clamp, wrapAngle, headingTo } from '../core/mathUtils.js';

const RIVALS = [['kestrel', '#7a3ad8', 41], ['brute8', '#f2b134', 39], ['kestrel', '#2bb3a8', 37]];
const ORDINAL = ['1st', '2nd', '3rd', '4th'];

// Rival AI: follow the street grid to the next checkpoint at a skill-limited speed.
function driveRival(G, rv, race, dt) {
  const s = rv.race;
  const [tx, tz] = race.r.points[Math.min(s.i, race.r.points.length - 1)];
  if (s.done) { Object.assign(rv.controls, { throttle: 0, brake: 0, steer: 0, handbrake: true }); return; }   // brake at rest would reverse
  if (Math.hypot(rv.x - tx, rv.z - tz) < 14) { s.i++; if (s.i >= race.r.points.length) { s.done = true; s.t = race.t; } return; }
  const wp = routeWaypoint(rv.x, rv.z, tx, tz);
  const diff = wrapAngle(headingTo(rv.x, rv.z, wp.x, wp.z) - rv.heading);
  const cap = Math.abs(diff) > 0.7 ? 14 : Math.abs(diff) > 0.35 ? 24 : s.cap;
  if (s.reverse > 0) { s.reverse -= dt; Object.assign(rv.controls, { throttle: 0, brake: 1, steer: clamp(diff * 2, -1, 1), handbrake: false }); return; }
  rv.controls.steer = clamp(-diff * 2.6, -1, 1);
  rv.controls.handbrake = Math.abs(diff) > 1.1 && rv.speed > 14;
  if (rv.speed < cap) { rv.controls.throttle = 1; rv.controls.brake = 0; } else { rv.controls.throttle = 0; rv.controls.brake = clamp((rv.speed - cap) / 6, 0.2, 1); }
  s.stuck = rv.controls.throttle > 0 && Math.abs(rv.speed) < 1.2 ? s.stuck + dt : 0;
  if (s.stuck > 1.4) { s.reverse = 1.1; s.stuck = 0; }
}

export const RACES = [
  { id: 'mile-sprint', name: 'Flamingo Mile Sprint', start: { x: -398.25, z: 370 }, par: 34, reward: 600, points: [[-400, 200], [-400, 0], [-400, -200], [-398, -390]] },
  { id: 'glasswater-loop', name: 'Glasswater Loop', start: { x: 101.75, z: 170 }, par: 52, reward: 900, points: [[100, 0], [100, -200], [0, -200], [0, 0], [0, 100], [100, 190]] },
  { id: 'dockside-dash', name: 'Dockside Dash', start: { x: 380, z: 401.75 }, par: 46, reward: 800, points: [[300, 400], [100, 400], [100, 200], [300, 200], [300, 0]] },
];

const FARE_SPOTS = [[-209, 141], [-109, 30], [91, -170], [109, 160], [-309, -60], [209, 120], [-91, 250], [291, -120], [-391, 160], [9, -291], [191, 330], [-209, -330]];

export function createSideActivities(G) {
  const best = {};
  const beams = RACES.map(() => makeMarkerBeam(0x4aa8ff, 45));
  for (const b of beams) G.scene.add(b);
  const fareBeam = makeMarkerBeam(0x6cff8a, 45);
  G.scene.add(fareBeam);
  let race = null, fare = null, faresDone = 0;
  const pos = () => (G.player.vehicle ? G.player.vehicle : G.player);
  const busy = () => !!G.missions.active();

  function startRace(r) {
    race = { r, i: 0, t: 0, countdown: 3, rivals: [] };
    // the grid: rivals line up beside and behind the player, facing the first checkpoint
    const v = G.player.vehicle, [fx, fz] = r.points[0];
    const ax = Math.abs(fx - r.start.x) > Math.abs(fz - r.start.z);
    const dx = ax ? Math.sign(fx - r.start.x) : 0, dz = ax ? 0 : Math.sign(fz - r.start.z);
    const h = Math.atan2(dx, dz), sx = -dz, sz = dx;   // sx/sz: the lane to the player's left
    [[3.5, 0], [0, -8], [3.5, -8]].forEach(([side, back], k) => {
      const [type, paint, cap] = RIVALS[k];
      const rv = new Vehicle(G, type, v.x + sx * side + dx * back, v.z + sz * side + dz * back, h, paint);
      rv.driver = 'race'; rv.race = { i: 0, cap, stuck: 0, reverse: 0, done: false, t: 0 };
      rv.sync();
      G.vehicles.push(rv); race.rivals.push(rv);
    });
    G.hud.big('3', 'passed', r.name, 0.9);
    G.audio.ui();
  }
  function clearRivals() {
    for (const rv of race?.rivals || []) { if (rv.driver !== 'race') continue; rv.remove(); const i = G.vehicles.indexOf(rv); if (i >= 0) G.vehicles.splice(i, 1); }
  }
  // 1 + rivals ahead: more checkpoints cleared, or the same count and closer to the next one
  function position() {
    const [x, z] = race.r.points[Math.min(race.i, race.r.points.length - 1)];
    const mine = Math.hypot(pos().x - x, pos().z - z);
    return 1 + race.rivals.filter((rv) => rv.race.done || rv.race.i > race.i || (rv.race.i === race.i && Math.hypot(rv.x - x, rv.z - z) < mine)).length;
  }
  function finishRace() {
    const { r, t } = race;
    const place = 1 + race.rivals.filter((rv) => rv.race.done).length;
    const won = place === 1;
    if (won) {
      if (!best[r.id] || t < best[r.id]) best[r.id] = t;
      G.progression.addCash(r.reward, `${r.name} won`); G.progression.addRespect(60); G.audio.missionPassed();
    }
    G.hud.big(won ? 'Race won' : `${ORDINAL[place - 1]} place`, won ? 'passed' : 'wasted', `${r.name} · ${t.toFixed(2)} s`, 3.5);
    clearRivals();
    race = null;
  }
  function newFare() {
    const p = pos();
    const pick = FARE_SPOTS.filter(([x, z]) => Math.hypot(x - p.x, z - p.z) > 120);
    const [px, pz] = rng.pick(pick);
    const drop = rng.pick(FARE_SPOTS.filter(([x, z]) => Math.hypot(x - px, z - pz) > 250));
    fare = { stage: 'pickup', x: px, z: pz, dx: drop[0], dz: drop[1], t: 0, ped: null };
    G.notify(`Halcyon Cabs: fare waiting in ${DISTRICTS[districtAt(px, pz)].name}`);
  }

  return {
    races: RACES, best,
    racesWon: () => RACES.filter((r) => best[r.id] !== undefined).length,
    rivals: () => race?.rivals || [],
    place: () => (race && race.countdown <= 0 ? position() : null),
    faresDone: () => faresDone,
    markers: () => (busy() || race || fare ? [] : RACES.map((r) => ({ x: r.start.x, z: r.start.z }))),
    target() {
      if (race && race.countdown <= 0) { const [x, z] = race.r.points[race.i]; return { x, z }; }
      if (fare) return fare.stage === 'pickup' ? { x: fare.x, z: fare.z } : { x: fare.dx, z: fare.dz };
      return null;
    },
    timer: () => (race ? Math.max(0, race.t) : null),
    card() {
      if (race) return { kicker: 'Street race', title: race.r.name, objective: race.countdown > 0 ? `Get ready… <b>${Math.ceil(race.countdown)}</b>` : `Position <b>${position()}/4</b> · Checkpoint <b>${race.i + 1}/${race.r.points.length}</b>`, index: race.i, total: race.r.points.length };
      if (fare) return { kicker: 'Halcyon Cabs', title: fare.stage === 'pickup' ? 'Pick up the fare' : 'Drop off the fare', objective: fare.stage === 'pickup' ? `Stop by the green marker in <b>${DISTRICTS[districtAt(fare.x, fare.z)].name}</b>` : `Drive to <b>${DISTRICTS[districtAt(fare.dx, fare.dz)].name}</b> · tip falls with time`, index: fare.stage === 'pickup' ? 0 : 1, total: 2 };
      return null;
    },
    prompt() {
      const v = G.player.vehicle;
      if (v && v.type === 'cab' && !fare && !race && !busy()) return '<kbd>T</kbd>Start a Halcyon Cabs fare';
      return '';
    },
    update(dt, input) {
      const p = pos(), v = G.player.vehicle;
      const idle = !busy() && !race && !fare && G.mode === 'play';
      RACES.forEach((r, i) => {
        beams[i].visible = idle;
        if (!idle) return;
        beams[i].position.set(r.start.x, 0, r.start.z);
        beams[i].pulse(G.time);
        if (v && Math.hypot(p.x - r.start.x, p.z - r.start.z) < 6 && Math.abs(v.speed) < 8) startRace(r);
      });
      if (race) {
        if (!v || busy()) { clearRivals(); race = null; G.notify('Race abandoned'); return; }
        for (const rv of race.rivals) if (rv.driver === 'race' && !rv.wrecked) {
          if (race.countdown > 0) Object.assign(rv.controls, { throttle: 0, brake: 0, steer: 0, handbrake: true }); else driveRival(G, rv, race, dt);
        }
        if (race.countdown > 0) {
          const before = Math.ceil(race.countdown);
          race.countdown -= dt;
          v.controls.throttle = 0; v.controls.brake = 1;
          if (Math.ceil(race.countdown) !== before && race.countdown > 0) { G.hud.big(String(Math.ceil(race.countdown)), 'passed', race.r.name, 0.9); G.audio.ui(); }
          if (race.countdown <= 0) { G.hud.big('Go!', 'passed', race.r.name, 0.8); G.audio.starUp(); }
          return;
        }
        race.t += dt;
        const [x, z] = race.r.points[race.i];
        if (Math.hypot(p.x - x, p.z - z) < 13) { race.i++; G.audio.ui(); if (race.i >= race.r.points.length) finishRace(); }
      }
      if (input.pressed('KeyT') && v && v.type === 'cab' && !fare && !race && !busy()) newFare();
      if (fare) {
        if (!v || v.type !== 'cab' || busy()) { fare = null; G.notify('Fare cancelled'); fareBeam.visible = false; return; }
        fare.t += dt;
        const tx = fare.stage === 'pickup' ? fare.x : fare.dx, tz = fare.stage === 'pickup' ? fare.z : fare.dz;
        fareBeam.visible = true; fareBeam.position.set(tx, 0, tz); fareBeam.pulse(G.time);
        if (Math.hypot(p.x - tx, p.z - tz) < 10 && Math.abs(v.speed) < 3) {
          if (fare.stage === 'pickup') { fare.stage = 'drop'; fare.t = 0; G.notify('Passenger aboard'); G.audio.door(); }
          else {
            const dist = Math.hypot(fare.dx - fare.x, fare.dz - fare.z);
            const pay = Math.round(40 + dist / 4 + Math.max(0, 60 - fare.t) * 3);
            G.progression.addCash(pay, 'Fare paid'); G.progression.addRespect(15);
            faresDone++; fare = null; fareBeam.visible = false;
          }
        }
      } else fareBeam.visible = false;
    },
    reset() { clearRivals(); race = null; fare = null; fareBeam.visible = false; },
    // shot mode: put a race in progress with rivals already placed
    stageRace(id, i, t, rivals) {
      const r = RACES.find((q) => q.id === id);
      race = { r, i, t, countdown: 0, rivals };
      for (const rv of rivals) { rv.driver = 'race'; rv.race = { i, cap: 40, stuck: 0, reverse: 0, done: false, t: 0 }; }
    },
  };
}
