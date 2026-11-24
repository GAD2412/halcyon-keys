// Time of day: blends palette keyframes (dawn, noon, golden hour, dusk, night) into the sun, sky, fog,
// exposure and the city's lit windows and street lamps. One game hour lasts two real minutes.
import * as THREE from 'three';
import { clamp } from '../core/mathUtils.js';

const KEYS = [
  { h: 0, sunEl: -20, sun: 0x8aa0ff, sunI: 0.6, top: 0x070a1e, hor: 0x2a2a5a, fog: 0x1a1a3c, hemiS: 0x5060a8, hemiG: 0x201a28, hemiI: 0.75, exp: 1.25, glow: 1, stars: 0.9, fogD: 0.0016 },
  { h: 5.5, sunEl: -2, sun: 0xff9a6a, sunI: 0.8, top: 0x2b3a6e, hor: 0xf29a7a, fog: 0xc98d86, hemiS: 0x8a8fb8, hemiG: 0x4a3c3c, hemiI: 0.6, exp: 1.05, glow: 0.6, stars: 0.2, fogD: 0.0015 },
  { h: 8, sunEl: 25, sun: 0xffe2bf, sunI: 2.6, top: 0x3d78c4, hor: 0xbfdcf0, fog: 0xc7dcea, hemiS: 0xcfe6ff, hemiG: 0x7a6a55, hemiI: 0.9, exp: 1.0, glow: 0, stars: 0, fogD: 0.0009 },
  { h: 13, sunEl: 62, sun: 0xfff4e2, sunI: 3.0, top: 0x2f6fc0, hor: 0xb7d7ee, fog: 0xc4dbeb, hemiS: 0xd6ebff, hemiG: 0x857358, hemiI: 1.0, exp: 0.95, glow: 0, stars: 0, fogD: 0.0008 },
  { h: 17.2, sunEl: 11, sun: 0xffb36b, sunI: 3.3, top: 0x3a64a8, hor: 0xffc08a, fog: 0xf1b98e, hemiS: 0xffd9b8, hemiG: 0x6e5444, hemiI: 0.95, exp: 1.0, glow: 0.05, stars: 0, fogD: 0.0011 },
  { h: 18.6, sunEl: 2, sun: 0xff7e4f, sunI: 2.2, top: 0x2c3570, hor: 0xff8a5c, fog: 0xd8806a, hemiS: 0xc79ab8, hemiG: 0x4c3a40, hemiI: 0.75, exp: 1.05, glow: 0.55, stars: 0.05, fogD: 0.0013 },
  { h: 20, sunEl: -10, sun: 0x9fb0ff, sunI: 0.75, top: 0x0b1030, hor: 0x3a2f6a, fog: 0x231f48, hemiS: 0x6070c0, hemiG: 0x2a2030, hemiI: 0.85, exp: 1.25, glow: 1, stars: 0.7, fogD: 0.0015 },
  { h: 24, sunEl: -20, sun: 0x8aa0ff, sunI: 0.6, top: 0x070a1e, hor: 0x2a2a5a, fog: 0x1a1a3c, hemiS: 0x5060a8, hemiG: 0x201a28, hemiI: 0.75, exp: 1.25, glow: 1, stars: 0.9, fogD: 0.0016 },
];

const ca = new THREE.Color(), cb = new THREE.Color();
function mixHex(a, b, t, out) { return out.copy(ca.setHex(a)).lerp(cb.setHex(b), t); }

export function createDayNightCycle({ scene, renderer, hemi, sun, sunDir, sky }) {
  scene.fog = new THREE.FogExp2(0xf1b98e, 0.0011);
  const glowMaterials = [];   // facade materials whose emissive window lights fade in at night
  const nightObjects = [];    // street-lamp glows, neon: visible only at night
  const state = { hour: 17.4, speed: 1 / 120, glow: 0, isNight: false, lastEnvHour: -99 };

  function apply() {
    const h = ((state.hour % 24) + 24) % 24;
    let i = 0;
    while (KEYS[i + 1].h < h) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = clamp((h - a.h) / (b.h - a.h), 0, 1);
    const n = (k) => a[k] + (b[k] - a[k]) * t;
    const el = THREE.MathUtils.degToRad(n('sunEl'));
    // Sun sets over the ocean in the west; at night the same light is a cool moon high in the east.
    const night = el < -0.05;
    const az = night ? 0.6 : -1.15 - (h / 24) * 0.4;
    const lightEl = night ? 0.9 : Math.max(el, 0.06);
    sunDir.set(Math.sin(az) * Math.cos(lightEl), Math.sin(lightEl), Math.cos(az) * Math.cos(lightEl) * 0.6).normalize();
    sky.uniforms.sunDir.value.set(Math.sin(-1.2) * Math.cos(el), Math.sin(el), Math.cos(-1.2) * Math.cos(el) * 0.6).normalize();
    mixHex(a.sun, b.sun, t, sun.color);
    sun.intensity = n('sunI');
    mixHex(a.top, b.top, t, sky.uniforms.topColor.value);
    mixHex(a.hor, b.hor, t, sky.uniforms.horizonColor.value);
    sky.uniforms.groundColor.value.copy(sky.uniforms.horizonColor.value).multiplyScalar(0.55);
    mixHex(a.sun, b.sun, t, sky.uniforms.sunColor.value);
    sky.uniforms.sunColor.value.multiplyScalar(night ? 0 : 1);
    sky.uniforms.stars.value = n('stars');
    mixHex(a.fog, b.fog, t, scene.fog.color);
    scene.fog.density = n('fogD');
    mixHex(a.hemiS, b.hemiS, t, hemi.color);
    mixHex(a.hemiG, b.hemiG, t, hemi.groundColor);
    hemi.intensity = n('hemiI');
    renderer.toneMappingExposure = n('exp');
    state.glow = n('glow');
    state.isNight = state.glow > 0.5;
    for (const m of glowMaterials) m.emissiveIntensity = state.glow * (m.userData.glowScale || 1);
    for (const o of nightObjects) o.visible = state.glow > 0.3;
    if (Math.abs(h - state.lastEnvHour) > 0.75) { state.lastEnvHour = h; sky.refreshEnvironment(); }
  }

  return {
    state, glowMaterials, nightObjects,
    setHour(hh) { state.hour = hh; state.lastEnvHour = -99; apply(); },
    update(dt) { state.hour = (state.hour + dt * state.speed) % 24; apply(); },
    apply,
    clockText() { const h = Math.floor(state.hour), m = Math.floor((state.hour % 1) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
  };
}
