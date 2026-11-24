// Canvas-painted textures: building facades (with a matching night-window glow map), asphalt with lane
// markings, sidewalk tiles, sand and sea normals. No image files: everything is drawn here.
import * as THREE from 'three';
import { createRandom } from '../core/random.js';

function canvasTexture(w, h, draw, { srgb = true, repeat = true } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

const STYLES = {
  // Pastel deco hotels: white render, deep teal glass, horizontal eyebrow ledges.
  deco: { wall: '#f4efe6', slab: '#fffaf2', glass: ['#2f6f86', '#3d7f96', '#255a70'], cols: 4, rows: 4, winW: 0.56, winH: 0.5, ledge: true },
  // Downtown curtain wall: blue-green glass panels and thin mullions.
  glass: { wall: '#c9d6de', slab: '#dfe8ee', glass: ['#3a6f8f', '#4a86a6', '#2d5c78', '#5b97b3'], cols: 6, rows: 8, winW: 0.9, winH: 0.78, ledge: false },
  // Old-town stucco with shuttered windows.
  stucco: { wall: '#efe2cc', slab: '#f6ead6', glass: ['#3b3a40', '#2f3a48'], cols: 3, rows: 4, winW: 0.42, winH: 0.55, ledge: false, shutters: true },
  // Rustline warehouses: corrugated panels and a few high windows.
  warehouse: { wall: '#bdb6ab', slab: '#cfc8bd', glass: ['#3c4a52'], cols: 4, rows: 2, winW: 0.5, winH: 0.22, ledge: false, corrugated: true },
};

// Returns { map, emissive } for a style. The top band of every floor is plain wall: roofs sample it.
export function makeFacade(styleName, seed = 7) {
  const st = STYLES[styleName];
  const rnd = createRandom(seed);
  const W = 512, H = 512;
  const lit = [];
  const map = canvasTexture(W, H, (g) => {
    g.fillStyle = st.wall; g.fillRect(0, 0, W, H);
    if (st.corrugated) {
      for (let x = 0; x < W; x += 8) { g.fillStyle = x % 16 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'; g.fillRect(x, 0, 4, H); }
    }
    const cw = W / st.cols, rh = H / st.rows;
    for (let r = 0; r < st.rows; r++) {
      g.fillStyle = st.slab; g.fillRect(0, r * rh, W, rh * 0.16);
      if (st.ledge) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, r * rh + rh * 0.16, W, 4); }
      for (let c = 0; c < st.cols; c++) {
        const ww = cw * st.winW, wh = rh * st.winH;
        const x = c * cw + (cw - ww) / 2, y = r * rh + rh * 0.3;
        g.fillStyle = rnd.pick(st.glass); g.fillRect(x, y, ww, wh);
        // sky reflection gradient on the glass
        const gr = g.createLinearGradient(x, y, x + ww, y + wh);
        gr.addColorStop(0, 'rgba(255,220,180,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (!st.corrugated) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + wh - 3, ww, 3); }
        if (st.shutters) { g.fillStyle = rnd.pick(['#2f7f72', '#b4553c', '#3f6aa0', '#7a5a2c']); g.fillRect(x - 12, y, 10, wh); g.fillRect(x + ww + 2, y, 10, wh); }
        if (styleName === 'glass') { g.fillStyle = 'rgba(230,240,245,0.55)'; g.fillRect(x + ww / 2 - 1, y, 2, wh); }
        if (rnd.chance(styleName === 'warehouse' ? 0.3 : 0.42)) lit.push([x, y, ww, wh, rnd.pick(['#ffd08a', '#ffe3b0', '#fff1d6', '#bfe3ff'])]);
      }
    }
    // weathering streaks
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,60,40,${rnd.range(0.02, 0.06)})`; g.fillRect(rnd.range(0, W), rnd.range(0, H), rnd.range(2, 6), rnd.range(30, 120)); }
  });
  const emissive = canvasTexture(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (const [x, y, w, h, c] of lit) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  });
  const tileW = { deco: 12, glass: 18, stucco: 10, warehouse: 24 }[styleName];
  const tileH = { deco: 14, glass: 28, stucco: 13, warehouse: 12 }[styleName];
  return { map, emissive, tileW, tileH };
}

// Shop signs: one row per name, neon letters on a dark board.
export function makeShopSignAtlas(names) {
  const INK = ['#ff4fa8', '#3ff0e0', '#ffc24a', '#9dff6a', '#fff4dc', '#ff7a4a'];
  return canvasTexture(512, 64 * names.length, (g, w) => {
    names.forEach((name, i) => {
      const y = i * 64;
      g.fillStyle = '#141018'; g.fillRect(0, y, w, 64);
      g.fillStyle = INK[i % INK.length];
      g.font = '900 44px "Avenir Next Condensed", "Futura", "Helvetica Neue", Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = INK[i % INK.length]; g.shadowBlur = 10;
      g.fillText(name, w / 2, y + 34, w - 24);
      g.shadowBlur = 0;
    });
  }, { repeat: false });
}

export function makeRoadTexture() {
  return canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#3b3d42'; g.fillRect(0, 0, W, H);
    const rnd = createRandom(3);
    for (let i = 0; i < 2500; i++) { const v = rnd.int(40, 80); g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(rnd.range(0, W), rnd.range(0, H), 2, 2); }
    // curbside gutters
    g.fillStyle = '#2c2e33'; g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
    // double yellow centre line
    g.fillStyle = '#f2c14e'; g.fillRect(W / 2 - 6, 0, 4, H); g.fillRect(W / 2 + 2, 0, 4, H);
    // dashed white lane dividers
    g.fillStyle = '#f4f1ea';
    for (let y = 0; y < H; y += 64) { g.fillRect(W * 0.25 - 2, y, 4, 34); g.fillRect(W * 0.75 - 2, y, 4, 34); }
    // edge lines
    g.fillRect(10, 0, 3, H); g.fillRect(W - 13, 0, 3, H);
  });
}

export function makeIntersectionTexture() {
  return canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#3b3d42'; g.fillRect(0, 0, W, H);
    const rnd = createRandom(5);
    for (let i = 0; i < 2500; i++) { const v = rnd.int(40, 80); g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(rnd.range(0, W), rnd.range(0, H), 2, 2); }
    // zebra crossings on all four sides
    g.fillStyle = '#efece4';
    for (let i = 0; i < 9; i++) {
      const p = 24 + i * 24;
      g.fillRect(p, 2, 12, 22); g.fillRect(p, H - 24, 12, 22);
      g.fillRect(2, p, 22, 12); g.fillRect(W - 24, p, 22, 12);
    }
  }, { repeat: false });
}

export function makeTileTexture(base, line, size = 128, noise = 0.12) {
  return canvasTexture(size, size, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    const rnd = createRandom(size + base.length);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rnd.range(0, noise)})`; g.fillRect(rnd.range(0, W), rnd.range(0, H), 2, 2); }
    if (line) { g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(0, 0, W / 2, H / 2); g.strokeRect(W / 2, H / 2, W / 2, H / 2); }
  });
}

export function makeSandTexture() {
  return canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#ecd3a4'; g.fillRect(0, 0, W, H);
    const rnd = createRandom(11);
    for (let i = 0; i < 6000; i++) { const t = rnd.next(); g.fillStyle = t < 0.5 ? 'rgba(160,120,70,0.18)' : 'rgba(255,245,220,0.35)'; g.fillRect(rnd.range(0, W), rnd.range(0, H), 1.5, 1.5); }
  });
}

// Tangent-space normal map of overlapping ripples for the ocean's sun glitter.
export function makeWaveNormals() {
  return canvasTexture(256, 256, (g, W, H) => {
    const img = g.createImageData(W, H);
    const rnd = createRandom(21);
    const waves = Array.from({ length: 7 }, () => ({ kx: rnd.int(1, 6), ky: rnd.int(1, 6) * (rnd.chance(0.5) ? 1 : -1), a: rnd.range(0.4, 1), p: rnd.range(0, 6.28) }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let dx = 0, dy = 0;
      for (const w of waves) {
        const ph = ((x * w.kx + y * w.ky) / W) * Math.PI * 2 + w.p;
        const c = Math.cos(ph) * w.a;
        dx += c * w.kx * 0.12; dy += c * w.ky * 0.12;
      }
      const i = (y * W + x) * 4;
      img.data[i] = 128 + Math.max(-127, Math.min(127, dx * 60));
      img.data[i + 1] = 128 + Math.max(-127, Math.min(127, dy * 60));
      img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false });
}

// Soft round sprite used by light glows and particles.
export function makeGlowTexture() {
  return canvasTexture(64, 64, (g, W) => {
    const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
  }, { repeat: false });
}
