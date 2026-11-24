// Every person in the city (player, pedestrians, officers, gang members) drawn as instanced body parts:
// a dozen draw calls for the whole crowd. Faces, hair, hands, caps and guns are separate parts so each
// takes its own instance colour. The upper body leans with the torso; limbs swing with a walk/run
// cycle; poses for two-handed aiming, hands-up, cowering and lying dead.
import * as THREE from 'three';
import { createRandom } from '../core/random.js';
import { MeshBuilder } from '../render/meshBuilder.js';

const TORSO_PIVOT = [0, 0.9, 0];
const PARTS = {
  legL: { size: [0.17, 0.9, 0.2], off: [0, -0.45, 0], pivot: [0.11, 0.93, 0] },
  legR: { size: [0.17, 0.9, 0.2], off: [0, -0.45, 0], pivot: [-0.11, 0.93, 0] },
  torso: { size: [0.46, 0.64, 0.27], off: [0, 0.32, 0], pivot: TORSO_PIVOT },
  armL: { size: [0.13, 0.6, 0.15], off: [0, -0.27, 0], pivot: [0.31, 1.5, 0], upper: true },
  armR: { size: [0.13, 0.6, 0.15], off: [0, -0.27, 0], pivot: [-0.31, 1.5, 0], upper: true },
  handL: { pivot: [0.31, 1.5, 0], upper: true },
  handR: { pivot: [-0.31, 1.5, 0], upper: true },
  head: { pivot: [0, 1.55, 0], upper: true },
  hair: { pivot: [0, 1.55, 0], upper: true },
  hairLong: { pivot: [0, 1.55, 0], upper: true },
  cap: { pivot: [0, 1.55, 0], upper: true },
  gun: { pivot: [-0.31, 1.5, 0], upper: true },
};
const COLOR_KEY = { legL: 'pants', legR: 'pants', torso: 'shirt', armL: 'shirt', armR: 'shirt', handL: 'skin', handR: 'skin', head: 'skin', hair: 'hair', hairLong: 'hair', cap: 'cap', gun: 'gun' };

const SKINS = ['#f1c9a5', '#e3b08a', '#c98e62', '#a8704c', '#7a4a2c', '#5e3a24'];
const HAIRS = ['#2a1d14', '#4a2e1c', '#c8a060', '#151515', '#8a4a2a', '#d9d0c0'];
const SHIRTS = ['#ff6f61', '#3fd6cc', '#f7f3ea', '#ffc65a', '#f28ab2', '#2e4a7a', '#8fd16a', '#ff9a3c', '#7a6ad8', '#e8e8e8'];
const PANTS = ['#3a4f7a', '#b59a6a', '#f2efe6', '#24262c', '#6a7a5a', '#4a6a9a'];
const HATS = ['#e8d8a8', '#f4f4f0', '#2e4a7a', '#d0453a'];

const looks = createRandom(5150);
export function randomLook(kind = 'ped', rnd = looks) {
  if (kind === 'cop') return { shirt: '#2c4672', pants: '#1c2436', skin: rnd.pick(SKINS), hair: '#16223a', gun: '#1a1a1a', cap: '#18233a' };
  if (kind === 'gang') return { shirt: rnd.pick(['#c0503a', '#b8452e', '#d4602a']), pants: '#26262a', skin: rnd.pick(SKINS), hair: '#1a1410', gun: '#1a1a1a', cap: rnd.pick(['#1c1c20', '#8a2f22']) };
  if (kind === 'player') return { shirt: '#2bb3a8', pants: '#33405a', skin: '#c98e62', hair: '#1f1712', gun: '#1a1a1a' };
  return { shirt: rnd.pick(SHIRTS), pants: rnd.pick(PANTS), skin: rnd.pick(SKINS), hair: rnd.pick(HAIRS), gun: '#1a1a1a', longHair: rnd.chance(0.45), cap: rnd.chance(0.18) ? rnd.pick(HATS) : null };
}

// Part shapes. White vertex colours take the per-person instance colour; tinted ones darken it
// (shoes, belt, eyes, mouth), so one instanced mesh per part still gives faces and trim.
function partGeometry(name, p) {
  const mb = new MeshBuilder();
  const white = { r: 1, g: 1, b: 1 }, dark = { r: 0.12, g: 0.11, b: 0.1 }, shade = { r: 0.78, g: 0.78, b: 0.78 };
  if (name === 'legL' || name === 'legR') {
    const [sx, sy, sz] = p.size, [ox, oy, oz] = p.off;
    mb.box(ox, oy + 0.06, oz, sx, sy - 0.12, sz, white);
    mb.box(ox, oy + 0.06 - 0.2, oz, sx + 0.012, 0.05, sz + 0.012, shade);          // knee crease
    mb.box(ox, -sy + 0.06, oz + 0.04, sx + 0.02, 0.12, sz + 0.1, dark, { bottom: true });
  } else if (name === 'torso') {
    const [sx, sy, sz] = p.size;
    mb.prism(0, 0, 0, sx / 2 - 0.05, sz / 2, 0.1, { side: 0 }, dark);                         // belt
    mb.prism(0, 0.1, 0, sx / 2 - 0.05, sz / 2, sy - 0.2, { side: -0.05, front: 0, back: 0 }, white);  // waist to chest
    mb.box(0, sy - 0.05, 0, sx, 0.1, sz, white);                                              // shoulders
    mb.box(0, sy - 0.03, sz / 2 + 0.005, 0.16, 0.08, 0.02, shade);                            // collar
    mb.box(0, 0.38, sz / 2 + 0.004, 0.02, 0.42, 0.012, shade);                                 // jacket seam
  } else if (name === 'armL' || name === 'armR') {
    const [sx, sy, sz] = p.size, [ox, oy, oz] = p.off;
    mb.box(ox, oy, oz, sx, sy, sz, white, { bottom: true });
    mb.box(ox, oy - sy / 2 + 0.04, oz, sx + 0.015, 0.08, sz + 0.015, shade);                  // cuff
  } else if (name === 'handL' || name === 'handR') {
    mb.box(0, -0.63, 0.01, 0.11, 0.13, 0.12, white, { bottom: true });
  } else if (name === 'head') {
    mb.box(0, -0.01, 0, 0.13, 0.1, 0.13, white);                                              // neck
    mb.box(0, 0.16, 0, 0.29, 0.3, 0.29, white, { bottom: true });
    for (const s of [-1, 1]) {
      mb.box(s * 0.068, 0.19, 0.147, 0.055, 0.05, 0.012, dark);                                // eyes
      mb.box(s * 0.152, 0.16, 0, 0.03, 0.09, 0.07, shade);                                      // ears
    }
    mb.box(0, 0.13, 0.16, 0.05, 0.07, 0.04, { r: 0.92, g: 0.9, b: 0.88 });                   // nose
    mb.box(0, 0.075, 0.147, 0.1, 0.022, 0.012, { r: 0.5, g: 0.28, b: 0.25 });                // mouth
  } else if (name === 'hair' || name === 'hairLong') {
    const long = name === 'hairLong';
    mb.box(0, 0.335, -0.01, 0.31, 0.08, 0.32, white);                                         // crown
    mb.box(0, 0.3, 0.14, 0.29, 0.06, 0.04, white);                                            // fringe
    mb.box(0, long ? 0.13 : 0.22, -0.145, 0.31, long ? 0.48 : 0.24, long ? 0.07 : 0.05, white);  // back
    for (const s of [-1, 1]) {
      mb.box(s * 0.15, long ? 0.18 : 0.26, -0.03, 0.03, long ? 0.3 : 0.12, 0.24, white);      // sides
      mb.box(s * 0.068, 0.235, 0.148, 0.075, 0.025, 0.012, white);                             // brows
    }
  } else if (name === 'cap') {
    mb.box(0, 0.33, -0.005, 0.32, 0.12, 0.32, white);
    mb.box(0, 0.29, 0.2, 0.28, 0.025, 0.15, white);
    mb.box(0, 0.28, 0, 0.325, 0.03, 0.325, shade);                                           // band
  } else if (name === 'gun') {
    // held in the right hand; the barrel runs along the arm so aiming points it at the target
    mb.box(0, -0.8, 0.04, 0.07, 0.44, 0.1, white, { bottom: true });                          // body + barrel
    mb.box(0, -0.66, -0.07, 0.06, 0.08, 0.14, white);                                         // grip
    mb.box(0, -0.8, -0.09, 0.05, 0.07, 0.17, white);                                          // magazine
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
  const base = new THREE.Matrix4(), upper = new THREE.Matrix4(), local = new THREE.Matrix4(), out = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const colorCache = new Map();
  const col = (hex) => { if (!colorCache.has(hex)) colorCache.set(hex, new THREE.Color(hex)); return colorCache.get(hex); };

  function limbAngles(h) {
    const sw = Math.sin(h.phase || 0);
    const run = h.pose === 'run' ? 1 : 0;
    const moving = h.pose === 'walk' || h.pose === 'run';
    const amp = moving ? (run ? 0.95 : 0.5) : 0;
    const a = { legL: sw * amp, legR: -sw * amp, armL: -sw * amp * 0.85, armR: sw * amp * 0.85, torso: run ? 0.22 : 0, head: run ? -0.15 : 0 };
    if (h.pose === 'aim') { a.armR = -Math.PI / 2 + (h.aimPitch || 0); a.armL = -1.42 + (h.aimPitch || 0); a.torso = 0.06; a.head = -0.04; a.legL = -0.18; a.legR = 0.14; }
    if (h.pose === 'handsup') { a.armR = Math.PI * 0.95; a.armL = Math.PI * 0.95; }
    if (h.pose === 'cower') { a.armR = -2.3; a.armL = -2.3; a.torso = 0.55; a.head = 0.3; a.legL = -0.5; a.legR = -0.3; }
    if (h.armed && moving && h.pose !== 'aim') a.armR = -0.9;
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
        out.multiplyMatrices(p.upper ? upper : base, local);
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
        // upper body hangs off the torso so leaning carries the head and arms with it
        tmp.makeRotationX(ang.torso);
        tmp.setPosition(TORSO_PIVOT[0], TORSO_PIVOT[1], TORSO_PIVOT[2]);
        upper.multiplyMatrices(base, tmp);
        local.makeTranslation(-TORSO_PIVOT[0], -TORSO_PIVOT[1], -TORSO_PIVOT[2]);
        upper.multiply(local);
        for (const name of ['legL', 'legR', 'torso', 'armL', 'armR', 'head']) put(name, ang[name] || 0, h);
        put('handL', ang.armL, h); put('handR', ang.armR, h);
        put(h.look.longHair ? 'hairLong' : 'hair', ang.head, h);
        if (h.look.cap) put('cap', ang.head, h);
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
