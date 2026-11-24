// WebAudio setup: one context started on the first click or key, master volume and mute, a shared
// white-noise buffer, distance attenuation, and the game-facing sound API that the other audio files fill in.
import { createEngineSound } from './engineSound.js';
import { createSirens } from './sirens.js';
import { createSoundEffects } from './soundEffects.js';
import { createRadioStation } from './radioStation.js';

export function createAudio(G) {
  const A = { ctx: null, master: null, muted: false, volume: 0.7, ready: false };
  const parts = {};

  A.start = () => {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    A.ctx = new Ctx();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : A.volume;
    const comp = A.ctx.createDynamicsCompressor();
    A.master.connect(comp).connect(A.ctx.destination);
    const len = A.ctx.sampleRate * 2;
    A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const data = A.noise.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647) * 2 - 1; }
    parts.engine = createEngineSound(A);
    parts.sirens = createSirens(A);
    parts.fx = createSoundEffects(A);
    parts.radio = createRadioStation(A);
    A.ready = true;
  };
  A.setMuted = (m) => { A.muted = m; if (A.master) A.master.gain.value = m ? 0 : A.volume; };
  A.setVolume = (v) => { A.volume = v; if (A.master && !A.muted) A.master.gain.value = v; };
  // 1 near the listener, fading to 0 at ~120 m
  A.atten = (x, z) => {
    const c = G.camera.position;
    return Math.max(0, 1 - Math.hypot(c.x - x, c.z - z) / 120);
  };

  const fx = (name, ...args) => { if (A.ready) parts.fx[name](...args); };
  Object.assign(A, {
    gunshot: (kind, x, z) => fx('gunshot', kind, A.atten(x, z)),
    explosion: (x, z) => fx('explosion', Math.max(0.25, A.atten(x, z))),
    crash: (strength, x, z) => fx('crash', Math.min(1, strength / 20) * A.atten(x, z)),
    horn: (x, z, player = false) => fx('horn', player ? 1 : A.atten(x, z) * 0.6, player),
    punch: () => fx('punch'), door: () => fx('door'), click: () => fx('click'), starUp: () => fx('starUp'),
    ui: () => fx('ui'), missionPassed: () => fx('jingle'),
    radioName: () => (parts.radio ? parts.radio.name() : 'WAVE 101.9'),
    nextStation: () => parts.radio?.next(),
  });

  // per-frame: engine follows the player's car, sirens follow the nearest police unit
  A.update = (dt) => {
    if (!A.ready) return;
    const p = G.player, v = p.vehicle;
    parts.engine.update(dt, v && !v.wrecked && G.mode === 'play' ? v : null);
    let nearest = Infinity;
    for (const u of G.police.units) if (u.sirenOn) nearest = Math.min(nearest, Math.hypot(u.x - G.camera.position.x, u.z - G.camera.position.z));
    parts.sirens.update(dt, G.mode === 'play' && nearest < 160 ? 1 - nearest / 160 : 0, G.police.heli && !G.police.heli.removed ? A.atten(G.police.heli.x, G.police.heli.z) : 0);
    parts.radio.update(dt, G.mode === 'play' && !!v);
  };
  return A;
}
