// Every glowing light in one draw call: a Points cloud with per-point colour and size, additive.
// Static night lights (lamps, neon, string lights) plus dynamic ones written each frame (sirens,
// headlights, tail lights, muzzle flashes, fire).
import * as THREE from 'three';

const vert = `
attribute float size; attribute vec3 tint;
varying vec3 vTint;
uniform float scale;
void main() {
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(-mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const frag = `
varying vec3 vTint;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d2 = dot(q, q) * 4.0;
  float a = exp(-d2 * 5.0) + exp(-d2 * 40.0) * 0.6;
  a *= 1.0 - smoothstep(0.7, 1.0, d2);
  gl_FragColor = vec4(vTint * a, a);
}`;

export function createLightGlows(scene, capacity = 4000) {
  const pos = new Float32Array(capacity * 3), col = new Float32Array(capacity * 3), size = new Float32Array(capacity);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('tint', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { scale: { value: 600 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 10;
  scene.add(points);

  const statics = [];
  let count = 0;
  const api = {
    nightLevel: 0,
    addStatic(list) { for (const p of list) statics.push(p); },
    begin() {
      count = 0;
      if (api.nightLevel > 0.15) for (const s of statics) api.add(s[0], s[1], s[2], s[3] * api.nightLevel, s[4] * api.nightLevel, s[5] * api.nightLevel, s[6]);
    },
    add(x, y, z, r, g, b, s) {
      if (count >= capacity) return;
      const i = count++;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
      size[i] = s;
    },
    end() {
      geo.setDrawRange(0, count);
      for (const k of ['position', 'tint', 'size']) geo.attributes[k].needsUpdate = true;
    },
    // sizes are given in sixths of a metre of glow diameter
    setViewportHeight(h) { mat.uniforms.scale.value = h * 0.22; },
  };
  return api;
}
