// Builds Port Halcyon's static geometry from the city plan: roads with lane markings and crossings,
// sidewalks, block grounds, buildings with painted facades and rooftop details, merged per 200 m chunk
// and per material so the whole city draws in a few dozen calls. Registers every solid box for collisions.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { makeFacade, makeRoadTexture, makeIntersectionTexture, makeTileTexture } from '../render/facadeTextures.js';
import { buildCityPlan, GRID, ROAD_HALF, DISTRICTS, CITY_MIN, CITY_MAX } from './cityPlan.js';
import { createCollisionMap } from './collisionMap.js';
import { createRandom } from '../core/random.js';

const STYLE_LIST = ['deco', 'glass', 'stucco', 'warehouse'];

export function buildCity(scene, dayNight) {
  const plan = buildCityPlan();
  const collision = createCollisionMap();
  const rnd = createRandom(99);
  const glowPoints = [];   // static night lights: [x,y,z,r,g,b,size]

  // ---- materials
  const facades = {};
  for (const [i, s] of STYLE_LIST.entries()) {
    const f = makeFacade(s, 10 + i);
    const mat = new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true,
      roughness: s === 'glass' ? 0.22 : 0.78, metalness: s === 'glass' ? 0.35 : 0.02, envMapIntensity: s === 'glass' ? 1.1 : 0.5,
    });
    mat.userData.glowScale = s === 'glass' ? 1.4 : 1.1;
    dayNight.glowMaterials.push(mat);
    facades[s] = { tex: f, mat };
  }
  const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
  const tileTex = makeTileTexture('#d9d3c8', 'rgba(0,0,0,0.12)', 128, 0.1);
  tileTex.repeat.set(1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ map: tileTex, vertexColors: true, roughness: 0.9 });
  const roadMat = new THREE.MeshStandardMaterial({ map: makeRoadTexture(), roughness: 0.82, metalness: 0.0 });
  const crossMat = new THREE.MeshStandardMaterial({ map: makeIntersectionTexture(), roughness: 0.82 });
  const meshes = [];

  // ---- chunked builders
  const chunks = new Map();
  const chunkOf = (x, z) => {
    const k = `${Math.floor((x - CITY_MIN) / 200)},${Math.floor((z - CITY_MIN) / 200)}`;
    if (!chunks.has(k)) chunks.set(k, { deco: new MeshBuilder(), glass: new MeshBuilder(), stucco: new MeshBuilder(), warehouse: new MeshBuilder(), detail: new MeshBuilder() });
    return chunks.get(k);
  };

  // ---- roads
  const roads = new MeshBuilder();
  const crossings = new MeshBuilder();
  const y = 0.03;
  for (const c of GRID) {
    for (let i = 0; i < GRID.length - 1; i++) {
      const a = GRID[i] + ROAD_HALF, b = GRID[i + 1] - ROAD_HALF;
      // north-south road at x = c
      roads.quad([c - 7, y, b], [c + 7, y, b], [c + 7, y, a], [c - 7, y, a], [0, 1, 0], vcolor(0xffffff), [0, b / 14, 1, b / 14, 1, a / 14, 0, a / 14]);
      // east-west road at z = c
      roads.quad([a, y, c + 7], [b, y, c + 7], [b, y, c - 7], [a, y, c - 7], [0, 1, 0], vcolor(0xffffff), [1, a / 14, 1, b / 14, 0, b / 14, 0, a / 14]);
    }
    for (const d of GRID) crossings.ground(c - 7, d - 7, c + 7, d + 7, y + 0.005, vcolor(0xffffff), [0, 0, 1, 0, 1, 1, 0, 1]);
  }
  addMesh(roads, roadMat, { receive: true });
  addMesh(crossings, crossMat, { receive: true });

  // ---- block grounds (raised sidewalks) and parks
  const grounds = new MeshBuilder();
  for (const bl of plan.blocks) {
    const park = bl.kind === 'park' || bl.kind === 'pier-plaza';
    const col = vcolor(park ? '#8fb86a' : DISTRICTS[bl.district].ground);
    const h = 43;
    grounds.box(bl.x, 0.08, bl.z, h * 2, 0.16, h * 2, vcolor('#c9c3b8'), { top: false });
    const x0 = bl.x - h, x1 = bl.x + h, z0 = bl.z - h, z1 = bl.z + h;
    grounds.quad([x0, 0.16, z1], [x1, 0.16, z1], [x1, 0.16, z0], [x0, 0.16, z0], [0, 1, 0], col, [x0 / 6, z1 / 6, x1 / 6, z1 / 6, x1 / 6, z0 / 6, x0 / 6, z0 / 6]);
    if (park) {
      // footpaths crossing the park
      grounds.ground(bl.x - 2.5, z0 + 4, bl.x + 2.5, z1 - 4, 0.18, vcolor('#e6dcc6'));
      grounds.ground(x0 + 4, bl.z - 2.5, x1 - 4, bl.z + 2.5, 0.185, vcolor('#e6dcc6'));
      if (bl.kind === 'park') {
        const ch = chunkOf(bl.x, bl.z);
        ch.detail.cylinder(bl.x, 1.2, bl.z, 5, 2.4, vcolor('#d8d2c4'), { seg: 16 });
        ch.detail.cylinder(bl.x, 2.6, bl.z, 4, 0.4, vcolor('#6fc3d8'), { seg: 16 });
      }
    }
  }
  addMesh(grounds, groundMat, { receive: true });

  // ---- buildings
  for (const b of plan.buildings) {
    const ch = chunkOf(b.x, b.z);
    const col = vcolor(b.color);
    const top = vcolor(b.color, 0.72);
    collision.addBox(b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2, b.h);
    if (b.style === 'container') {
      for (let k = 0; k < b.h / 2.6; k++) ch.detail.box(b.x, 1.3 + k * 2.6, b.z, b.w, 2.55, b.d, vcolor(b.color, 0.9 - k * 0.05), { topColor: vcolor(b.color, 0.75) });
      continue;
    }
    const f = facades[b.style].tex;
    ch[b.style].box(b.x, b.h / 2 + 0.16, b.z, b.w, b.h, b.d, col, { uv: 'facade', tileW: f.tileW, tileH: f.tileH, uOff: rnd.next(), topColor: top });
    const roofY = b.h + 0.16;
    // parapet ring
    if (b.style !== 'warehouse') {
      const pc = vcolor(b.color, 0.9);
      ch.detail.box(b.x, roofY + 0.5, b.z - b.d / 2 + 0.3, b.w, 1, 0.6, pc);
      ch.detail.box(b.x, roofY + 0.5, b.z + b.d / 2 - 0.3, b.w, 1, 0.6, pc);
      ch.detail.box(b.x - b.w / 2 + 0.3, roofY + 0.5, b.z, 0.6, 1, b.d, pc);
      ch.detail.box(b.x + b.w / 2 - 0.3, roofY + 0.5, b.z, 0.6, 1, b.d, pc);
    }
    // rooftop machinery
    const units = b.style === 'glass' ? 3 : 2;
    for (let i = 0; i < units; i++) {
      const ux = b.x + rnd.range(-b.w / 3, b.w / 3), uz = b.z + rnd.range(-b.d / 3, b.d / 3);
      ch.detail.box(ux, roofY + 1, uz, rnd.range(2, 4), 2, rnd.range(2, 4), vcolor('#b9bcc0'));
    }
    if (b.trim) {
      // ocean-view balconies with glass rails on every floor of the beach face
      const face = b.x - b.w / 2;
      for (let fy = 4.4; fy < b.h - 2.5; fy += 3.5) {
        ch.detail.box(face - 0.65, fy, b.z, 1.3, 0.2, b.d * 0.8, vcolor('#fbf6ec'));
        ch.detail.box(face - 1.25, fy + 0.55, b.z, 0.08, 0.9, b.d * 0.8, vcolor('#a9dbe8'));
      }
      // deco fins and a coloured stripe on the beach face
      const trim = vcolor(rnd.pick(['#ffffff', '#3fb8b0', '#f2789a', '#f6c35a']));
      ch.detail.box(b.x - b.w / 2 - 0.3, b.h / 2, b.z, 0.6, b.h + 2, 3, trim);
      ch.detail.box(b.x - b.w / 2 - 0.25, b.h * 0.33, b.z, 0.5, 0.8, b.d, trim);
      ch.detail.box(b.x - b.w / 2 - 0.4, roofY + 2.5, b.z, 0.5, 4, b.d * 0.5, vcolor('#fff7ea'));
      glowPoints.push([b.x - b.w / 2 - 1, roofY + 2.5, b.z, 1, 0.35, 0.65, 9], [b.x - b.w / 2 - 1, b.h * 0.33, b.z, 0.3, 0.9, 0.85, 6]);
    }
    if (b.crown) {
      ch.glass.box(b.x, roofY + 6, b.z, b.w * 0.6, 12, b.d * 0.6, col, { uv: 'facade', tileW: f.tileW, tileH: f.tileH, topColor: top });
      ch.detail.cylinder(b.x, roofY + 22, b.z, 0.4, 20, vcolor('#d0d4d8'), { seg: 6 });
      glowPoints.push([b.x, roofY + 32, b.z, 1, 0.2, 0.2, 10]);
    }
    if (b.villa) {
      ch.detail.box(b.x, roofY + 0.25, b.z, b.w + 2, 0.5, b.d + 2, vcolor('#c96f4a'));
      ch.detail.ground(b.x - 6, b.z + b.d / 2 + 2, b.x + 6, b.z + b.d / 2 + 7, 0.2, vcolor('#45b6d6'));
    }
    if (b.awning) {
      const ac = vcolor(rnd.pick(['#d0453a', '#2a8f84', '#e9a23b', '#3b6fb0']));
      const alongX = b.w > b.d;
      if (alongX) {
        const zf = b.z + (b.d / 2 + 1.2) * (b.z % 100 > 0 || b.z % 100 < -50 ? 1 : -1);
        ch.detail.box(b.x, 3.4, zf, b.w * 0.8, 0.25, 2.4, ac);
      } else {
        const xf = b.x + (b.w / 2 + 1.2) * (Math.sign(b.x - Math.round(b.x / 100) * 100 + 0.01) > 0 ? -1 : 1);
        ch.detail.box(xf, 3.4, b.z, 2.4, 0.25, b.d * 0.8, ac);
      }
    }
    if (b.chimney) {
      ch.detail.cylinder(b.x + b.w * 0.3, roofY + 9, b.z, 1.6, 18, vcolor('#8a5544'), { seg: 10, rTop: 1.2 });
      ch.detail.cylinder(b.x + b.w * 0.3, roofY + 17.5, b.z, 1.3, 1.2, vcolor('#d8d0c4'), { seg: 10 });
    }
    // Lantern Quarter string lights between buildings at night
    if (b.district === 'lantern') for (let i = 0; i < 4; i++) {
      glowPoints.push([b.x + rnd.range(-b.w / 2, b.w / 2), 5.5, b.z + rnd.range(-b.d / 2, b.d / 2), 1, 0.75, 0.4, 3.2]);
    }
  }

  // ---- neon: tower edge strips and crown bands downtown, sign blades on the deco hotels
  const neon = new MeshBuilder();
  const NEON = ['#3ff0ff', '#ff3fd0', '#9a6bff', '#ff8a3f', '#4dff9a'];
  for (const b of plan.buildings) {
    if (b.style === 'glass' && b.h > 40) {
      const c = NEON[(Math.abs(Math.round(b.x * 7 + b.z * 3)) % NEON.length)];
      const col = vcolor(c, 1.2);
      const ex = b.x + b.w / 2 + 0.2, ez = b.z + b.d / 2 + 0.2, top = b.h + 0.16;
      neon.box(ex, top * 0.45, ez, 0.35, top * 0.88, 0.35, col);
      for (const [ox, oz, sx, sz] of [[0, b.d / 2 + 0.2, b.w + 0.6, 0.3], [0, -b.d / 2 - 0.2, b.w + 0.6, 0.3], [b.w / 2 + 0.2, 0, 0.3, b.d + 0.6], [-b.w / 2 - 0.2, 0, 0.3, b.d + 0.6]]) neon.box(b.x + ox, top - 2.5, b.z + oz, sx, 0.45, sz, col);
      const cc = new THREE.Color(c);
      for (let yy = 4; yy < top * 0.88; yy += 6) glowPoints.push([ex, yy, ez, cc.r, cc.g, cc.b, 4]);
      for (const [ox, oz] of [[b.w / 2, b.d / 2], [-b.w / 2, b.d / 2], [b.w / 2, -b.d / 2], [-b.w / 2, -b.d / 2], [0, b.d / 2 + 0.2], [0, -b.d / 2 - 0.2], [b.w / 2 + 0.2, 0], [-b.w / 2 - 0.2, 0]]) glowPoints.push([b.x + ox, top - 2.5, b.z + oz, cc.r, cc.g, cc.b, 6]);
    }
    if (b.trim) {
      const c = rnd.pick(['#ff4fa8', '#3ff0e0', '#ffb03f']);
      const cc = new THREE.Color(c);
      neon.box(b.x - b.w / 2 - 0.9, b.h * 0.62, b.z + b.d * 0.3, 0.3, b.h * 0.45, 2.2, vcolor(c, 1.2));
      for (let yy = b.h * 0.42; yy < b.h * 0.84; yy += 2.5) glowPoints.push([b.x - b.w / 2 - 1.2, yy, b.z + b.d * 0.3, cc.r, cc.g, cc.b, 5]);
    }
  }
  if (neon.vertexCount) {
    const nm = new THREE.Mesh(neon.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
    nm.matrixAutoUpdate = false;
    scene.add(nm);
    meshes.push(nm);
  }

  // ---- night market stalls and lanterns
  const mk = chunkOf(-250, 50);
  for (let i = 0; i < 8; i++) {
    const sx = -268 + (i % 4) * 12, sz = 38 + Math.floor(i / 4) * 24;
    mk.detail.box(sx, 1.1, sz, 6, 2.2, 3.5, vcolor('#7a5a3a'));
    mk.detail.prism(sx, 2.2, sz, 3.4, 2.2, 1.2, { side: 3.2, front: 0, back: 0 }, vcolor(rnd.pick(['#e05a4a', '#f2b544', '#3fa89a', '#d65a8a'])));
    glowPoints.push([sx, 3.8, sz, 1, 0.55, 0.25, 4], [sx + 3, 3.4, sz, 1, 0.3, 0.3, 3]);
  }

  // ---- dock cranes (landmarks of Ninefold Docks)
  for (const [cx, cz] of [[180, 440], [300, 440]]) {
    const ch = chunkOf(cx, 380);
    const cc = vcolor('#e0a030');
    for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) ch.detail.box(cx + ox, 14, cz + oz, 1.2, 28, 1.2, cc);
    ch.detail.box(cx, 29, cz - 12, 3, 2.5, 60, cc);
    ch.detail.box(cx, 26, cz, 12, 4, 6, vcolor('#c03a2a'));
    glowPoints.push([cx, 31, cz - 40, 1, 0.2, 0.2, 8], [cx, 31, cz + 16, 1, 0.2, 0.2, 8]);
  }

  // ---- flush chunk builders into meshes
  for (const ch of chunks.values()) {
    for (const s of STYLE_LIST) addMesh(ch[s], facades[s].mat, { cast: true, receive: true });
    addMesh(ch.detail, detailMat, { cast: true, receive: true });
  }

  function addMesh(builder, material, { cast = false, receive = false } = {}) {
    if (builder.vertexCount === 0) return;
    const m = new THREE.Mesh(builder.build(), material);
    m.castShadow = cast; m.receiveShadow = receive;
    m.matrixAutoUpdate = false;
    scene.add(m);
    meshes.push(m);
  }

  // hard world edges: north and east are hills, west and south the sea
  collision.addBox(CITY_MAX + 20, -900, CITY_MAX + 60, 900, 50);
  collision.addBox(-900, CITY_MIN - 60, 900, CITY_MIN - 20, 50);

  return { plan, collision, meshes, glowPoints, roadMaterials: [roadMat, crossMat] };
}
