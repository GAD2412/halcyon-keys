// Police siren (a square wave swept between two pitches by a slow LFO, the wail) and the helicopter's
// rotor thump (low-passed noise gated by a fast LFO), both faded by distance.

export function createSirens(A) {
  const ctx = A.ctx;
  const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 900;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.35;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 320;
  lfo.connect(lfoGain).connect(osc.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
  const g = ctx.createGain(); g.gain.value = 0;
  osc.connect(f).connect(g).connect(A.master);
  // rotor
  const n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 180;
  const gate = ctx.createGain(); gate.gain.value = 0;
  const rl = ctx.createOscillator(); rl.type = 'square'; rl.frequency.value = 11;
  const rlg = ctx.createGain(); rlg.gain.value = 0.5;
  rl.connect(rlg).connect(gate.gain);
  const rg = ctx.createGain(); rg.gain.value = 0;
  n.connect(nf).connect(gate).connect(rg).connect(A.master);
  for (const s of [osc, lfo, n, rl]) s.start();
  let mode = 0, modeT = 0;
  return {
    update(dt, level, rotor) {
      const t = ctx.currentTime;
      // switch between a slow wail and a fast yelp every few seconds
      modeT -= dt;
      if (modeT <= 0) { mode = 1 - mode; modeT = mode ? 2.5 : 5; lfo.frequency.setTargetAtTime(mode ? 3.2 : 0.35, t, 0.05); }
      g.gain.setTargetAtTime(level * 0.07, t, 0.1);
      rg.gain.setTargetAtTime(rotor * 0.9, t, 0.2);
    },
  };
}
