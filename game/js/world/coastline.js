// The coast: land plane, beach sand and boardwalk on the west and south, the animated ocean with sun
// glitter, Halo Pier with its turning Halo Wheel, lifeguard towers, umbrellas and the hills behind the city.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { makeSandTexture, makeWaveNormals } from '../render/facadeTextures.js';
import { BEACH_WEST, BEACH_SOUTH, CITY_MIN, CITY_MAX } from './cityPlan.js';
import { createRandom } from '../core/random.js';

export function buildCoastline(scene, collision) {
  const rnd = createRandom(404);
  const glowPoints = [];

  // land behind the city
  const land = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x8f9a6a, roughness: 1 }));
  land.rotation.x = -Math.PI / 2;
  land.position.set(BEACH_WEST + 1500, -0.02, BEACH_SOUTH - 1500);
  land.receiveShadow = true;
  scene.add(land);

  // sand: west beach and south beach, a darker wet band at the waterline
  const sandTex = makeSandTexture();
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, vertexColors: true, roughness: 0.95 });
  const sand = new MeshBuilder();
  const S = 24;
  const quadUv = (x0, z0, x1, z1) => [x0 / S, z1 / S, x1 / S, z1 / S, x1 / S, z0 / S, x0 / S, z0 / S];
  const sq = (x0, z0, x1, z1, yy, col) => sand.quad([x0, yy, z1], [x1, yy, z1], [x1, yy, z0], [x0, yy, z0], [0, 1, 0], col, quadUv(x0, z0, x1, z1));
  sq(BEACH_WEST, -900, CITY_MIN - 7, BEACH_SOUTH, 0.01, vcolor('#ffffff'));
  sq(CITY_MIN - 7, CITY_MAX + 7, 1400, BEACH_SOUTH, 0.012, vcolor('#ffffff'));
  sq(BEACH_WEST - 14, -900, BEACH_WEST, BEACH_SOUTH + 14, 0.0, vcolor('#a88a60'));
  sq(BEACH_WEST, BEACH_SOUTH, 1400, BEACH_SOUTH + 14, 0.0, vcolor('#a88a60'));
  // boardwalk promenade along the beach boulevard
  sq(CITY_MIN - 17, -420, CITY_MIN - 7, CITY_MAX + 17, 0.14, vcolor('#d8c2a0', 0.95));
  sq(CITY_MIN - 17, CITY_MAX + 7, 420, CITY_MAX + 17, 0.14, vcolor('#d8c2a0', 0.95));
  const sandMesh = new THREE.Mesh(sand.build(), sandMat);
  sandMesh.receiveShadow = true;
  scene.add(sandMesh);

  // ocean: Phong with a scrolling ripple normal map gives a sun-glitter path at golden hour
  const normals = makeWaveNormals();
  normals.repeat.set(140, 140);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshPhongMaterial({ color: 0x1f6f8f, specular: 0xffe2b0, shininess: 90, normalMap: normals, normalScale: new THREE.Vector2(0.9, 0.9), reflectivity: 0.6 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.35, 0);
  scene.add(ocean);
  // shallow turquoise band near the shore
  const shallow = new MeshBuilder();
  shallow.ground(BEACH_WEST - 60, -900, BEACH_WEST - 14, BEACH_SOUTH + 60, -0.3, vcolor('#2fb3b8'));
  shallow.ground(BEACH_WEST - 14, BEACH_SOUTH + 14, 1400, BEACH_SOUTH + 60, -0.3, vcolor('#2fb3b8'));
  const shallowMesh = new THREE.Mesh(shallow.build(), new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.55, shininess: 60, specular: 0xffffff, normalMap: normals }));
  scene.add(shallowMesh);

  // pier, wheel, towers, umbrellas and hills share one detail mesh
  const det = new MeshBuilder();
  const wood = vcolor('#9a7550');
  const pierZ = 330, pierX0 = BEACH_WEST - 4, pierX1 = BEACH_WEST - 150;
  det.box((pierX0 + pierX1) / 2, 1.4, pierZ, pierX0 - pierX1, 0.4, 14, wood);
  for (let x = pierX1 + 4; x < pierX0; x += 8) for (const oz of [-6, 6]) det.box(x, 0.5, pierZ + oz, 0.6, 2.4, 0.6, vcolor('#6e5238'));
  for (let x = pierX1 + 2; x < pierX0; x += 4) for (const oz of [-6.8, 6.8]) det.box(x, 2.2, pierZ + oz, 0.2, 1.2, 0.2, vcolor('#f4efe6'));
  det.box(pierX1 + 30, 4, pierZ - 4, 10, 6, 5, vcolor('#f2789a'));   // snack kiosk
  det.box(pierX1 + 30, 7.4, pierZ - 4, 11, 0.8, 6, vcolor('#ffffff'));
  collision.addBox(pierX1, pierZ - 8, pierX0, pierZ - 7, 3);
  collision.addBox(pierX1, pierZ + 7, pierX0, pierZ + 8, 3);
  scene.add(meshOf(det, true));

  // Halo Wheel: a ring of spokes and gondolas that turns slowly
  const wheel = new THREE.Group();
  const wb = new MeshBuilder();
  const R = 22, seg = 24;
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2, a2 = ((i + 1) / seg) * Math.PI * 2;
    const p = [Math.cos(a) * R, Math.sin(a) * R], q = [Math.cos(a2) * R, Math.sin(a2) * R];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    // rim segment approximated by a box rotated in the wheel plane (built in x/y, rotated later)
    addPlaneBox(wb, mx, my, len + 0.4, 0.8, 0.8, ang, vcolor('#f4f1ea'));
    addPlaneBox(wb, Math.cos(a) * R / 2, Math.sin(a) * R / 2, R, 0.25, 0.25, a, vcolor('#e8e4dc'));
    if (i % 2 === 0) wb.box(Math.cos(a) * R, Math.sin(a) * R - 1.6, 0, 2.2, 2.4, 2.2, vcolor(['#f2789a', '#3fb8b0', '#f6c35a', '#7aa8ff'][i / 2 % 4]));
    glowPoints.push([pierX1 + 40, 26 + Math.sin(a) * R, pierZ + Math.cos(a) * R, 1, 0.6, 0.8, 3.5]);
  }
  wb.cylinder(0, 0, 0, 1.5, 4, vcolor('#d0d0d0'), { axis: 'x', seg: 10 });
  const wheelMesh = meshOf(wb, true);
  wheel.add(wheelMesh);
  wheel.position.set(pierX1 + 40, 26, pierZ);
  wheel.rotation.y = Math.PI / 2;
  scene.add(wheel);
  const legs = new MeshBuilder();
  for (const oz of [-3, 3]) {
    addLeg(legs, pierX1 + 40, pierZ + oz, 26, 12);
    addLeg(legs, pierX1 + 40, pierZ + oz, 26, -12);
  }
  scene.add(meshOf(legs, true));

  // lifeguard towers, umbrellas and towels on the sand
  const beachProps = new MeshBuilder();
  for (let z = -380; z < 440; z += 90) {
    const x = BEACH_WEST + 22;
    for (const [ox, oz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) beachProps.box(x + ox, 1.5, z + oz, 0.25, 3, 0.25, vcolor('#f4efe6'));
    beachProps.box(x, 3.6, z, 3.6, 2.2, 3.6, vcolor(rnd.pick(['#f2789a', '#3fb8b0', '#f6c35a'])));
    beachProps.prism(x, 4.7, z, 2.2, 2.2, 1, { side: 2.1, front: 2.1, back: 0 }, vcolor('#d0453a'));
  }
  for (let i = 0; i < 70; i++) {
    const west = i < 50;
    const x = west ? rnd.range(BEACH_WEST + 8, CITY_MIN - 24) : rnd.range(-380, 380);
    const z = west ? rnd.range(-400, 460) : rnd.range(CITY_MAX + 22, BEACH_SOUTH - 8);
    const c = vcolor(rnd.pick(['#e8574a', '#f2c14e', '#3fb8b0', '#f4f1ea', '#5b7fd6', '#f2789a']));
    beachProps.cylinder(x, 1.3, z, 0.06, 2.6, vcolor('#f4efe6'), { seg: 4 });
    beachProps.cylinder(x, 2.6, z, 1.8, 0.5, c, { seg: 8, rTop: 0.05 });
    beachProps.ground(x + 0.6, z - 0.5, x + 2.4, z + 0.5, 0.03, vcolor(rnd.pick(['#ffffff', '#f6c35a', '#7ad0c8', '#f29aa8'])));
  }
  scene.add(meshOf(beachProps, true));

  // hills north and east, fading into the haze
  const hills = new MeshBuilder();
  for (let i = 0; i < 26; i++) {
    const north = i < 14;
    const x = north ? -500 + i * 80 + rnd.range(-20, 20) : CITY_MAX + 140 + rnd.range(0, 200);
    const z = north ? CITY_MIN - 150 - rnd.range(0, 220) : -400 + (i - 14) * 80;
    const r = rnd.range(90, 160), h = rnd.range(40, 90);
    hills.cylinder(x, h * 0.3 - 2, z, r, h * 0.6, vcolor(rnd.pick(['#5f7a4a', '#56704a', '#6a7f50'])), { seg: 14, rTop: r * 0.6 });
    hills.cylinder(x, h * 0.6 + h * 0.2 - 2, z, r * 0.6, h * 0.4, vcolor(rnd.pick(['#5f7a4a', '#4f6a44'])), { seg: 14, rTop: r * 0.15 });
  }
  const hillMesh = meshOf(hills, false);
  scene.add(hillMesh);

  return {
    wheel, ocean, glowPoints,
    update(dt, t) {
      wheel.rotation.x += dt * 0.08;
      normals.offset.set((t * 0.004) % 1, (t * 0.0025) % 1);
    },
  };
}

function meshOf(builder, cast) {
  const m = new THREE.Mesh(builder.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}

// A box lying in the x/y plane, rotated about z (used for wheel rims and spokes).
function addPlaneBox(mb, cx, cy, len, th, depth, ang, color) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const corners = [];
  for (const [lx, ly] of [[-len / 2, -th / 2], [len / 2, -th / 2], [len / 2, th / 2], [-len / 2, th / 2]]) corners.push([cx + lx * c - ly * s, cy + lx * s + ly * c]);
  const f = mb.flatUv;
  const zf = depth / 2;
  const P = (i, z) => [corners[i][0], corners[i][1], z];
  mb.quad(P(0, zf), P(1, zf), P(2, zf), P(3, zf), [0, 0, 1], color, f);
  mb.quad(P(1, -zf), P(0, -zf), P(3, -zf), P(2, -zf), [0, 0, -1], color, f);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const nx = corners[j][1] - corners[i][1], ny = -(corners[j][0] - corners[i][0]);
    const l = Math.hypot(nx, ny) || 1;
    mb.quad(P(i, zf), P(i, -zf), P(j, -zf), P(j, zf), [nx / l, ny / l, 0], color, f);
  }
}

function addLeg(mb, x, z, topY, spreadX) {
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const y = topY * (1 - (t0 + t1) / 2);
    mb.box(x + spreadX * (t0 + t1) / 2, y, z, 0.7, topY / steps + 0.2, 0.7, vcolor('#e8e4dc'));
  }
}
