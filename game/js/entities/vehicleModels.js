// Low-poly car bodies built from tapered prisms: one merged, vertex-coloured mesh per model and paint.
// Hatch, sedan, muscle, sports and van shapes; cab and PHPD liveries with a roof light bar.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { VEHICLES } from './vehicleCatalog.js';

const cache = new Map();
let paintMaterial = null;
let lightMaterials = null;

export function vehicleMaterials() {
  if (!paintMaterial) {
    paintMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.3, envMapIntensity: 1.25 });
    lightMaterials = {
      red: new THREE.MeshBasicMaterial({ color: 0xff2a3a }),
      blue: new THREE.MeshBasicMaterial({ color: 0x2a6bff }),
      off: new THREE.MeshBasicMaterial({ color: 0x333a44 }),
      burnt: new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.95 }),
    };
  }
  return { paint: paintMaterial, lights: lightMaterials };
}

const GLASS = '#18222e', TRIM = '#24262a', TIRE = '#141414', HUB = '#c9ccd1', HEAD = '#fff6dc', TAIL = '#e0202a';

export function vehicleGeometry(type, paintHex) {
  const key = type + paintHex;
  if (cache.has(key)) return cache.get(key);
  const s = VEHICLES[type];
  const mb = new MeshBuilder();
  const paint = vcolor(paintHex), dark = vcolor(paintHex, 0.75);
  const W = s.wid / 2, L = s.len / 2;
  const police = s.livery === 'police';
  const lowerPaint = police ? vcolor('#1b2a48') : paint;
  const clear = 0.28;
  const st = s.style;

  // lower body (doors, sills) and the shoulder line
  const tall = st === 'van' || st === 'bus';
  const bodyTop = st === 'sports' ? 0.78 : tall ? 1.05 : st === 'muscle' ? 0.86 : 0.9;
  // lower body with a rounded shoulder: a straight box topped by a tapered prism
  const shoulder = tall ? 0.12 : 0.17;
  mb.box(0, (clear + bodyTop - shoulder) / 2, 0, s.wid, bodyTop - shoulder - clear, s.len, lowerPaint, { top: false });
  mb.prism(0, bodyTop - shoulder, 0, W, L, shoulder, { front: 0.16, back: 0.12, side: 0.08 }, paint);
  // nose and tail taper under the bumpers
  mb.prism(0, clear, L - 0.05, W - 0.04, 0.1, 0.32, { front: 0.08, side: 0.06 }, lowerPaint);
  // wheel arches, door seams and mirrors
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) mb.box(sx * (W + 0.005), (tall ? 0.4 : 0.36) + 0.12, sz * L * 0.66, 0.03, 0.34, (tall ? 0.4 : 0.36) * 2.5, vcolor('#16181c'));
    mb.box(sx * (W + 0.004), (clear + bodyTop) / 2 + 0.05, L * 0.12, 0.01, bodyTop - clear - 0.2, 0.025, vcolor('#202226'));
    if (st !== 'van') mb.box(sx * (W + 0.1), bodyTop + 0.12, L * 0.28, 0.2, 0.1, 0.14, paint);
  }
  if (police) mb.box(0, bodyTop - 0.12, 0, s.wid + 0.02, 0.14, s.len * 0.9, vcolor('#f4f4f0'));
  if (police) mb.box(0, 0.62, 0, s.wid + 0.03, 0.08, s.len * 0.7, vcolor('#2bd0c4'));
  // bumpers and grille
  mb.box(0, 0.42, L + 0.05, s.wid * 0.96, 0.26, 0.2, vcolor(TRIM));
  mb.box(0, 0.42, -L - 0.05, s.wid * 0.96, 0.26, 0.2, vcolor(TRIM));
  mb.box(0, bodyTop - 0.22, L + 0.01, s.wid * 0.5, 0.16, 0.04, vcolor('#0e0f12'));
  // lights
  for (const sx of [-1, 1]) {
    mb.box(sx * (W - 0.28), bodyTop - 0.18, L + 0.02, 0.38, 0.13, 0.05, vcolor(HEAD, 1.6));
    mb.box(sx * (W - 0.25), bodyTop - 0.16, -L - 0.02, 0.4, 0.13, 0.05, vcolor(TAIL, 1.3));
  }
  // wheels
  const wr = tall ? 0.42 : 0.36;
  const wx = W - 0.12, wz = L * 0.66;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mb.cylinder(sx * wx, wr, sz * wz, wr, 0.28, vcolor(TIRE), { axis: 'x', seg: 12 });
    mb.cylinder(sx * (wx + 0.13), wr, sz * wz, wr * 0.55, 0.04, vcolor(HUB), { axis: 'x', seg: 8 });
  }

  // upper body by style: hood/deck prisms, glass cabin, painted roof
  const glass = vcolor(GLASS);
  if (st === 'bus') {
    // long box body, a band of side windows, wide windscreen, teal stripe, lit route board
    mb.box(0, 1.05 + 0.95, 0, s.wid, 1.9, s.len, paint);
    mb.box(0, 1.95, -0.3, s.wid + 0.02, 0.9, s.len - 2.2, glass, { top: false });
    mb.box(0, 1.75, L + 0.01, s.wid - 0.16, 1.25, 0.04, glass);
    mb.box(0, 1.9, -L - 0.01, s.wid - 0.5, 0.7, 0.04, glass);
    mb.box(0, 2.98, 0, s.wid - 0.24, 0.12, s.len - 0.8, dark);
    mb.box(0, 2.98, -L * 0.4, 1.4, 0.3, 1.8, vcolor('#c9ccd1'));
    mb.box(0, 1.2, 0, s.wid + 0.03, 0.2, s.len * 0.97, vcolor('#2bb3a8'));
    mb.box(0, 2.62, L + 0.03, s.wid * 0.62, 0.26, 0.04, vcolor('#ffb03f', 1.4));
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) mb.box(sx * (W + 0.012), 1.95, -L + 1.6 + i * 1.75, 0.02, 0.9, 0.1, paint);
  } else if (st === 'van') {
    mb.box(0, 1.05 + 0.6, -0.35, s.wid, 1.2, s.len - 0.7, paint);
    mb.prism(0, 1.05, L - 0.55, W, 0.35, 1.0, { front: 0.3, side: 0.05 }, glass);
    mb.box(0, 1.62, -0.35, s.wid + 0.02, 0.42, s.len - 1.6, glass, { top: false });
    mb.box(0, 2.26, -0.35, s.wid - 0.1, 0.08, s.len - 0.8, dark);
  } else {
    const cab = {
      hatch: { y: bodyTop, h: 0.56, len: L * 0.62, z: -L * 0.18, front: 0.5, back: 0.12, side: 0.12 },
      sedan: { y: bodyTop, h: 0.55, len: L * 0.5, z: -L * 0.08, front: 0.55, back: 0.42, side: 0.13 },
      muscle: { y: bodyTop, h: 0.46, len: L * 0.45, z: -L * 0.12, front: 0.55, back: 0.5, side: 0.14 },
      sports: { y: bodyTop, h: 0.4, len: L * 0.5, z: -L * 0.1, front: 0.75, back: 0.75, side: 0.18 },
    }[st];
    mb.prism(0, cab.y, cab.z, W - 0.05, cab.len, cab.h, { front: cab.front, back: cab.back, side: cab.side }, glass);
    // roof skin slightly above the glass top
    const rl = cab.len - (cab.front + cab.back) / 2, rw = W - 0.05 - cab.side;
    const rz = cab.z + (cab.back - cab.front) / 2;
    mb.box(0, cab.y + cab.h + 0.02, rz, rw * 2 + 0.02, 0.06, rl * 2 + 0.02, police ? vcolor('#f4f4f0') : paint);
    // pillars (body-colour strips over the glass edges)
    for (const sx of [-1, 1]) mb.box(sx * (rw + cab.side * 0.5), cab.y + cab.h * 0.5, rz, 0.06, cab.h, 0.12, paint);
    // sloped hood and deck
    mb.prism(0, bodyTop, L * 0.62, W, L * 0.38, 0.08, { front: 0.05, side: 0.05 }, paint);
    if (st === 'muscle') {
      mb.box(0, bodyTop + 0.14, L * 0.45, 0.6, 0.16, 0.9, vcolor(TRIM));
      for (const sx of [-0.22, 0.22]) mb.box(sx, bodyTop + 0.01, 0, 0.18, 0.02, s.len * 0.98, vcolor('#f4f1ea'), { top: true });
    }
    if (st === 'sports') {
      mb.box(0, bodyTop + 0.32, -L + 0.25, s.wid * 0.9, 0.06, 0.4, dark);
      for (const sx of [-1, 1]) mb.box(sx * (W - 0.3), bodyTop + 0.16, -L + 0.3, 0.08, 0.3, 0.12, vcolor(TRIM));
    }
  }
  if (s.livery === 'cab') {
    mb.box(0, 1.45 + 0.14, -0.3, 0.8, 0.24, 0.35, vcolor('#fffbe8', 1.3));
    for (let i = 0; i < 10; i++) for (const sx of [-1, 1]) mb.box(sx * (W + 0.005), 0.66, -L * 0.6 + i * 0.28, 0.02, 0.12, 0.14, vcolor(i % 2 ? '#111' : '#fff'));
  }
  if (police) mb.box(0, (st === 'sports' ? 1.2 : 1.48) + 0.05, -0.1, 1.2, 0.1, 0.34, vcolor('#202428'));

  const geo = mb.build();
  cache.set(key, geo);
  return geo;
}

// Door lettering for PHPD cars: one canvas texture shared by every cruiser.
let decal = null;
function doorDecal() {
  if (decal) return decal;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f0';
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 26; g.lineTo(34 + Math.cos(a) * r, 33 + Math.sin(a) * r); }
  g.fill();
  g.fillStyle = '#f4f4f0';
  g.font = '900 46px "Avenir Next Condensed", "Futura", "Helvetica Neue", Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('PHPD', 72, 35);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  decal = {
    geo: new THREE.PlaneGeometry(1.5, 0.375),
    mat: new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
  return decal;
}

// A car object: body mesh plus, for police, the flashing light bar halves.
export function buildVehicleMesh(type, paintHex) {
  const { paint, lights } = vehicleMaterials();
  const s = VEHICLES[type];
  const group = new THREE.Group();
  const body = new THREE.Mesh(vehicleGeometry(type, paintHex), paint);
  body.castShadow = true;
  group.add(body);
  let bar = null;
  if (s.livery === 'police') {
    // "PHPD" lettering with a star badge on both front doors
    for (const side of [-1, 1]) {
      const decal = new THREE.Mesh(doorDecal().geo, doorDecal().mat);
      decal.position.set(side * (s.wid / 2 + 0.014), s.style === 'sports' ? 0.5 : 0.52, 0.15);
      decal.rotation.y = side * Math.PI / 2;
      group.add(decal);
    }
    const y = (s.style === 'sports' ? 1.2 : 1.48) + 0.17;
    const geo = new THREE.BoxGeometry(0.55, 0.14, 0.3);
    const red = new THREE.Mesh(geo, lights.red), blue = new THREE.Mesh(geo, lights.blue);
    red.position.set(0.3, y, -0.1); blue.position.set(-0.3, y, -0.1);
    group.add(red, blue);
    bar = { red, blue, y };
  }
  return { group, body, bar };
}
