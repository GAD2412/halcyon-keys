// In-car radio: a procedural step sequencer with three stations (WAVE 101.9 synthwave, SALT 94.2
// island beat, KEY 88 lo-fi). Plays only while driving; R changes station.

const STATIONS = [
  { name: 'WAVE 101.9', bpm: 104, root: 45, scale: [0, 3, 7, 10, 12, 15], bass: [0, 0, 7, 5], lead: 'sawtooth', kick: [1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
  { name: 'SALT 94.2', bpm: 96, root: 50, scale: [0, 2, 4, 7, 9, 12], bass: [0, 5, 7, 5], lead: 'triangle', kick: [1, 0, 0, 1, 0, 0, 1, 0], snare: [0, 0, 1, 0, 0, 1, 0, 1] },
  { name: 'KEY 88', bpm: 78, root: 48, scale: [0, 3, 5, 7, 10, 14], bass: [0, 8, 3, 10], lead: 'sine', kick: [1, 0, 0, 0, 0, 1, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createRadioStation(A) {
  const ctx = A.ctx;
  const out = ctx.createGain(); out.gain.value = 0; out.connect(A.master);
  let station = 0, step = 0, nextT = 0, on = false, seed = 3;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function note(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(t, kick) {
    if (kick) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(out); o.start(t); o.stop(t + 0.25); }
    else { const s = ctx.createBufferSource(); s.buffer = A.noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); s.connect(f).connect(g).connect(out); s.start(t, rand()); s.stop(t + 0.15); }
  }
  function schedule() {
    const st = STATIONS[station];
    const sixteenth = 60 / st.bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      const s8 = step % 8, bar = Math.floor(step / 16) % 4;
      if (st.kick[s8]) drum(nextT, true);
      if (st.snare[s8]) drum(nextT, false);
      if (step % 4 === 0) note(mtof(st.root - 12 + st.bass[bar]), nextT, sixteenth * 3.5, 'triangle', 0.25);
      if (step % 2 === 0 && rand() < 0.55) note(mtof(st.root + 12 + st.scale[Math.floor(rand() * st.scale.length)]), nextT, sixteenth * 1.8, st.lead, 0.07);
      if (step % 16 === 0) for (const k of [0, 2, 4]) note(mtof(st.root + st.bass[bar] + st.scale[k]), nextT, sixteenth * 15, 'sine', 0.04);
      nextT += sixteenth; step++;
    }
  }
  return {
    name: () => STATIONS[station].name,
    next() { station = (station + 1) % STATIONS.length; step = 0; },
    update(dt, playing) {
      if (playing !== on) { on = playing; out.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.3); if (on) nextT = ctx.currentTime + 0.05; }
      if (on) schedule();
    },
  };
}
