// Shot mode (?shot=cover|onfoot|map|night): stages real in-game scenes with the game's own systems
// (cars, police, helicopter, crowds, HUD, missions, menus), then freezes the simulation so the
// screenshot is reproducible. window.__shotReady turns true when the frame is ready.
import * as THREE from 'three';
import { Vehicle } from '../entities/vehicle.js';
import { createHuman } from '../entities/characterModel.js';
import { createHelicopter } from '../entities/helicopter.js';
import { spawnGangMember } from '../ai/gangAI.js';
import { groundHeight } from '../world/cityPlan.js';
import { rng, createRandom } from '../core/random.js';

export function stageShot(G, name) {
  rng.reseed(1234);
  const r = createRandom(99);
  G.startGame(null);
  G.mode = 'shot';
  G.traffic.target.count = 0;
  G.peds.target.count = 0;

  const car = (type, x, z, h, paint, speed = 0, extra = {}) => {
    const v = new Vehicle(G, type, x, z, h, paint);
    v.driver = 'ai';
    const f = v.forward; v.vx = f.x * speed; v.vz = f.z * speed; v.speed = speed;
    Object.assign(v, extra);
    v.sync();
    G.vehicles.push(v);
    return v;
  };
  const cop = (type, x, z, h, speed = 0, phase = 0) => {
    const v = G.police.makeUnit(type, x, z, h);
    const f = v.forward; v.vx = f.x * speed; v.vz = f.z * speed; v.speed = speed;
    v.sirenOn = true; v.lightPhase = phase;
    v.sync();
    return v;
  };
  const person = (kind, x, z, h, pose, phase = r.range(0, 6)) => {
    const p = createHuman(kind, x, z, h);
    p.pose = pose; p.phase = phase; p.y = groundHeight(x, z);
    G.humans.push(p);
    return p;
  };
  const camera = (pos, look, fov = 62) => { G.cameraRig.override = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov }; };
  const smokeTrail = (x, z, dx, dz, n = 14) => {
    for (let i = 0; i < n; i++) {
      G.effects.smoke(x + dx * i * 0.9 + r.range(-0.4, 0.4), 0.4, z + dz * i * 0.9 + r.range(-0.4, 0.4), 0.9 + i * 0.05, 0.92, 0.34);
      G.effects.update(0.09);
    }
  };
  const finish = (focus) => {
    G.shotFocus = focus;
    G.hud.big('', '', '', 0);
    setTimeout(() => { window.__shotReady = true; }, 900);
  };
  const p = G.player;
  p.owned.add('smg'); p.ammo.smg = 186; p.ammo.pistol = 54;

  if (name === 'cover' || name === 'start') {
    // Golden hour, Flamingo Mile: a 4-star getaway with cruisers, MANTA-1, a roadblock, traffic and a fleeing crowd.
    G.dayNight.setHour(17.45);
    G.progression.cash = 24350; G.progression.respect = 940;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail', 'lantern-night', 'hot-wire', 'long-lens', 'armored-tuesday', 'wrens-convoy'] });
    G.missions.startMission('low-sun');
    G.missions.jumpToStep(3);
    G.wanted.force(4); G.wanted.seen = true;
    p.selectWeapon('smg'); p.health = 82; p.armor = 64;
    // the Kestrel drifts north toward the camera; the chase fills the boulevard behind it
    const Z = 40; // mid-block, clear of signal posts
    const kes = car('kestrel', -397.8, 100 + Z, Math.PI + 0.22, '#ff5a3c', 39);
    kes.roll = 0.06; kes.drifting = true; kes.controls.throttle = 1; kes.driver = null; kes.sync();
    p.enter(kes); p.x = kes.x; p.z = kes.z;
    smokeTrail(-397.2, 103 + Z, 0.25, 1, 10);
    smokeTrail(-399.4, 103.2 + Z, 0.3, 1, 8);
    for (let i = 1; i < 14; i++) G.skids.add(-396.6 + i * 0.2, 102 + Z + i * 1.3, -399 + i * 0.2, 102 + Z + i * 1.3);
    cop('reef', -402.6, 109.5 + Z, Math.PI - 0.1, 36, 0.4);
    cop('reef', -393.4, 113.5 + Z, Math.PI + 0.12, 35, 3.6);
    cop('barracuda', -398.6, 122 + Z, Math.PI - 0.03, 37, 1.9);
    cop('reef', -404.9, 128 + Z, Math.PI + 0.06, 34, 5.0);
    // a PHPD roadblock across all four lanes down the boulevard: cruisers in a V, officers aiming
    const rb = [[-404.4, 181, Math.PI / 2 + 0.12, 1.2], [-399.6, 183, -Math.PI / 2 + 0.1, 4.4], [-394.8, 181.2, Math.PI / 2 - 0.15, 2.6]];
    for (const [x, z, h, ph] of rb) cop('reef', x, z, h, 0, ph).ai.kind = 'roadblock';
    for (const [x, z] of [[-402, 178.2], [-397.2, 178.6], [-406.6, 177.8], [-392.4, 178.4]]) person('cop', x, z, Math.PI + r.range(-0.15, 0.15), 'aim');
    // civilian traffic: a cab braking beside the chase, cars pulled over, more down the road and across the junction
    car('cab', -405.25, 103 + Z, -0.12, '#f6b62e', 3, { controls: { throttle: 0, brake: 1, steer: 0, handbrake: false } });
    car('pip', -406.2, 165, -0.08, '#8fd7d0', 0, { controls: { throttle: 0, brake: 1, steer: 0, handbrake: false } });
    car('haulit', -393.6, 160, Math.PI + 0.06, '#f4f1ea', 0, { controls: { throttle: 0, brake: 1, steer: 0, handbrake: false } });
    car('caravel', -394.75, 196, Math.PI, '#2e4a7a', 0);
    car('cab', -405.25, 232, 0, '#f6b62e', 6);
    car('brute8', -401.75, 252, 0, '#1f2a44', 10);
    car('pip', -398.25, 240, Math.PI, '#f28ab2', 0);
    car('brute8', -372, 201.75, Math.PI / 2, '#3fb8b0', 10);
    car('caravel', -352, 198.25, -Math.PI / 2, '#8a1f2c', 10);
    // helicopter with its searchlight on the Kestrel
    const heli = createHelicopter(G, -394.5, 124 + Z);
    heli.y = 15.5; heli.heading = Math.PI - 0.7; heli.aimX = kes.x; heli.aimZ = kes.z;
    G.police.setHeli(heli);
    heli.update(0);
    // crowd fleeing on the boardwalk and the sidewalk
    person('ped', -409.5, 96 + Z, -Math.PI / 2 - 0.5, 'run', 1.2);
    person('ped', -411.6, 101.5 + Z, -Math.PI / 2 + 0.3, 'run', 3.9);
    person('ped', -410.2, 110 + Z, Math.PI - 0.6, 'run', 0.4);
    person('ped', -413.2, 92 + Z, -Math.PI / 2, 'cower');
    person('ped', -412.4, 118 + Z, -Math.PI / 2 - 0.2, 'run', 2.2);
    person('ped', -414.5, 126 + Z, -Math.PI / 2 + 0.5, 'run', 5.1);
    person('ped', -390.6, 97 + Z, Math.PI / 2 + 0.5, 'handsup');
    person('ped', -389.9, 108 + Z, 0.3, 'run', 1.7);
    person('ped', -391.2, 116 + Z, Math.PI / 2, 'cower');
    person('ped', -389.6, 128 + Z, Math.PI / 2 + 0.3, 'run', 4.4);
    // the beach promenade and the hotel sidewalk further up are busy too
    for (let i = 0; i < 12; i++) person('ped', -411 - r.range(0, 3.5), 140 + i * 5.5 + r.range(-1.5, 1.5), r.chance(0.5) ? -Math.PI / 2 + r.range(-0.6, 0.6) : r.range(-3, 3), r.chance(0.55) ? 'run' : 'walk');
    for (let i = 0; i < 8; i++) person('ped', -390.2 + r.range(-0.6, 0.6), 140 + i * 6 + r.range(-1.5, 1.5), r.chance(0.5) ? Math.PI / 2 : r.range(-3, 3), r.chance(0.5) ? 'run' : 'cower');
    for (let i = 0; i < 16; i++) person('ped', r.range(-462, -424), r.range(120, 260), r.range(-3, 3), r.chance(0.4) ? 'run' : 'idle');
    G.hud.dialogue.pin({ who: 'lux', text: 'MANTA-1 is right on you! Lose them in the Lantern Quarter, Nico!' });
    camera([-392.6, 3.5, 86.5 + Z], [-399.4, 4.6, 118 + Z], 60);
    G.cameraRig.yaw = 0;
    finish({ x: -398, z: 112 + Z });
  } else if (name === 'onfoot') {
    // Dusk in the Lantern Night Market: Nico holds the aisle against the Rustline Kings under the
    // lantern strings while shoppers scatter and a PHPD cruiser pulls up at the far end.
    G.dayNight.setHour(20.2);
    G.progression.cash = 6820; G.progression.respect = 410;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail'] });
    G.missions.startMission('lantern-night');
    G.missions.jumpToStep(1);
    const gang = G.missions.active().data.gang;
    G.wanted.force(2); G.wanted.seen = true;
    p.selectWeapon('smg'); p.health = 64; p.armor = 22;
    Object.assign(p, { x: -264.5, z: 48.6, y: groundHeight(-264.5, 48.6), pose: 'aim', aiming: true, aimPitch: 0.02, heading: Math.PI / 2 });
    // the Kings: four shooting from the aisle and the counters, one diving across, one down
    const spots = [[-255.5, 49.7, 'aim'], [-251, 45.4, 'aim'], [-247.5, 54.4, 'aim'], [-243, 47.6, 'run'], [-239.5, 52.6, 'aim'], [-259.5, 46.6, 'dead']];
    gang.forEach((g, i) => {
      const [x, z, pose] = spots[i];
      Object.assign(g, { x, z, pose, alert: true, y: groundHeight(x, z), aimPitch: 0 });
      if (pose === 'dead') { g.alive = false; g.health = 0; }
      g.heading = Math.atan2(p.x - x, p.z - z) + (pose === 'run' ? -1.3 : 0);
      if (pose === 'aim') {
        const mx = x + Math.sin(g.heading) * 1.05 - Math.cos(g.heading) * 0.33, mzz = z + Math.cos(g.heading) * 1.05 + Math.sin(g.heading) * 0.33;
        G.effects.flash(mx, 1.78, mzz, 7.5);
        G.effects.tracer(mx, 1.78, mzz, p.x + r.range(1.2, 3), r.range(1.2, 1.9), p.z + r.range(-1.6, 1.6));
      }
    });
    G.forceCrosshair = true;
    const mz = { x: p.x + 1.15, z: p.z + 0.34 };
    G.effects.flash(mz.x, 1.66, mz.z, 3.2);
    G.effects.tracer(mz.x, 1.78, mz.z, -255.6, 1.55, 49.7);
    G.effects.tracer(mz.x + 0.4, 1.78, mz.z, -251, 1.45, 45.5);
    G.effects.sparks(-255.6, 1.6, 49.7, 10);
    G.effects.sparks(-261, 1.2, 43.2, 8);
    G.effects.blood(-255.5, 1.5, 49.7);
    // shoppers scattering toward the camera and diving behind the counters
    const crowd = [[-260.5, 45.2, 'run', -1.75], [-259, 54.8, 'run', -1.35], [-261.8, 56.2, 'run', -1.6], [-257.5, 52.9, 'run', -2.0],
      [-257.5, 44, 'cower', 0.5], [-252, 56.6, 'cower', 2.6], [-249, 57, 'handsup', -1.5], [-246, 43.8, 'cower', 1.2],
      [-262.5, 43.6, 'run', -2.3], [-244.5, 57, 'run', 0.2], [-225.5, 44.2, 'run', 1.4], [-226, 57.4, 'run', 1.9], [-253, 38, 'run', -0.4], [-241, 62.5, 'run', 0.3]];
    for (const [x, z, pose, h] of crowd) person('ped', x, z, h, pose);
    // PHPD rolls into the far end of the aisle, light bar blazing
    const cruiser = cop('reef', -235.5, 44.6, 0.8, 0, 1.0); cruiser.ai.deployed = true;
    const cruiser2 = cop('reef', -216, 53, -Math.PI / 2 - 0.3, 6, 3.4); cruiser2.ai.deployed = true;
    person('cop', -240, 47.9, -Math.PI / 2, 'aim');
    person('cop', -239.5, 42.9, -Math.PI / 2 - 0.3, 'run', 2.2);
    G.hud.dialogue.clear();
    G.cameraRig.yaw = p.heading; G.cameraRig.pitch = 0.08;
    camera([p.x - 3.1, 2.25, p.z + 1.05], [p.x + 20, 1.55, p.z + 1.05], 54);
    finish({ x: -250, z: 50 });
  } else if (name === 'map') {
    G.dayNight.setHour(16.8);
    G.progression.cash = 15480; G.progression.respect = 760;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail', 'lantern-night'] });
    G.side.best['mile-sprint'] = 31.4;
    G.missions.startMission('hot-wire');
    G.missions.jumpToStep(1);
    G.missions.jumpToStep(2);
    const brute = G.missions.active().car;
    p.enter(brute);
    brute.x = -40; brute.z = -100; brute.heading = -Math.PI / 2; brute.sync();
    p.x = brute.x; p.z = brute.z;
    G.missions.active().data.i = 1;
    G.wanted.force(1); G.wanted.seen = true;
    cop('reef', 30, -98, -Math.PI / 2, 20);
    camera([-20, 14, -88], [-60, 0, -100], 60);
    G.cameraRig.yaw = -Math.PI / 2;
    G.mode = 'pause';
    document.getElementById('pause-menu').classList.remove('hidden');
    G.menus.open('Map');
    G.mode = 'shot';
    finish({ x: -40, z: -100 });
  } else if (name === 'night') {
    // Neon night in Glasswater, rain on the road: the Glasswater Loop street race, Nico's Kestrel GT
    // running second, wheel to wheel with two rivals and chasing the leader's tail lights.
    G.dayNight.setHour(21.6);
    G.weather.setRain(true);
    G.progression.cash = 15480; G.progression.respect = 760;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail', 'lantern-night'] });
    const S = 37;
    const kes = car('kestrel', 101.6, -53, Math.PI + 0.04, '#f4f1ea', S, { roll: 0.03 });
    kes.controls.throttle = 1; kes.driver = null; kes.sync();
    p.enter(kes); p.x = kes.x; p.z = kes.z;
    p.selectWeapon('smg');
    const rivals = [car('kestrel', 105.4, -51.2, Math.PI - 0.03, '#7a3ad8', S), car('brute8', 97.9, -50.4, Math.PI + 0.05, '#ff7a1a', S - 1), car('kestrel', 102.6, -77, Math.PI - 0.02, '#2bb3a8', S + 1)];
    for (const rv of rivals) { rv.controls.throttle = 1; }
    G.side.stageRace('glasswater-loop', 1, 41.6, rivals);
    // spray behind the racers on the wet road
    for (const v of [kes, ...rivals]) for (let i = 0; i < 5; i++) G.effects.smoke(v.x + r.range(-0.8, 0.8), 0.35, v.z + 2.6 + i * 0.9, 0.6 + i * 0.12, 0.85, 0.22);
    // city traffic: oncoming headlights, cars held at the junction, a cab the racers are about to pass
    const lanes = [[94.75, -120, 0, 11], [98.25, -150, 0, 10], [94.75, -175, 0, 9], [105.25, -112, Math.PI, 8], [101.75, -140, Math.PI, 7], [112, -98.25, -Math.PI / 2, 0], [88, -101.75, Math.PI / 2, 0], [130, -101.75, Math.PI / 2, 9], [70, -98.25, -Math.PI / 2, 4]];
    const types = ['cab', 'caravel', 'haulit', 'cab', 'pip', 'brute8', 'caravel', 'pip', 'cab'];
    lanes.forEach(([x, z, h, s], i) => car(types[i], x, z, h, null, s));
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 91 : 109;
      person('ped', side + r.range(-1.2, 1.2), r.range(-140, -30), r.chance(0.5) ? 0 : Math.PI, r.chance(0.8) ? 'walk' : 'idle');
    }
    person('ped', 108.6, -60, -Math.PI / 2, 'handsup'); person('ped', 92, -58, Math.PI / 2, 'idle');
    G.hud.dialogue.clear();
    camera([101.2, 3.7, -40.2], [101.8, 0.9, -80], 58);
    G.cameraRig.yaw = Math.PI;
    finish({ x: 101, z: -70 });
  }
}
