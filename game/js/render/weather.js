// Weather: night rain showers. Streaks fall in a box that follows the camera, the roads turn glossy
// and wet, and the fog thickens. Rain comes and goes on its own at night.
import * as THREE from 'three';

export function createWeather(scene, { roadMaterials = [] } = {}) {
  const N = 2200, W = 60, H = 30;
  const pos = new Float32Array(N * 6);
  const seeds = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seeds[i * 3] = Math.random() * W - W / 2; seeds[i * 3 + 1] = Math.random() * H; seeds[i * 3 + 2] = Math.random() * W - W / 2; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaac4e8, transparent: true, opacity: 0.38, depthWrite: false }));
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  const dry = roadMaterials.map((m) => ({ m, rough: m.roughness, metal: m.metalness }));
  const state = { raining: false, wet: 0, timer: 90, forced: null };

  function applyWet() {
    for (const d of dry) { d.m.roughness = d.rough - state.wet * 0.55; d.m.metalness = d.metal + state.wet * 0.35; }
  }

  return {
    state,
    setRain(on) { state.forced = on; state.raining = on; state.wet = on ? 1 : 0; lines.visible = on; applyWet(); },
    update(dt, camera, isNight, t) {
      if (state.forced === null) {
        state.timer -= dt;
        if (state.timer <= 0) { state.raining = isNight && !state.raining && Math.random() < 0.5; state.timer = 60 + Math.random() * 90; }
        if (!isNight) state.raining = false;
      }
      state.wet += ((state.raining ? 1 : 0) - state.wet) * Math.min(1, dt * 0.2);
      applyWet();
      lines.visible = state.raining || (state.forced === true);
      if (!lines.visible) return;
      const c = camera.position;
      for (let i = 0; i < N; i++) {
        const x = c.x + seeds[i * 3];
        const z = c.z + seeds[i * 3 + 2];
        const y = c.y - 6 + ((seeds[i * 3 + 1] - t * 24) % H + H) % H;
        pos.set([x, y, z, x + 0.05, y - 0.9, z + 0.02], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
