// One-shot sounds synthesised on demand: gunshots, explosions, crashes, horn, punches, car doors,
// empty-gun clicks, the wanted-star sting, UI blips and the mission-passed jingle.

export function createSoundEffects(A) {
  const ctx = A.ctx;
  function noiseBurst({ vol = 0.5, dur = 0.2, type = 'lowpass', freq = 1200, q = 0.7, attack = 0.002, sweep = null }) {
    if (vol <= 0.01) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = A.noise; src.playbackRate.value = 1;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(A.master);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  function tone({ freq = 440, to = null, dur = 0.15, vol = 0.2, type = 'sine', delay = 0 }) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(A.master); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    gunshot(kind, att) {
      const v = 0.15 + att * 0.6;
      noiseBurst({ vol: v, dur: kind === 'smg' ? 0.09 : 0.16, type: 'bandpass', freq: kind === 'smg' ? 1800 : 1100, q: 0.9, sweep: 300 });
      tone({ freq: 160, to: 50, dur: 0.12, vol: v * 0.6, type: 'triangle' });
    },
    explosion(att) {
      noiseBurst({ vol: 0.9 * att, dur: 1.6, type: 'lowpass', freq: 900, sweep: 60, attack: 0.01 });
      tone({ freq: 70, to: 25, dur: 1.2, vol: 0.6 * att, type: 'sine' });
    },
    crash(v) { noiseBurst({ vol: 0.6 * v, dur: 0.35, type: 'bandpass', freq: 700, q: 0.6, sweep: 200 }); tone({ freq: 90, to: 40, dur: 0.25, vol: 0.4 * v, type: 'square' }); },
    horn(v, player) { tone({ freq: player ? 392 : 349, dur: 0.45, vol: 0.12 * v, type: 'sawtooth' }); tone({ freq: player ? 494 : 440, dur: 0.45, vol: 0.1 * v, type: 'sawtooth' }); },
    punch() { noiseBurst({ vol: 0.4, dur: 0.08, type: 'lowpass', freq: 600 }); tone({ freq: 120, to: 60, dur: 0.08, vol: 0.3 }); },
    door() { noiseBurst({ vol: 0.25, dur: 0.12, type: 'lowpass', freq: 400 }); tone({ freq: 90, dur: 0.1, vol: 0.2, type: 'square' }); },
    click() { tone({ freq: 1800, dur: 0.03, vol: 0.15, type: 'square' }); },
    starUp() { tone({ freq: 660, dur: 0.12, vol: 0.12, type: 'triangle' }); tone({ freq: 880, dur: 0.18, vol: 0.12, type: 'triangle', delay: 0.1 }); },
    ui() { tone({ freq: 740, to: 990, dur: 0.06, vol: 0.08, type: 'triangle' }); },
    jingle() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.35, vol: 0.14, type: 'triangle', delay: i * 0.12 })); },
  };
}
