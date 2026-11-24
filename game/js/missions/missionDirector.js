// Runs the story: shows the next mission's start marker, starts it when the player walks in, steps
// through its objectives (dialogue, go to, steal a car, drive, lose the police, eliminate, timed
// checkpoints, escape), draws the objective beam, pays rewards, and fails it on death or arrest.
import * as THREE from 'three';
import { MISSIONS } from './story.js';
import { Vehicle } from '../entities/vehicle.js';
import { spawnGangMember, updateGangMember } from '../ai/gangAI.js';

function makeBeam(color) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 70, 18, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 35;
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3;
  g.add(beam, ring);
  g.visible = false;
  return g;
}

export function createMissionDirector(G) {
  const done = new Set();
  let active = null;
  const targetBeam = makeBeam(0xffd23a), startBeam = makeBeam(0xff6f61);
  G.scene.add(targetBeam, startBeam);

  const next = () => MISSIONS.find((m) => !done.has(m.id)) || null;
  const pos = () => (G.player.vehicle ? G.player.vehicle : G.player);
  const step = () => active && active.m.steps[active.index];

  function begin(m) {
    active = { m, index: -1, data: {}, car: null };
    if (m.giveWeapon) for (const [w, n] of Object.entries(m.giveWeapon)) { G.player.owned.add(w); G.player.ammo[w] += n; G.player.selectWeapon(w); }
    G.hud.big(m.title, 'passed', `${m.act} · ${G.progression.completion()}% complete`, 2.5);
    G.audio.ui();
    advance();
  }

  function advance() {
    active.index++;
    const s = step();
    if (!s) return complete();
    const d = active.data = {};
    if (s.type === 'dialogue') G.hud.dialogue.say(s.lines);
    if (s.type === 'enterVehicle') {
      const sp = s.spawn;
      const car = new Vehicle(G, sp.type, sp.x, sp.z, sp.h, sp.paint);
      car.role = 'mission'; car.driver = null;
      G.vehicles.push(car);
      active.car = car;
    }
    if (s.type === 'eliminate') d.gang = s.spawn.map(([x, z], i) => spawnGangMember(G, x, z, i % 2 ? 'smg' : 'pistol'));
    if (s.type === 'checkpoints') { d.i = 0; d.t = s.time; }
    if (s.type === 'escape') G.wanted.force(s.stars);
  }

  function complete() {
    const m = active.m;
    done.add(m.id);
    G.progression.addCash(m.reward, 'Mission passed');
    G.progression.addRespect(m.respect);
    G.hud.big('Mission passed', 'passed', `${m.title}  ·  +$${m.reward.toLocaleString('en-US')}  ·  +${m.respect} respect`, 4);
    G.audio.missionPassed();
    cleanup(false);
    active = null;
    G.save?.save('auto');
  }

  function cleanup(removeCar) {
    if (!active) return;
    for (const g of active.data.gang || []) if (!g.alive || removeCar) { const i = G.humans.indexOf(g); if (i >= 0) G.humans.splice(i, 1); }
    if (active.car && active.car.role === 'mission') active.car.role = 'parked';
  }

  function fail(reason) {
    if (!active) return;
    G.hud.big('Mission failed', 'wasted', reason, 3.5);
    G.hud.dialogue.clear();
    cleanup(true);
    active = null;
  }

  G.events.on('playerDied', () => fail('You were wasted'));
  G.events.on('busted', () => fail('You were busted'));

  return {
    total: () => MISSIONS.length,
    completedCount: () => done.size,
    isDone: (id) => done.has(id),
    list: () => MISSIONS.map((m) => ({ id: m.id, title: m.title, act: m.act, giver: m.giver, reward: m.reward, state: done.has(m.id) ? 'done' : active?.m === m ? 'active' : next() === m ? 'next' : 'locked' })),
    active: () => active,
    startMission(id) { const m = MISSIONS.find((x) => x.id === id); if (m) { if (active) fail('Restarted'); begin(m); } },
    jumpToStep(i) { if (!active) return; active.index = i - 1; advance(); },
    saveState: () => ({ done: [...done] }),
    loadState(s) { done.clear(); for (const id of s?.done || []) done.add(id); active = null; },
    startMarkers() { const m = next(); return !active && m ? [{ x: m.start.x, z: m.start.z, letter: m.letter, title: m.title }] : []; },
    target() {
      const s = step();
      if (!s) return null;
      if (s.type === 'enterVehicle' && active.car) return { x: active.car.x, z: active.car.z };
      if (s.type === 'drive' && s.needMissionCar && active.car && G.player.vehicle !== active.car) return { x: active.car.x, z: active.car.z };
      if (s.type === 'goto' || s.type === 'drive' || (s.type === 'escape' && s.x !== undefined)) return { x: s.x, z: s.z };
      if (s.type === 'checkpoints') { const [x, z] = s.points[active.data.i]; return { x, z }; }
      if (s.type === 'eliminate') { const g = active.data.gang?.find((h) => h.alive); return g ? { x: g.x, z: g.z } : null; }
      return null;
    },
    card() {
      const m = active?.m || null;
      if (!m) {
        const n = next();
        return n ? { kicker: 'Next mission', title: n.title, objective: `Go to the <b>${n.letter}</b> marker: ${n.start.name}`, index: 0, total: 0 } : { kicker: 'Port Halcyon', title: 'Free roam', objective: 'The Keys are yours.', index: 0, total: 0 };
      }
      const s = step();
      let objective = s?.text || '';
      if (s?.type === 'dialogue') objective = 'Listen…';
      if (s?.type === 'eliminate') { const g = active.data.gang || []; objective = `${s.text}: <b>${g.filter((h) => !h.alive).length}/${g.length}</b> down`; }
      if (s?.type === 'checkpoints') objective = `${s.text} <b>${active.data.i + 1}/${s.points.length}</b>`;
      if (s?.type === 'loseWanted' || s?.type === 'escape') objective = `${s.text} <b>${'★'.repeat(G.wanted.stars)}</b>`;
      if (s?.type === 'drive' && s.needMissionCar && G.player.vehicle !== active.car) objective = 'Get back in the <b>Kestrel GT</b>';
      const idx = MISSIONS.indexOf(m);
      return { kicker: `${m.act} · Mission ${idx + 1}`, title: m.title, objective, index: active.index, total: m.steps.length };
    },
    timer: () => (step()?.type === 'checkpoints' ? Math.max(0, active.data.t) : null),
    prompt() {
      const s = startBeam.visible && next();
      if (!s || active) return '';
      const p = pos();
      return Math.hypot(p.x - s.start.x, p.z - s.start.z) < 14 ? `Mission: <b>${s.title}</b> · step into the marker` : '';
    },
    update(dt) {
      const p = pos();
      // start markers
      const n = next();
      startBeam.visible = !active && !!n && G.mode !== 'title';
      if (startBeam.visible) {
        startBeam.position.set(n.start.x, 0, n.start.z);
        const sp = G.player.vehicle ? Math.abs(G.player.vehicle.speed) : 0;
        if (Math.hypot(p.x - n.start.x, p.z - n.start.z) < 3.5 && sp < 6 && G.player.alive) begin(n);
      }
      // active mission
      const tgt = this.target();
      targetBeam.visible = !!tgt && G.mode !== 'title';
      if (tgt) targetBeam.position.set(tgt.x, 0, tgt.z);
      targetBeam.children[0].material.opacity = 0.25 + Math.sin(G.time * 3) * 0.08;
      if (!active) return;
      const s = step(), d = active.data;
      const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
      for (const g of d.gang || []) updateGangMember(G, g, dt);
      if (active.car && active.car.wrecked && ['enterVehicle', 'drive'].includes(s.type) && (s.type === 'enterVehicle' || s.needMissionCar)) return fail('The car was destroyed');
      switch (s.type) {
        case 'dialogue': if (!G.hud.dialogue.busy()) advance(); break;
        case 'goto': if (near(s.x, s.z, s.r)) advance(); break;
        case 'enterVehicle':
          if (G.player.vehicle === active.car) { if (s.wanted) G.wanted.force(s.wanted); advance(); }
          break;
        case 'drive':
          if ((!s.needMissionCar || G.player.vehicle === active.car) && near(s.x, s.z, s.r)) advance();
          break;
        case 'loseWanted': case 'escape': if (G.wanted.stars === 0) advance(); break;
        case 'eliminate': if (d.gang.every((g) => !g.alive)) advance(); break;
        case 'checkpoints': {
          d.t -= dt;
          const [x, z] = s.points[d.i];
          if (near(x, z, 14)) { d.i++; G.audio.ui(); if (d.i >= s.points.length) advance(); else d.t += 0; }
          else if (d.t <= 0) fail('Out of time');
          break;
        }
        default: break;
      }
    },
  };
}
