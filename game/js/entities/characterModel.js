// Every person in the city (player, pedestrians, officers, gang members) drawn as instanced body parts:
// eight draw calls for the whole crowd. Limbs swing with a walk/run cycle; poses for aiming, hands-up,
// cowering and lying dead.
import * as THREE from 'three';
import { createRandom } from '../core/random.js';
import { MeshBuilder } from '../render/meshBuilder.js';

const PARTS = {
  legL: { size: [0.17, 0.9, 0.2], off: [0, -0.45, 0], pivot: [0.11, 0.93, 0] },
  legR: { size: [0.17, 0.9, 0.2], off: [0, -0.45, 0], pivot: [-0.11, 0.93, 0] },
  torso: { size: [0.46, 0.64, 0.27], off: [0, 0.32, 0], pivot: [0, 0.9, 0] },
  armL: { size: [0.13, 0.64, 0.15], off: [0, -0.29, 0], pivot: [0.31, 1.5, 0] },
  armR: { size: [0.13, 0.64, 0.15], off: [0, -0.29, 0], pivot: [-0.31, 1.5, 0] },
  head: { size: [0.27, 0.29, 0.28], off: [0, 0.15, 0], pivot: [0, 1.55, 0] },
  hair: { size: [0.29, 0.1, 0.3], off: [0, 0.31, -0.01], pivot: [0, 1.55, 0] },
  hairLong: { size: [0.3, 0.42, 0.3], off: [0, 0, 0], pivot: [0, 1.55, 0] },
  gun: { size: [0.07, 0.14, 0.34], off: [0, -0.62, 0.12], pivot: [-0.31, 1.5, 0] },
};
const COLOR_KEY = { legL: 'pants', legR: 'pants', torso: 'shirt', armL: 'shirt', armR: 'shirt', head: 'skin', hair: 'hair', hairLong: 'hair', gun: 'gun' };

const SKINS = ['#f1c9a5', '#e3b08a', '#c98e62', '#a8704c', '#7a4a2c', '#5e3a24'];
const HAIRS = ['#2a1d14', '#4a2e1c', '#c8a060', '#151515', '#8a4a2a', '#d9d0c0'];
const SHIRTS = ['#ff6f61', '#3fd6cc', '#f7f3ea', '#ffc65a', '#f28ab2', '#2e4a7a', '#8fd16a', '#ff9a3c', '#7a6ad8', '#e8e8e8'];
const PANTS = ['#3a4f7a', '#b59a6a', '#f2efe6', '#24262c', '#6a7a5a', '#4a6a9a'];

const looks = createRandom(5150);
export function randomLook(kind = 'ped', rnd = looks) {
  if (kind === 'cop') return { shirt: '#2c4672', pants: '#1c2436', skin: rnd.pick(SKINS), hair: '#16223a', gun: '#1a1a1a' };
  if (kind === 'gang') return { shirt: rnd.pick(['#c0503a', '#b8452e', '#8a2f22']), pants: '#26262a', skin: rnd.pick(SKINS), hair: '#1a1410', gun: '#1a1a1a' };
  if (kind === 'player') return { shirt: '#2bb3a8', pants: '#33405a', skin: '#c98e62', hair: '#1f1712', gun: '#1a1a1a' };
  return { shirt: rnd.pick(SHIRTS), pants: rnd.pick(PANTS), skin: rnd.pick(SKINS), hair: rnd.pick(HAIRS), gun: '#1a1a1a', longHair: rnd.chance(0.45) };
}

// Part shapes: legs end in dark shoes, the torso tapers to the waist, long hair falls down the back.
// White vertex colours take the per-person instance colour; dark ones (shoes, belt) stay dark.
function partGeometry(name, p) {
  const mb = new MeshBuilder();
  const white = { r: 1, g: 1, b: 1 }, dark = { r: 0.12, g: 0.11, b: 0.1 };
  const [sx, sy, sz] = p.size, [ox, oy, oz] = p.off;
  if (name === 'legL' || name === 'legR') {
    mb.box(ox, oy + 0.06, oz, sx, sy - 0.12, sz, white);
    mb.box(ox, -sy + 0.06, oz + 0.04, sx + 0.02, 0.12, sz + 0.1, dark, { bottom: true });
  } else if (name === 'torso') {
    mb.prism(0, 0, 0, sx / 2 - 0.04, sz / 2, 0.1, { side: 0 }, dark);
    mb.prism(0, 0.1, 0, sx / 2 - 0.04, sz / 2, sy - 0.18, { side: -0.04, front: 0, back: 0 }, white);
    mb.box(0, sy - 0.04, 0, sx, 0.08, sz, white);
  } else if (name === 'hairLong') {
    mb.box(0, 0.2, -0.13, 0.3, 0.42, 0.08, white);
    mb.box(0, 0.31, 0, 0.29, 0.1, 0.3, white);
  } else {
    mb.box(ox, oy, oz, sx, sy, sz, white, { bottom: true });
  }
  return mb.build();
}

export function createCrowdRenderer(scene, capacity = 220) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, vertexColors: true });
  const meshes = {};
  for (const [name, p] of Object.entries(PARTS)) {
    const geo = partGeometry(name, p);
    const m = new THREE.InstancedMesh(geo, material, capacity);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true; m.receiveShadow = false;
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    meshes[name] = m;
  }
  const base = new THREE.Matrix4(), local = new THREE.Matrix4(), out = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const colorCache = new Map();
  const col = (hex) => { if (!colorCache.has(hex)) colorCache.set(hex, new THREE.Color(hex)); return colorCache.get(hex); };

  function limbAngles(h) {
    const sw = Math.sin(h.phase || 0);
    const run = h.pose === 'run' ? 1 : 0;
    const moving = h.pose === 'walk' || h.pose === 'run';
    const amp = moving ? (run ? 0.95 : 0.5) : 0;
    const a = { legL: sw * amp, legR: -sw * amp, armL: -sw * amp * 0.8, armR: sw * amp * 0.8, torso: run ? 0.18 : 0, head: 0 };
    if (h.pose === 'aim') { a.armR = -Math.PI / 2 + (h.aimPitch || 0); a.armL = -1.25; }
    if (h.pose === 'handsup') { a.armR = Math.PI * 0.95; a.armL = Math.PI * 0.95; }
    if (h.pose === 'cower') { a.armR = -2.2; a.armL = -2.2; a.torso = 0.5; a.head = 0.4; }
    if (h.armed && moving && h.pose !== 'aim') a.armR = -0.5;
    return a;
  }

  return {
    draw(humans) {
      const counts = {};
      for (const name of Object.keys(PARTS)) counts[name] = 0;
      const put = (name, angle, h, color) => {
        const p = PARTS[name];
        local.makeRotationX(angle);
        local.setPosition(p.pivot[0], p.pivot[1], p.pivot[2]);
        out.multiplyMatrices(base, local);
        const i = counts[name]++;
        meshes[name].setMatrixAt(i, out);
        meshes[name].setColorAt(i, col(color || h.look[COLOR_KEY[name]]));
      };
      let n = 0;
      for (const h of humans) {
        if (!h.visible || n >= capacity) continue;
        const dead = h.pose === 'dead';
        e.set(dead ? -Math.PI / 2 : 0, h.heading, 0);
        q.setFromEuler(e);
        v.set(h.x, (h.y || 0) + (dead ? 0.16 : 0) + (h.pose === 'cower' ? -0.25 : 0), h.z);
        s.setScalar(h.scale || 1);
        base.compose(v, q, s);
        const ang = limbAngles(h);
        for (const name of ['legL', 'legR', 'torso', 'armL', 'armR', 'head']) put(name, ang[name] || 0, h);
        put(h.look.longHair ? 'hairLong' : 'hair', ang.head, h);
        if (h.armed && !dead) put('gun', ang.armR, h, '#1a1a1a');
        n++;
      }
      for (const [name, m] of Object.entries(meshes)) {
        m.count = counts[name];
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    },
  };
}

// A person record shared by every human system.
export function createHuman(kind, x, z, heading = 0, look = randomLook(kind)) {
  return {
    kind, x, z, y: 0.16, heading, phase: Math.random() * 6, pose: 'idle', look, visible: true,
    health: kind === 'player' ? 100 : kind === 'cop' ? 70 : kind === 'gang' ? 60 : 40, alive: true,
    armed: kind === 'cop' || kind === 'gang', radius: 0.38, vx: 0, vz: 0, scale: 1.08,
  };
}
