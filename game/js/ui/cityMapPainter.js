// Paints Port Halcyon as a flat map (sea, sand, district blocks, building footprints, roads) into an
// offscreen canvas. The minimap and the pause-menu map both draw from it.
import { DISTRICTS, GRID, CITY_MIN, CITY_MAX, BEACH_WEST, BEACH_SOUTH } from '../world/cityPlan.js';

export const MAP_MIN = -560, MAP_SIZE = 1120;

export function paintCityMap(plan, pxPerM = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = MAP_SIZE * pxPerM;
  const g = cv.getContext('2d');
  g.scale(pxPerM, pxPerM);
  g.translate(-MAP_MIN, -MAP_MIN);
  g.fillStyle = '#1f5f86'; g.fillRect(MAP_MIN, MAP_MIN, MAP_SIZE, MAP_SIZE);
  g.fillStyle = '#2a8fae'; g.fillRect(BEACH_WEST - 50, MAP_MIN, 50, MAP_SIZE); g.fillRect(BEACH_WEST, BEACH_SOUTH, MAP_SIZE, 50);
  g.fillStyle = '#6d7f55'; g.fillRect(BEACH_WEST, MAP_MIN, MAP_SIZE, BEACH_SOUTH - MAP_MIN);
  g.fillStyle = '#e9d3a0'; g.fillRect(BEACH_WEST, MAP_MIN, CITY_MIN - 7 - BEACH_WEST, BEACH_SOUTH - MAP_MIN); g.fillRect(BEACH_WEST, CITY_MAX + 7, MAP_SIZE, BEACH_SOUTH - CITY_MAX - 7);
  // pier
  g.fillStyle = '#9a7550'; g.fillRect(BEACH_WEST - 150, 323, 150, 14);
  for (const b of plan.blocks) {
    g.fillStyle = b.kind === 'park' ? '#7fb35e' : DISTRICTS[b.district].map;
    g.fillRect(b.x - 43, b.z - 43, 86, 86);
  }
  g.fillStyle = 'rgba(30,30,40,0.28)';
  for (const b of plan.buildings) g.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
  g.fillStyle = '#3a3f4a';
  for (const c of GRID) { g.fillRect(c - 7, CITY_MIN - 7, 14, CITY_MAX - CITY_MIN + 14); g.fillRect(CITY_MIN - 7, c - 7, CITY_MAX - CITY_MIN + 14, 14); }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
  for (const c of GRID) { g.beginPath(); g.moveTo(c, CITY_MIN); g.lineTo(c, CITY_MAX); g.moveTo(CITY_MIN, c); g.lineTo(CITY_MAX, c); g.stroke(); }
  return cv;
}
