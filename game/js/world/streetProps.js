// Instanced street furniture: palms along the beach boulevard and avenues, park trees, street lamps
// (with night glows) and traffic signal heads. A few draw calls for hundreds of props.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { GRID, CITY_MIN, CITY_MAX, districtAt } from './cityPlan.js';
import { createRandom } from '../core/random.js';
import { makeGlowTexture } from '../render/facadeTextures.js';

function palmTrunkGeometry() {
  const mb = new MeshBuilder();
  const segs = 7, h = 9;
  for (let i = 0; i < segs; i++) {
    const y = (i + 0.5) * (h / segs);
    const bend = Math.pow(i / segs, 2) * 1.4;
    mb.cylinder(bend, y, 0, 0.32 - i * 0.025, h / segs + 0.05, vcolor(i % 2 ? '#8a6a48' : '#7a5c3c'), { seg: 6, rTop: 0.3 - i * 0.025 });
  }
  return mb.build();
}

function palmCrownGeometry() {
  const mb = new MeshBuilder();
  const leaves = 9;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const px = -dz * 0.55, pz = dx * 0.55; // half width perpendicular
    let prev = [0, 0, 0];
    const col = vcolor(i % 3 === 0 ? '#3f7d3a' : i % 3 === 1 ? '#4f9444' : '#5aa04a');
    for (let s = 1; s <= 4; s++) {
      const t = s / 4;
      const r = t * 4.6;
      const y = Math.sin(t * Math.PI * 0.8) * 1.2 - t * t * 2.6;
      const w = Math.sin(t * Math.PI) * 1 + 0.15;
      const cur = [dx * r, y, dz * r];
      const pw = s === 1 ? 0.1 : Math.sin((s - 1) / 4 * Math.PI) + 0.15;
      mb.quad([prev[0] - px * pw, prev[1], prev[2] - pz * pw], [prev[0] + px * pw, prev[1], prev[2] + pz * pw], [cur[0] + px * w, cur[1], cur[2] + pz * w], [cur[0] - px * w, cur[1], cur[2] - pz * w], [0, 1, 0], col, mb.flatUv);
      prev = cur;
    }
  }
  mb.cylinder(0, -0.2, 0, 0.5, 0.8, vcolor('#6a5a30'), { seg: 6 });
  return mb.build();
}

function treeGeometry() {
  const mb = new MeshBuilder();
  mb.cylinder(0, 1.5, 0, 0.25, 3, vcolor('#6e5238'), { seg: 6 });
  mb.cylinder(0, 4.2, 0, 2.6, 3.6, vcolor('#4e8a3e'), { seg: 7, rTop: 1.2 });
  mb.cylinder(0, 6.4, 0, 1.4, 1.4, vcolor('#5f9a48'), { seg: 7, rTop: 0.2 });
  return mb.build();
}

function lampGeometry() {
  const mb = new MeshBuilder();
  mb.cylinder(0, 3.5, 0, 0.12, 7, vcolor('#3a3f45'), { seg: 6 });
  mb.box(0.9, 7, 0, 2, 0.15, 0.15, vcolor('#3a3f45'));
  mb.box(1.8, 6.85, 0, 0.8, 0.25, 0.45, vcolor('#fff4d8'));
  return mb.build();
}

function signalGeometry() {
  const mb = new MeshBuilder();
  mb.cylinder(0, 2.6, 0, 0.1, 5.2, vcolor('#2e3238'), { seg: 6 });
  mb.box(0, 4.6, 0, 0.45, 1.3, 0.4, vcolor('#2a2d30'));
  mb.box(0, 5.0, 0.21, 0.25, 0.25, 0.02, vcolor('#e84a3a'));
  mb.box(0, 4.6, 0.21, 0.25, 0.25, 0.02, vcolor('#f2b544'));
  mb.box(0, 4.2, 0.21, 0.25, 0.25, 0.02, vcolor('#3ad07a'));
  return mb.build();
}

export function buildStreetProps(scene, plan) {
  const rnd = createRandom(77);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  const palms = [], trees = [], lamps = [], signals = [];
  const glowPoints = [];

  // beach boulevard: double row of palms (the postcard look) and lamps
  for (let z = CITY_MIN - 10; z <= CITY_MAX + 10; z += 16) {
    palms.push([CITY_MIN - 12, z, rnd.range(0, 6.28), rnd.range(0.9, 1.25)]);
    if ((z / 16) % 2 === 0) palms.push([CITY_MIN + 9.5, z + 8, rnd.range(0, 6.28), rnd.range(0.85, 1.1)]);
  }
  for (let x = CITY_MIN; x <= CITY_MAX + 10; x += 18) palms.push([x, CITY_MAX + 12, rnd.range(0, 6.28), rnd.range(0.9, 1.2)]);
  // avenues: lamps every 33 m on sidewalks, palms in Flamingo/Mango, a few trees elsewhere
  for (const c of GRID) for (let s = CITY_MIN + 20; s < CITY_MAX; s += 33) {
    if (Math.abs(((s % 100) + 100) % 100 - 0) < 12 || Math.abs(((s % 100) + 100) % 100 - 100) < 12) continue;
    lamps.push([c + 9.2, s, Math.PI]); lamps.push([s, c - 9.2, -Math.PI / 2]);
    const d1 = districtAt(c + 10, s), d2 = districtAt(s, c - 10);
    if ((d1 === 'mango' || d1 === 'flamingo' || d1 === 'glasswater') && rnd.chance(0.8)) palms.push([c - 9.5, s + 8, rnd.range(0, 6), rnd.range(0.8, 1.1)]);
    if ((d2 === 'mango' || d2 === 'flamingo' || d2 === 'lantern') && rnd.chance(0.6)) palms.push([s + 8, c + 9.5, rnd.range(0, 6), rnd.range(0.8, 1.1)]);
  }
  // parks and villas
  for (const bl of plan.blocks) {
    if (bl.kind === 'park') for (let i = 0; i < 26; i++) trees.push([bl.x + rnd.range(-36, 36), bl.z + rnd.range(-36, 36), rnd.range(0, 6), rnd.range(0.8, 1.3)]);
    if (bl.district === 'mango' || bl.kind === 'pier-plaza') for (let i = 0; i < 8; i++) palms.push([bl.x + rnd.range(-38, 38), bl.z + rnd.range(-38, 38), rnd.range(0, 6), rnd.range(0.8, 1.2)]);
  }
  // signal heads on two corners of each inner intersection
  for (const x of GRID) for (const z of GRID) {
    signals.push([x + 8.5, z + 8.5, Math.PI]); signals.push([x - 8.5, z - 8.5, 0]);
  }

  const dummy = new THREE.Object3D();
  function instanced(geo, list, cast) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, z, r, s = 1], i) => {
      dummy.position.set(x, 0.15, z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(s);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.castShadow = cast; m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  instanced(palmTrunkGeometry(), palms, true);
  // crowns sit at the bent trunk top, scaled with the palm
  const crowns = palms.map(([x, z, r, s]) => [x + Math.sin(r + Math.PI / 2) * 1.4 * s, z + Math.cos(r + Math.PI / 2) * 1.4 * s, r, s]);
  const crownMesh = instanced(palmCrownGeometry(), crowns, true);
  crowns.forEach(([x, z, r, s], i) => { dummy.position.set(x, 9 * s + 0.15, z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); crownMesh.setMatrixAt(i, dummy.matrix); });
  instanced(treeGeometry(), trees, true);
  instanced(lampGeometry(), lamps, false);
  instanced(signalGeometry(), signals, false);

  for (const [x, z, r] of lamps) glowPoints.push([x + Math.sin(r + Math.PI / 2) * 1.8, 6.6, z + Math.cos(r + Math.PI / 2) * 1.8, 1, 0.82, 0.55, 7]);

  // warm pools of light on the ground under every lamp, shown at night (one additive mesh)
  const pools = new MeshBuilder();
  const warm = vcolor('#ffcf8a');
  for (const [x, z, r] of lamps) {
    const cx = x + Math.sin(r + Math.PI / 2) * 2.4, cz = z + Math.cos(r + Math.PI / 2) * 2.4, R = 7;
    pools.quad([cx - R, 0.2, cz + R], [cx + R, 0.2, cz + R], [cx + R, 0.2, cz - R], [cx - R, 0.2, cz - R], [0, 1, 0], warm, [0, 0, 1, 0, 1, 1, 0, 1]);
  }
  const poolMesh = new THREE.Mesh(pools.build(), new THREE.MeshBasicMaterial({ map: makeGlowTexture(), vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  poolMesh.visible = false;
  scene.add(poolMesh);
  return { glowPoints, palmCount: palms.length, nightMeshes: [poolMesh] };
}
