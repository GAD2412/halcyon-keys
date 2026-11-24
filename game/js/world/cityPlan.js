// Port Halcyon's layout: a 100 m road grid, six districts, the beach and the ocean on the west and south,
// and every building lot (footprint, height, facade style, colour). Pure data, seeded, identical every load.
import { createRandom } from '../core/random.js';

export const PITCH = 100;            // road centre to road centre
export const ROAD_HALF = 7;          // 4 lanes of 3.5 m
export const SIDEWALK = 4;
export const GRID = [-400, -300, -200, -100, 0, 100, 200, 300, 400];
export const CITY_MIN = -400, CITY_MAX = 400;
export const BEACH_WEST = -470, BEACH_SOUTH = 470;   // sand ends and the water starts here
export const WORLD_LIMIT = 520;
export const LANE_OFFSETS = [1.75, 5.25];

export const DISTRICTS = {
  flamingo: { name: 'Flamingo Mile', ground: '#e9dcc4', map: '#f2b8a8', label: [-350, 0] },
  glasswater: { name: 'Glasswater', ground: '#cfd3d6', map: '#9fc3dc', label: [50, 0] },
  lantern: { name: 'Lantern Quarter', ground: '#ddd0bb', map: '#e7c48f', label: [-200, 120] },
  mango: { name: 'Mango Hill', ground: '#a9c48a', map: '#a8d58f', label: [-100, -300] },
  rustline: { name: 'Rustline Yards', ground: '#b9b2a6', map: '#c4a58a', label: [300, -150] },
  docks: { name: 'Ninefold Docks', ground: '#b4b6b4', map: '#a9b4c0', label: [250, 300] },
};

export function districtAt(x, z) {
  if (x < -300) return 'flamingo';
  if (z >= 200 && x >= 100) return 'docks';
  if (x >= 200) return 'rustline';
  if (z <= -200) return 'mango';
  if (x >= -100 && z <= 200) return 'glasswater';
  return 'lantern';
}

export const nearestGrid = (v) => Math.max(CITY_MIN, Math.min(CITY_MAX, Math.round(v / PITCH) * PITCH));
export const onRoadNS = (x, z) => Math.abs(x - nearestGrid(x)) <= ROAD_HALF + 1 && z >= CITY_MIN - 10 && z <= CITY_MAX + 10;
export const onRoadEW = (x, z) => Math.abs(z - nearestGrid(z)) <= ROAD_HALF + 1 && x >= CITY_MIN - 10 && x <= CITY_MAX + 10;

const PALETTES = {
  flamingo: ['#f6b5c1', '#9fe3d0', '#ffe0a8', '#b8d8f6', '#d9c2f0', '#ffc7a3', '#f7f0e2', '#a6e1e8'],
  glasswater: ['#e6edf2', '#d4e2ea', '#c8d9e6', '#f0f0ea', '#dfe6ee'],
  lantern: ['#f0c79a', '#e8a98a', '#f3dfb0', '#e7b7a0', '#f6e6c8', '#d99a7c', '#c9d7b0'],
  mango: ['#fbf4e6', '#f5ead2', '#ffffff', '#f2e3d0'],
  rustline: ['#b0a597', '#9c8f84', '#c2b39c', '#a35c43', '#8b8f8c'],
  docks: ['#b3aca2', '#9ea7ab'],
};

// Special lots: parks and landmarks that replace generated buildings.
const PARKS = new Set(['-150,-50', '50,250']);
const LANDMARK_LOTS = { '-350,350': 'pier-plaza', '-250,50': 'night-market', '150,-150': 'halcyon-tower' };

export function buildCityPlan(seed = 1337) {
  const rnd = createRandom(seed);
  const buildings = [];   // {x,z,w,d,h,style,color,district}
  const blocks = [];
  const centers = [-350, -250, -150, -50, 50, 150, 250, 350];
  for (const bx of centers) for (const bz of centers) {
    const district = districtAt(bx, bz);
    const key = `${bx},${bz}`;
    const kind = PARKS.has(key) ? 'park' : LANDMARK_LOTS[key] || 'buildings';
    blocks.push({ x: bx, z: bz, district, kind });
    if (kind !== 'buildings' && kind !== 'halcyon-tower') {
      if (kind === 'night-market') addLanternRow(bx, bz, rnd, buildings, true);
      continue;
    }
    const pal = PALETTES[district];
    const add = (x, z, w, d, h, style, extra = {}) => buildings.push({ x, z, w, d, h, style, color: rnd.pick(pal), district, ...extra });
    const E = 39; // buildable half size of a block
    if (kind === 'halcyon-tower') {
      add(bx, bz, 34, 34, 170, 'glass', { color: '#d8e6f0', crown: true, name: 'Halcyon Tower' });
      add(bx - 26, bz + 26, 22, 22, 24, 'glass'); add(bx + 26, bz - 24, 22, 26, 38, 'glass');
      continue;
    }
    if (district === 'flamingo') {
      // Deco hotels face the beach (west edge), lower annexes behind.
      for (let k = 0; k < 3; k++) {
        const z = bz - E + 13 + k * 26;
        add(bx - 18, z, 30, 22, rnd.range(14, 34), 'deco', { trim: true });
        if (rnd.chance(0.7)) add(bx + 22, z, 24, 20, rnd.range(9, 16), 'deco');
      }
    } else if (district === 'glasswater') {
      for (const [ox, oz] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
        if (rnd.chance(0.15)) continue;
        const w = rnd.range(24, 32), d = rnd.range(24, 32);
        add(bx + ox, bz + oz, w, d, rnd.range(36, 120), 'glass', { crown: rnd.chance(0.35) });
      }
    } else if (district === 'lantern') {
      addLanternRow(bx, bz, rnd, buildings, false);
    } else if (district === 'mango') {
      for (const [ox, oz] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
        add(bx + ox, bz + oz, rnd.range(14, 20), rnd.range(12, 16), rnd.range(6, 9), 'stucco', { villa: true, pool: true });
      }
    } else if (district === 'rustline') {
      add(bx, bz - 18, 70, 34, rnd.range(10, 15), 'warehouse', { chimney: rnd.chance(0.6) });
      add(bx - 16, bz + 22, 38, 26, rnd.range(8, 12), 'warehouse');
      if (rnd.chance(0.7)) add(bx + 24, bz + 24, 24, 22, rnd.range(7, 10), 'warehouse');
    } else if (district === 'docks') {
      add(bx - 20, bz - 22, 34, 28, rnd.range(9, 13), 'warehouse');
      // container stacks are recorded separately; they are solid too
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        const stack = rnd.int(1, 4);
        buildings.push({ x: bx + 6 + c * 16, z: bz - 8 + r * 15, w: 13, d: 2.6 * 3.2, h: 2.6 * stack, style: 'container', color: rnd.pick(['#c0503a', '#2f6fa0', '#e0a030', '#3a8a6a', '#8a3a6a', '#d06a2a']), district });
      }
      add(bx - 20, bz + 22, 30, 24, rnd.range(8, 11), 'warehouse');
    }
  }
  return { buildings, blocks };
}

function addLanternRow(bx, bz, rnd, out, marketCenter) {
  const pal = PALETTES.lantern;
  const E = 39;
  const depth = 14;
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < 3; k++) {
      if (marketCenter && k === 1) continue;
      const along = -E + 13 + k * 26;
      const w = rnd.range(20, 25), h = rnd.range(7, 15);
      let x, z, ww, dd;
      if (side === 0) { x = bx + along; z = bz - E + depth / 2; ww = w; dd = depth; }
      else if (side === 1) { x = bx + along; z = bz + E - depth / 2; ww = w; dd = depth; }
      else if (side === 2) { x = bx - E + depth / 2; z = bz + along; ww = depth; dd = w; }
      else { x = bx + E - depth / 2; z = bz + along; ww = depth; dd = w; }
      if ((side >= 2) && (k === 0 || k === 2)) continue; // corners already taken by the N/S rows
      out.push({ x, z, w: ww, d: dd, h, style: 'stucco', color: rnd.pick(pal), district: 'lantern', awning: rnd.chance(0.6) });
    }
  }
}

// Points of interest used by missions, respawns and the map legend.
export const PLACES = {
  pier: { x: -448, z: 330, name: 'Halo Pier' },
  safehouse: { x: -209, z: 150, name: 'Suds & Sons Laundromat' },
  garage: { x: 209, z: -40, name: "Tuck's Body & Soul" },
  valet: { x: 91, z: -130, name: 'Glasswater Valet' },
  market: { x: -250, z: 50, name: 'Lantern Night Market' },
  hospital: { x: -130, z: -60, name: 'Halcyon General' },
  police: { x: 109, z: 88, name: 'PHPD Central' },
  docks: { x: 250, z: 412, name: 'Ninefold Ferry Slip' },
};
