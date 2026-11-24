// Side activities between story missions: three street time trials (drive into a blue marker in any
// car, beat the par time through the checkpoints) and Halcyon Cabs fares (press T in a cab, pick up
// the passenger, drop them off fast for a bigger tip).
import { makeMarkerBeam } from '../render/markerBeam.js';
import { DISTRICTS, districtAt } from '../world/cityPlan.js';
import { rng } from '../core/random.js';

export const RACES = [
  { id: 'mile-sprint', name: 'Flamingo Mile Sprint', start: { x: -398.25, z: 370 }, par: 34, reward: 600, points: [[-400, 200], [-400, 0], [-400, -200], [-398, -390]] },
  { id: 'glasswater-loop', name: 'Glasswater Loop', start: { x: 1.75, z: 170 }, par: 52, reward: 900, points: [[0, 0], [0, -200], [200, -200], [200, 0], [100, 100], [0, 190]] },
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
    race = { r, i: 0, t: 0, countdown: 3 };
    G.hud.big('3', 'passed', r.name, 0.9);
    G.audio.ui();
  }
  function finishRace() {
    const { r, t } = race;
    const won = t <= r.par;
    if (!best[r.id] || t < best[r.id]) best[r.id] = t;
    if (won) { G.progression.addCash(r.reward, `${r.name} won`); G.progression.addRespect(60); G.audio.missionPassed(); }
    G.hud.big(won ? 'Race won' : 'Too slow', won ? 'passed' : 'wasted', `${r.name} · ${t.toFixed(2)} s · par ${r.par} s`, 3.5);
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
    racesWon: () => RACES.filter((r) => best[r.id] !== undefined && best[r.id] <= r.par).length,
    faresDone: () => faresDone,
    markers: () => (busy() || race || fare ? [] : RACES.map((r) => ({ x: r.start.x, z: r.start.z }))),
    target() {
      if (race && race.countdown <= 0) { const [x, z] = race.r.points[race.i]; return { x, z }; }
      if (fare) return fare.stage === 'pickup' ? { x: fare.x, z: fare.z } : { x: fare.dx, z: fare.dz };
      return null;
    },
    timer: () => (race ? Math.max(0, race.t) : null),
    card() {
      if (race) return { kicker: 'Street time trial', title: race.r.name, objective: race.countdown > 0 ? `Get ready… <b>${Math.ceil(race.countdown)}</b>` : `Checkpoint <b>${race.i + 1}/${race.r.points.length}</b> · par ${race.r.par} s`, index: race.i, total: race.r.points.length };
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
        if (!v || busy()) { race = null; G.notify('Race abandoned'); return; }
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
    reset() { race = null; fare = null; fareBeam.visible = false; },
  };
}
