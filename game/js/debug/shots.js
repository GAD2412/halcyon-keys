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
    const kes = car('kestrel', -397.8, 100, Math.PI + 0.22, '#ff5a3c', 39);
    kes.roll = 0.06; kes.drifting = true; kes.controls.throttle = 1; kes.driver = null; kes.sync();
    p.enter(kes); p.x = kes.x; p.z = kes.z;
    smokeTrail(-397.2, 103, 0.25, 1, 10);
    smokeTrail(-399.4, 103.2, 0.3, 1, 8);
    for (let i = 1; i < 14; i++) G.skids.add(-396.6 + i * 0.2, 102 + i * 1.3, -399 + i * 0.2, 102 + i * 1.3);
    cop('reef', -402.6, 109.5, Math.PI - 0.1, 36, 0.4);
    cop('reef', -393.4, 113.5, Math.PI + 0.12, 35, 3.6);
    cop('barracuda', -398.6, 122, Math.PI - 0.03, 37, 1.9);
    cop('reef', -404.9, 134, Math.PI + 0.06, 34, 5.0);
    // a roadblock waiting further down the boulevard
    const rb1 = cop('reef', -400.2, 196, Math.PI / 2 + 0.35, 0, 1.2); rb1.ai.kind = 'roadblock';
    const rb2 = cop('reef', -394.2, 200, -Math.PI / 2 + 0.3, 0, 4.4); rb2.ai.kind = 'roadblock';
    person('cop', -397.5, 192.5, Math.PI, 'aim'); person('cop', -404.5, 198, Math.PI + 0.2, 'aim');
    // civilian traffic: a cab braking beside the chase, more cars down the road and across the junction
    car('cab', -405.25, 103, -0.12, '#f6b62e', 3, { controls: { throttle: 0, brake: 1, steer: 0, handbrake: false } });
    car('haulit', -405.25, 168, 0, '#f4f1ea', 8);
    car('pip', -394.75, 176, Math.PI, '#8fd7d0', 0);
    car('caravel', -401.75, 230, 0, '#2e4a7a', 10);
    car('brute8', -372, 201.75, Math.PI / 2, '#1f2a44', 10);
    car('caravel', -352, 198.25, -Math.PI / 2, '#8a1f2c', 10);
    // helicopter with its searchlight on the Kestrel
    const heli = createHelicopter(G, -394.5, 124);
    heli.y = 15.5; heli.heading = Math.PI - 0.7; heli.aimX = kes.x; heli.aimZ = kes.z;
    G.police.setHeli(heli);
    heli.update(0);
    // crowd fleeing on the boardwalk and the sidewalk
    person('ped', -409.5, 96, -Math.PI / 2 - 0.5, 'run', 1.2);
    person('ped', -411.6, 101.5, -Math.PI / 2 + 0.3, 'run', 3.9);
    person('ped', -410.2, 110, Math.PI - 0.6, 'run', 0.4);
    person('ped', -413.2, 92, -Math.PI / 2, 'cower');
    person('ped', -412.4, 118, -Math.PI / 2 - 0.2, 'run', 2.2);
    person('ped', -414.5, 126, -Math.PI / 2 + 0.5, 'run', 5.1);
    person('ped', -390.6, 97, Math.PI / 2 + 0.5, 'handsup');
    person('ped', -389.9, 108, 0.3, 'run', 1.7);
    person('ped', -391.2, 116, Math.PI / 2, 'cower');
    person('ped', -389.6, 128, Math.PI / 2 + 0.3, 'run', 4.4);
    for (let i = 0; i < 16; i++) person('ped', r.range(-462, -424), r.range(90, 220), r.range(-3, 3), r.chance(0.4) ? 'run' : 'idle');
    G.hud.dialogue.pin({ who: 'lux', text: 'MANTA-1 is right on you! Lose them in the Lantern Quarter, Nico!' });
    camera([-392.6, 3.5, 86.5], [-399.4, 4.6, 118], 60);
    G.cameraRig.yaw = 0;
    finish({ x: -398, z: 112 });
  } else if (name === 'onfoot') {
    // Dusk in the Lantern Quarter night market: a gunfight with the Rustline Kings.
    G.dayNight.setHour(17.95);
    G.progression.cash = 6820; G.progression.respect = 410;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail'] });
    G.missions.startMission('lantern-night');
    G.missions.jumpToStep(1);
    const gang = G.missions.active().data.gang;
    const spots = [[-229, 45.5, 'aim'], [-224.5, 54, 'aim'], [-219, 48.5, 'run'], [-234, 57, 'dead'], [-237.5, 44.5, 'dead'], [-226, 39.5, 'dead']];
    G.wanted.force(2); G.wanted.seen = true;
    p.selectWeapon('smg'); p.health = 64; p.armor = 22;
    Object.assign(p, { x: -245, z: 50, y: 0.16, pose: 'aim', aiming: true, aimPitch: 0.03 });
    p.heading = Math.atan2(-229 + 245, 45.5 - 50);
    gang.forEach((g, i) => { g.x = spots[i][0]; g.z = spots[i][1]; g.pose = spots[i][2]; g.alert = true; g.y = groundHeight(g.x, g.z); if (g.pose === 'dead') { g.alive = false; g.health = 0; } g.heading = Math.atan2(p.x - g.x, p.z - g.z) + (g.pose === 'run' ? 1.2 : 0); });
    G.forceCrosshair = true;
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const mz = { x: p.x + fx * 0.95 - fz * 0.33, z: p.z + fz * 0.95 + fx * 0.33 };
    // muzzle flashes and tracers in both directions
    G.effects.flash(mz.x, 1.5, mz.z, 1.7);
    G.effects.tracer(mz.x, 1.5, mz.z, -229.2, 1.3, 45.6);
    G.effects.tracer(-229.6, 1.5, 45.8, -244.2, 1.5, 50.6);
    G.effects.flash(-229.7, 1.5, 45.9, 4);
    G.effects.flash(-225.2, 1.5, 53.6, 4);
    G.effects.tracer(-225.3, 1.5, 53.5, -244.4, 1.3, 49.2);
    G.effects.sparks(-241.5, 1.4, 49.5, 8);
    G.effects.blood(-229, 1.3, 45.6);
    // fleeing crowd and stall keepers
    const crowd = [[-232, 34, 'run', 2.6], [-238, 66, 'cower', 0.4], [-216, 60, 'run', 0.3], [-249, 34, 'cower', 1], [-236, 70, 'run', 0.2], [-222, 32, 'handsup', -1.4], [-212, 41, 'run', 3.6], [-244, 62, 'run', 2.8], [-214, 66, 'run', 0.9]];
    for (const [x, z, pose, h] of crowd) person('ped', x, z, h, pose);
    const cruiser = cop('reef', -198.25, 64, Math.PI + 0.2, 0, 1.0); cruiser.ai.deployed = true;
    person('cop', -206, 58, -Math.PI / 2, 'run');
    person('cop', -205, 70, -Math.PI / 2 - 0.3, 'aim');
    car('cab', -201.75, 20, 0, '#f6b62e', 0);
    G.hud.dialogue.pin({ who: 'lux', text: "Two by the lantern stall! Keep them off Pearl's people!" });
    G.cameraRig.yaw = p.heading; G.cameraRig.pitch = 0.1;
    camera([p.x - fx * 4.3 - fz * 1.15, 2.55, p.z - fz * 4.3 + fx * 1.15], [p.x + fx * 22 - fz * 1.15, 1.2, p.z + fz * 22 + fx * 1.15], 56);
    finish({ x: -250, z: 45 });
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
    // Neon night in Glasswater: the Hot Wire courier run against the clock, traffic headlights everywhere.
    G.dayNight.setHour(21.6);
    G.progression.cash = 15480; G.progression.respect = 760;
    G.missions.loadState({ done: ['homecoming', 'borrowed-paint', 'ninefold-tail', 'lantern-night'] });
    G.missions.startMission('hot-wire');
    G.missions.jumpToStep(1);
    G.missions.jumpToStep(2);
    const brute = G.missions.active().car;
    p.enter(brute);
    Object.assign(brute, { x: 98.2, z: -40, heading: Math.PI + 0.12, speed: 33, roll: 0.05 });
    const f = brute.forward; brute.vx = f.x * 33; brute.vz = f.z * 33; brute.controls.throttle = 1; brute.sync();
    G.missions.active().data.t = 61.4; G.missions.active().data.i = 1;
    p.x = brute.x; p.z = brute.z;
    p.selectWeapon('smg');
    const lanes = [[101.75, -95, Math.PI, 12], [105.25, -120, Math.PI, 10], [94.75, -70, 0, 11], [98.25, -125, 0, 10], [101.75, 6, Math.PI, 0], [94.75, 30, 0, 0], [60, -1.75, -Math.PI / 2, 10], [140, 1.75, Math.PI / 2, 9], [130, -101.75, Math.PI / 2, 9], [70, -98.25, -Math.PI / 2, 0]];
    const types = ['cab', 'caravel', 'pip', 'haulit', 'kestrel', 'cab', 'brute8', 'caravel', 'pip', 'cab'];
    lanes.forEach(([x, z, h, s], i) => car(types[i], x, z, h, null, s));
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 91 : 109;
      person('ped', side + r.range(-1.2, 1.2), r.range(-130, 20), r.chance(0.5) ? 0 : Math.PI, r.chance(0.8) ? 'walk' : 'idle');
    }
    G.wanted.force(2); G.wanted.seen = true;
    cop('barracuda', 102.8, -31.5, Math.PI + 0.08, 34, 2.2);
    cop('reef', 94.6, -27, Math.PI - 0.1, 30, 5.2);
    G.hud.dialogue.pin({ who: 'pearl', text: 'Second drop is two blocks up. Do not stop for lights.' });
    camera([97.5, 5.4, -15], [99.5, 1.2, -60], 62);
    G.cameraRig.yaw = Math.PI;
    finish({ x: 98, z: -60 });
  }
}
