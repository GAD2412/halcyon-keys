// Transient effects: tyre and damage smoke, fire, sparks, explosions, muzzle flashes and bullet tracers.
// Smoke is one alpha-blended point cloud; fire, sparks and flashes go into the shared light glows.
import * as THREE from 'three';
import { makeGlowTexture } from './facadeTextures.js';
import { rng } from '../core/random.js';

const smokeVert = `
attribute float size; attribute float alpha; attribute vec3 tint;
varying float vAlpha; varying vec3 vTint; uniform float scale;
void main() {
  vAlpha = alpha; vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(-mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const smokeFrag = `
uniform sampler2D tex; varying float vAlpha; varying vec3 vTint;
void main() {
  float a = texture2D(tex, gl_PointCoord).r * vAlpha;
  gl_FragColor = vec4(vTint, a);
}`;

export function createEffects(scene) {
  const CAP = 1200;
  const P = { x: new Float32Array(CAP), y: new Float32Array(CAP), z: new Float32Array(CAP), vx: new Float32Array(CAP), vy: new Float32Array(CAP), vz: new Float32Array(CAP), life: new Float32Array(CAP), max: new Float32Array(CAP), size: new Float32Array(CAP), grow: new Float32Array(CAP), shade: new Float32Array(CAP), a0: new Float32Array(CAP) };
  let head = 0;
  const pos = new Float32Array(CAP * 3), sizeA = new Float32Array(CAP), alphaA = new Float32Array(CAP), tintA = new Float32Array(CAP * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizeA, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphaA, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(tintA, 3));
  const mat = new THREE.ShaderMaterial({ vertexShader: smokeVert, fragmentShader: smokeFrag, uniforms: { tex: { value: makeGlowTexture() }, scale: { value: 700 } }, transparent: true, depthWrite: false });
  const cloud = new THREE.Points(geo, mat);
  cloud.frustumCulled = false;
  cloud.renderOrder = 9;
  scene.add(cloud);

  function emit(x, y, z, vx, vy, vz, life, size, grow, shade, alpha) {
    const i = head; head = (head + 1) % CAP;
    P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
    P.life[i] = life; P.max[i] = life; P.size[i] = size; P.grow[i] = grow; P.shade[i] = shade; P.a0[i] = alpha;
  }

  // glowing short-lived items: fire, sparks, muzzle flashes
  const flashes = [];
  const tracers = [];
  const TR = 64;
  const trPos = new Float32Array(TR * 6);
  const trGeo = new THREE.BufferGeometry();
  trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
  const trLines = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  trLines.frustumCulled = false;
  scene.add(trLines);

  const api = {
    smoke(x, y, z, size = 1, shade = 0.8) { emit(x, y, z, rng.range(-0.6, 0.6), rng.range(0.6, 1.4), rng.range(-0.6, 0.6), rng.range(1.2, 2.2), size, size * 1.4, shade, 0.5); },
    dust(x, y, z) { emit(x, y, z, rng.range(-1, 1), rng.range(0.2, 0.8), rng.range(-1, 1), 0.8, 0.6, 1.2, 0.9, 0.35); },
    blood(x, y, z) { for (let i = 0; i < 6; i++) emit(x, y, z, rng.range(-1.5, 1.5), rng.range(0.5, 2.5), rng.range(-1.5, 1.5), 0.5, 0.25, 0.1, -1, 0.9); },
    fire(x, y, z) {
      flashes.push({ x: x + rng.range(-0.4, 0.4), y, z: z + rng.range(-0.4, 0.4), vy: rng.range(1.5, 3.5), life: rng.range(0.3, 0.6), max: 0.6, r: 1, g: rng.range(0.35, 0.6), b: 0.08, size: rng.range(6, 10) });
    },
    sparks(x, y, z, n = 8) {
      for (let i = 0; i < n; i++) flashes.push({ x, y, z, vx: rng.range(-5, 5), vy: rng.range(1, 6), vz: rng.range(-5, 5), life: rng.range(0.15, 0.4), max: 0.4, r: 1, g: 0.8, b: 0.4, size: 1.6 });
    },
    flash(x, y, z, size = 5, r = 1, g = 0.85, b = 0.5, life = 0.06) { flashes.push({ x, y, z, life, max: life, r, g, b, size }); },
    tracer(x1, y1, z1, x2, y2, z2) { tracers.push({ a: [x1, y1, z1], b: [x2, y2, z2], life: 0.07 }); },
    explosion(x, z) {
      api.flash(x, 2, z, 60, 1, 0.7, 0.3, 0.35);
      for (let i = 0; i < 30; i++) api.fire(x + rng.range(-2, 2), rng.range(0.5, 3), z + rng.range(-2, 2));
      for (let i = 0; i < 24; i++) emit(x, 1.5, z, rng.range(-5, 5), rng.range(2, 7), rng.range(-5, 5), rng.range(1.5, 3), 3, 3, 0.15, 0.7);
      api.sparks(x, 1.5, z, 30);
    },
    update(dt) {
      for (let i = 0; i < CAP; i++) {
        if (P.life[i] <= 0) { alphaA[i] = 0; continue; }
        P.life[i] -= dt;
        P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
        if (P.shade[i] < 0) P.vy[i] -= 9 * dt;
        const t = 1 - P.life[i] / P.max[i];
        pos[i * 3] = P.x[i]; pos[i * 3 + 1] = P.y[i]; pos[i * 3 + 2] = P.z[i];
        sizeA[i] = (P.size[i] + P.grow[i] * t) * 1.8;
        alphaA[i] = Math.max(0, P.a0[i] * (1 - t) * Math.min(1, t * 6));
        const s = P.shade[i];
        if (s < 0) { tintA[i * 3] = 0.45; tintA[i * 3 + 1] = 0.02; tintA[i * 3 + 2] = 0.02; }
        else { tintA[i * 3] = s; tintA[i * 3 + 1] = s * 0.97; tintA[i * 3 + 2] = s * 0.95; }
      }
      for (const k of ['position', 'size', 'alpha', 'tint']) geo.attributes[k].needsUpdate = true;
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= dt;
        if (f.life <= 0) { flashes.splice(i, 1); continue; }
        f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; f.z += (f.vz || 0) * dt;
        if (f.vx) f.vy -= 12 * dt;
      }
      let n = 0;
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= dt;
        if (t.life <= 0) { tracers.splice(i, 1); continue; }
        if (n < TR) { trPos.set(t.a, n * 6); trPos.set(t.b, n * 6 + 3); n++; }
      }
      trGeo.setDrawRange(0, n * 2);
      trGeo.attributes.position.needsUpdate = true;
    },
    drawGlows(glows) {
      for (const f of flashes) {
        const k = Math.max(0, f.life / f.max);
        glows.add(f.x, f.y, f.z, f.r * k * 1.5, f.g * k * 1.5, f.b * k * 1.5, f.size * (0.6 + 0.4 * k));
      }
    },
    setViewportHeight(h) { mat.uniforms.scale.value = h * 0.9; },
  };
  return api;
}

// Dark tyre marks left by drifting cars, kept in a ring buffer of thin quads.
export function createSkidMarks(scene) {
  const CAP = 600;
  const pos = new Float32Array(CAP * 6 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.frustumCulled = false;
  scene.add(mesh);
  let head = 0, count = 0;
  const last = new Map();
  return {
    add(x1, z1, x2, z2) {
      // each call lays two short segments (left and right wheels) from their previous positions
      for (const [k, x, z] of [[0, x1, z1], [1, x2, z2]]) {
        const p = last.get(k);
        last.set(k, { x, z, t: performance.now() });
        if (!p || performance.now() - p.t > 120 || Math.hypot(x - p.x, z - p.z) > 4) continue;
        const dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz) || 1;
        const nx = (-dz / l) * 0.13, nz = (dx / l) * 0.13, y = 0.05;
        const q = [p.x - nx, y, p.z - nz, p.x + nx, y, p.z + nz, x + nx, y, z + nz, p.x - nx, y, p.z - nz, x + nx, y, z + nz, x - nx, y, z - nz];
        pos.set(q, head * 18);
        head = (head + 1) % CAP; count = Math.min(CAP, count + 1);
      }
      geo.setDrawRange(0, count * 6);
      geo.attributes.position.needsUpdate = true;
    },
  };
}
