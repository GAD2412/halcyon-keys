// Car engine: two detuned sawtooth oscillators and filtered noise whose pitch follows simulated RPM
// through five gears, with a tyre-squeal band when drifting.

export function createEngineSound(A) {
  const ctx = A.ctx;
  const out = ctx.createGain(); out.gain.value = 0; out.connect(A.master);
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 3;
  filter.connect(out);
  const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
  const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 18;
  const sub = ctx.createOscillator(); sub.type = 'triangle';
  const g1 = ctx.createGain(); g1.gain.value = 0.25; const g2 = ctx.createGain(); g2.gain.value = 0.2; const g3 = ctx.createGain(); g3.gain.value = 0.35;
  o1.connect(g1).connect(filter); o2.connect(g2).connect(filter); sub.connect(g3).connect(filter);
  const noise = ctx.createBufferSource(); noise.buffer = A.noise; noise.loop = true;
  const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 1;
  const ng = ctx.createGain(); ng.gain.value = 0.08;
  noise.connect(nf).connect(ng).connect(filter);
  // tyre squeal
  const sq = ctx.createBufferSource(); sq.buffer = A.noise; sq.loop = true;
  const sqf = ctx.createBiquadFilter(); sqf.type = 'bandpass'; sqf.frequency.value = 2400; sqf.Q.value = 8;
  const sqg = ctx.createGain(); sqg.gain.value = 0;
  sq.connect(sqf).connect(sqg).connect(A.master);
  for (const n of [o1, o2, sub, noise, sq]) n.start();
  let rpm = 800;

  return {
    update(dt, car) {
      const t = ctx.currentTime;
      if (!car) { out.gain.setTargetAtTime(0, t, 0.15); sqg.gain.setTargetAtTime(0, t, 0.1); return; }
      const speed = Math.abs(car.speed), top = car.spec.maxSpeed;
      const gear = Math.min(5, Math.floor((speed / top) * 5));
      const inGear = (speed / top) * 5 - gear;
      const target = 900 + inGear * 4200 + (car.controls.throttle > 0 ? 500 : 0);
      rpm += (target - rpm) * Math.min(1, dt * 8);
      const f = rpm / 60;
      o1.frequency.setTargetAtTime(f, t, 0.03); o2.frequency.setTargetAtTime(f * 1.005, t, 0.03); sub.frequency.setTargetAtTime(f / 2, t, 0.03);
      filter.frequency.setTargetAtTime(500 + rpm * 0.35 + car.controls.throttle * 900, t, 0.05);
      out.gain.setTargetAtTime(0.1 + car.controls.throttle * 0.12, t, 0.08);
      sqg.gain.setTargetAtTime(car.drifting ? 0.07 : 0, t, 0.06);
    },
  };
}
