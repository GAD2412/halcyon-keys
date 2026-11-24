// Full city map for the pause menu: districts with names, landmarks, mission markers, police, the player
// and the GPS route to the current objective.
import { DISTRICTS, PLACES } from '../world/cityPlan.js';
import { MAP_MIN, MAP_SIZE } from './cityMapPainter.js';
import { gpsRoute } from './minimap.js';
import { JUMPS } from '../systems/stuntJumps.js';

// the framed part of the world: the city, its beaches and a strip of sea
const VX = -525, VZ = -455, VS = 985;

export function drawWorldMap(canvas, G) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width, k = S / VS;
  const X = (x) => (x - VX) * k, Z = (z) => (z - VZ) * k;
  ctx.clearRect(0, 0, S, S);
  const m = G.mapCanvas.width / MAP_SIZE;
  ctx.drawImage(G.mapCanvas, (VX - MAP_MIN) * m, (VZ - MAP_MIN) * m, VS * m, VS * m, 0, 0, S, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const d of Object.values(DISTRICTS)) {
    ctx.font = `800 ${Math.round(S * 0.026)}px "Avenir Next Condensed", "Futura", sans-serif`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,14,28,0.85)'; ctx.fillStyle = '#fff';
    ctx.strokeText(d.name.toUpperCase(), X(d.label[0]), Z(d.label[1])); ctx.fillText(d.name.toUpperCase(), X(d.label[0]), Z(d.label[1]));
  }
  ctx.font = `700 ${Math.round(S * 0.016)}px "Avenir Next", sans-serif`;
  for (const p of Object.values(PLACES)) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), S * 0.006, 0, 7); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,14,28,0.8)'; ctx.strokeText(p.name, X(p.x), Z(p.z) - S * 0.018); ctx.fillStyle = '#ffe7c0'; ctx.fillText(p.name, X(p.x), Z(p.z) - S * 0.018);
  }
  ctx.font = `800 ${Math.round(S * 0.02)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText('HALCYON BAY', X(100), Z(505));
  ctx.save(); ctx.translate(X(-500), Z(-120)); ctx.rotate(-Math.PI / 2); ctx.fillText('PACIFIC SHELF', 0, 0); ctx.restore();
  const p = G.player, px = p.vehicle ? p.vehicle.x : p.x, pz = p.vehicle ? p.vehicle.z : p.z;
  // stunt ramps: yellow chevrons, greyed once cleared
  JUMPS.forEach(([x, z, h], i) => {
    const cleared = G.stunts.cleared(i);
    ctx.save(); ctx.translate(X(x), Z(z)); ctx.rotate(Math.PI - h);
    ctx.fillStyle = cleared ? '#8a8a8a' : '#ffc21a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    const k = S * 0.011;
    ctx.beginPath(); ctx.moveTo(0, -k * 1.2); ctx.lineTo(k, k); ctx.lineTo(0, k * 0.3); ctx.lineTo(-k, k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  for (const r of G.side.races) {
    ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.arc(X(r.start.x), Z(r.start.z), S * 0.012, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(S * 0.014)}px sans-serif`; ctx.fillText('R', X(r.start.x), Z(r.start.z) + 1);
  }
  const tgt = G.side.target() || G.missions.target();
  if (tgt) {
    ctx.strokeStyle = '#c86bff'; ctx.lineWidth = Math.max(3, S * 0.006); ctx.lineJoin = 'round';
    ctx.beginPath(); gpsRoute(px, pz, tgt.x, tgt.z).forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z)))); ctx.stroke();
    star(ctx, X(tgt.x), Z(tgt.z), S * 0.02, '#ffd23a');
  }
  for (const m of G.missions.startMarkers()) {
    ctx.fillStyle = '#ff6f61'; ctx.beginPath(); ctx.arc(X(m.x), Z(m.z), S * 0.016, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(S * 0.018)}px sans-serif`; ctx.fillText(m.letter, X(m.x), Z(m.z) + 1);
  }
  for (const u of G.police.units) { ctx.fillStyle = '#ff3a4a'; ctx.beginPath(); ctx.arc(X(u.x), Z(u.z), S * 0.007, 0, 7); ctx.fill(); }
  // player arrow
  const h = p.vehicle ? p.vehicle.heading : p.heading;
  ctx.save(); ctx.translate(X(px), Z(pz)); ctx.rotate(Math.PI - h);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const a = S * 0.018;
  ctx.beginPath(); ctx.moveTo(0, -a); ctx.lineTo(a * 0.7, a * 0.7); ctx.lineTo(0, a * 0.3); ctx.lineTo(-a * 0.7, a * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
